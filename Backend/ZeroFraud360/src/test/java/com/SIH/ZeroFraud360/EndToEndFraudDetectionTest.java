package com.SIH.ZeroFraud360;

import com.SIH.ZeroFraud360.event.dto.AccountParticipantDto;
import com.SIH.ZeroFraud360.event.dto.PaymentSuccessEvent;
import com.SIH.ZeroFraud360.event.repository.ObservedTransactionRepository;
import com.SIH.ZeroFraud360.event.repository.ProcessedEventRepository;
import com.SIH.ZeroFraud360.fraud.decision.client.DecisionApiClient;
import com.SIH.ZeroFraud360.fraud.decision.dto.DecisionApiResponseDto;
import com.SIH.ZeroFraud360.fraud.domain.AlertStatus;
import com.SIH.ZeroFraud360.fraud.domain.DecisionType;
import com.SIH.ZeroFraud360.fraud.domain.FraudAlert;
import com.SIH.ZeroFraud360.fraud.hold.client.BankSimulationHoldClient;
import com.SIH.ZeroFraud360.fraud.hold.dto.BankHoldResponseDto;
import com.SIH.ZeroFraud360.fraud.repository.DecisionRequestRepository;
import com.SIH.ZeroFraud360.fraud.repository.FraudAlertRepository;
import com.SIH.ZeroFraud360.fraud.repository.HoldRequestRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.BEFORE_EACH_TEST_METHOD)
class EndToEndFraudDetectionTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private com.SIH.ZeroFraud360.auth.security.JwtProvider jwtProvider;

    @Autowired
    private FraudAlertRepository alertRepository;

    @Autowired
    private ProcessedEventRepository processedEventRepository;

    @Autowired
    private ObservedTransactionRepository transactionRepository;

    @Autowired
    private DecisionRequestRepository decisionRequestRepository;

    @Autowired
    private HoldRequestRepository holdRequestRepository;

    @MockitoBean
    private DecisionApiClient decisionApiClient;

    @MockitoBean
    private BankSimulationHoldClient bankHoldClient;

    @BeforeEach
    void cleanDb() {
        holdRequestRepository.deleteAll();
        decisionRequestRepository.deleteAll();
        alertRepository.deleteAll();
        transactionRepository.deleteAll();
        processedEventRepository.deleteAll();
    }

    @Test
    @DisplayName("End-to-End: A -> B -> C within 60s triggers alert, Decision API STOP commands hold on Account C, Officer releases hold")
    void testEndToEndFraudDetectionAndHoldWorkflow() throws Exception {
        com.SIH.ZeroFraud360.auth.security.UserPrincipal policePrincipal =
                new com.SIH.ZeroFraud360.auth.security.UserPrincipal(
                        1L, "police", "hash", "ROLE_POLICE", true,
                        java.util.List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_POLICE"))
                );
        String policeToken = jwtProvider.generateToken(policePrincipal);

        Instant t1Time = Instant.now().minus(Duration.ofSeconds(120));
        Instant t2Time = Instant.now().minus(Duration.ofSeconds(60));
        Instant t3Time = Instant.now();

        // Configure mock Decision API to command STOP
        when(decisionApiClient.requestDecision(any())).thenAnswer(invocation ->
                new DecisionApiResponseDto("REQ-DEC-1", DecisionType.STOP.name(), "Multi-hop layering detected: STOP transaction")
        );

        // Configure mock BankSimulationHoldClient to confirm hold on accounts
        when(bankHoldClient.placeHold(any(), any())).thenAnswer(invocation ->
                new BankHoldResponseDto("HOLD-BANK-9001", invocation.getArgument(0), new BigDecimal("10000.00"), "ACTIVE", Instant.now().plus(Duration.ofMinutes(10)))
        );
        doNothing().when(bankHoldClient).releaseHold(any(), any());
        doNothing().when(bankHoldClient).freezeAccount(any(), any());
        doNothing().when(bankHoldClient).unfreezeAccount(any(), any());

        // Step 1: Ingest T1 (Account A -> Account B, ₹10,000)
        PaymentSuccessEvent event1 = new PaymentSuccessEvent(
                "EVT-001",
                "PAYMENT_SUCCESS",
                "TXN-001",
                t1Time,
                new AccountParticipantDto("ACC-A", "1000000001", "BANK_A"),
                new AccountParticipantDto("ACC-B", "2000000001", "BANK_B"),
                new BigDecimal("10000.00"),
                "INR",
                "SIMULATED_UPI",
                "CORR-001",
                "MSG-001"
        );

        mockMvc.perform(post("/internal/v1/events/payment-success")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(event1)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PROCESSED"));

        // No alerts should exist after T1
        assertThat(alertRepository.count()).isEqualTo(0);

        // Step 2: Ingest T2 (Account B -> Account C, ₹10,000, 60 seconds later) -> Hop 2: MEDIUM_RISK
        PaymentSuccessEvent event2 = new PaymentSuccessEvent(
                "EVT-002",
                "PAYMENT_SUCCESS",
                "TXN-002",
                t2Time,
                new AccountParticipantDto("ACC-B", "2000000001", "BANK_B"),
                new AccountParticipantDto("ACC-C", "3000000001", "BANK_C"),
                new BigDecimal("10000.00"),
                "INR",
                "SIMULATED_UPI",
                "CORR-002",
                "MSG-002"
        );

        mockMvc.perform(post("/internal/v1/events/payment-success")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(event2)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PROCESSED"));

        // Step 2 Verification: 2-Hop flagged as MEDIUM_RISK surveillance alert
        List<FraudAlert> alertsAfterT2 = alertRepository.findAll();
        assertThat(alertsAfterT2).hasSize(1);
        FraudAlert medAlert = alertsAfterT2.get(0);
        assertThat(medAlert.getStatus()).isEqualTo(AlertStatus.MEDIUM_RISK);
        assertThat(medAlert.getDecision()).isEqualTo(DecisionType.PENDING);

        // Step 3: Ingest T3 (Account C -> Account D, ₹10,000, 60 seconds later) -> Hop 3: MULTI_HOP_FRAUD_CHAIN CRITICAL
        PaymentSuccessEvent event3 = new PaymentSuccessEvent(
                "EVT-003",
                "PAYMENT_SUCCESS",
                "TXN-003",
                t3Time,
                new AccountParticipantDto("ACC-C", "3000000001", "BANK_C"),
                new AccountParticipantDto("ACC-D", "4000000001", "BANK_D"),
                new BigDecimal("10000.00"),
                "INR",
                "SIMULATED_UPI",
                "CORR-003",
                "MSG-003"
        );

        mockMvc.perform(post("/internal/v1/events/payment-success")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(event3)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PROCESSED"));

        // Step 3 Verification: 3-Hop escalated to CRITICAL fraud with STOP decision and HOLD_ACTIVE status
        List<FraudAlert> alertsAfterT3 = alertRepository.findAll();
        assertThat(alertsAfterT3).hasSize(2);
        FraudAlert criticalAlert = alertsAfterT3.stream()
                .filter(a -> a.getStatus() == AlertStatus.HOLD_ACTIVE)
                .findFirst()
                .orElseThrow();
        assertThat(criticalAlert.getDecision()).isEqualTo(DecisionType.STOP);
        assertThat(criticalAlert.getPatternType()).isEqualTo("MULTI_HOP_FRAUD_CHAIN");
        assertThat(criticalAlert.getFirstTransactionId()).isEqualTo("TXN-002");
        assertThat(criticalAlert.getSecondTransactionId()).isEqualTo("TXN-003");
        assertThat(criticalAlert.getIntermediateAccountId()).isEqualTo("3000000001");
        assertThat(criticalAlert.getDestinationAccountId()).isEqualTo("4000000001");

        // Step 4: Verify Fraud Query API returns the alerts with Bearer JWT
        mockMvc.perform(get("/api/fraud/alerts")
                        .header("Authorization", "Bearer " + policeToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));

        // Step 5: Officer releases hold via Officer API with Bearer JWT
        mockMvc.perform(post("/api/officer/holds/" + criticalAlert.getAlertId() + "/release")
                        .header("Authorization", "Bearer " + policeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"officerId\":\"OFFICER-77\",\"reason\":\"Investigation complete: cleared.\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RELEASED"));

        // Step 6: Verify alert is now RESOLVED
        FraudAlert resolvedAlert = alertRepository.findByAlertId(criticalAlert.getAlertId()).orElseThrow();
        assertThat(resolvedAlert.getStatus()).isEqualTo(AlertStatus.RESOLVED);
        assertThat(resolvedAlert.getResolvedAt()).isNotNull();
    }
}

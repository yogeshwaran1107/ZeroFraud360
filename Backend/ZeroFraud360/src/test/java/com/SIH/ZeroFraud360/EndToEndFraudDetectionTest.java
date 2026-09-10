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

        Instant t1Time = Instant.now().minus(Duration.ofSeconds(60));
        Instant t2Time = Instant.now();

        // Configure mock Decision API to command STOP
        when(decisionApiClient.requestDecision(any())).thenAnswer(invocation ->
                new DecisionApiResponseDto("REQ-DEC-1", DecisionType.STOP.name(), "Rapid pass-through detected: STOP transaction")
        );

        // Configure mock BankSimulationHoldClient to confirm hold on Account C
        when(bankHoldClient.placeHold(eq("3000000001"), any())).thenAnswer(invocation ->
                new BankHoldResponseDto("HOLD-BANK-9001", "3000000001", new BigDecimal("10000.00"), "ACTIVE", Instant.now().plus(Duration.ofMinutes(10)))
        );
        doNothing().when(bankHoldClient).releaseHold(any(), any());

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

        // Step 2: Ingest T2 (Account B -> Account C, ₹10,000, 60 seconds later)
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

        // Step 3: Verify Fraud Alert was created with HOLD_ACTIVE status
        List<FraudAlert> alerts = alertRepository.findAll();
        assertThat(alerts).hasSize(1);
        FraudAlert alert = alerts.get(0);
        assertThat(alert.getStatus()).isEqualTo(AlertStatus.HOLD_ACTIVE);
        assertThat(alert.getDecision()).isEqualTo(DecisionType.STOP);
        assertThat(alert.getFirstTransactionId()).isEqualTo("TXN-001");
        assertThat(alert.getSecondTransactionId()).isEqualTo("TXN-002");
        assertThat(alert.getSourceAccountId()).isEqualTo("1000000001");
        assertThat(alert.getIntermediateAccountId()).isEqualTo("2000000001");
        assertThat(alert.getDestinationAccountId()).isEqualTo("3000000001");
        assertThat(alert.getFirstAmount()).isEqualByComparingTo("10000.00");
        assertThat(alert.getSecondAmount()).isEqualByComparingTo("10000.00");

        // Step 4: Verify Fraud Query API returns the alert with Bearer JWT
        mockMvc.perform(get("/api/fraud/alerts")
                        .header("Authorization", "Bearer " + policeToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].alertId").value(alert.getAlertId()))
                .andExpect(jsonPath("$[0].status").value("HOLD_ACTIVE"))
                .andExpect(jsonPath("$[0].decision").value("STOP"));

        // Step 5: Officer releases hold via Officer API with Bearer JWT
        mockMvc.perform(post("/api/officer/holds/" + alert.getAlertId() + "/release")
                        .header("Authorization", "Bearer " + policeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"officerId\":\"OFFICER-77\",\"reason\":\"Investigation complete: cleared.\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RELEASED"));

        // Step 6: Verify alert is now RESOLVED
        FraudAlert resolvedAlert = alertRepository.findByAlertId(alert.getAlertId()).orElseThrow();
        assertThat(resolvedAlert.getStatus()).isEqualTo(AlertStatus.RESOLVED);
        assertThat(resolvedAlert.getResolvedAt()).isNotNull();
    }
}

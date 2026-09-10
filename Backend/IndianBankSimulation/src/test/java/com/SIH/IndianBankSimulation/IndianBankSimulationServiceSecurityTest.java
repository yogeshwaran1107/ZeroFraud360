package com.SIH.IndianBankSimulation;

import com.SIH.IndianBankSimulation.account.domain.BankAccount;
import com.SIH.IndianBankSimulation.account.repository.BankAccountRepository;
import com.SIH.IndianBankSimulation.hold.domain.AccountHold;
import com.SIH.IndianBankSimulation.hold.domain.HoldStatus;
import com.SIH.IndianBankSimulation.hold.dto.CreateHoldRequest;
import com.SIH.IndianBankSimulation.hold.dto.ReleaseHoldRequest;
import com.SIH.IndianBankSimulation.hold.repository.AccountHoldRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.BEFORE_EACH_TEST_METHOD)
class IndianBankSimulationServiceSecurityTest {

    private static final String VALID_SERVICE_TOKEN = "sim-secret-token-360";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private AccountHoldRepository holdRepository;

    @Autowired
    private BankAccountRepository accountRepository;

    @BeforeEach
    void setup() {
        holdRepository.deleteAll();

        BankAccount c = accountRepository.findByAccountNumber("3000000001").orElseThrow();
        c.setAvailableBalance(new BigDecimal("15000.0000"));
        accountRepository.save(c);
    }

    @Test
    @DisplayName("Direct frontend hold attack without service token is rejected with 403 and no hold created")
    void testDirectFrontendHoldAttackWithoutTokenIsRejected() throws Exception {
        CreateHoldRequest holdRequest = new CreateHoldRequest(
                "ATTACK-HOLD-1",
                "TXN-ATTACK",
                "ALERT-ATTACK",
                new BigDecimal("5000.00"),
                "INR",
                10,
                "FRAUD_ALERT",
                "ZERO_FRAUD_360"
        );

        mockMvc.perform(post("/internal/v1/accounts/3000000001/holds")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(holdRequest)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));

        assertThat(holdRepository.count()).isEqualTo(0);
    }

    @Test
    @DisplayName("Direct hold attack with forged or invalid service token is rejected with 403")
    void testHoldWithForgedTokenIsRejected() throws Exception {
        CreateHoldRequest holdRequest = new CreateHoldRequest(
                "ATTACK-HOLD-2",
                "TXN-ATTACK-2",
                "ALERT-ATTACK-2",
                new BigDecimal("5000.00"),
                "INR",
                10,
                "FRAUD_ALERT",
                "ZERO_FRAUD_360"
        );

        mockMvc.perform(post("/internal/v1/accounts/3000000001/holds")
                        .header("X-Service-Token", "forged-invalid-secret")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(holdRequest)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));

        assertThat(holdRepository.count()).isEqualTo(0);
    }

    @Test
    @DisplayName("Hold creation with valid ZeroFraud360 service token succeeds and locks balance")
    void testHoldWithValidServiceTokenSucceeds() throws Exception {
        CreateHoldRequest holdRequest = new CreateHoldRequest(
                "HOLD-SEC-001",
                "TXN-SEC-001",
                "ALERT-SEC-001",
                new BigDecimal("5000.00"),
                "INR",
                10,
                "FRAUD_ALERT",
                "ZERO_FRAUD_360"
        );

        mockMvc.perform(post("/internal/v1/accounts/3000000001/holds")
                        .header("X-Service-Token", VALID_SERVICE_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(holdRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.holdId").value("HOLD-SEC-001"))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.amount").value(5000.00));

        assertThat(holdRepository.count()).isEqualTo(1);
    }

    @Test
    @DisplayName("Direct frontend release attack without service token is rejected and hold stays active")
    void testReleaseWithoutServiceTokenIsRejected() throws Exception {
        // Place initial hold
        CreateHoldRequest holdRequest = new CreateHoldRequest(
                "HOLD-SEC-002",
                "TXN-SEC-002",
                "ALERT-SEC-002",
                new BigDecimal("4000.00"),
                "INR",
                10,
                "FRAUD_ALERT",
                "ZERO_FRAUD_360"
        );

        mockMvc.perform(post("/internal/v1/accounts/3000000001/holds")
                        .header("X-Service-Token", VALID_SERVICE_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(holdRequest)))
                .andExpect(status().isCreated());

        // Attack: attempt to release without service token
        ReleaseHoldRequest releaseRequest = new ReleaseHoldRequest("ATTACKER", "Unauthorized release attempt");
        mockMvc.perform(post("/internal/v1/holds/HOLD-SEC-002/release")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(releaseRequest)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));

        // Verify hold remains ACTIVE
        AccountHold hold = holdRepository.findByHoldId("HOLD-SEC-002").orElseThrow();
        assertThat(hold.getStatus()).isEqualTo(HoldStatus.ACTIVE);
    }

    @Test
    @DisplayName("Release hold with valid ZeroFraud360 service token successfully releases hold")
    void testReleaseWithValidServiceTokenSucceeds() throws Exception {
        // Place initial hold
        CreateHoldRequest holdRequest = new CreateHoldRequest(
                "HOLD-SEC-003",
                "TXN-SEC-003",
                "ALERT-SEC-003",
                new BigDecimal("4000.00"),
                "INR",
                10,
                "FRAUD_ALERT",
                "ZERO_FRAUD_360"
        );

        mockMvc.perform(post("/internal/v1/accounts/3000000001/holds")
                        .header("X-Service-Token", VALID_SERVICE_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(holdRequest)))
                .andExpect(status().isCreated());

        // Legitimate release with valid service token
        ReleaseHoldRequest releaseRequest = new ReleaseHoldRequest("police", "Authorized release");
        mockMvc.perform(post("/internal/v1/holds/HOLD-SEC-003/release")
                        .header("X-Service-Token", VALID_SERVICE_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(releaseRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RELEASED"));

        AccountHold hold = holdRepository.findByHoldId("HOLD-SEC-003").orElseThrow();
        assertThat(hold.getStatus()).isEqualTo(HoldStatus.RELEASED);
    }

    @Test
    @DisplayName("Query hold details without service token is rejected")
    void testGetHoldWithoutTokenIsRejected() throws Exception {
        mockMvc.perform(get("/internal/v1/holds/HOLD-ANY"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Query hold details with valid service token succeeds")
    void testGetHoldWithValidTokenSucceeds() throws Exception {
        CreateHoldRequest holdRequest = new CreateHoldRequest(
                "HOLD-SEC-004",
                "TXN-SEC-004",
                "ALERT-SEC-004",
                new BigDecimal("2500.00"),
                "INR",
                10,
                "FRAUD_ALERT",
                "ZERO_FRAUD_360"
        );

        mockMvc.perform(post("/internal/v1/accounts/3000000001/holds")
                        .header("X-Service-Token", VALID_SERVICE_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(holdRequest)))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/internal/v1/holds/HOLD-SEC-004")
                        .header("X-Service-Token", VALID_SERVICE_TOKEN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.holdId").value("HOLD-SEC-004"))
                .andExpect(jsonPath("$.status").value("ACTIVE"));
    }
}

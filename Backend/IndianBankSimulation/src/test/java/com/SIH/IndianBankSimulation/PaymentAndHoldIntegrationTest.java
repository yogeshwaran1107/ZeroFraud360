package com.SIH.IndianBankSimulation;

import com.SIH.IndianBankSimulation.account.domain.BankAccount;
import com.SIH.IndianBankSimulation.account.repository.BankAccountRepository;
import com.SIH.IndianBankSimulation.account.service.AccountService;
import com.SIH.IndianBankSimulation.hold.dto.CreateHoldRequest;
import com.SIH.IndianBankSimulation.hold.dto.CreateHoldResponse;
import com.SIH.IndianBankSimulation.hold.dto.HoldResponseDto;
import com.SIH.IndianBankSimulation.hold.dto.ReleaseHoldRequest;
import com.SIH.IndianBankSimulation.hold.service.InternalHoldService;
import com.SIH.IndianBankSimulation.outbox.domain.OutboxEvent;
import com.SIH.IndianBankSimulation.outbox.domain.OutboxStatus;
import com.SIH.IndianBankSimulation.outbox.repository.OutboxEventRepository;
import com.SIH.IndianBankSimulation.payment.dto.PaymentTransferRequest;
import com.SIH.IndianBankSimulation.payment.dto.PaymentTransferResponse;
import com.SIH.IndianBankSimulation.payment.service.PaymentService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.BEFORE_EACH_TEST_METHOD)
class PaymentAndHoldIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private PaymentService paymentService;

    @Autowired
    private InternalHoldService holdService;

    @Autowired
    private BankAccountRepository accountRepository;

    @Autowired
    private AccountService accountService;

    @Autowired
    private OutboxEventRepository outboxEventRepository;

    @Autowired
    private com.SIH.IndianBankSimulation.hold.repository.AccountHoldRepository holdRepository;

    @Autowired
    private com.SIH.IndianBankSimulation.payment.repository.PaymentTransactionRepository paymentTransactionRepository;

    @org.junit.jupiter.api.BeforeEach
    void resetData() {
        holdRepository.deleteAll();
        paymentTransactionRepository.deleteAll();
        outboxEventRepository.deleteAll();

        BankAccount a = accountRepository.findByAccountNumber("1000000001").orElseThrow();
        a.setAvailableBalance(new BigDecimal("50000.0000"));
        accountRepository.save(a);

        BankAccount b = accountRepository.findByAccountNumber("2000000001").orElseThrow();
        b.setAvailableBalance(new BigDecimal("10000.0000"));
        accountRepository.save(b);

        BankAccount c = accountRepository.findByAccountNumber("3000000001").orElseThrow();
        c.setAvailableBalance(new BigDecimal("5000.0000"));
        accountRepository.save(c);
    }

    @Test
    @DisplayName("Simulate A -> B -> C payments and verify balances and outbox events")
    void testPaymentsAtoBtoC() {
        // Step 1: Account A transfers 10,000 to Account B
        PaymentTransferRequest t1 = new PaymentTransferRequest(
                "1000000001",
                "2000000001",
                new BigDecimal("10000.00"),
                "INR",
                "123456",
                "SIMULATED_UPI",
                "MSG-1",
                Instant.now()
        );
        PaymentTransferResponse res1 = paymentService.executePayment(t1);
        assertThat(res1.status()).isEqualTo("SUCCESS");

        BankAccount a = accountRepository.findByAccountNumber("1000000001").orElseThrow();
        BankAccount b = accountRepository.findByAccountNumber("2000000001").orElseThrow();
        assertThat(a.getAvailableBalance()).isEqualByComparingTo("40000.00");
        assertThat(b.getAvailableBalance()).isEqualByComparingTo("20000.00");

        // Step 2: Account B transfers 10,000 to Account C
        PaymentTransferRequest t2 = new PaymentTransferRequest(
                "2000000001",
                "3000000001",
                new BigDecimal("10000.00"),
                "INR",
                "654321",
                "SIMULATED_UPI",
                "MSG-2",
                Instant.now()
        );
        PaymentTransferResponse res2 = paymentService.executePayment(t2);
        assertThat(res2.status()).isEqualTo("SUCCESS");

        b = accountRepository.findByAccountNumber("2000000001").orElseThrow();
        BankAccount c = accountRepository.findByAccountNumber("3000000001").orElseThrow();
        assertThat(b.getAvailableBalance()).isEqualByComparingTo("10000.00");
        assertThat(c.getAvailableBalance()).isEqualByComparingTo("15000.00");

        // Verify outbox events
        List<OutboxEvent> outboxList = outboxEventRepository.findAllByStatusOrderByCreatedAtAsc(OutboxStatus.PENDING);
        assertThat(outboxList).hasSize(2);
        assertThat(outboxList.get(0).getPayload()).contains(res1.transactionId());
        assertThat(outboxList.get(1).getPayload()).contains(res2.transactionId());
    }

    @Test
    @DisplayName("Internal hold reduces available balance and enforces spend authorization")
    void testHoldReducesAvailableBalanceAndBlocksOverdraft() throws Exception {
        // Place hold of 3000 on Account C (which has 5000)
        CreateHoldRequest holdRequest = new CreateHoldRequest(
                "HOLD-TEST-1",
                "TXN-XYZ",
                "ALERT-1",
                new BigDecimal("3000.00"),
                "INR",
                10,
                "FRAUD_ALERT",
                "ZERO_FRAUD_360"
        );

        mockMvc.perform(post("/internal/v1/accounts/3000000001/holds")
                        .header("X-Service-Token", "sim-secret-token-360")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(holdRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.holdId").value("HOLD-TEST-1"))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.amount").value(3000.00));

        // Available balance should now be 5000 - 3000 = 2000
        BankAccount c = accountRepository.findByAccountNumber("3000000001").orElseThrow();
        BigDecimal available = accountService.computeAvailableBalance(c);
        assertThat(available).isEqualByComparingTo("2000.00");

        // Transfer of 2500 should fail
        PaymentTransferRequest failTransfer = new PaymentTransferRequest(
                "3000000001",
                "1000000001",
                new BigDecimal("2500.00"),
                "INR",
                "123456",
                "SIMULATED_UPI",
                "MSG-FAIL",
                Instant.now()
        );
        mockMvc.perform(post("/api/payments/transfer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(failTransfer)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INSUFFICIENT_AVAILABLE_FUNDS"));

        // Transfer of 1500 should succeed
        PaymentTransferRequest passTransfer = new PaymentTransferRequest(
                "3000000001",
                "1000000001",
                new BigDecimal("1500.00"),
                "INR",
                "123456",
                "SIMULATED_UPI",
                "MSG-PASS",
                Instant.now()
        );
        mockMvc.perform(post("/api/payments/transfer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(passTransfer)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"));

        // Idempotency: re-sending the same hold request returns the existing hold
        mockMvc.perform(post("/internal/v1/accounts/3000000001/holds")
                        .header("X-Service-Token", "sim-secret-token-360")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(holdRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.holdId").value("HOLD-TEST-1"));

        // Release hold
        ReleaseHoldRequest releaseRequest = new ReleaseHoldRequest("OFFICER-001", "Manual clearance");
        mockMvc.perform(post("/internal/v1/holds/HOLD-TEST-1/release")
                        .header("X-Service-Token", "sim-secret-token-360")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(releaseRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RELEASED"));

        // Available balance is now restored: 5000 - 1500 = 3500
        c = accountRepository.findByAccountNumber("3000000001").orElseThrow();
        assertThat(accountService.computeAvailableBalance(c)).isEqualByComparingTo("3500.00");
    }

    @Test
    @DisplayName("Hold unauthorized request without valid service token is rejected")
    void testHoldTokenValidation() throws Exception {
        CreateHoldRequest holdRequest = new CreateHoldRequest(
                "HOLD-TEST-2",
                "TXN-XYZ",
                "ALERT-2",
                new BigDecimal("1000.00"),
                "INR",
                10,
                "FRAUD_ALERT",
                "ZERO_FRAUD_360"
        );

        mockMvc.perform(post("/internal/v1/accounts/3000000001/holds")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(holdRequest)))
                .andExpect(status().isForbidden());
    }
}

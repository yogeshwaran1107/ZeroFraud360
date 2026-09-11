package com.SIH.IndianBankSimulation.hold.controller;

import com.SIH.IndianBankSimulation.account.domain.AccountStatus;
import com.SIH.IndianBankSimulation.account.domain.BankAccount;
import com.SIH.IndianBankSimulation.account.repository.BankAccountRepository;
import com.SIH.IndianBankSimulation.hold.domain.AccountHold;
import com.SIH.IndianBankSimulation.hold.domain.HoldStatus;
import com.SIH.IndianBankSimulation.hold.repository.AccountHoldRepository;
import com.SIH.IndianBankSimulation.outbox.repository.OutboxEventRepository;
import com.SIH.IndianBankSimulation.payment.repository.PaymentTransactionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/developer")
@CrossOrigin(origins = "*")
public class DeveloperController {

    private static final Logger log = LoggerFactory.getLogger(DeveloperController.class);

    private final BankAccountRepository accountRepository;
    private final AccountHoldRepository holdRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final OutboxEventRepository outboxEventRepository;

    private static final Map<String, BigDecimal> DEFAULT_BALANCES = Map.of(
            "10001", new BigDecimal("78500.0000"),
            "10002", new BigDecimal("42300.0000"),
            "10003", new BigDecimal("65200.0000"),
            "10004", new BigDecimal("34800.0000"),
            "10005", new BigDecimal("56700.0000"),
            "10006", new BigDecimal("89400.0000"),
            "1000000001", new BigDecimal("50000.0000"),
            "2000000001", new BigDecimal("10000.0000"),
            "3000000001", new BigDecimal("5000.0000")
    );

    public DeveloperController(BankAccountRepository accountRepository,
                               AccountHoldRepository holdRepository,
                               PaymentTransactionRepository paymentTransactionRepository,
                               OutboxEventRepository outboxEventRepository) {
        this.accountRepository = accountRepository;
        this.holdRepository = holdRepository;
        this.paymentTransactionRepository = paymentTransactionRepository;
        this.outboxEventRepository = outboxEventRepository;
    }

    @PostMapping("/reset")
    @Transactional
    public ResponseEntity<Map<String, Object>> resetBankData() {
        log.warn("DEVELOPER ACTION: Full reset of IndianBankSimulation data and account balances");

        holdRepository.deleteAll();
        paymentTransactionRepository.deleteAll();
        outboxEventRepository.deleteAll();

        List<BankAccount> allAccounts = accountRepository.findAll();
        for (BankAccount acc : allAccounts) {
            acc.setStatus(AccountStatus.ACTIVE);
            BigDecimal defaultBal = DEFAULT_BALANCES.getOrDefault(acc.getAccountNumber(), new BigDecimal("50000.0000"));
            acc.setAvailableBalance(defaultBal);
            acc.setPinFailedAttempts(0);
            accountRepository.save(acc);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", true);
        result.put("message", "Bank Simulation reset to clean state. Accounts restored to ACTIVE with default balances.");
        result.put("accountsResetCount", allAccounts.size());
        result.put("timestamp", Instant.now().toString());

        return ResponseEntity.ok(result);
    }

    @PostMapping("/unfreeze-all")
    @Transactional
    public ResponseEntity<Map<String, Object>> unfreezeAllAccounts() {
        log.info("DEVELOPER ACTION: Unfreezing all accounts");

        List<AccountHold> allHolds = holdRepository.findAll();
        int releasedCount = 0;
        for (AccountHold h : allHolds) {
            if (h.getStatus() == HoldStatus.ACTIVE || h.getStatus() == HoldStatus.BLOCKED) {
                h.setStatus(HoldStatus.RELEASED);
                h.setReleasedAt(Instant.now());
                h.setReleaseReason("Developer clearance");
                holdRepository.save(h);
                releasedCount++;
            }
        }

        List<BankAccount> allAccounts = accountRepository.findAll();
        int unfrozenCount = 0;
        for (BankAccount acc : allAccounts) {
            if (acc.getStatus() != AccountStatus.ACTIVE) {
                acc.setStatus(AccountStatus.ACTIVE);
                accountRepository.save(acc);
                unfrozenCount++;
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", true);
        result.put("message", "All bank accounts restored to ACTIVE and active holds released.");
        result.put("unfrozenAccountsCount", unfrozenCount);
        result.put("releasedHoldsCount", releasedCount);

        return ResponseEntity.ok(result);
    }

    @GetMapping("/accounts")
    public ResponseEntity<List<Map<String, Object>>> getAccountsList() {
        List<BankAccount> accounts = accountRepository.findAll();
        List<Map<String, Object>> list = new ArrayList<>();

        for (BankAccount acc : accounts) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("accountNumber", acc.getAccountNumber());
            map.put("customerName", acc.getCustomer() != null ? acc.getCustomer().getFullName() : "Unknown");
            map.put("availableBalance", acc.getAvailableBalance());
            map.put("currency", acc.getCurrency());
            map.put("status", acc.getStatus().name());
            map.put("bankCode", acc.getBank() != null ? acc.getBank().getBankCode() : "BANK");
            list.add(map);
        }

        return ResponseEntity.ok(list);
    }
}

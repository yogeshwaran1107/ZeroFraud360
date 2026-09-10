package com.SIH.IndianBankSimulation.hold.service;

import com.SIH.IndianBankSimulation.account.domain.BankAccount;
import com.SIH.IndianBankSimulation.account.repository.BankAccountRepository;
import com.SIH.IndianBankSimulation.common.exception.ResourceNotFoundException;
import com.SIH.IndianBankSimulation.hold.domain.AccountHold;
import com.SIH.IndianBankSimulation.hold.domain.HoldStatus;
import com.SIH.IndianBankSimulation.hold.dto.CreateHoldRequest;
import com.SIH.IndianBankSimulation.hold.dto.CreateHoldResponse;
import com.SIH.IndianBankSimulation.hold.dto.HoldResponseDto;
import com.SIH.IndianBankSimulation.hold.dto.ReleaseHoldRequest;
import com.SIH.IndianBankSimulation.hold.repository.AccountHoldRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
public class InternalHoldService {

    private static final Logger log = LoggerFactory.getLogger(InternalHoldService.class);

    private final AccountHoldRepository holdRepository;
    private final BankAccountRepository accountRepository;

    public InternalHoldService(AccountHoldRepository holdRepository, BankAccountRepository accountRepository) {
        this.holdRepository = holdRepository;
        this.accountRepository = accountRepository;
    }

    @Transactional
    public CreateHoldResponse createHold(String accountId, CreateHoldRequest request) {
        String effectiveHoldId = request.requestId() != null && !request.requestId().isBlank()
                ? request.requestId()
                : "HOLD-" + (request.alertId() != null ? request.alertId() : System.currentTimeMillis());

        // Idempotency: return existing hold if requestId/holdId already processed
        Optional<AccountHold> existing = holdRepository.findByHoldId(effectiveHoldId);
        if (existing.isPresent()) {
            AccountHold h = existing.get();
            log.info("Idempotent hold request detected for holdId={}", effectiveHoldId);
            return new CreateHoldResponse(h.getHoldId(), h.getAccountId(), h.getAmount(), h.getStatus().name(), h.getExpiresAt());
        }

        BankAccount account = accountRepository.findByAccountNumber(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", accountId));

        int durationMinutes = request.durationMinutes() != null && request.durationMinutes() > 0
                ? request.durationMinutes()
                : 10;
        Instant expiresAt = Instant.now().plus(Duration.ofMinutes(durationMinutes));

        AccountHold hold = new AccountHold(
                effectiveHoldId,
                account.getAccountNumber(),
                request.transactionId(),
                request.alertId(),
                request.amount(),
                request.currency() != null ? request.currency() : account.getCurrency(),
                request.reasonCode() != null ? request.reasonCode() : "FRAUD_ALERT",
                request.source() != null ? request.source() : "ZERO_FRAUD_360",
                expiresAt
        );

        AccountHold saved = holdRepository.save(hold);
        log.info("Placed fund hold: holdId={}, account={}, amount={}, expiresAt={}",
                saved.getHoldId(), saved.getAccountId(), saved.getAmount(), saved.getExpiresAt());

        return new CreateHoldResponse(
                saved.getHoldId(),
                saved.getAccountId(),
                saved.getAmount(),
                saved.getStatus().name(),
                saved.getExpiresAt()
        );
    }

    @Transactional
    public HoldResponseDto releaseHold(String holdId, ReleaseHoldRequest request) {
        AccountHold hold = holdRepository.findByHoldId(holdId)
                .orElseThrow(() -> new ResourceNotFoundException("Hold", holdId));

        if (hold.getStatus() == HoldStatus.RELEASED) {
            log.info("Hold {} is already RELEASED", holdId);
            return toDto(hold);
        }

        hold.setStatus(HoldStatus.RELEASED);
        hold.setReleasedAt(Instant.now());
        hold.setReleaseReason(request != null ? request.reason() : "Manual release");

        AccountHold saved = holdRepository.save(hold);
        log.info("Released fund hold: holdId={}, account={}, reason={}",
                holdId, saved.getAccountId(), saved.getReleaseReason());

        return toDto(saved);
    }

    @Transactional
    public HoldResponseDto blockHold(String holdId, ReleaseHoldRequest request) {
        AccountHold hold = holdRepository.findByHoldId(holdId)
                .orElseThrow(() -> new ResourceNotFoundException("Hold", holdId));

        hold.setStatus(HoldStatus.BLOCKED);
        hold.setReleaseReason(request != null && request.reason() != null ? request.reason() : "Officially confirmed fraud - funds blocked");
        AccountHold saved = holdRepository.save(hold);
        log.warn("PERMANENTLY BLOCKED fraudulent funds: holdId={}, account={}, amount={}, reason={}",
                holdId, saved.getAccountId(), saved.getAmount(), saved.getReleaseReason());

        return toDto(saved);
    }

    @Transactional(readOnly = true)
    public HoldResponseDto getHold(String holdId) {
        AccountHold hold = holdRepository.findByHoldId(holdId)
                .orElseThrow(() -> new ResourceNotFoundException("Hold", holdId));
        return toDto(hold);
    }

    @Transactional(readOnly = true)
    public List<HoldResponseDto> getHoldsForAccount(String accountId) {
        return holdRepository.findAllByAccountIdAndStatus(accountId, HoldStatus.ACTIVE).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public int releaseExpiredHolds() {
        Instant now = Instant.now();
        List<AccountHold> expiredHolds = holdRepository.findAllByStatusAndExpiresAtLessThanEqual(HoldStatus.ACTIVE, now);
        for (AccountHold hold : expiredHolds) {
            hold.setStatus(HoldStatus.EXPIRED);
            hold.setReleasedAt(now);
            hold.setReleaseReason("Hold expired automatically");
            holdRepository.save(hold);
            log.info("Expired fund hold auto-released: holdId={}, account={}", hold.getHoldId(), hold.getAccountId());
        }
        return expiredHolds.size();
    }

    private HoldResponseDto toDto(AccountHold hold) {
        return new HoldResponseDto(
                hold.getHoldId(),
                hold.getAccountId(),
                hold.getTransactionId(),
                hold.getAlertId(),
                hold.getAmount(),
                hold.getCurrency(),
                hold.getReasonCode(),
                hold.getSource(),
                hold.getStatus().name(),
                hold.getCreatedAt(),
                hold.getExpiresAt(),
                hold.getReleasedAt(),
                hold.getReleaseReason()
        );
    }
}

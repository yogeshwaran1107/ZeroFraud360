package com.SIH.IndianBankSimulation.hold.scheduler;

import com.SIH.IndianBankSimulation.hold.service.InternalHoldService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "bank.holds.scheduler.enabled", havingValue = "true", matchIfMissing = true)
public class HoldExpirationScheduler {

    private static final Logger log = LoggerFactory.getLogger(HoldExpirationScheduler.class);

    private final InternalHoldService holdService;

    public HoldExpirationScheduler(InternalHoldService holdService) {
        this.holdService = holdService;
    }

    @Scheduled(fixedDelayString = "${bank.holds.expiration-check-interval-ms:15000}")
    public void checkExpiredHolds() {
        int releasedCount = holdService.releaseExpiredHolds();
        if (releasedCount > 0) {
            log.info("Hold expiration job released {} expired holds", releasedCount);
        }
    }
}

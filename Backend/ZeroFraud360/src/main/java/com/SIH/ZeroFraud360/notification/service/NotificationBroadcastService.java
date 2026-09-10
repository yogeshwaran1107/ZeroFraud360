package com.SIH.ZeroFraud360.notification.service;

import com.SIH.ZeroFraud360.fraud.domain.FraudAlert;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class NotificationBroadcastService {

    private static final Logger log = LoggerFactory.getLogger(NotificationBroadcastService.class);

    public record NotificationRecord(
            String notificationId,
            String alertId,
            String recipientType, // "POLICE", "CYBER_CRIME", "BANK_SECURITY", "VICTIM"
            String recipientTarget,
            String channel, // "URGENT_DISPATCH_SMS", "SECURE_POLICE_FEED", "BANK_SECURITY_CONSOLE"
            String message,
            Instant dispatchedAt
    ) {}

    private final List<NotificationRecord> broadcastHistory = new CopyOnWriteArrayList<>();

    public void broadcastFraudAlert(FraudAlert alert) {
        String alertId = alert.getAlertId();
        String victimAcc = alert.getSourceAccountId();
        String intermediateAcc = alert.getIntermediateAccountId();
        String destAcc = alert.getDestinationAccountId();
        String amount = alert.getSecondAmount() != null ? alert.getSecondAmount().toPlainString() : "Unknown";

        log.warn("================================================================================");
        log.warn("🚨 [URGENT_BROADCAST_NOTIFICATION] FRAUD DETECTED ON ALERT [{}]", alertId);
        log.warn("🚨 Pattern: {} | Intercepted Flow: {} -> {} -> {} | Amount: ₹{}",
                alert.getPatternType(), victimAcc, intermediateAcc, destAcc, amount);
        log.warn("🚨 Immediately muting further transactions and withdrawals on involved accounts!");
        log.warn("================================================================================");

        // 1. Police Authority Broadcast
        NotificationRecord policeNotif = new NotificationRecord(
                "NOTIF-" + UUID.randomUUID().toString().substring(0, 8),
                alertId,
                "POLICE",
                "STATE_POLICE_FRAUD_CELL",
                "SECURE_POLICE_FEED",
                String.format("URGENT CRIME ALERT: Rapid Pass-Through money flow detected for ₹%s. Victim: %s, Suspect Account: %s. Funds restricted.", amount, victimAcc, destAcc),
                Instant.now()
        );
        broadcastHistory.add(policeNotif);
        log.info("📢 Dispatched to POLICE (State Cyber/Police Cell): {}", policeNotif.message());

        // 2. Cyber Crime Unit Broadcast
        NotificationRecord cyberNotif = new NotificationRecord(
                "NOTIF-" + UUID.randomUUID().toString().substring(0, 8),
                alertId,
                "CYBER_CRIME",
                "NATIONAL_CYBER_CRIME_PORTAL",
                "API_WEBHOOK",
                String.format("CYBER FRAUD INCIDENT: Anomaly triggered under %s. Intercepted destination account %s on hold.", alert.getPatternType(), destAcc),
                Instant.now()
        );
        broadcastHistory.add(cyberNotif);
        log.info("📢 Dispatched to CYBER CRIME UNIT: {}", cyberNotif.message());

        // 3. Bank Security Console
        NotificationRecord bankNotif = new NotificationRecord(
                "NOTIF-" + UUID.randomUUID().toString().substring(0, 8),
                alertId,
                "BANK_SECURITY",
                "INTERBANK_SECURITY_CONSOLE",
                "BANK_SECURITY_CONSOLE",
                String.format("FINANCIAL SECURITY ALERT: Account %s and %s involved in high-risk transfer chain. Outflows muted.", intermediateAcc, destAcc),
                Instant.now()
        );
        broadcastHistory.add(bankNotif);
        log.info("📢 Dispatched to BANK SECURITY: {}", bankNotif.message());

        // 4. Victim Urgent Notification
        NotificationRecord victimNotif = new NotificationRecord(
                "NOTIF-" + UUID.randomUUID().toString().substring(0, 8),
                alertId,
                "VICTIM",
                "VICTIM_ACCOUNT_" + victimAcc,
                "URGENT_SMS_AND_APP_NOTIFICATION",
                String.format("SECURITY ALERT: ZeroFraud360 detected a suspicious pass-through transfer of ₹%s originating from your account %s. Outgoing transactions have been muted for your protection.", amount, victimAcc),
                Instant.now()
        );
        broadcastHistory.add(victimNotif);
        log.info("📢 Dispatched to VICTIM (%s): {}", victimAcc, victimNotif.message());

        // Keep last 100 in memory
        while (broadcastHistory.size() > 100) {
            broadcastHistory.remove(0);
        }
    }

    public List<NotificationRecord> getRecentNotifications() {
        return Collections.unmodifiableList(new ArrayList<>(broadcastHistory));
    }

    public List<NotificationRecord> getNotificationsForAlert(String alertId) {
        return broadcastHistory.stream()
                .filter(n -> n.alertId().equalsIgnoreCase(alertId))
                .toList();
    }
}

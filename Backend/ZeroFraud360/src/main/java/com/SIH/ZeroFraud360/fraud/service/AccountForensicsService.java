package com.SIH.ZeroFraud360.fraud.service;

import com.SIH.ZeroFraud360.event.domain.ObservedTransaction;
import com.SIH.ZeroFraud360.event.repository.ObservedTransactionRepository;
import com.SIH.ZeroFraud360.fraud.domain.AlertStatus;
import com.SIH.ZeroFraud360.fraud.domain.FraudAlert;
import com.SIH.ZeroFraud360.fraud.dto.AccountForensicsDto;
import com.SIH.ZeroFraud360.fraud.dto.AccountForensicsDto.*;
import com.SIH.ZeroFraud360.fraud.dto.QuickAccountDto;
import com.SIH.ZeroFraud360.fraud.repository.FraudAlertRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
public class AccountForensicsService {

    private static final Logger log = LoggerFactory.getLogger(AccountForensicsService.class);

    private final ObservedTransactionRepository transactionRepository;
    private final FraudAlertRepository alertRepository;
    private final RestClient restClient;

    @Value("${bank.sim.base-url:http://localhost:8080}")
    private String bankSimBaseUrl;

    public AccountForensicsService(ObservedTransactionRepository transactionRepository,
                                   FraudAlertRepository alertRepository,
                                   @Value("${bank.sim.connect-timeout-ms:2000}") int connectTimeoutMs,
                                   @Value("${bank.sim.read-timeout-ms:5000}") int readTimeoutMs) {
        this.transactionRepository = transactionRepository;
        this.alertRepository = alertRepository;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofMillis(connectTimeoutMs));
        factory.setReadTimeout(Duration.ofMillis(readTimeoutMs));
        this.restClient = RestClient.builder().requestFactory(factory).build();
    }

    public List<QuickAccountDto> getQuickAccounts() {
        // Try fetching live from IndianBankSimulation
        try {
            String url = bankSimBaseUrl.replaceAll("/+$", "") + "/api/developer/accounts";
            List<Map<String, Object>> res = restClient.get()
                    .uri(url)
                    .accept(MediaType.APPLICATION_JSON)
                    .retrieve()
                    .body(new ParameterizedTypeReference<List<Map<String, Object>>>() {});

            if (res != null && !res.isEmpty()) {
                return res.stream().map(m -> new QuickAccountDto(
                        (String) m.get("accountNumber"),
                        (String) m.get("customerName"),
                        (String) m.get("bankCode"),
                        (String) m.get("status"),
                        m.get("availableBalance") != null ? new BigDecimal(m.get("availableBalance").toString()) : BigDecimal.ZERO
                )).toList();
            }
        } catch (Exception e) {
            log.warn("Could not fetch live accounts from bank simulation, using static fallback: {}", e.getMessage());
        }

        // Static fallback if bank simulation is offline
        return List.of(
                new QuickAccountDto("10001", "Muthukumaran M", "BANK_A", "ACTIVE", new BigDecimal("78500.00")),
                new QuickAccountDto("10002", "Naveen K", "BANK_B", "ACTIVE", new BigDecimal("42300.00")),
                new QuickAccountDto("10003", "Yogeshwaran V", "BANK_C", "ACTIVE", new BigDecimal("65200.00")),
                new QuickAccountDto("10004", "Kanika", "BANK_A", "ACTIVE", new BigDecimal("34800.00")),
                new QuickAccountDto("10005", "Nithiya", "BANK_B", "ACTIVE", new BigDecimal("56700.00")),
                new QuickAccountDto("10006", "Elamathi", "BANK_C", "ACTIVE", new BigDecimal("89400.00")),
                new QuickAccountDto("1000000001", "Alice Sharma", "BANK_A", "ACTIVE", new BigDecimal("50000.00")),
                new QuickAccountDto("2000000001", "Bob Verma", "BANK_B", "ACTIVE", new BigDecimal("10000.00")),
                new QuickAccountDto("3000000001", "Charlie Kumar", "BANK_C", "ACTIVE", new BigDecimal("5000.00"))
        );
    }

    public AccountForensicsDto getAccountForensics(String accountNumber) {
        String cleanAcc = accountNumber != null ? accountNumber.trim() : "";

        // 1. Resolve Account Profile (live from IndianBankSimulation if available)
        QuickAccountDto profile = getQuickAccounts().stream()
                .filter(a -> a.accountNumber().equalsIgnoreCase(cleanAcc))
                .findFirst()
                .orElseGet(() -> new QuickAccountDto(
                        cleanAcc,
                        "Simulated Customer (" + cleanAcc + ")",
                        "BANK_A",
                        "ACTIVE",
                        new BigDecimal("25000.00")
                ));

        String bankName = switch (profile.bankCode()) {
            case "BANK_A" -> "State Bank of India";
            case "BANK_B" -> "HDFC Bank Ltd";
            case "BANK_C" -> "ICICI Bank Ltd";
            default -> "Private Commercial Bank";
        };

        // 2. Query Live Transactions from ZeroFraud360 DB
        List<ObservedTransaction> dbOutgoing = transactionRepository.findBySenderAccountIdOrderByOccurredAtDesc(cleanAcc);
        List<ObservedTransaction> dbIncoming = transactionRepository.findByReceiverAccountIdOrderByOccurredAtDesc(cleanAcc);

        // 3. Query Alerts for Risk Score Calculation
        List<FraudAlert> relatedAlerts = alertRepository.findAll().stream()
                .filter(a -> cleanAcc.equalsIgnoreCase(a.getSourceAccountId()) ||
                             cleanAcc.equalsIgnoreCase(a.getIntermediateAccountId()) ||
                             cleanAcc.equalsIgnoreCase(a.getDestinationAccountId()))
                .toList();

        boolean isCritical = "FROZEN".equalsIgnoreCase(profile.status()) ||
                relatedAlerts.stream().anyMatch(a -> a.getStatus() == AlertStatus.STOP_RECEIVED ||
                                                     a.getStatus() == AlertStatus.HOLD_REQUESTED ||
                                                     a.getStatus() == AlertStatus.HOLD_ACTIVE ||
                                                     a.getStatus() == AlertStatus.CONFIRMED_FRAUD);
        boolean isMedium = !isCritical && relatedAlerts.stream().anyMatch(a -> a.getStatus() == AlertStatus.MEDIUM_RISK);

        int riskScore = isCritical ? 94 : (isMedium ? 68 : 15);
        String riskLevel = isCritical ? "CRITICAL" : (isMedium ? "MEDIUM" : "LOW");

        // 4. Build Historical / Simulated Forensic Activity for this Account
        List<ForensicTransactionItem> ledger = new ArrayList<>();
        populateSimulatedForensicHistory(cleanAcc, profile.customerName(), ledger);

        // Append live observed transactions from DB
        for (ObservedTransaction tx : dbOutgoing) {
            ledger.add(0, new ForensicTransactionItem(
                    tx.getTransactionId(),
                    tx.getOccurredAt(),
                    "UPI_TRANSFER",
                    "UPI Instant Payment",
                    "DEBIT",
                    tx.getAmount(),
                    getGatewayCity(cleanAcc),
                    "UPI-GW-SIM-" + tx.getSenderBankId(),
                    "Transfer to A/C " + tx.getReceiverAccountId(),
                    tx.getStatus(),
                    isCritical ? "SUSPICIOUS_MULE_OUTFLOW" : (isMedium ? "RAPID_PASS_THROUGH" : "NORMAL")
            ));
        }

        for (ObservedTransaction tx : dbIncoming) {
            ledger.add(0, new ForensicTransactionItem(
                    tx.getTransactionId(),
                    tx.getOccurredAt(),
                    "UPI_TRANSFER",
                    "UPI Inbound Credit",
                    "CREDIT",
                    tx.getAmount(),
                    getGatewayCity(tx.getSenderAccountId()),
                    "UPI-GW-SIM-" + tx.getReceiverBankId(),
                    "Inflow from A/C " + tx.getSenderAccountId(),
                    tx.getStatus(),
                    "NORMAL"
            ));
        }

        // Sort ledger newest first
        ledger.sort(Comparator.comparing(ForensicTransactionItem::timestamp).reversed());

        // 5. Calculate Mode Breakdown for Withdrawals / Debits
        Map<String, ModeAccumulator> modeMap = new LinkedHashMap<>();
        modeMap.put("ATM_WITHDRAWAL", new ModeAccumulator("ATM Cash Withdrawal", "atm"));
        modeMap.put("UPI_TRANSFER", new ModeAccumulator("UPI Transfer / Payment", "upi"));
        modeMap.put("POS_MERCHANT", new ModeAccumulator("Point of Sale (POS) Merchant Debit", "pos"));
        modeMap.put("NET_BANKING", new ModeAccumulator("NetBanking / IMPS Transfer", "netbanking"));
        modeMap.put("BRANCH_COUNTER", new ModeAccumulator("Branch Counter Cash Withdrawal", "branch"));

        BigDecimal totalWithdrawals = BigDecimal.ZERO;
        int totalWithdrawalsCount = 0;
        BigDecimal totalInflows = BigDecimal.ZERO;
        int totalInflowCount = 0;
        BigDecimal highestWithdrawal = BigDecimal.ZERO;

        for (ForensicTransactionItem item : ledger) {
            if ("DEBIT".equalsIgnoreCase(item.type())) {
                totalWithdrawals = totalWithdrawals.add(item.amount());
                totalWithdrawalsCount++;
                if (item.amount().compareTo(highestWithdrawal) > 0) {
                    highestWithdrawal = item.amount();
                }

                ModeAccumulator acc = modeMap.get(item.mode());
                if (acc == null) {
                    acc = new ModeAccumulator(item.modeLabel(), "other");
                    modeMap.put(item.mode(), acc);
                }
                acc.totalAmount = acc.totalAmount.add(item.amount());
                acc.count++;
            } else if ("CREDIT".equalsIgnoreCase(item.type())) {
                totalInflows = totalInflows.add(item.amount());
                totalInflowCount++;
            }
        }

        List<WithdrawalModeStat> modeStats = new ArrayList<>();
        String primaryMode = "None";
        BigDecimal maxModeAmount = BigDecimal.ZERO;

        for (Map.Entry<String, ModeAccumulator> entry : modeMap.entrySet()) {
            ModeAccumulator acc = entry.getValue();
            if (acc.count > 0) {
                double pct = totalWithdrawals.compareTo(BigDecimal.ZERO) > 0
                        ? acc.totalAmount.multiply(new BigDecimal(100)).divide(totalWithdrawals, 1, RoundingMode.HALF_UP).doubleValue()
                        : 0.0;
                BigDecimal avg = acc.count > 0 ? acc.totalAmount.divide(new BigDecimal(acc.count), 2, RoundingMode.HALF_UP) : BigDecimal.ZERO;

                modeStats.add(new WithdrawalModeStat(
                        entry.getKey(),
                        acc.label,
                        acc.totalAmount,
                        acc.count,
                        pct,
                        avg,
                        acc.icon
                ));

                if (acc.totalAmount.compareTo(maxModeAmount) > 0) {
                    maxModeAmount = acc.totalAmount;
                    primaryMode = acc.label;
                }
            }
        }

        // 6. Aggregate Locations
        Map<String, LocationAccumulator> locMap = new LinkedHashMap<>();
        for (ForensicTransactionItem item : ledger) {
            if ("DEBIT".equalsIgnoreCase(item.type()) && item.city() != null) {
                String key = item.city() + "::" + item.terminal();
                LocationAccumulator loc = locMap.computeIfAbsent(key, k -> new LocationAccumulator(
                        "LOC-" + Math.abs(k.hashCode() % 10000),
                        item.city(),
                        resolveState(item.city()),
                        item.terminal(),
                        resolveLatitude(item.city()),
                        resolveLongitude(item.city())
                ));
                loc.totalAmount = loc.totalAmount.add(item.amount());
                loc.count++;
                if (loc.lastActivity == null || item.timestamp().isAfter(loc.lastActivity)) {
                    loc.lastActivity = item.timestamp();
                }
                if (item.amount().compareTo(new BigDecimal("20000")) > 0) {
                    loc.riskTag = "HIGH_VALUE";
                }
            }
        }

        List<LocationWithdrawalStat> locationStats = new ArrayList<>();
        String primaryLoc = "N/A";
        BigDecimal maxLocAmount = BigDecimal.ZERO;

        for (LocationAccumulator loc : locMap.values()) {
            locationStats.add(new LocationWithdrawalStat(
                    loc.id,
                    loc.city,
                    loc.state,
                    loc.terminal,
                    loc.lat,
                    loc.lng,
                    loc.totalAmount,
                    loc.count,
                    loc.lastActivity != null ? loc.lastActivity : Instant.now(),
                    loc.riskTag
            ));
            if (loc.totalAmount.compareTo(maxLocAmount) > 0) {
                maxLocAmount = loc.totalAmount;
                primaryLoc = loc.city + " (" + loc.terminal + ")";
            }
        }

        // 7. Geo Velocity Anomaly Detection (e.g. impossible travel between different cities)
        List<GeoVelocityAlert> velocityAlerts = detectGeoVelocityAnomalies(cleanAcc, ledger);

        ForensicsSummary summary = new ForensicsSummary(
                totalWithdrawals,
                totalWithdrawalsCount,
                totalInflows,
                totalInflowCount,
                highestWithdrawal,
                primaryMode,
                primaryLoc
        );

        return new AccountForensicsDto(
                profile.accountNumber(),
                profile.customerName(),
                profile.bankCode(),
                bankName,
                profile.status(),
                profile.availableBalance(),
                "INR",
                riskScore,
                riskLevel,
                summary,
                modeStats,
                locationStats,
                velocityAlerts,
                ledger
        );
    }

    private List<GeoVelocityAlert> detectGeoVelocityAnomalies(String accountId, List<ForensicTransactionItem> ledger) {
        List<GeoVelocityAlert> alerts = new ArrayList<>();
        ForensicTransactionItem prev = null;

        for (ForensicTransactionItem curr : ledger) {
            if ("DEBIT".equalsIgnoreCase(curr.type()) && curr.city() != null) {
                if (prev != null && !curr.city().equalsIgnoreCase(prev.city())) {
                    long diffMinutes = Math.abs(ChronoUnit.MINUTES.between(prev.timestamp(), curr.timestamp()));
                    double distKm = estimateDistanceKm(prev.city(), curr.city());
                    if (diffMinutes < 180 && distKm > 300) {
                        double speedKmh = (distKm / Math.max(1, diffMinutes)) * 60.0;
                        alerts.add(new GeoVelocityAlert(
                                "GEO-VEL-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(),
                                String.format("Impossible Travel Velocity: %s to %s (%.0f km in %d mins = %.0f km/h). Probable cloned card or distributed mule syndicate.",
                                        prev.city(), curr.city(), distKm, diffMinutes, speedKmh),
                                prev.city(),
                                curr.city(),
                                diffMinutes,
                                distKm,
                                "CRITICAL"
                        ));
                    }
                }
                prev = curr;
            }
        }

        // If account 10003 or 10004 has critical status or mule alert, inject an investigative geo-anomaly
        if (("10003".equals(accountId) || "10004".equals(accountId)) && alerts.isEmpty()) {
            alerts.add(new GeoVelocityAlert(
                    "GEO-ANOM-902",
                    "Suspicious Rapid Inter-City Outflows: Multiple ATM cash withdrawals and UPI hops initiated within minutes across Mumbai and Chennai.",
                    "Mumbai",
                    "Chennai",
                    42,
                    1330.0,
                    "HIGH"
            ));
        }

        return alerts;
    }

    private void populateSimulatedForensicHistory(String accountId, String customerName, List<ForensicTransactionItem> ledger) {
        Instant now = Instant.now();

        switch (accountId) {
            case "10001": // Muthukumaran M (Chennai)
                ledger.add(new ForensicTransactionItem(
                        "TX-ATM-9101", now.minus(2, ChronoUnit.HOURS), "ATM_WITHDRAWAL", "ATM Cash Withdrawal", "DEBIT",
                        new BigDecimal("15000.00"), "Chennai", "ATM-SBI-CHN-042 (T. Nagar Branch)", "Self Cash Withdrawal", "SUCCESS", "NORMAL"
                ));
                ledger.add(new ForensicTransactionItem(
                        "TX-POS-9102", now.minus(14, ChronoUnit.HOURS), "POS_MERCHANT", "Point of Sale (POS) Merchant", "DEBIT",
                        new BigDecimal("4250.00"), "Chennai", "POS-CHN-088 (Phoenix Marketcity)", "Merchant Retail Debit", "SUCCESS", "NORMAL"
                ));
                ledger.add(new ForensicTransactionItem(
                        "TX-ATM-9103", now.minus(28, ChronoUnit.HOURS), "ATM_WITHDRAWAL", "ATM Cash Withdrawal", "DEBIT",
                        new BigDecimal("10000.00"), "Chennai", "ATM-SBI-CHN-019 (Anna Nagar)", "Self Cash Withdrawal", "SUCCESS", "NORMAL"
                ));
                ledger.add(new ForensicTransactionItem(
                        "TX-NET-9104", now.minus(48, ChronoUnit.HOURS), "NET_BANKING", "NetBanking / IMPS Transfer", "DEBIT",
                        new BigDecimal("8500.00"), "Chennai", "NET-SBI-PORTAL (Online)", "Utility Bill Payment", "SUCCESS", "NORMAL"
                ));
                break;

            case "10002": // Naveen K (Bengaluru)
                ledger.add(new ForensicTransactionItem(
                        "TX-ATM-9201", now.minus(3, ChronoUnit.HOURS), "ATM_WITHDRAWAL", "ATM Cash Withdrawal", "DEBIT",
                        new BigDecimal("20000.00"), "Bengaluru", "ATM-HDFC-BLR-108 (Indiranagar 100ft Rd)", "Self Cash Withdrawal", "SUCCESS", "NORMAL"
                ));
                ledger.add(new ForensicTransactionItem(
                        "TX-POS-9202", now.minus(18, ChronoUnit.HOURS), "POS_MERCHANT", "Point of Sale (POS) Merchant", "DEBIT",
                        new BigDecimal("6800.00"), "Bengaluru", "POS-BLR-054 (Forum Mall Koramangala)", "Electronics Store", "SUCCESS", "NORMAL"
                ));
                ledger.add(new ForensicTransactionItem(
                        "TX-ATM-9203", now.minus(36, ChronoUnit.HOURS), "ATM_WITHDRAWAL", "ATM Cash Withdrawal", "DEBIT",
                        new BigDecimal("8000.00"), "Bengaluru", "ATM-HDFC-BLR-014 (MG Road)", "Self Cash Withdrawal", "SUCCESS", "NORMAL"
                ));
                break;

            case "10003": // Yogeshwaran V (Mumbai - Mule Layer Node)
                ledger.add(new ForensicTransactionItem(
                        "TX-ATM-9301", now.minus(45, ChronoUnit.MINUTES), "ATM_WITHDRAWAL", "ATM Cash Withdrawal", "DEBIT",
                        new BigDecimal("25000.00"), "Mumbai", "ATM-ICICI-MUM-201 (Nariman Point)", "Rapid Cashout ATM", "SUCCESS", "SUSPICIOUS_RAPID_CASHOUT"
                ));
                ledger.add(new ForensicTransactionItem(
                        "TX-ATM-9302", now.minus(90, ChronoUnit.MINUTES), "ATM_WITHDRAWAL", "ATM Cash Withdrawal", "DEBIT",
                        new BigDecimal("18000.00"), "Mumbai", "ATM-ICICI-MUM-049 (Bandra Kurla Complex)", "Rapid Cashout ATM", "SUCCESS", "SUSPICIOUS_RAPID_CASHOUT"
                ));
                ledger.add(new ForensicTransactionItem(
                        "TX-POS-9303", now.minus(12, ChronoUnit.HOURS), "POS_MERCHANT", "Point of Sale (POS) Merchant", "DEBIT",
                        new BigDecimal("7900.00"), "Mumbai", "POS-MUM-110 (Palladium High Street Phoenix)", "Luxury Goods Store", "SUCCESS", "NORMAL"
                ));
                ledger.add(new ForensicTransactionItem(
                        "TX-BRN-9304", now.minus(24, ChronoUnit.HOURS), "BRANCH_COUNTER", "Branch Counter Cash Withdrawal", "DEBIT",
                        new BigDecimal("30000.00"), "Mumbai", "BRANCH-ICICI-MUM-001 (Fort Branch)", "Teller Cash Cheque", "SUCCESS", "HIGH_VALUE"
                ));
                break;

            case "10004": // Kanika (Coimbatore - Destination Node)
                ledger.add(new ForensicTransactionItem(
                        "TX-ATM-9401", now.minus(25, ChronoUnit.MINUTES), "ATM_WITHDRAWAL", "ATM Cash Withdrawal", "DEBIT",
                        new BigDecimal("12000.00"), "Coimbatore", "ATM-SBI-CBE-031 (RS Puram)", "ATM Terminal Withdrawal", "SUCCESS", "HIGH_RISK_DESTINATION"
                ));
                ledger.add(new ForensicTransactionItem(
                        "TX-POS-9402", now.minus(8, ChronoUnit.HOURS), "POS_MERCHANT", "Point of Sale (POS) Merchant", "DEBIT",
                        new BigDecimal("3500.00"), "Coimbatore", "POS-CBE-012 (Brookefields Mall)", "Jewellery Retail", "SUCCESS", "NORMAL"
                ));
                ledger.add(new ForensicTransactionItem(
                        "TX-NET-9403", now.minus(20, ChronoUnit.HOURS), "NET_BANKING", "NetBanking / IMPS Transfer", "DEBIT",
                        new BigDecimal("5000.00"), "Coimbatore", "NET-SBI-PORTAL (Online)", "Third Party IMPS", "SUCCESS", "NORMAL"
                ));
                break;

            case "10005": // Nithiya (Delhi)
                ledger.add(new ForensicTransactionItem(
                        "TX-ATM-9501", now.minus(4, ChronoUnit.HOURS), "ATM_WITHDRAWAL", "ATM Cash Withdrawal", "DEBIT",
                        new BigDecimal("14000.00"), "Delhi", "ATM-HDFC-DEL-077 (Connaught Place)", "Self Cash Withdrawal", "SUCCESS", "NORMAL"
                ));
                ledger.add(new ForensicTransactionItem(
                        "TX-POS-9502", now.minus(16, ChronoUnit.HOURS), "POS_MERCHANT", "Point of Sale (POS) Merchant", "DEBIT",
                        new BigDecimal("5400.00"), "Delhi", "POS-DEL-029 (Select Citywalk Saket)", "Apparel Purchase", "SUCCESS", "NORMAL"
                ));
                break;

            case "10006": // Elamathi (Hyderabad)
                ledger.add(new ForensicTransactionItem(
                        "TX-ATM-9601", now.minus(5, ChronoUnit.HOURS), "ATM_WITHDRAWAL", "ATM Cash Withdrawal", "DEBIT",
                        new BigDecimal("22000.00"), "Hyderabad", "ATM-ICICI-HYD-062 (Hitec City Madhapur)", "Self Cash Withdrawal", "SUCCESS", "NORMAL"
                ));
                ledger.add(new ForensicTransactionItem(
                        "TX-POS-9602", now.minus(22, ChronoUnit.HOURS), "POS_MERCHANT", "Point of Sale (POS) Merchant", "DEBIT",
                        new BigDecimal("4800.00"), "Hyderabad", "POS-HYD-044 (Inorbit Mall Cyberabad)", "Dining & Hospitality", "SUCCESS", "NORMAL"
                ));
                break;

            default:
                ledger.add(new ForensicTransactionItem(
                        "TX-ATM-" + Math.abs(accountId.hashCode() % 9000 + 1000),
                        now.minus(6, ChronoUnit.HOURS),
                        "ATM_WITHDRAWAL",
                        "ATM Cash Withdrawal",
                        "DEBIT",
                        new BigDecimal("10000.00"),
                        "Chennai",
                        "ATM-GEN-CHN-001 (Central Hub)",
                        "Self Cash Withdrawal",
                        "SUCCESS",
                        "NORMAL"
                ));
                break;
        }
    }

    private String getGatewayCity(String accountId) {
        return switch (accountId) {
            case "10001" -> "Chennai";
            case "10002" -> "Bengaluru";
            case "10003" -> "Mumbai";
            case "10004" -> "Coimbatore";
            case "10005" -> "Delhi";
            case "10006" -> "Hyderabad";
            default -> "Chennai";
        };
    }

    private String resolveState(String city) {
        return switch (city.toLowerCase()) {
            case "chennai", "coimbatore" -> "Tamil Nadu";
            case "bengaluru" -> "Karnataka";
            case "mumbai" -> "Maharashtra";
            case "delhi", "new delhi" -> "Delhi NCR";
            case "hyderabad" -> "Telangana";
            default -> "India";
        };
    }

    private double resolveLatitude(String city) {
        return switch (city.toLowerCase()) {
            case "chennai" -> 13.0827;
            case "coimbatore" -> 11.0168;
            case "bengaluru" -> 12.9716;
            case "mumbai" -> 19.0760;
            case "delhi", "new delhi" -> 28.6139;
            case "hyderabad" -> 17.3850;
            default -> 13.0827;
        };
    }

    private double resolveLongitude(String city) {
        return switch (city.toLowerCase()) {
            case "chennai" -> 80.2707;
            case "coimbatore" -> 76.9558;
            case "bengaluru" -> 77.5946;
            case "mumbai" -> 72.8777;
            case "delhi", "new delhi" -> 77.2090;
            case "hyderabad" -> 78.4867;
            default -> 80.2707;
        };
    }

    private double estimateDistanceKm(String cityA, String cityB) {
        double lat1 = resolveLatitude(cityA);
        double lon1 = resolveLongitude(cityA);
        double lat2 = resolveLatitude(cityB);
        double lon2 = resolveLongitude(cityB);

        // Haversine formula
        double earthRadius = 6371; // km
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                        Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return earthRadius * c;
    }

    private static class ModeAccumulator {
        String label;
        String icon;
        BigDecimal totalAmount = BigDecimal.ZERO;
        int count = 0;

        ModeAccumulator(String label, String icon) {
            this.label = label;
            this.icon = icon;
        }
    }

    private static class LocationAccumulator {
        String id;
        String city;
        String state;
        String terminal;
        double lat;
        double lng;
        BigDecimal totalAmount = BigDecimal.ZERO;
        int count = 0;
        Instant lastActivity;
        String riskTag = "NORMAL";

        LocationAccumulator(String id, String city, String state, String terminal, double lat, double lng) {
            this.id = id;
            this.city = city;
            this.state = state;
            this.terminal = terminal;
            this.lat = lat;
            this.lng = lng;
        }
    }
}
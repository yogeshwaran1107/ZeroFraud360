package com.SIH.ZeroFraud360.fraud.controller;

import com.SIH.ZeroFraud360.auth.security.UserPrincipal;
import com.SIH.ZeroFraud360.common.correlation.CorrelationContext;
import com.SIH.ZeroFraud360.fraud.hold.dto.BankReleaseHoldRequestDto;
import com.SIH.ZeroFraud360.fraud.hold.service.HoldCoordinator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/officer")
public class OfficerController {

    private static final Logger log = LoggerFactory.getLogger(OfficerController.class);

    private final HoldCoordinator holdCoordinator;

    public OfficerController(HoldCoordinator holdCoordinator) {
        this.holdCoordinator = holdCoordinator;
    }

    @PostMapping("/holds/{holdId}/release")
    @PreAuthorize("hasAnyRole('POLICE', 'CYBER', 'BANK')")
    public ResponseEntity<Map<String, String>> releaseHold(
            @PathVariable("holdId") String holdId,
            @RequestBody(required = false) BankReleaseHoldRequestDto request,
            @AuthenticationPrincipal UserPrincipal principal) {

        String officerId = principal != null ? principal.getUsername() :
                (request != null && request.officerId() != null ? request.officerId() : "OFFICER-DEFAULT");
        String role = principal != null ? principal.getRole() : "UNKNOWN";
        String reason = request != null && request.reason() != null ? request.reason() : "Manual officer clearance";

        log.info("OFFICER_RELEASE_REQUESTED [AUDIT]: officer='{}', role='{}', holdId='{}', correlationId='{}'",
                officerId, role, holdId, CorrelationContext.getCorrelationId());

        try {
            holdCoordinator.releaseHold(holdId, officerId, reason);

            log.info("OFFICER_RELEASE_COMPLETED [AUDIT]: officer='{}', role='{}', holdId='{}', status='RELEASED'",
                    officerId, role, holdId);

            return ResponseEntity.ok(Map.of(
                    "holdId", holdId,
                    "status", "RELEASED",
                    "officerId", officerId,
                    "reason", reason
            ));
        } catch (Exception ex) {
            log.error("OFFICER_RELEASE_FAILED [AUDIT]: officer='{}', role='{}', holdId='{}', error='{}'",
                    officerId, role, holdId, ex.getMessage());
            throw ex;
        }
    }

    @PostMapping("/holds/{holdId}/confirm-fraud")
    @PreAuthorize("hasAnyRole('POLICE', 'CYBER', 'BANK')")
    public ResponseEntity<Map<String, String>> confirmFraud(
            @PathVariable("holdId") String holdId,
            @RequestBody(required = false) BankReleaseHoldRequestDto request,
            @AuthenticationPrincipal UserPrincipal principal) {

        String officerId = principal != null ? principal.getUsername() :
                (request != null && request.officerId() != null ? request.officerId() : "OFFICER-DEFAULT");
        String role = principal != null ? principal.getRole() : "UNKNOWN";
        String reason = request != null && request.reason() != null ? request.reason() : "Officially confirmed as fraudulent money flow";

        log.warn("OFFICER_CONFIRM_FRAUD_REQUESTED [AUDIT]: officer='{}', role='{}', holdId='{}', correlationId='{}'",
                officerId, role, holdId, CorrelationContext.getCorrelationId());

        try {
            holdCoordinator.confirmFraud(holdId, officerId, reason);

            log.warn("OFFICER_CONFIRM_FRAUD_COMPLETED [AUDIT]: officer='{}', role='{}', holdId='{}', status='BLOCKED'",
                    officerId, role, holdId);

            return ResponseEntity.ok(Map.of(
                    "holdId", holdId,
                    "status", "CONFIRMED_FRAUD",
                    "officerId", officerId,
                    "reason", reason
            ));
        } catch (Exception ex) {
            log.error("OFFICER_CONFIRM_FRAUD_FAILED [AUDIT]: officer='{}', role='{}', holdId='{}', error='{}'",
                    officerId, role, holdId, ex.getMessage());
            throw ex;
        }
    }
}

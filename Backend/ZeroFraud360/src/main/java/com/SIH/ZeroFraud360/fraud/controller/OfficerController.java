package com.SIH.ZeroFraud360.fraud.controller;

import com.SIH.ZeroFraud360.fraud.hold.dto.BankReleaseHoldRequestDto;
import com.SIH.ZeroFraud360.fraud.hold.service.HoldCoordinator;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/officer")
public class OfficerController {

    private final HoldCoordinator holdCoordinator;

    public OfficerController(HoldCoordinator holdCoordinator) {
        this.holdCoordinator = holdCoordinator;
    }

    @PostMapping("/holds/{holdId}/release")
    public ResponseEntity<Map<String, String>> releaseHold(
            @PathVariable("holdId") String holdId,
            @RequestBody(required = false) BankReleaseHoldRequestDto request) {

        String officerId = request != null && request.officerId() != null ? request.officerId() : "OFFICER-DEFAULT";
        String reason = request != null && request.reason() != null ? request.reason() : "Manual officer clearance";

        holdCoordinator.releaseHold(holdId, officerId, reason);

        return ResponseEntity.ok(Map.of(
                "holdId", holdId,
                "status", "RELEASED",
                "officerId", officerId,
                "reason", reason
        ));
    }
}

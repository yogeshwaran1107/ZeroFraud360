package com.SIH.IndianBankSimulation.hold.controller;

import com.SIH.IndianBankSimulation.common.exception.UnauthorizedAccountAccessException;
import com.SIH.IndianBankSimulation.hold.dto.CreateHoldRequest;
import com.SIH.IndianBankSimulation.hold.dto.CreateHoldResponse;
import com.SIH.IndianBankSimulation.hold.dto.HoldResponseDto;
import com.SIH.IndianBankSimulation.hold.dto.ReleaseHoldRequest;
import com.SIH.IndianBankSimulation.hold.service.InternalHoldService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/internal/v1")
public class InternalHoldController {

    private final InternalHoldService holdService;

    @Value("${bank.security.internal-service-token:sim-secret-token-360}")
    private String internalServiceToken;

    public InternalHoldController(InternalHoldService holdService) {
        this.holdService = holdService;
    }

    private void validateServiceToken(String token) {
        if (token == null || !token.equals(internalServiceToken)) {
            throw new UnauthorizedAccountAccessException("Invalid or missing X-Service-Token");
        }
    }

    @PostMapping("/accounts/{accountId}/holds")
    public ResponseEntity<CreateHoldResponse> placeHold(
            @PathVariable("accountId") String accountId,
            @RequestHeader(value = "X-Service-Token", required = false) String serviceToken,
            @Valid @RequestBody CreateHoldRequest request) {

        validateServiceToken(serviceToken);
        CreateHoldResponse response = holdService.createHold(accountId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/holds/{holdId}/release")
    public ResponseEntity<HoldResponseDto> releaseHold(
            @PathVariable("holdId") String holdId,
            @RequestHeader(value = "X-Service-Token", required = false) String serviceToken,
            @RequestBody(required = false) ReleaseHoldRequest request) {

        validateServiceToken(serviceToken);
        HoldResponseDto response = holdService.releaseHold(holdId, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/holds/{holdId}/block")
    public ResponseEntity<HoldResponseDto> blockHold(
            @PathVariable("holdId") String holdId,
            @RequestHeader(value = "X-Service-Token", required = false) String serviceToken,
            @RequestBody(required = false) ReleaseHoldRequest request) {

        validateServiceToken(serviceToken);
        HoldResponseDto response = holdService.blockHold(holdId, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/holds/{holdId}")
    public ResponseEntity<HoldResponseDto> getHold(
            @PathVariable("holdId") String holdId,
            @RequestHeader(value = "X-Service-Token", required = false) String serviceToken) {

        validateServiceToken(serviceToken);
        HoldResponseDto response = holdService.getHold(holdId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/accounts/{accountId}/freeze")
    public ResponseEntity<Void> freezeAccount(
            @PathVariable("accountId") String accountId,
            @RequestHeader(value = "X-Service-Token", required = false) String serviceToken,
            @RequestBody(required = false) ReleaseHoldRequest request) {

        validateServiceToken(serviceToken);
        String reason = request != null && request.reason() != null ? request.reason() : "Mule network freeze command";
        holdService.freezeAccount(accountId, reason);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/accounts/{accountId}/unfreeze")
    public ResponseEntity<Void> unfreezeAccount(
            @PathVariable("accountId") String accountId,
            @RequestHeader(value = "X-Service-Token", required = false) String serviceToken,
            @RequestBody(required = false) ReleaseHoldRequest request) {

        validateServiceToken(serviceToken);
        String reason = request != null && request.reason() != null ? request.reason() : "Compliance officer clearance";
        holdService.unfreezeAccount(accountId, reason);
        return ResponseEntity.ok().build();
    }
}

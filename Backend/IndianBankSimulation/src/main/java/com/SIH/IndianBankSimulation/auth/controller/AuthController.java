package com.SIH.IndianBankSimulation.auth.controller;

import com.SIH.IndianBankSimulation.auth.dto.AuthResponse;
import com.SIH.IndianBankSimulation.auth.dto.LoginRequest;
import com.SIH.IndianBankSimulation.auth.dto.RegisterRequest;
import com.SIH.IndianBankSimulation.auth.dto.UserProfileDto;
import com.SIH.IndianBankSimulation.auth.service.AuthService;
import com.SIH.IndianBankSimulation.common.security.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/me")
    public ResponseEntity<UserProfileDto> getCurrentUser(@AuthenticationPrincipal UserPrincipal principal) {
        UserProfileDto profile = authService.getProfile(principal.getId());
        return ResponseEntity.ok(profile);
    }
}

package com.SIH.ZeroFraud360.auth.controller;

import com.SIH.ZeroFraud360.auth.dto.AuthResponse;
import com.SIH.ZeroFraud360.auth.dto.LoginRequest;
import com.SIH.ZeroFraud360.auth.dto.UserProfileDto;
import com.SIH.ZeroFraud360.auth.security.UserPrincipal;
import com.SIH.ZeroFraud360.auth.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

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

    @GetMapping("/me")
    public ResponseEntity<UserProfileDto> me(@AuthenticationPrincipal UserPrincipal principal) {
        UserProfileDto profile = authService.getCurrentUserProfile(principal.getUsername());
        return ResponseEntity.ok(profile);
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout() {
        return ResponseEntity.ok(Map.of(
                "message", "Logout successful. Discard token client-side."
        ));
    }
}

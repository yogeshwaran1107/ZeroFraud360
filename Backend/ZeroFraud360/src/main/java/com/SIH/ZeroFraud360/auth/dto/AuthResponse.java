package com.SIH.ZeroFraud360.auth.dto;

public record AuthResponse(
        String accessToken,
        String tokenType,
        long expiresIn,
        String username,
        String role
) {
}

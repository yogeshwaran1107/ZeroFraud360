package com.SIH.ZeroFraud360.auth.dto;

public record UserProfileDto(
        String username,
        String role,
        boolean enabled
) {
}

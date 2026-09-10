package com.SIH.IndianBankSimulation.auth.dto;

import java.util.List;

public class AuthResponse {

    private String accessToken;
    private String tokenType = "Bearer";
    private long expiresInMs;
    private Long userId;
    private String username;
    private List<String> roles;

    public AuthResponse() {
    }

    public AuthResponse(String accessToken, String tokenType, long expiresInMs, Long userId, String username, List<String> roles) {
        this.accessToken = accessToken;
        this.tokenType = tokenType;
        this.expiresInMs = expiresInMs;
        this.userId = userId;
        this.username = username;
        this.roles = roles;
    }

    public String getAccessToken() {
        return accessToken;
    }

    public void setAccessToken(String accessToken) {
        this.accessToken = accessToken;
    }

    public String getTokenType() {
        return tokenType;
    }

    public void setTokenType(String tokenType) {
        this.tokenType = tokenType;
    }

    public long getExpiresInMs() {
        return expiresInMs;
    }

    public void setExpiresInMs(long expiresInMs) {
        this.expiresInMs = expiresInMs;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public List<String> getRoles() {
        return roles;
    }

    public void setRoles(List<String> roles) {
        this.roles = roles;
    }
}

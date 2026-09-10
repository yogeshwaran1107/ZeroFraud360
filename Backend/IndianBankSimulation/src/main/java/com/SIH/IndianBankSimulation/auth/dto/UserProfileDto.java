package com.SIH.IndianBankSimulation.auth.dto;

import java.util.List;

public class UserProfileDto {

    private Long userId;
    private String username;
    private String email;
    private String fullName;
    private String mobileNumber;
    private List<String> roles;

    public UserProfileDto() {
    }

    public UserProfileDto(Long userId, String username, String email, String fullName, String mobileNumber, List<String> roles) {
        this.userId = userId;
        this.username = username;
        this.email = email;
        this.fullName = fullName;
        this.mobileNumber = mobileNumber;
        this.roles = roles;
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

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getMobileNumber() {
        return mobileNumber;
    }

    public void setMobileNumber(String mobileNumber) {
        this.mobileNumber = mobileNumber;
    }

    public List<String> getRoles() {
        return roles;
    }

    public void setRoles(List<String> roles) {
        this.roles = roles;
    }
}

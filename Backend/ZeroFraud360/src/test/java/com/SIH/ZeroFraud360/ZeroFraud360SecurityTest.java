package com.SIH.ZeroFraud360;

import com.SIH.ZeroFraud360.auth.dto.LoginRequest;
import com.SIH.ZeroFraud360.auth.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.BEFORE_EACH_TEST_METHOD)
class ZeroFraud360SecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @org.junit.jupiter.api.BeforeEach
    void resetUserLocks() {
        userRepository.findAll().forEach(user -> {
            user.setFailedLoginAttempts(0);
            user.setLockedUntil(null);
            userRepository.save(user);
        });
    }

    private String loginAndGetToken(String username, String password) throws Exception {
        LoginRequest req = new LoginRequest(username, password);
        MvcResult res = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.username").value(username))
                .andReturn();

        JsonNode root = objectMapper.readTree(res.getResponse().getContentAsString());
        return root.get("accessToken").asText();
    }

    @Test
    @DisplayName("Predefined user 'police' can log in successfully and receives valid JWT")
    void testPoliceLoginSuccess() throws Exception {
        String token = loginAndGetToken("police", "Police@12345");
        assertThat(token).isNotBlank();

        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("police"))
                .andExpect(jsonPath("$.role").value("ROLE_POLICE"));
    }

    @Test
    @DisplayName("Predefined user 'cyber' can log in successfully and access fraud queries")
    void testCyberLoginSuccess() throws Exception {
        String token = loginAndGetToken("cyber", "Cyber@12345");
        assertThat(token).isNotBlank();

        mockMvc.perform(get("/api/fraud/alerts")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Predefined user 'bank' can log in successfully and access fraud queries")
    void testBankLoginSuccess() throws Exception {
        String token = loginAndGetToken("bank", "Bank@12345");
        assertThat(token).isNotBlank();

        mockMvc.perform(get("/api/fraud/alerts")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Invalid password results in 401 and generic error message")
    void testWrongPasswordRejected() throws Exception {
        LoginRequest req = new LoginRequest("police", "WrongPassword123!");
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }

    @Test
    @DisplayName("Unknown username results in 401 without revealing user existence")
    void testUnknownUserRejected() throws Exception {
        LoginRequest req = new LoginRequest("hacker", "HackerPass123!");
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }

    @Test
    @DisplayName("Protected fraud endpoints reject requests without Authorization header")
    void testFraudEndpointRejectsMissingToken() throws Exception {
        mockMvc.perform(get("/api/fraud/alerts"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    @DisplayName("Protected fraud endpoints reject requests with invalid Bearer token")
    void testFraudEndpointRejectsInvalidToken() throws Exception {
        mockMvc.perform(get("/api/fraud/alerts")
                        .header("Authorization", "Bearer invalid.jwt.token"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    @DisplayName("Account is locked for 300s after 5 consecutive failed logins")
    void testAccountLockoutAfter5FailedAttempts() throws Exception {
        LoginRequest badReq = new LoginRequest("police", "WrongPass!");

        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(badReq)))
                    .andExpect(status().isUnauthorized());
        }

        // 6th attempt should fail because account is locked
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest("police", "Police@12345"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("locked")));
    }

    @Test
    @DisplayName("Stateless logout endpoint responds successfully with guidance")
    void testLogout() throws Exception {
        String token = loginAndGetToken("police", "Police@12345");

        mockMvc.perform(post("/api/auth/logout")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Logout successful")));
    }
}

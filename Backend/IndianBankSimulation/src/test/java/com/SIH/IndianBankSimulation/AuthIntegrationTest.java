package com.SIH.IndianBankSimulation;

import com.SIH.IndianBankSimulation.auth.dto.AuthResponse;
import com.SIH.IndianBankSimulation.auth.dto.LoginRequest;
import com.SIH.IndianBankSimulation.auth.dto.RegisterRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class AuthIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("Alice can login successfully with valid credentials")
    void aliceCanLoginSuccessfully() throws Exception {
        LoginRequest request = new LoginRequest("alice", "Password@123");

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.username").value("alice"))
                .andExpect(jsonPath("$.roles[0]").value("ROLE_CUSTOMER"))
                .andExpect(header().exists("X-Correlation-Id"))
                .andReturn();

        AuthResponse authResponse = objectMapper.readValue(result.getResponse().getContentAsString(), AuthResponse.class);
        assertThat(authResponse.getAccessToken()).isNotBlank();
    }

    @Test
    @DisplayName("Bob can login successfully with valid credentials")
    void bobCanLoginSuccessfully() throws Exception {
        LoginRequest request = new LoginRequest("bob", "Password@123");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.username").value("bob"))
                .andExpect(jsonPath("$.roles[0]").value("ROLE_CUSTOMER"));
    }

    @Test
    @DisplayName("Login fails with bad password and returns standard error envelope")
    void loginWithBadPasswordFails() throws Exception {
        LoginRequest request = new LoginRequest("alice", "WrongPassword");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
                .andExpect(jsonPath("$.message").value("Invalid username or password."))
                .andExpect(jsonPath("$.correlationId").isNotEmpty());
    }

    @Test
    @DisplayName("Register a new customer successfully")
    void registerNewCustomerSuccessfully() throws Exception {
        RegisterRequest request = new RegisterRequest(
                "charlie",
                "charlie@banka.sim",
                "Password@123",
                "Charlie Singh",
                "9876543299"
        );

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.username").value("charlie"))
                .andExpect(jsonPath("$.roles[0]").value("ROLE_CUSTOMER"));

        // Verify newly registered user can login
        LoginRequest loginRequest = new LoginRequest("charlie", "Password@123");
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty());
    }

    @Test
    @DisplayName("Register with duplicate username returns 409 Conflict")
    void registerWithDuplicateUsernameFails() throws Exception {
        RegisterRequest request = new RegisterRequest(
                "alice", // already exists
                "alice_new@banka.sim",
                "Password@123",
                "Alice New",
                "9876543288"
        );

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.code").value("DUPLICATE_RESOURCE"))
                .andExpect(jsonPath("$.correlationId").isNotEmpty());
    }

    @Test
    @DisplayName("Authenticated user can view their own profile")
    void authenticatedUserCanViewProfile() throws Exception {
        // First login as Alice
        LoginRequest loginRequest = new LoginRequest("alice", "Password@123");
        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andReturn();

        AuthResponse authResponse = objectMapper.readValue(loginResult.getResponse().getContentAsString(), AuthResponse.class);

        // Fetch /api/auth/me
        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + authResponse.getAccessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("alice"))
                .andExpect(jsonPath("$.email").value("alice@banka.sim"))
                .andExpect(jsonPath("$.fullName").value("Alice Sharma"))
                .andExpect(jsonPath("$.mobileNumber").value("9876543210"));
    }
}

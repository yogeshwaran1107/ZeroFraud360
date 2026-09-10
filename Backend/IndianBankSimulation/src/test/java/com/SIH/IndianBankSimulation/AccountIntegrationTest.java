package com.SIH.IndianBankSimulation;

import com.SIH.IndianBankSimulation.auth.dto.AuthResponse;
import com.SIH.IndianBankSimulation.auth.dto.LoginRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class AccountIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String aliceToken;
    private String bobToken;

    @BeforeEach
    void setUp() throws Exception {
        // Login as Alice
        LoginRequest aliceLogin = new LoginRequest("alice", "Password@123");
        MvcResult aliceResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(aliceLogin)))
                .andExpect(status().isOk())
                .andReturn();
        AuthResponse aliceAuth = objectMapper.readValue(aliceResult.getResponse().getContentAsString(), AuthResponse.class);
        aliceToken = aliceAuth.getAccessToken();

        // Login as Bob
        LoginRequest bobLogin = new LoginRequest("bob", "Password@123");
        MvcResult bobResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(bobLogin)))
                .andExpect(status().isOk())
                .andReturn();
        AuthResponse bobAuth = objectMapper.readValue(bobResult.getResponse().getContentAsString(), AuthResponse.class);
        bobToken = bobAuth.getAccessToken();
    }

    @Test
    @DisplayName("Alice can fetch her accounts and verify seeded balance of ₹50,000")
    void aliceCanFetchHerAccounts() throws Exception {
        mockMvc.perform(get("/api/accounts/me")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].accountNumber").value("1000000001"))
                .andExpect(jsonPath("$[0].bankCode").value("BANK_A"))
                .andExpect(jsonPath("$[0].ifsc").value("SIMU000001"))
                .andExpect(jsonPath("$[0].upiId").value("alice@bankA"))
                .andExpect(jsonPath("$[0].currency").value("INR"))
                .andExpect(jsonPath("$[0].status").value("ACTIVE"))
                .andExpect(jsonPath("$[0].availableBalance").value(50000.0000))
                // Verify security invariant: PIN, PIN hash, or passwords are NEVER returned
                .andExpect(jsonPath("$[0].upiPin").doesNotExist())
                .andExpect(jsonPath("$[0].upiPinHash").doesNotExist())
                .andExpect(jsonPath("$[0].password").doesNotExist());
    }

    @Test
    @DisplayName("Alice can fetch her account balance")
    void aliceCanFetchHerBalance() throws Exception {
        mockMvc.perform(get("/api/accounts/me/balance")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accountNumber").value("1000000001"))
                .andExpect(jsonPath("$.upiId").value("alice@bankA"))
                .andExpect(jsonPath("$.currency").value("INR"))
                .andExpect(jsonPath("$.availableBalance").value(50000.0000));
    }

    @Test
    @DisplayName("Bob can fetch his accounts and verify seeded balance of ₹10,000")
    void bobCanFetchHisAccounts() throws Exception {
        mockMvc.perform(get("/api/accounts/me")
                        .header("Authorization", "Bearer " + bobToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].accountNumber").value("2000000001"))
                .andExpect(jsonPath("$[0].bankCode").value("BANK_B"))
                .andExpect(jsonPath("$[0].ifsc").value("SIMU000002"))
                .andExpect(jsonPath("$[0].upiId").value("bob@bankB"))
                .andExpect(jsonPath("$[0].availableBalance").value(10000.0000));
    }

    @Test
    @DisplayName("Alice cannot view Bob's account directly (authorization boundary check)")
    void aliceCannotViewBobsAccount() throws Exception {
        mockMvc.perform(get("/api/accounts/2000000001")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.code").value("FORBIDDEN_ACCOUNT_ACCESS"))
                .andExpect(jsonPath("$.correlationId").isNotEmpty());
    }

    @Test
    @DisplayName("Unauthenticated request to /api/accounts/me is rejected with 403/401")
    void unauthenticatedRequestIsRejected() throws Exception {
        mockMvc.perform(get("/api/accounts/me"))
                .andExpect(status().isForbidden());
    }
}

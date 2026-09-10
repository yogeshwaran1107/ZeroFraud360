package com.SIH.IndianBankSimulation;

import com.SIH.IndianBankSimulation.auth.dto.AuthResponse;
import com.SIH.IndianBankSimulation.auth.dto.LoginRequest;
import com.SIH.IndianBankSimulation.beneficiary.dto.CreateBeneficiaryRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class BeneficiaryIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("User can login with 5-digit Account ID (10001) and retrieve account details")
    void canLoginWithFiveDigitAccountId() throws Exception {
        // Login with 5-digit account number as identifier
        LoginRequest login = new LoginRequest("10001", "Password@123");
        MvcResult res = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andReturn();

        AuthResponse auth = objectMapper.readValue(res.getResponse().getContentAsString(), AuthResponse.class);

        // Fetch /api/accounts/me with token
        mockMvc.perform(get("/api/accounts/me")
                        .header("Authorization", "Bearer " + auth.getAccessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].accountNumber").value("10001"))
                .andExpect(jsonPath("$[0].customerName").value("Muthukumaran M"))
                .andExpect(jsonPath("$[0].availableBalance").value(78500.0000));
    }

    @Test
    @DisplayName("User can list and add beneficiaries")
    void canListAndAddBeneficiaries() throws Exception {
        // Login as Muthu
        LoginRequest login = new LoginRequest("muthu", "Password@123");
        MvcResult res = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isOk())
                .andReturn();

        AuthResponse auth = objectMapper.readValue(res.getResponse().getContentAsString(), AuthResponse.class);
        String token = auth.getAccessToken();

        // Get initial beneficiaries
        mockMvc.perform(get("/api/beneficiaries")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))));

        // Add new beneficiary (Elamathi 10006)
        CreateBeneficiaryRequest addReq = new CreateBeneficiaryRequest(
                "Elamathi",
                "10006",
                "SIMU000003",
                "Bank of Simulation C",
                "elamathi@bankC"
        );

        mockMvc.perform(post("/api/beneficiaries")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(addReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.beneficiaryName").value("Elamathi"))
                .andExpect(jsonPath("$.accountNumber").value("10006"));
    }
}

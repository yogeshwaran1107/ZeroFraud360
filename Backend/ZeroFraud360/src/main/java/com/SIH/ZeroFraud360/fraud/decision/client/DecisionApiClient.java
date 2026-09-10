package com.SIH.ZeroFraud360.fraud.decision.client;

import com.SIH.ZeroFraud360.fraud.decision.dto.DecisionApiRequestDto;
import com.SIH.ZeroFraud360.fraud.decision.dto.DecisionApiResponseDto;
import com.SIH.ZeroFraud360.fraud.domain.DecisionRequest;
import com.SIH.ZeroFraud360.fraud.domain.DecisionType;
import com.SIH.ZeroFraud360.fraud.repository.DecisionRequestRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.time.Instant;

@Component
public class DecisionApiClient {

    private static final Logger log = LoggerFactory.getLogger(DecisionApiClient.class);

    private final DecisionRequestRepository decisionRequestRepository;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    @Value("${fraud.decision-api.base-url:http://localhost:xxxx}")
    private String baseUrl;

    @Value("${fraud.decision-api.verify-path:/fraud/verify}")
    private String verifyPath;

    public DecisionApiClient(DecisionRequestRepository decisionRequestRepository,
                             ObjectMapper objectMapper,
                             @Value("${fraud.decision-api.connect-timeout-ms:2000}") int connectTimeoutMs,
                             @Value("${fraud.decision-api.read-timeout-ms:5000}") int readTimeoutMs) {
        this.decisionRequestRepository = decisionRequestRepository;
        this.objectMapper = objectMapper;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofMillis(connectTimeoutMs));
        factory.setReadTimeout(Duration.ofMillis(readTimeoutMs));

        this.restClient = RestClient.builder()
                .requestFactory(factory)
                .build();
    }

    public DecisionApiResponseDto requestDecision(DecisionApiRequestDto request) {
        String targetUrl = baseUrl.replaceAll("/+$", "") + (verifyPath.startsWith("/") ? verifyPath : "/" + verifyPath);
        String payloadJson;
        try {
            payloadJson = objectMapper.writeValueAsString(request);
        } catch (Exception e) {
            payloadJson = request.toString();
        }

        // Persist decision request before network call
        DecisionRequest dbRequest = new DecisionRequest(request.requestId(), request.alertId(), payloadJson);
        dbRequest = decisionRequestRepository.save(dbRequest);

        log.info("Sending fraud verification request to Decision API [{}]: alertId={}", targetUrl, request.alertId());

        try {
            String rawResponse = restClient.post()
                    .uri(targetUrl)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(String.class);

            DecisionApiResponseDto responseDto = parseResponse(request.requestId(), rawResponse);
            dbRequest.setStatus("COMPLETED");
            dbRequest.setResponseDecision(responseDto.decision());
            dbRequest.setResponseReason(responseDto.reason());
            dbRequest.setCompletedAt(Instant.now());
            decisionRequestRepository.save(dbRequest);

            log.info("Received Decision API response for alertId={}: decision={}", request.alertId(), responseDto.decision());
            return responseDto;
        } catch (Exception ex) {
            log.error("Failed to query Decision API at {} for alertId={}: {}", targetUrl, request.alertId(), ex.getMessage());
            dbRequest.setStatus("FAILED");
            dbRequest.setLastError(ex.getMessage());
            decisionRequestRepository.save(dbRequest);
            throw new RuntimeException("Decision API invocation failed: " + ex.getMessage(), ex);
        }
    }

    private DecisionApiResponseDto parseResponse(String requestId, String rawResponse) {
        if (rawResponse == null || rawResponse.isBlank()) {
            return new DecisionApiResponseDto(requestId, DecisionType.ALLOW.name(), "Empty decision response, defaulted to ALLOW");
        }

        String trimmed = rawResponse.trim();
        // Check if raw text response e.g. "STOP" or "ALLOW"
        if ("STOP".equalsIgnoreCase(trimmed)) {
            return new DecisionApiResponseDto(requestId, DecisionType.STOP.name(), "Decision API commanded STOP");
        }
        if ("ALLOW".equalsIgnoreCase(trimmed)) {
            return new DecisionApiResponseDto(requestId, DecisionType.ALLOW.name(), "Decision API commanded ALLOW");
        }

        // Attempt JSON parse
        try {
            DecisionApiResponseDto dto = objectMapper.readValue(trimmed, DecisionApiResponseDto.class);
            String dec = dto.decision() != null ? dto.decision().toUpperCase() : DecisionType.ALLOW.name();
            return new DecisionApiResponseDto(
                    dto.requestId() != null ? dto.requestId() : requestId,
                    dec,
                    dto.reason() != null ? dto.reason() : "Decision API response: " + dec
            );
        } catch (Exception e) {
            // Fallback check if JSON contains "STOP"
            if (trimmed.toUpperCase().contains("\"STOP\"") || trimmed.toUpperCase().contains("STOP")) {
                return new DecisionApiResponseDto(requestId, DecisionType.STOP.name(), "Extracted STOP from raw response");
            }
            return new DecisionApiResponseDto(requestId, DecisionType.ALLOW.name(), "Extracted ALLOW from raw response");
        }
    }
}

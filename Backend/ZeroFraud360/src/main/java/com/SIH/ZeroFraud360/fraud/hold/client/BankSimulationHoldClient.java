package com.SIH.ZeroFraud360.fraud.hold.client;

import com.SIH.ZeroFraud360.fraud.hold.dto.BankHoldRequestDto;
import com.SIH.ZeroFraud360.fraud.hold.dto.BankHoldResponseDto;
import com.SIH.ZeroFraud360.fraud.hold.dto.BankReleaseHoldRequestDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Duration;

@Component
public class BankSimulationHoldClient {

    private static final Logger log = LoggerFactory.getLogger(BankSimulationHoldClient.class);

    private final RestClient restClient;

    @Value("${bank.sim.base-url:http://localhost:8080}")
    private String bankSimBaseUrl;

    @Value("${bank.sim.service-token:sim-secret-token-360}")
    private String serviceToken;

    public BankSimulationHoldClient(@Value("${bank.sim.connect-timeout-ms:2000}") int connectTimeoutMs,
                                    @Value("${bank.sim.read-timeout-ms:5000}") int readTimeoutMs) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofMillis(connectTimeoutMs));
        factory.setReadTimeout(Duration.ofMillis(readTimeoutMs));

        this.restClient = RestClient.builder()
                .requestFactory(factory)
                .build();
    }

    public BankHoldResponseDto placeHold(String accountId, BankHoldRequestDto request) {
        String url = bankSimBaseUrl.replaceAll("/+$", "") + "/internal/v1/accounts/" + accountId + "/holds";
        log.info("Requesting hold from IndianBankSimulation at {}: accountId={}, holdRequestId={}",
                url, accountId, request.requestId());

        return restClient.post()
                .uri(url)
                .header("X-Service-Token", serviceToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(BankHoldResponseDto.class);
    }

    public void releaseHold(String holdId, BankReleaseHoldRequestDto request) {
        String url = bankSimBaseUrl.replaceAll("/+$", "") + "/internal/v1/holds/" + holdId + "/release";
        log.info("Requesting hold release from IndianBankSimulation at {}: holdId={}", url, holdId);

        restClient.post()
                .uri(url)
                .header("X-Service-Token", serviceToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .toBodilessEntity();
    }

    public void blockHold(String holdId, BankReleaseHoldRequestDto request) {
        String url = bankSimBaseUrl.replaceAll("/+$", "") + "/internal/v1/holds/" + holdId + "/block";
        log.warn("Requesting permanent fund block from IndianBankSimulation at {}: holdId={}", url, holdId);

        restClient.post()
                .uri(url)
                .header("X-Service-Token", serviceToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .toBodilessEntity();
    }
}

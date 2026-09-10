package com.SIH.IndianBankSimulation.common.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.preauth.PreAuthenticatedAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class InternalServiceAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(InternalServiceAuthenticationFilter.class);

    private final String expectedServiceToken;

    public InternalServiceAuthenticationFilter(
            @Value("${security.internal-service.expected-token:${bank.security.internal-service-token:${BANK_SIMULATION_SERVICE_TOKEN:sim-secret-token-360}}}")
            String expectedServiceToken) {
        this.expectedServiceToken = expectedServiceToken;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String path = request.getRequestURI();

        if (path.startsWith("/internal/v1/")) {
            String serviceToken = request.getHeader("X-Service-Token");

            if (StringUtils.hasText(serviceToken) && serviceToken.equals(expectedServiceToken)) {
                InternalServicePrincipal principal = new InternalServicePrincipal();
                PreAuthenticatedAuthenticationToken auth =
                        new PreAuthenticatedAuthenticationToken(principal, "PROTECTED", principal.getAuthorities());
                SecurityContextHolder.getContext().setAuthentication(auth);
                log.debug("Authenticated internal service request from principal '{}' for path '{}'",
                        principal.getName(), path);
            } else {
                log.warn("Internal service authorization failed for path '{}': invalid or missing X-Service-Token",
                        path);
                // Clear any prior authentication so unauthorized callers cannot proceed
                SecurityContextHolder.clearContext();
            }
        }

        filterChain.doFilter(request, response);
    }
}

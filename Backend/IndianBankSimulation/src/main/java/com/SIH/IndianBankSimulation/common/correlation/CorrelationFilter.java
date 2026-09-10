package com.SIH.IndianBankSimulation.common.correlation;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Filter to capture or generate correlation ID on every incoming HTTP request.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CorrelationFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String correlationId = request.getHeader(CorrelationContext.CORRELATION_ID_HEADER);
        if (correlationId == null || correlationId.isBlank()) {
            correlationId = CorrelationContext.generateCorrelationId();
        }

        try {
            CorrelationContext.setCorrelationId(correlationId);
            response.setHeader(CorrelationContext.CORRELATION_ID_HEADER, correlationId);
            filterChain.doFilter(request, response);
        } finally {
            CorrelationContext.clear();
        }
    }
}

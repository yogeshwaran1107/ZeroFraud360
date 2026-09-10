package com.SIH.IndianBankSimulation.common.correlation;

import org.slf4j.MDC;

import java.util.UUID;

/**
 * Thread-local context maintaining correlation ID for tracing distributed execution.
 */
public final class CorrelationContext {

    public static final String CORRELATION_ID_HEADER = "X-Correlation-Id";
    public static final String MDC_KEY = "correlationId";

    private CorrelationContext() {
    }

    public static String getCorrelationId() {
        String id = MDC.get(MDC_KEY);
        if (id == null || id.isBlank()) {
            id = generateCorrelationId();
            setCorrelationId(id);
        }
        return id;
    }

    public static void setCorrelationId(String correlationId) {
        if (correlationId != null && !correlationId.isBlank()) {
            MDC.put(MDC_KEY, correlationId);
        } else {
            MDC.put(MDC_KEY, generateCorrelationId());
        }
    }

    public static String generateCorrelationId() {
        return "CORR-" + UUID.randomUUID();
    }

    public static void clear() {
        MDC.remove(MDC_KEY);
    }
}

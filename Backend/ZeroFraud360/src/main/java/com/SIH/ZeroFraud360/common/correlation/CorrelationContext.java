package com.SIH.ZeroFraud360.common.correlation;

import org.slf4j.MDC;

public final class CorrelationContext {

    public static final String CORRELATION_ID_HEADER = "X-Correlation-Id";
    public static final String MDC_CORRELATION_KEY = "correlationId";

    private CorrelationContext() {
    }

    public static String getCorrelationId() {
        return MDC.get(MDC_CORRELATION_KEY);
    }

    public static void setCorrelationId(String correlationId) {
        if (correlationId != null) {
            MDC.put(MDC_CORRELATION_KEY, correlationId);
        }
    }

    public static void clear() {
        MDC.remove(MDC_CORRELATION_KEY);
    }
}

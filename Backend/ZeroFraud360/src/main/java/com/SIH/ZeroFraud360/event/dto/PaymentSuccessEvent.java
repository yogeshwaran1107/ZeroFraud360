package com.SIH.ZeroFraud360.event.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record PaymentSuccessEvent(
        String eventId,
        String eventType,
        String transactionId,
        Instant occurredAt,
        AccountParticipantDto sender,
        AccountParticipantDto receiver,
        BigDecimal amount,
        String currency,
        String paymentRail,
        String correlationId,
        String messageId
) {
}

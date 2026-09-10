package com.SIH.ZeroFraud360.event.dto;

public record AccountParticipantDto(
        String accountId,
        String accountNumber,
        String bankId
) {
}

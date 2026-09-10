package com.SIH.IndianBankSimulation.outbox.dto;

public record AccountParticipantDto(
        String accountId,
        String accountNumber,
        String bankId
) {
}

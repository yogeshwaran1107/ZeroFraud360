package com.SIH.ZeroFraud360.fraud.domain;

public enum AlertStatus {
    CREATED,
    WAITING_DECISION,
    ALLOW_RECEIVED,
    STOP_RECEIVED,
    HOLD_REQUESTED,
    HOLD_ACTIVE,
    MEDIUM_RISK,
    RESOLVED,
    CONFIRMED_FRAUD,
    ERROR
}

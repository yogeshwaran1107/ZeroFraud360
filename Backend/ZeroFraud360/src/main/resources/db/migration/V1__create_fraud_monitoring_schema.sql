-- ZeroFraud360 V1 Schema
-- Tables: processed_events, observed_transactions, fraud_alerts, decision_requests, hold_requests

CREATE TABLE processed_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id VARCHAR(64) NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    consumer_name VARCHAR(100) NOT NULL,
    processed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_event_consumer UNIQUE (event_id, consumer_name)
);

CREATE TABLE observed_transactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id VARCHAR(64) NOT NULL UNIQUE,
    transaction_id VARCHAR(64) NOT NULL,
    sender_account_id VARCHAR(30) NOT NULL,
    receiver_account_id VARCHAR(30) NOT NULL,
    sender_bank_id VARCHAR(20) NOT NULL,
    receiver_bank_id VARCHAR(20) NOT NULL,
    amount DECIMAL(19, 4) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    payment_rail VARCHAR(30) NOT NULL DEFAULT 'SIMULATED_UPI',
    status VARCHAR(30) NOT NULL DEFAULT 'SUCCESS',
    correlation_id VARCHAR(64),
    message_id VARCHAR(64),
    occurred_at TIMESTAMP NOT NULL,
    received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_obs_receiver_occurred ON observed_transactions (receiver_account_id, occurred_at);
CREATE INDEX idx_obs_sender_occurred ON observed_transactions (sender_account_id, occurred_at);
CREATE INDEX idx_obs_transaction_id ON observed_transactions (transaction_id);

CREATE TABLE fraud_alerts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    alert_id VARCHAR(64) NOT NULL UNIQUE,
    dedup_key VARCHAR(150) NOT NULL UNIQUE,
    pattern_type VARCHAR(64) NOT NULL DEFAULT 'RAPID_PASS_THROUGH',
    status VARCHAR(30) NOT NULL DEFAULT 'CREATED',
    first_transaction_id VARCHAR(64) NOT NULL,
    second_transaction_id VARCHAR(64) NOT NULL,
    source_account_id VARCHAR(30) NOT NULL,
    intermediate_account_id VARCHAR(30) NOT NULL,
    destination_account_id VARCHAR(30) NOT NULL,
    first_amount DECIMAL(19, 4) NOT NULL,
    second_amount DECIMAL(19, 4) NOT NULL,
    time_difference_seconds BIGINT NOT NULL,
    decision VARCHAR(20) NULL,
    decision_reason VARCHAR(500) NULL,
    external_decision_request_id VARCHAR(64) NULL,
    hold_request_id VARCHAR(64) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL
);

CREATE INDEX idx_alerts_status ON fraud_alerts (status);
CREATE INDEX idx_alerts_dest_acc ON fraud_alerts (destination_account_id);

CREATE TABLE decision_requests (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    request_id VARCHAR(64) NOT NULL UNIQUE,
    alert_id VARCHAR(64) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'SENT',
    attempt_count INT NOT NULL DEFAULT 1,
    request_payload TEXT NULL,
    response_decision VARCHAR(20) NULL,
    response_reason VARCHAR(500) NULL,
    last_error VARCHAR(500) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL
);

CREATE INDEX idx_dec_req_alert ON decision_requests (alert_id);

CREATE TABLE hold_requests (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    request_id VARCHAR(64) NOT NULL UNIQUE,
    alert_id VARCHAR(64) NOT NULL,
    transaction_id VARCHAR(64) NOT NULL,
    account_id VARCHAR(30) NOT NULL,
    amount DECIMAL(19, 4) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    attempt_count INT NOT NULL DEFAULT 1,
    bank_hold_id VARCHAR(64) NULL,
    last_error VARCHAR(500) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL
);

CREATE INDEX idx_hold_req_alert ON hold_requests (alert_id);

-- Phase 2 / Fraud Simulation Extension Schema
-- Bank C, Customer Charlie, Account C
-- payment_transactions, account_holds, outbox_events

INSERT INTO banks (id, bank_code, name, ifsc_prefix, active) VALUES
(3, 'BANK_C', 'Bank of Simulation C', 'SIMU000003', TRUE);

INSERT INTO users (id, username, email, password_hash, status) VALUES
(4, 'customer_c', 'customer_c@bankc.sim', '$2a$10$Ui5Wq5cjd8xySq1H.G3Bne5DDkr9DgGMApTgXw6Z7bLyEiWYA3lue', 'ACTIVE');

INSERT INTO user_roles (user_id, role_id) VALUES
(4, 1);

INSERT INTO customers (id, user_id, full_name, mobile_number, email) VALUES
(3, 4, 'Charlie Kumar', '9876543212', 'customer_c@bankc.sim');

-- Account C for Charlie: initial balance ₹5,000, PIN 123456
INSERT INTO bank_accounts (id, account_number, ifsc, bank_id, customer_id, currency, status, available_balance, upi_id, upi_pin_hash, pin_failed_attempts, version) VALUES
(3, '3000000001', 'SIMU000003', 3, 3, 'INR', 'ACTIVE', 5000.0000, 'charlie@bankC', '$2a$10$QyV9eRvqGPkMOm0DS1xToOMc6ZM3iTjMpGWkBRRZ65SwWbifODpXe', 0, 0);

CREATE TABLE payment_transactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    transaction_id VARCHAR(64) NOT NULL UNIQUE,
    sender_account_id VARCHAR(30) NOT NULL,
    receiver_account_id VARCHAR(30) NOT NULL,
    sender_bank_id VARCHAR(20) NOT NULL,
    receiver_bank_id VARCHAR(20) NOT NULL,
    amount DECIMAL(19, 4) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    status VARCHAR(30) NOT NULL DEFAULT 'SUCCESS',
    payment_rail VARCHAR(30) NOT NULL DEFAULT 'SIMULATED_UPI',
    correlation_id VARCHAR(64),
    message_id VARCHAR(64),
    occurred_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pay_txn_sender ON payment_transactions (sender_account_id, occurred_at);
CREATE INDEX idx_pay_txn_receiver ON payment_transactions (receiver_account_id, occurred_at);
CREATE INDEX idx_pay_txn_occurred ON payment_transactions (occurred_at);

CREATE TABLE account_holds (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    hold_id VARCHAR(64) NOT NULL UNIQUE,
    account_id VARCHAR(30) NOT NULL,
    transaction_id VARCHAR(64),
    alert_id VARCHAR(64),
    amount DECIMAL(19, 4) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    reason_code VARCHAR(50) NOT NULL DEFAULT 'FRAUD_ALERT',
    source VARCHAR(50) NOT NULL DEFAULT 'ZERO_FRAUD_360',
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    released_at TIMESTAMP NULL,
    release_reason VARCHAR(255) NULL,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_holds_account_status ON account_holds (account_id, status);
CREATE INDEX idx_holds_expires_status ON account_holds (status, expires_at);

CREATE TABLE outbox_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id VARCHAR(64) NOT NULL UNIQUE,
    event_type VARCHAR(64) NOT NULL,
    aggregate_type VARCHAR(64) NOT NULL,
    aggregate_id VARCHAR(64) NOT NULL,
    payload TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    retry_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    error_message VARCHAR(500) NULL
);

CREATE INDEX idx_outbox_status ON outbox_events (status, created_at);

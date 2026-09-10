-- ZeroFraud360 V3 Schema: Fraud Patterns Registry
-- Stores confirmed fraud signatures, money-mule routes, and AML prevention patterns

CREATE TABLE IF NOT EXISTS fraud_patterns (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    pattern_id VARCHAR(64) NOT NULL UNIQUE,
    pattern_name VARCHAR(150) NOT NULL,
    pattern_type VARCHAR(64) NOT NULL DEFAULT 'RAPID_PASS_THROUGH',
    description TEXT,
    risk_level VARCHAR(20) NOT NULL DEFAULT 'HIGH',
    source_account VARCHAR(30),
    mule_account VARCHAR(30),
    destination_account VARCHAR(30),
    min_amount DECIMAL(19, 4),
    max_amount DECIMAL(19, 4),
    time_window_seconds INT DEFAULT 180,
    action_taken VARCHAR(50) NOT NULL DEFAULT 'CONFIRMED_FRAUD_BLOCK',
    confirmed_by_officer VARCHAR(50),
    alert_id VARCHAR(64),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_patterns_type ON fraud_patterns (pattern_type);
CREATE INDEX idx_patterns_status ON fraud_patterns (status);

-- Seed baseline institutional prevention patterns
INSERT INTO fraud_patterns (
    pattern_id, pattern_name, pattern_type, description, risk_level,
    source_account, mule_account, destination_account, min_amount, max_amount,
    time_window_seconds, action_taken, confirmed_by_officer, alert_id, status
) VALUES
(
    'PAT-BASELINE-001',
    'Rapid Pass-Through Money Mule Route (A -> B -> C <= 180s)',
    'RAPID_PASS_THROUGH',
    'Interception pattern matching rapid funds relay through intermediate mule account within 3 minutes of initial credit.',
    'CRITICAL',
    NULL, NULL, NULL, 5000.00, 500000.00,
    180, 'CONFIRMED_FRAUD_BLOCK', 'SYSTEM_POLICY', NULL, 'ACTIVE'
),
(
    'PAT-BASELINE-002',
    'High-Velocity Single Transfer Mule Spike',
    'HIGH_VALUE_SPIKE',
    'Abrupt large outflow from newly credited or low-volume simulated account exceeding safety threshold.',
    'HIGH',
    NULL, NULL, NULL, 25000.00, 1000000.00,
    300, 'CONFIRMED_FRAUD_BLOCK', 'SYSTEM_POLICY', NULL, 'ACTIVE'
);

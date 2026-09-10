-- ZeroFraud360 V2 Schema: Users and Predefined Roles
-- Seed users: police, cyber, bank

CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    failed_login_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users (username);

-- Predefined users:
-- police / Police@12345 / ROLE_POLICE
-- cyber / Cyber@12345 / ROLE_CYBER
-- bank / Bank@12345 / ROLE_BANK
INSERT INTO users (id, username, password_hash, role, enabled, failed_login_attempts) VALUES
(1, 'police', '$2a$10$cd.zjODU16FZDDNDJRin7uxG0A4XzklLPUzvnXdnBts2mxRVQY8Q6', 'ROLE_POLICE', TRUE, 0),
(2, 'cyber', '$2a$10$zoQ5Lia7uacNL0g67R/iZuhecEQNVCyJcP5s/UHDdPWynbQ6uu/Gy', 'ROLE_CYBER', TRUE, 0),
(3, 'bank', '$2a$10$ovBF1/RjMeiVKZM9ejfBpunQ6o2k.gXJXrYIH/T3ZHFeVg9QZUbsq', 'ROLE_BANK', TRUE, 0);

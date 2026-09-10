-- Seed initial simulation data for Phase 1
-- Banks, Roles, Users, Customers, Accounts

INSERT INTO roles (id, name) VALUES 
(1, 'ROLE_CUSTOMER'),
(2, 'ROLE_ADMIN');

INSERT INTO banks (id, bank_code, name, ifsc_prefix, active) VALUES
(1, 'BANK_A', 'Bank of Simulation A', 'SIMU000001', TRUE),
(2, 'BANK_B', 'Bank of Simulation B', 'SIMU000002', TRUE);

-- Default password for alice and bob is: Password@123
-- Default password for admin is: Admin@123
INSERT INTO users (id, username, email, password_hash, status) VALUES
(1, 'alice', 'alice@banka.sim', '$2a$10$Ui5Wq5cjd8xySq1H.G3Bne5DDkr9DgGMApTgXw6Z7bLyEiWYA3lue', 'ACTIVE'),
(2, 'bob', 'bob@bankb.sim', '$2a$10$Ui5Wq5cjd8xySq1H.G3Bne5DDkr9DgGMApTgXw6Z7bLyEiWYA3lue', 'ACTIVE'),
(3, 'admin', 'admin@banksim.internal', '$2a$10$RyuT6vPeKqXrvA9qdBipb.pfrMXw2JrsqPYFEMS9J3pchDj0Ed8o6', 'ACTIVE');

INSERT INTO user_roles (user_id, role_id) VALUES
(1, 1),
(2, 1),
(3, 2);

INSERT INTO customers (id, user_id, full_name, mobile_number, email) VALUES
(1, 1, 'Alice Sharma', '9876543210', 'alice@banka.sim'),
(2, 2, 'Bob Verma', '9876543211', 'bob@bankb.sim');

-- Account A for Alice: balance ₹50,000, PIN 123456
-- Account B for Bob: balance ₹10,000, PIN 654321
INSERT INTO bank_accounts (id, account_number, ifsc, bank_id, customer_id, currency, status, available_balance, upi_id, upi_pin_hash, pin_failed_attempts, version) VALUES
(1, '1000000001', 'SIMU000001', 1, 1, 'INR', 'ACTIVE', 50000.0000, 'alice@bankA', '$2a$10$QyV9eRvqGPkMOm0DS1xToOMc6ZM3iTjMpGWkBRRZ65SwWbifODpXe', 0, 0),
(2, '2000000001', 'SIMU000002', 2, 2, 'INR', 'ACTIVE', 10000.0000, 'bob@bankB', '$2a$10$SCR76cy6r7.zgqz5tY5P7.QYKbnVxhE2bBnP5jAKlsEkvLvKwSc8y', 0, 0);

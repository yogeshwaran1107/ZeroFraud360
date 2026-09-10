-- Migration V4: Add custom users with 5-digit account numbers and beneficiaries table

-- 1. Create Beneficiaries table
CREATE TABLE beneficiaries (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    beneficiary_name VARCHAR(150) NOT NULL,
    account_number VARCHAR(30) NOT NULL,
    ifsc VARCHAR(11) NOT NULL,
    bank_name VARCHAR(150) NOT NULL,
    upi_id VARCHAR(100) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_beneficiaries_customer FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE
);

CREATE INDEX idx_beneficiaries_customer ON beneficiaries (customer_id);

-- 2. Insert Users for Muthukumaran M, Naveen K, Yogeshwaran V, Kanika, Nithiya, Elamathi
-- Default password: Password@123 ($2a$10$Ui5Wq5cjd8xySq1H.G3Bne5DDkr9DgGMApTgXw6Z7bLyEiWYA3lue)
INSERT INTO users (id, username, email, password_hash, status) VALUES
(5, 'muthu', 'muthu@zerofraud.bank', '$2a$10$Ui5Wq5cjd8xySq1H.G3Bne5DDkr9DgGMApTgXw6Z7bLyEiWYA3lue', 'ACTIVE'),
(6, 'naveen', 'naveen@zerofraud.bank', '$2a$10$Ui5Wq5cjd8xySq1H.G3Bne5DDkr9DgGMApTgXw6Z7bLyEiWYA3lue', 'ACTIVE'),
(7, 'yogesh', 'yogesh@zerofraud.bank', '$2a$10$Ui5Wq5cjd8xySq1H.G3Bne5DDkr9DgGMApTgXw6Z7bLyEiWYA3lue', 'ACTIVE'),
(8, 'kanika', 'kanika@zerofraud.bank', '$2a$10$Ui5Wq5cjd8xySq1H.G3Bne5DDkr9DgGMApTgXw6Z7bLyEiWYA3lue', 'ACTIVE'),
(9, 'nithiya', 'nithiya@zerofraud.bank', '$2a$10$Ui5Wq5cjd8xySq1H.G3Bne5DDkr9DgGMApTgXw6Z7bLyEiWYA3lue', 'ACTIVE'),
(10, 'elamathi', 'elamathi@zerofraud.bank', '$2a$10$Ui5Wq5cjd8xySq1H.G3Bne5DDkr9DgGMApTgXw6Z7bLyEiWYA3lue', 'ACTIVE');

-- Assign ROLE_CUSTOMER (id=1)
INSERT INTO user_roles (user_id, role_id) VALUES
(5, 1),
(6, 1),
(7, 1),
(8, 1),
(9, 1),
(10, 1);

-- 3. Insert Customers
INSERT INTO customers (id, user_id, full_name, mobile_number, email) VALUES
(4, 5, 'Muthukumaran M', '9876500001', 'muthu@zerofraud.bank'),
(5, 6, 'Naveen K', '9876500002', 'naveen@zerofraud.bank'),
(6, 7, 'Yogeshwaran V', '9876500003', 'yogesh@zerofraud.bank'),
(7, 8, 'Kanika', '9876500004', 'kanika@zerofraud.bank'),
(8, 9, 'Nithiya', '9876500005', 'nithiya@zerofraud.bank'),
(9, 10, 'Elamathi', '9876500006', 'elamathi@zerofraud.bank');

-- 4. Insert 5-digit Bank Accounts (Default PIN: 123456 -> $2a$10$QyV9eRvqGPkMOm0DS1xToOMc6ZM3iTjMpGWkBRRZ65SwWbifODpXe)
INSERT INTO bank_accounts (id, account_number, ifsc, bank_id, customer_id, currency, status, available_balance, upi_id, upi_pin_hash, pin_failed_attempts, version) VALUES
(4, '10001', 'SIMU000001', 1, 4, 'INR', 'ACTIVE', 78500.0000, 'muthu@bankA', '$2a$10$QyV9eRvqGPkMOm0DS1xToOMc6ZM3iTjMpGWkBRRZ65SwWbifODpXe', 0, 0),
(5, '10002', 'SIMU000002', 2, 5, 'INR', 'ACTIVE', 42300.0000, 'naveen@bankB', '$2a$10$QyV9eRvqGPkMOm0DS1xToOMc6ZM3iTjMpGWkBRRZ65SwWbifODpXe', 0, 0),
(6, '10003', 'SIMU000003', 3, 6, 'INR', 'ACTIVE', 65200.0000, 'yogesh@bankC', '$2a$10$QyV9eRvqGPkMOm0DS1xToOMc6ZM3iTjMpGWkBRRZ65SwWbifODpXe', 0, 0),
(7, '10004', 'SIMU000001', 1, 7, 'INR', 'ACTIVE', 34800.0000, 'kanika@bankA', '$2a$10$QyV9eRvqGPkMOm0DS1xToOMc6ZM3iTjMpGWkBRRZ65SwWbifODpXe', 0, 0),
(8, '10005', 'SIMU000002', 2, 8, 'INR', 'ACTIVE', 56700.0000, 'nithiya@bankB', '$2a$10$QyV9eRvqGPkMOm0DS1xToOMc6ZM3iTjMpGWkBRRZ65SwWbifODpXe', 0, 0),
(9, '10006', 'SIMU000003', 3, 9, 'INR', 'ACTIVE', 89400.0000, 'elamathi@bankC', '$2a$10$QyV9eRvqGPkMOm0DS1xToOMc6ZM3iTjMpGWkBRRZ65SwWbifODpXe', 0, 0);

-- 5. Seed sample beneficiaries
INSERT INTO beneficiaries (customer_id, beneficiary_name, account_number, ifsc, bank_name, upi_id) VALUES
(4, 'Naveen K', '10002', 'SIMU000002', 'Bank of Simulation B', 'naveen@bankB'),
(4, 'Yogeshwaran V', '10003', 'SIMU000003', 'Bank of Simulation C', 'yogesh@bankC'),
(5, 'Muthukumaran M', '10001', 'SIMU000001', 'Bank of Simulation A', 'muthu@bankA'),
(6, 'Kanika', '10004', 'SIMU000001', 'Bank of Simulation A', 'kanika@bankA');

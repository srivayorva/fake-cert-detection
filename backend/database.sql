-- ============================================================
--  Fake Certificate Detection System — Database Schema
--  Run this file once to initialize the database
-- ============================================================

CREATE DATABASE IF NOT EXISTS fake_cert_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE fake_cert_db;

-- ────────────────────────────────────────────────────────────
-- 1. INSTITUTIONS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS institutions (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(200) NOT NULL,
  code        VARCHAR(20)  NOT NULL UNIQUE,  -- e.g. KMEC, IIT_B
  email       VARCHAR(150) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,          -- bcrypt hash
  address     TEXT,
  phone       VARCHAR(20),
  is_active   TINYINT(1) DEFAULT 1,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ────────────────────────────────────────────────────────────
-- 2. CERTIFICATES
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS certificates (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cert_id         VARCHAR(36)  NOT NULL UNIQUE,  -- UUID
  student_name    VARCHAR(150) NOT NULL,
  roll_number     VARCHAR(50)  NOT NULL,
  email           VARCHAR(150),
  course          VARCHAR(200) NOT NULL,
  specialization  VARCHAR(200),
  institution_id  INT UNSIGNED NOT NULL,
  issue_date      DATE NOT NULL,
  expiry_date     DATE,
  grade           VARCHAR(10),
  cgpa            DECIMAL(4,2),
  is_revoked      TINYINT(1) DEFAULT 0,
  revoke_reason   VARCHAR(255),
  qr_code_data    TEXT,                          -- base64 PNG
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  INDEX idx_cert_id   (cert_id),
  INDEX idx_roll      (roll_number),
  INDEX idx_student   (student_name),
  INDEX idx_inst      (institution_id)
);

-- ────────────────────────────────────────────────────────────
-- 3. VERIFICATION LOGS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS verification_logs (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cert_id_input VARCHAR(36)  NOT NULL,
  result        ENUM('VALID','FAKE','REVOKED','NOT_FOUND') NOT NULL,
  ip_address    VARCHAR(45),
  user_agent    VARCHAR(255),
  verified_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_cert    (cert_id_input),
  INDEX idx_result  (result),
  INDEX idx_date    (verified_at)
);

-- ────────────────────────────────────────────────────────────
-- 4. SAMPLE SEED DATA
-- ────────────────────────────────────────────────────────────

-- Sample institution (password: Admin@123)
INSERT IGNORE INTO institutions (name, code, email, password, address, phone) VALUES
('KMEC College of Engineering', 'KMEC',
 'admin@kmec.ac.in',
 '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LkdREFN.O7e',
 'Narasaraopet, Andhra Pradesh - 522601', '08647-234567'),
('Indian Institute of Technology', 'IITB',
 'admin@iitb.ac.in',
 '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LkdREFN.O7e',
 'Powai, Mumbai, Maharashtra - 400076', '022-25722545');

-- Sample certificates
INSERT IGNORE INTO certificates
  (cert_id, student_name, roll_number, email, course, specialization, institution_id, issue_date, grade, cgpa)
VALUES
  ('KMEC-2024-001', 'N S V S Surya', '245523753052', 'surya@example.com',
   'B.Tech Computer Science & Engineering', 'AI & ML', 1, '2024-05-15', 'A+', 9.2),
  ('KMEC-2024-002', 'P. Srivathsav', '245523753038', 'srivathsav@example.com',
   'B.Tech Computer Science & Engineering', 'AI & ML', 1, '2024-05-15', 'A', 8.8),
  ('KMEC-2024-003', 'K. Gnaneshwar', '245523753024', 'gnaneshwar@example.com',
   'B.Tech Computer Science & Engineering', 'AI & ML', 1, '2024-05-15', 'A+', 9.1),
  ('IITB-2023-101', 'Priya Sharma', 'IITB20CS001', 'priya@example.com',
   'B.Tech Computer Science', 'Data Science', 2, '2023-06-01', 'A', 9.5);

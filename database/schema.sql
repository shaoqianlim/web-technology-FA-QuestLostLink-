-- Quest LostLink — MySQL Database Schema
-- Run this file once in DBeaver to set up the database.
-- Connection: localhost:3306 (root user)

CREATE DATABASE IF NOT EXISTS quest_lostlink
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE quest_lostlink;

-- ── USERS TABLE ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(60)  NOT NULL,
  last_name  VARCHAR(60)  NOT NULL,
  email      VARCHAR(180) NOT NULL UNIQUE,
  phone      VARCHAR(20)  DEFAULT NULL,
  password   VARCHAR(255) NOT NULL,
  role       ENUM('student','staff','admin') NOT NULL DEFAULT 'student',
  is_active  TINYINT(1)   NOT NULL DEFAULT 1,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── ITEMS TABLE ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS items (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  type          ENUM('lost','found')                     NOT NULL,
  status        ENUM('active','claimed','resolved')      NOT NULL DEFAULT 'active',
  category      ENUM(
    'Electronics','Clothing','Books & Stationery',
    'ID / Cards','Keys','Bags & Wallets','Jewellery','Other'
  )                                                      NOT NULL,
  title         VARCHAR(120)  NOT NULL,
  description   TEXT          NOT NULL,
  location      VARCHAR(150)  NOT NULL,
  date_reported DATE          NOT NULL,
  contact_name  VARCHAR(100)  NOT NULL,
  contact_email VARCHAR(180)  NOT NULL,
  reported_by   INT UNSIGNED  DEFAULT NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_reported_by
    FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ── INDEXES ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_type     ON items(type);
CREATE INDEX IF NOT EXISTS idx_status   ON items(status);
CREATE INDEX IF NOT EXISTS idx_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_date     ON items(date_reported);
CREATE INDEX IF NOT EXISTS idx_created  ON items(created_at);

-- ── SAMPLE DATA (optional — delete before production) ─────────
INSERT IGNORE INTO users (first_name, last_name, email, password, role) VALUES
  ('Admin',  'User',  'admin@quest.edu.my',  'Admin@1234',  'admin'),
  ('Ahmad',  'Razif', 'ahmad@quest.edu.my',  'Student@123', 'student'),
  ('Priya',  'Nair',  'priya@quest.edu.my',  'Student@123', 'student');

INSERT IGNORE INTO items (type, status, category, title, description, location, date_reported, contact_name, contact_email) VALUES
  ('lost',  'active',   'Electronics',       'Black Laptop',          'Dell XPS 15, space grey, sticker on lid',       'Library Block B, Level 2',  '2025-03-01', 'Ahmad Razif',  'ahmad@quest.edu.my'),
  ('found', 'active',   'Keys',              'Car key — blue lanyard','Toyota key found near cafeteria entrance',       'Main Cafeteria',            '2025-03-02', 'Priya Nair',   'priya@quest.edu.my'),
  ('lost',  'active',   'ID / Cards',        'Student ID Card',       'QIU Student ID — name: Sarah Lim',              'Sports Complex',            '2025-03-03', 'Sarah Lim',    'sarah@quest.edu.my'),
  ('found', 'resolved', 'Bags & Wallets',    'Brown leather wallet',  'Contains cards and cash, no ID',                'Lecture Hall A',            '2025-02-28', 'Admin User',   'admin@quest.edu.my'),
  ('lost',  'active',   'Electronics',       'Apple AirPods Pro',     'White case with crack on corner, name engraved','Admin Block Toilet',        '2025-03-04', 'Raj Kumar',    'raj@quest.edu.my'),
  ('found', 'active',   'Clothing',          'Blue QIU Hoodie',       'Size M, found on chair after lecture',          'Block C Room 302',          '2025-03-04', 'Lee Wei',      'leewei@quest.edu.my');

SELECT 'Quest LostLink database setup complete!' AS Status;

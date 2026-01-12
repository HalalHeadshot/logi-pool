CREATE DATABASE logipool;
USE logipool;

CREATE TABLE produce (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phone VARCHAR(15),
  crop VARCHAR(50),
  quantity INT,
  village VARCHAR(50)
);

CREATE TABLE pools (
  id INT AUTO_INCREMENT PRIMARY KEY,
  crop VARCHAR(50),
  village VARCHAR(50),
  total_quantity INT DEFAULT 0,
  threshold INT,
  status VARCHAR(20)
);

CREATE TABLE drivers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50),
  phone VARCHAR(15),
  village VARCHAR(50),
  available BOOLEAN DEFAULT true
);

CREATE TABLE dispatches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  crop VARCHAR(50),
  village VARCHAR(50),
  total_quantity INT,
  driver_phone VARCHAR(15),
  status VARCHAR(20)
);

-- =========================
-- Phase 2: Shared Equipment
-- =========================

CREATE TABLE services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(50),           -- PLOUGH, TRACTOR, TRANSPORT
  owner_phone VARCHAR(15),
  village VARCHAR(50),
  available BOOLEAN DEFAULT true
);

CREATE TABLE service_bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  service_id INT,
  farmer_phone VARCHAR(15),
  village VARCHAR(50),
  status VARCHAR(20),         -- ACTIVE, DONE
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

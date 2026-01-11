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
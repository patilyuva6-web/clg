-- ==========================================================
-- College Lost & Found Management System (college_lost_found)
-- MySQL 8.0 / MariaDB Reference Schema for phpMyAdmin / XAMPP
-- ==========================================================

CREATE DATABASE IF NOT EXISTS `college_lost_found`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `college_lost_found`;

-- 1. USERS TABLE (Students & College Staff)
CREATE TABLE IF NOT EXISTS `users` (
  `user_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_name` VARCHAR(120) NOT NULL,
  `usn` VARCHAR(32) NOT NULL,
  `email` VARCHAR(160) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uq_users_usn` (`usn`),
  UNIQUE KEY `uq_users_email` (`email`)
) ENGINE=InnoDB;

-- 2. ADMINS TABLE
CREATE TABLE IF NOT EXISTS `admins` (
  `admin_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(80) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`admin_id`),
  UNIQUE KEY `uq_admins_username` (`username`)
) ENGINE=InnoDB;

-- 3. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS `categories` (
  `category_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `category_name` VARCHAR(80) NOT NULL,
  PRIMARY KEY (`category_id`),
  UNIQUE KEY `uq_categories_name` (`category_name`)
) ENGINE=InnoDB;

-- 4. ITEMS TABLE
CREATE TABLE IF NOT EXISTS `items` (
  `item_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `category_id` INT UNSIGNED NOT NULL,
  `item_name` VARCHAR(150) NOT NULL,
  `description` TEXT NOT NULL,
  `report_type` ENUM('lost', 'found') NOT NULL,
  `item_date` DATE NOT NULL,
  `location` VARCHAR(160) NOT NULL,
  `image` VARCHAR(255) DEFAULT NULL,
  `status` ENUM('pending', 'approved', 'rejected', 'returned') NOT NULL DEFAULT 'pending',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`item_id`),
  KEY `idx_items_user` (`user_id`),
  KEY `idx_items_category` (`category_id`),
  KEY `idx_items_status_type` (`status`, `report_type`),
  CONSTRAINT `fk_items_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_items_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 5. CLAIMS TABLE
CREATE TABLE IF NOT EXISTS `claims` (
  `claim_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `item_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `claim_description` TEXT NOT NULL,
  `supporting_info` TEXT NOT NULL,
  `claim_status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`claim_id`),
  KEY `idx_claims_item` (`item_id`),
  KEY `idx_claims_user` (`user_id`),
  CONSTRAINT `fk_claims_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`item_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_claims_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- DEFAULT CATEGORIES
INSERT INTO `categories` (`category_name`) VALUES
  ('Electronics'),
  ('ID Cards & Keys'),
  ('Books & Stationery'),
  ('Bags & Accessories'),
  ('Wallets & Valuables'),
  ('Clothing & Footwear'),
  ('Lab & Sports Gear'),
  ('Other')
ON DUPLICATE KEY UPDATE `category_name` = VALUES(`category_name`);

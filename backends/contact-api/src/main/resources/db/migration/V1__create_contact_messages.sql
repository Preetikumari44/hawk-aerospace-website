-- V1: baseline table, identical in shape to the original FM project
-- (public_html/contact/create_table.sql). Safe on a database that already has it.
CREATE TABLE IF NOT EXISTS `contact_messages` (
  `id`           INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `name`         VARCHAR(255)  NOT NULL,
  `email`        VARCHAR(255)  NOT NULL,
  `phone`        VARCHAR(100)  DEFAULT NULL,
  `country_code` VARCHAR(10)   DEFAULT NULL,
  `company`      VARCHAR(255)  DEFAULT NULL,
  `country`      VARCHAR(255)  DEFAULT NULL,
  `drone`        VARCHAR(50)   DEFAULT NULL,
  `message`      TEXT,
  `created_at`   DATETIME      DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

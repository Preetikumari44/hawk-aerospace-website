#!/bin/bash
# Runs ONCE, only when the MySQL data volume is empty (official image behaviour). Never drops or resets anything.
# One MySQL server, three SEPARATE databases and three least-privilege users: schemas are not merged.
set -euo pipefail
mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" <<SQL
CREATE DATABASE IF NOT EXISTS \`hawk_contact\`     CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS \`hawk_career\`      CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS \`hawk_distributor\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'hawk_contact'@'%'     IDENTIFIED BY '${CONTACT_DB_PASSWORD}';
CREATE USER IF NOT EXISTS 'hawk_career'@'%'      IDENTIFIED BY '${CAREER_DB_PASSWORD}';
CREATE USER IF NOT EXISTS 'hawk_distributor'@'%' IDENTIFIED BY '${DISTRIBUTOR_DB_PASSWORD}';

-- Contact and Distributor own their schema through Flyway (they create/alter their tables).
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES, DROP ON \`hawk_contact\`.*     TO 'hawk_contact'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES, DROP ON \`hawk_distributor\`.* TO 'hawk_distributor'@'%';
-- Careers never alters its schema (ddl-auto=none): data access only.
GRANT SELECT, INSERT, UPDATE, DELETE ON \`hawk_career\`.* TO 'hawk_career'@'%';
FLUSH PRIVILEGES;
SQL

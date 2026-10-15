-- OPTIONAL and potentially DESTRUCTIVE-IF-MISUSED: read before running. Not applied automatically.
--
-- Purpose: make duplicate protection race-proof across several backend instances. The backend already serialises
-- identical submissions inside one instance and checks for duplicates first; these indexes close the last gap.
--
-- Prerequisites (verify on a COPY of production first):
--   1. `SHOW CREATE TABLE drone_applications;`  -> email / phone must be VARCHAR (an index on TEXT needs a prefix length).
--   2. No existing duplicates, otherwise index creation fails:
--        SELECT email, COUNT(*) c FROM drone_applications GROUP BY email HAVING c > 1;
--        SELECT phone, COUNT(*) c FROM drone_applications GROUP BY phone HAVING c > 1;
--      Resolve any rows returned manually (this script never deletes records).
--   3. Old PHP rows store the email as typed; the backend now stores it lower-cased. MySQL's default
--      case-insensitive collation (utf8mb4_*_ci) treats them as equal, which is the desired behaviour.
--
-- Run:
ALTER TABLE drone_applications ADD UNIQUE INDEX uq_drone_applications_email (email);
ALTER TABLE drone_applications ADD UNIQUE INDEX uq_drone_applications_phone (phone);

import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const PASSWORD_HASH_DELIMITER = ':';
const SALT_LENGTH = 16;
const DERIVED_KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LENGTH).toString('hex');
  const hash = scryptSync(password, salt, DERIVED_KEY_LENGTH).toString('hex');
  return `${salt}${PASSWORD_HASH_DELIMITER}${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(PASSWORD_HASH_DELIMITER);
  if (!salt || !hash) {
    return false;
  }

  const derivedHash = scryptSync(password, salt, DERIVED_KEY_LENGTH);
  const storedHashBuffer = Buffer.from(hash, 'hex');

  return (
    derivedHash.length === storedHashBuffer.length && timingSafeEqual(derivedHash, storedHashBuffer)
  );
}

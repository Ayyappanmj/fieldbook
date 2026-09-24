/**
 * Password hashing using Node's built-in scrypt (no external dependency).
 * A production build could swap this for bcrypt/argon2 without touching
 * anything outside this file — every caller only sees hash() and verify().
 */
import crypto from 'node:crypto';

const KEY_LENGTH = 64;

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, KEY_LENGTH).toString('hex');
  return `scrypt:${salt}:${derived}`;
}

export function verifyPassword(password, stored) {
  const parts = String(stored).split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, hashHex] = parts;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(password, salt, expected.length);
  // Constant-time comparison so response timing can't leak how much of the
  // password guess was correct.
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

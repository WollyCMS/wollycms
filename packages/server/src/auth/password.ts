import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

const SALT_LENGTH = 32;
const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LENGTH).toString('hex');
  const hash = scryptSync(password, salt, KEY_LENGTH).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const hashBuffer = Buffer.from(hash, 'hex');
  const derivedBuffer = scryptSync(password, salt, KEY_LENGTH);
  return timingSafeEqual(hashBuffer, derivedBuffer);
}

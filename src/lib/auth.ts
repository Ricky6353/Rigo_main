import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) {
    return false;
  }
  const hashBuffer = Buffer.from(hash, 'hex');
  const candidate = scryptSync(password, salt, 64);
  if (hashBuffer.length !== candidate.length) {
    return false;
  }
  return timingSafeEqual(hashBuffer, candidate);
}

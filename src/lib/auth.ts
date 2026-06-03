import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  if (!stored || typeof stored !== 'string') return false;

  const colon = stored.indexOf(':');
  if (colon < 0) return false;

  const salt = stored.slice(0, colon);
  const hash = stored.slice(colon + 1);
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

/**
 * TOTP (RFC 6238) implementation using Web Crypto API.
 * Works on both Cloudflare Workers and Node.js 22+.
 */

const DIGITS = 6;
const PERIOD = 30;
const ALGORITHM = 'SHA-1';

/** Base32 alphabet (RFC 4648). */
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** Encode bytes to base32 string. */
export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let result = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      result += BASE32[(value >>> bits) & 0x1f];
    }
  }
  if (bits > 0) {
    result += BASE32[(value << (5 - bits)) & 0x1f];
  }
  return result;
}

/** Decode base32 string to bytes. */
export function base32Decode(input: string): Uint8Array {
  const cleaned = input.replace(/[= ]/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (const char of cleaned) {
    const idx = BASE32.indexOf(char);
    if (idx === -1) throw new Error(`Invalid base32 character: ${char}`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      output.push((value >>> bits) & 0xff);
    }
  }
  return new Uint8Array(output);
}

/** Generate a random 20-byte TOTP secret, returned as base32. */
export function generateTotpSecret(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return base32Encode(bytes);
}

/** Compute HMAC-SHA1 using Web Crypto. */
async function hmacSha1(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const keyBuf = key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) as ArrayBuffer;
  const dataBuf = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyBuf, { name: 'HMAC', hash: ALGORITHM }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, dataBuf);
  return new Uint8Array(sig);
}

/** Generate a TOTP code for a given secret and time. */
export async function totpCode(secret: string, time?: number): Promise<string> {
  const now = time ?? Math.floor(Date.now() / 1000);
  const counter = Math.floor(now / PERIOD);

  // Convert counter to 8-byte big-endian buffer
  const counterBuf = new Uint8Array(8);
  let tmp = counter;
  for (let i = 7; i >= 0; i--) {
    counterBuf[i] = tmp & 0xff;
    tmp = Math.floor(tmp / 256);
  }

  const key = base32Decode(secret);
  const mac = await hmacSha1(key, counterBuf);

  // Dynamic truncation (RFC 4226 §5.4)
  const offset = mac[mac.length - 1] & 0x0f;
  const binary =
    ((mac[offset] & 0x7f) << 24) |
    ((mac[offset + 1] & 0xff) << 16) |
    ((mac[offset + 2] & 0xff) << 8) |
    (mac[offset + 3] & 0xff);

  const otp = binary % 10 ** DIGITS;
  return otp.toString().padStart(DIGITS, '0');
}

/** Verify a TOTP code with a configurable time window (default: ±1 step = 90s). */
export async function verifyTotp(
  secret: string,
  code: string,
  window = 1,
): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  for (let i = -window; i <= window; i++) {
    const expected = await totpCode(secret, now + i * PERIOD);
    if (timingSafeEqual(code, expected)) return true;
  }
  return false;
}

/** Constant-time string comparison to prevent timing attacks. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/** Generate an otpauth:// URI for QR code generation. */
export function generateTotpUri(
  secret: string,
  email: string,
  issuer = 'WollyCMS',
): string {
  const label = encodeURIComponent(`${issuer}:${email}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: ALGORITHM.replace('-', ''),
    digits: String(DIGITS),
    period: String(PERIOD),
  });
  return `otpauth://totp/${label}?${params}`;
}

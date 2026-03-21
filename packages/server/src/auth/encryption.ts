/**
 * AES-256-GCM encryption for TOTP secrets at rest.
 * Uses Web Crypto API (works on Workers and Node.js 22+).
 * Encryption key is derived from JWT_SECRET via HKDF.
 */

const ENC_ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const INFO = new TextEncoder().encode('wollycms-totp-encryption');

/** Derive a 256-bit AES key from the JWT secret using HKDF. */
async function deriveKey(secret: string): Promise<CryptoKey> {
  const raw = new TextEncoder().encode(secret);
  const baseKey = await crypto.subtle.importKey('raw', raw, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: INFO },
    baseKey,
    { name: ENC_ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Hex encode bytes. */
function toHex(buf: Uint8Array): string {
  return Array.from(buf).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Hex decode string to bytes. */
function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

/** Encrypt a plaintext string. Returns "iv:ciphertext" in hex. */
export async function encrypt(plaintext: string, jwtSecret: string): Promise<string> {
  const key = await deriveKey(jwtSecret);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const data = new TextEncoder().encode(plaintext);
  const encrypted = await crypto.subtle.encrypt({ name: ENC_ALGORITHM, iv }, key, data);
  return `${toHex(iv)}:${toHex(new Uint8Array(encrypted))}`;
}

/** Decrypt "iv:ciphertext" hex string back to plaintext. */
export async function decrypt(encrypted: string, jwtSecret: string): Promise<string> {
  const [ivHex, ctHex] = encrypted.split(':');
  if (!ivHex || !ctHex) throw new Error('Invalid encrypted format');
  const key = await deriveKey(jwtSecret);
  const ivArr = fromHex(ivHex);
  const ciphertext = fromHex(ctHex);
  const ivBuf = ivArr.buffer.slice(ivArr.byteOffset, ivArr.byteOffset + ivArr.byteLength) as ArrayBuffer;
  const ctBuf = ciphertext.buffer.slice(ciphertext.byteOffset, ciphertext.byteOffset + ciphertext.byteLength) as ArrayBuffer;
  const decrypted = await crypto.subtle.decrypt({ name: ENC_ALGORITHM, iv: new Uint8Array(ivBuf) }, key, ctBuf);
  return new TextDecoder().decode(decrypted);
}

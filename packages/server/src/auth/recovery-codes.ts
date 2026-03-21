/**
 * Recovery code generation and verification.
 * Codes are hashed with SHA-256 before storage (like API keys).
 */

const CODE_COUNT = 10;
const CODE_LENGTH = 8; // 4 + 4 with dash: XXXX-XXXX

/** SHA-256 hash a string. Uses Web Crypto API. */
async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Generate a single recovery code in XXXX-XXXX format. */
function generateCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  const chars = hex.slice(0, CODE_LENGTH).toUpperCase();
  return `${chars.slice(0, 4)}-${chars.slice(4, 8)}`;
}

/** Normalize a code for comparison (remove dashes, uppercase). */
function normalizeCode(code: string): string {
  return code.replace(/-/g, '').toUpperCase();
}

/**
 * Generate recovery codes.
 * Returns both plaintext (to show user once) and hashed (to store).
 */
export async function generateRecoveryCodes(
  count = CODE_COUNT,
): Promise<{ plaintext: string[]; hashed: string[] }> {
  const plaintext: string[] = [];
  const hashed: string[] = [];

  for (let i = 0; i < count; i++) {
    const code = generateCode();
    plaintext.push(code);
    hashed.push(await sha256Hex(normalizeCode(code)));
  }

  return { plaintext, hashed };
}

/** Hash a recovery code for comparison against stored hashes. */
export async function hashRecoveryCode(code: string): Promise<string> {
  return sha256Hex(normalizeCode(code));
}

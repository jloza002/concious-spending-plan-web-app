import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const ENCODING = "base64url";

/**
 * Returns the 32-byte encryption key from ENCRYPTION_KEY env var.
 * Returns null if not configured (encryption disabled).
 */
function getKey(): Buffer | null {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length === 0) return null;
  if (hex.length !== 64) {
    throw new Error("ENCRYPTION_KEY must be a 64-character hex string (32 bytes)");
  }
  return Buffer.from(hex, "hex");
}

/**
 * Encrypt a numeric value to a ciphertext string.
 * Returns the original value as a string if encryption is not configured.
 * Format: base64url(iv) + "." + base64url(tag) + "." + base64url(ciphertext)
 */
export function encryptNumber(value: number): string {
  const key = getKey();
  if (!key) return String(value);

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv) as crypto.CipherGCM;
  const plaintext = Buffer.from(String(value), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    iv.toString(ENCODING),
    tag.toString(ENCODING),
    encrypted.toString(ENCODING),
  ].join(".");
}

/**
 * Decrypt a ciphertext string back to a number.
 * If encryption is not configured, parses the value as a plain number.
 */
export function decryptNumber(ciphertext: string): number {
  const key = getKey();
  if (!key) return parseFloat(ciphertext);

  const parts = ciphertext.split(".");
  if (parts.length !== 3) {
    // Fallback: treat as plain number (migration period)
    const n = parseFloat(ciphertext);
    return isNaN(n) ? 0 : n;
  }

  const [ivB64, tagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64, ENCODING);
  const tag = Buffer.from(tagB64, ENCODING).slice(0, TAG_LENGTH);
  const data = Buffer.from(dataB64, ENCODING);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv) as crypto.DecipherGCM;
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return parseFloat(decrypted.toString("utf8"));
}

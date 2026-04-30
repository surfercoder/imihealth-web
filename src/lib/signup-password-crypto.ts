import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  type CipherGCM,
  type DecipherGCM,
} from "crypto";

// AES-256-GCM: 32-byte key, 12-byte IV, 16-byte auth tag.
// Stored format (base64): [iv (12)] [authTag (16)] [ciphertext (n)].
const ALGORITHM = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

function key(): Buffer {
  const raw = process.env.SIGNUP_ENC_KEY;
  if (!raw) {
    throw new Error("SIGNUP_ENC_KEY is not configured");
  }
  const buf = Buffer.from(raw, "hex");
  if (buf.length !== 32) {
    throw new Error("SIGNUP_ENC_KEY must be 32 bytes (64 hex chars)");
  }
  return buf;
}

export function encryptPassword(plaintext: string): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGORITHM, key(), iv) as CipherGCM;
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

export function decryptPassword(stored: string): string {
  const buf = Buffer.from(stored, "base64");
  if (buf.length < IV_LEN + TAG_LEN) {
    throw new Error("ciphertext too short");
  }
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ciphertext = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGORITHM, key(), iv) as DecipherGCM;
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
    "utf8",
  );
}

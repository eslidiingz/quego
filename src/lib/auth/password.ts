import "server-only";
import { scrypt as scryptCb, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number },
) => Promise<Buffer>;

const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;
const SALT_BYTES = 16;

/** Format: scrypt$N$r$p$saltBase64$keyBase64 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await scrypt(password, salt, KEYLEN, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  // Only our own cost parameters are accepted (audit L7): a stored hash can't
  // pick a weaker N/r/p, or a huge one that pins the CPU, or a short key.
  if (parts[1] !== String(N) || parts[2] !== String(R) || parts[3] !== String(P)) {
    return false;
  }
  const salt = Buffer.from(parts[4], "base64");
  const expected = Buffer.from(parts[5], "base64");
  if (expected.length !== KEYLEN) return false;
  const actual = await scrypt(password, salt, KEYLEN, { N, r: R, p: P });
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

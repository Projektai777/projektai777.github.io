// =============================================================
// Lojalumas — rotating staff code (TOTP-like), pure client-side.
//
// Staff open /tools/staff.html (password-gated) and read a 6-digit
// code (or QR) that changes every 30 s, like a 2FA token. The
// customer types it on their OWN phone (or scans the QR), and the
// card validates it here — so the phone never leaves the customer.
//
// HMAC-SHA1 over a 30 s counter, RFC-6238 style, truncated to 6
// digits. The per-tenant secret lives in tenants.js (like the old
// PIN hash): this is good-enough DETERRENCE for a static, no-backend
// product, NOT cryptographic secrecy. The rotation is what stops a
// customer reusing a code they once saw.
//
// © 2026 Lojalumas. All rights reserved. Proprietary — see LICENSE.
// =============================================================

const PERIOD = 30; // seconds each code is shown
const DIGITS = 6;
const WINDOW = 1; // accept ±1 step (clock skew + the seconds it takes to type)

async function hmacSha1(keyBytes, msgBytes) {
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, msgBytes));
}

// 8-byte big-endian counter.
function counterBytes(counter) {
  const b = new Uint8Array(8);
  for (let i = 7; i >= 0; i--) { b[i] = counter & 0xff; counter = Math.floor(counter / 256); }
  return b;
}

async function codeForCounter(secret, counter) {
  const mac = await hmacSha1(new TextEncoder().encode(secret), counterBytes(counter));
  const off = mac[mac.length - 1] & 0x0f;
  const bin = ((mac[off] & 0x7f) << 24) | (mac[off + 1] << 16) | (mac[off + 2] << 8) | mac[off + 3];
  return String(bin % 10 ** DIGITS).padStart(DIGITS, '0');
}

// The code to SHOW right now (staff page). epochMs override for tests.
export async function currentCode(secret, epochMs = Date.now()) {
  return codeForCounter(secret, Math.floor(epochMs / 1000 / PERIOD));
}

// Seconds until the visible code rotates — for the countdown ring.
export function secondsLeft(epochMs = Date.now()) {
  return PERIOD - (Math.floor(epochMs / 1000) % PERIOD);
}

// Validate a typed/scanned code against the accepted ±WINDOW window.
export async function verifyCode(secret, code, epochMs = Date.now()) {
  const c = String(code || '').trim();
  if (!secret || !/^\d{6}$/.test(c)) return false;
  const base = Math.floor(epochMs / 1000 / PERIOD);
  for (let w = -WINDOW; w <= WINDOW; w++) {
    if (await codeForCounter(secret, base + w) === c) return true;
  }
  return false;
}

export const TOTP_PERIOD = PERIOD;
export const TOTP_DIGITS = DIGITS;

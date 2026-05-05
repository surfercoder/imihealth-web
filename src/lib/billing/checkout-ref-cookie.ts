// Per-checkout cookie that carries the user_id (or pending_signups id) across
// the MP redirect. MP's plan-based subscription checkout drops any
// external_reference we try to attach to the init_point URL, so we stash the
// reference in a signed HttpOnly cookie before redirecting and read it back on
// /billing/return. The webhook never needs this cookie — once /billing/return
// links the preapproval to a subscriptions row, follow-up webhook events
// resolve via mp_preapproval_id.

import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "mp_checkout_ref";
const TTL_SECONDS = 60 * 30;

interface Payload {
  ref: string;
  exp: number;
}

interface ReadableCookieStore {
  get(name: string): { value: string } | undefined;
}

interface MutableCookieStore extends ReadableCookieStore {
  set(
    name: string,
    value: string,
    options: {
      httpOnly: boolean;
      secure: boolean;
      sameSite: "lax";
      path: string;
      maxAge: number;
    },
  ): unknown;
}

function secret(): string {
  const s = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!s) throw new Error("MERCADOPAGO_WEBHOOK_SECRET is not configured");
  return s;
}

function sign(payloadB64: string, key: string): string {
  return createHmac("sha256", key).update(payloadB64).digest("base64url");
}

function verifyMac(payloadB64: string, mac: string, key: string): boolean {
  const expected = sign(payloadB64, key);
  if (expected.length !== mac.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(mac));
}

export function encodeCheckoutRef(
  ref: string,
  nowMs: number = Date.now(),
): string {
  const payload: Payload = { ref, exp: nowMs + TTL_SECONDS * 1000 };
  const json = JSON.stringify(payload);
  const payloadB64 = Buffer.from(json, "utf8").toString("base64url");
  const mac = sign(payloadB64, secret());
  return `${payloadB64}.${mac}`;
}

export function decodeCheckoutRef(
  raw: string,
  nowMs: number = Date.now(),
): string | null {
  const dot = raw.indexOf(".");
  if (dot === -1) return null;
  const payloadB64 = raw.slice(0, dot);
  const mac = raw.slice(dot + 1);
  let key: string;
  try {
    key = secret();
  } catch {
    return null;
  }
  if (!verifyMac(payloadB64, mac, key)) return null;
  let parsed: Payload;
  try {
    parsed = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8"),
    ) as Payload;
  } catch {
    return null;
  }
  if (typeof parsed.ref !== "string" || typeof parsed.exp !== "number") {
    return null;
  }
  if (parsed.exp <= nowMs) return null;
  return parsed.ref;
}

export function setCheckoutRefCookie(
  store: MutableCookieStore,
  ref: string,
): void {
  store.set(COOKIE_NAME, encodeCheckoutRef(ref), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // Lax keeps the cookie on the top-level redirect back from MP's domain.
    sameSite: "lax",
    path: "/",
    maxAge: TTL_SECONDS,
  });
}

export function readCheckoutRefCookie(
  store: ReadableCookieStore,
): string | null {
  const c = store.get(COOKIE_NAME);
  if (!c?.value) return null;
  return decodeCheckoutRef(c.value);
}

export const __testing = { COOKIE_NAME, TTL_SECONDS };

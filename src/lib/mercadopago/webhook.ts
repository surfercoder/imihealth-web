// Verifies MercadoPago webhook signatures.
//
// MP signs notifications with HMAC-SHA256 over a manifest string of the form:
//   id:<dataId>;request-id:<x-request-id>;ts:<ts>;
// where <dataId> is the alphanumeric ID from the `data.id` query param,
// <ts> is the timestamp from the x-signature header, and the secret is
// the per-application webhook secret (configured in MP dashboard).

import { createHmac, timingSafeEqual } from "crypto";

interface ParsedSignature {
  ts: string;
  v1: string;
}

function parseSignature(header: string): ParsedSignature | null {
  const parts = header.split(",").map((p) => p.trim());
  let ts = "";
  let v1 = "";
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k === "ts") ts = v;
    else if (k === "v1") v1 = v;
  }
  if (!ts || !v1) return null;
  return { ts, v1 };
}

function constantTimeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const ab = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  // Buffer.from('hex') silently drops invalid chars: equal-length strings can
  // still decode to different-length buffers, which would crash timingSafeEqual.
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export interface VerifyInput {
  /** Raw `x-signature` header. */
  signatureHeader: string | null;
  /** Raw `x-request-id` header. */
  requestId: string | null;
  /** `data.id` value from query string (alphanumeric IDs must be lowercased per MP). */
  dataId: string | null;
  /** Webhook secret from the MP dashboard. */
  secret: string | undefined;
}

export interface VerifyResult {
  ok: boolean;
  reason?: string;
}

export function verifyWebhookSignature(input: VerifyInput): VerifyResult {
  const { signatureHeader, requestId, dataId, secret } = input;
  if (!secret) return { ok: false, reason: "missing-secret" };
  if (!signatureHeader) return { ok: false, reason: "missing-signature" };
  if (!requestId) return { ok: false, reason: "missing-request-id" };
  if (!dataId) return { ok: false, reason: "missing-data-id" };

  const parsed = parseSignature(signatureHeader);
  if (!parsed) return { ok: false, reason: "invalid-signature-format" };

  // MP recommends lowercasing alphanumeric data.id values before signing.
  const normalizedId = dataId.toLowerCase();
  const manifest = `id:${normalizedId};request-id:${requestId};ts:${parsed.ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");

  if (!constantTimeEqualHex(expected, parsed.v1)) {
    return { ok: false, reason: "signature-mismatch" };
  }
  return { ok: true };
}

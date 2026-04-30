// Polled by /billing/return after a deferred-signup payment to detect when the
// MP webhook has materialized the auth user. Returns:
//   { state: "processing" }  → pending_signups row still present
//   { state: "ready" }       → row gone, account exists and verification email sent
//   { state: "unknown" }     → no matching ref (typo, replay, or row never existed)

import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const ref = new URL(request.url).searchParams.get("ref");
  if (!ref || !UUID_RE.test(ref)) {
    return NextResponse.json({ state: "unknown" });
  }

  const admin = createServiceClient();
  const { data } = await admin
    .from("pending_signups")
    .select("id")
    .eq("id", ref)
    .maybeSingle();

  return NextResponse.json({ state: data ? "processing" : "ready" });
}

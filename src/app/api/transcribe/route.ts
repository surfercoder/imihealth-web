import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getAuthedSupabase } from "@/utils/supabase/api-auth";
import { transcribeAudio } from "@/lib/transcribe";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const { supabase, user } = await getAuthedSupabase(request);
  if (!supabase || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed, retryAfter } = checkRateLimit(user.id, {
    key: "transcribe",
    limit: 10,
    windowSeconds: 60,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  const body = await request.json().catch(() => ({}));
  const audioPath = typeof body.audioPath === "string" ? body.audioPath : "";
  const language = typeof body.language === "string" ? body.language : "es";

  if (!audioPath) {
    return NextResponse.json({ error: "Missing audioPath" }, { status: 400 });
  }

  let transcript = "";
  try {
    const { data: audioData, error: downloadError } = await supabase.storage
      .from("audio-recordings")
      .download(audioPath);
    if (downloadError || !audioData) {
      return NextResponse.json(
        { error: downloadError?.message ?? "Audio not found" },
        { status: 404 },
      );
    }
    const buffer = Buffer.from(await audioData.arrayBuffer());
    const langCode = language === "en" ? "en" : "es";
    const result = await transcribeAudio(buffer, langCode);
    transcript = result.text ?? "";
  } catch (err) {
    Sentry.captureException(err, { tags: { flow: "transcribe" } });
    const message = err instanceof Error ? err.message : "Transcription failed";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    const { error: removeError } = await supabase.storage
      .from("audio-recordings")
      .remove([audioPath]);
    if (removeError) {
      console.warn(`[transcribe] Storage cleanup failed: ${removeError.message}`);
    }
  }

  return NextResponse.json({ transcript });
}

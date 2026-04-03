"use server";

import { createClient } from "@/utils/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { transcribeAudio } from "@/lib/transcribe";
import { getSpecialtyPrompt } from "@/lib/prompts";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function processQuickInforme(
  browserTranscript: string,
  audioBlob?: Blob,
  language: string = "es"
): Promise<{ informeDoctor?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  try {
    let transcript = browserTranscript;

    // Transcribe audio with AssemblyAI if provided
    if (audioBlob) {
      try {
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = Buffer.from(arrayBuffer);
        const langCode = language === "en" ? "en" : "es";
        const result = await transcribeAudio(audioBuffer, langCode);
        if (result.text) {
          transcript = result.text;
        }
      } catch (transcribeError) {
        console.warn("AssemblyAI transcription failed, using browser transcript:", transcribeError);
      }
    }

    // Fetch doctor's specialty for prompt selection
    const { data: doctorData } = await supabase
      .from("doctors")
      .select("especialidad")
      .eq("id", user.id)
      .single();

    const specialtyPrompt = getSpecialtyPrompt(doctorData?.especialidad);

    const response = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 8192,
      system: specialtyPrompt,
      messages: [
        {
          role: "user",
          content: `Basándote en la siguiente transcripción de una consulta médica, genera SOLO el informe para el doctor.

TRANSCRIPCIÓN:
${transcript}

---

Genera la respuesta en el siguiente formato JSON exacto (sin markdown, solo JSON puro):
{
  "informe_doctor": "..."
}

INFORME PARA EL DOCTOR (informe_doctor):
- Sigue ESTRICTAMENTE el formato de salida definido en tus instrucciones de sistema para esta especialidad
- Detallado y técnico, con terminología médica apropiada
- Incluye clasificaciones, scores y códigos CIE-10 según corresponda
- Formato estructurado con secciones claras usando saltos de línea`,
        },
      ],
    });

    const responseText =
      response.content[0].type === "text"
        ? response.content[0].text
        : "{}";

    let informeDoctor = "";

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    try {
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
      informeDoctor = parsed.informe_doctor || "";
    } catch {
      informeDoctor = responseText;
    }

    return { informeDoctor };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return { error: message };
  }
}

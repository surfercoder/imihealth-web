import { ANTHROPIC_MODEL } from "@/lib/ai-model";
import { anthropic, extractTextFromContent } from "./helpers";

interface DialogParseResult {
  transcriptType: "dialog" | "monologue";
  transcriptDialog: unknown[] | null;
}

function parseDialogResponse(dialogText: string): DialogParseResult {
  const dialogJson = dialogText.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(dialogJson ? dialogJson[0] : dialogText);
  const transcriptType = parsed.transcript_type === "monologue" ? "monologue" : "dialog";
  const transcriptDialog = Array.isArray(parsed.dialog) && parsed.dialog.length > 0 ? parsed.dialog : null;
  return { transcriptType, transcriptDialog };
}

type SupabaseLike = {
  from: (table: string) => {
    update: (data: object) => {
      eq: (col: string, val: string) => {
        eq: (col: string, val: string) => PromiseLike<unknown>;
      };
    };
  };
};

/**
 * Fire-and-forget background extraction of structured dialog from a transcript.
 * Updates the informe row in place. Errors are logged and swallowed.
 */
export function extractDialogInBackground(
  transcript: string,
  informeId: string,
  doctorId: string,
  supabase: SupabaseLike,
): void {
  anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `Analiza esta transcripción de consulta médica y extrae el diálogo estructurado.

TRANSCRIPCIÓN:
${transcript}

Responde en JSON puro (sin markdown):
{
  "transcript_type": "dialog" o "monologue",
  "dialog": [{"speaker": "doctor" o "paciente", "text": "..."}]
}

- "dialog" si hay dos personas conversando, "monologue" si solo habla el doctor
- Si es monologue, deja dialog como []
- Infiere quién habla por contexto: doctor pregunta/diagnostica, paciente describe síntomas
- Mantén el texto original sin modificar`,
      },
    ],
  }).then(async (dialogResponse) => {
    try {
      const dialogText = extractTextFromContent(dialogResponse);
      const { transcriptType, transcriptDialog } = parseDialogResponse(dialogText);
      await supabase
        .from("informes")
        .update({ transcript_dialog: transcriptDialog, transcript_type: transcriptType })
        .eq("id", informeId)
        .eq("doctor_id", doctorId);
    } catch (e) {
      console.warn("[process-informe] Background dialog extraction failed:", e);
    }
  }).catch((e) => {
    console.warn("[process-informe] Background dialog extraction failed:", e);
  });
}

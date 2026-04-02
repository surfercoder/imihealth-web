import { AssemblyAI, TranscriptUtterance } from "assemblyai";

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY!,
});

export interface TranscriptionResult {
  text: string;
  utterances: Array<{ speaker: string; text: string }> | null;
}

/**
 * Transcribes audio using AssemblyAI with speaker diarization.
 * Accepts either a public URL or a local file buffer.
 */
export async function transcribeAudio(
  audioSource: string | Buffer,
  languageCode: string = "es"
): Promise<TranscriptionResult> {
  const transcriptConfig: Parameters<typeof client.transcripts.transcribe>[0] = {
    audio: audioSource,
    speech_models: ["universal-3-pro", "universal-2"],
    language_code: languageCode,
    speaker_labels: true,
  };

  const transcript = await client.transcripts.transcribe(transcriptConfig);

  if (transcript.status === "error") {
    throw new Error(
      `Transcription failed: ${transcript.error ?? "Unknown error"}`
    );
  }

  const utterances = transcript.utterances
    ? transcript.utterances.map((u: TranscriptUtterance) => ({
        speaker: u.speaker,
        text: u.text,
      }))
    : null;

  return {
    text: transcript.text ?? "",
    utterances,
  };
}

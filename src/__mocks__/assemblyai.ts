export const __mockTranscribe = jest.fn().mockResolvedValue({ text: '', utterances: null });

export class AssemblyAI {
  constructor() {}
  transcripts = {
    transcribe: __mockTranscribe,
  };
}

export type TranscriptUtterance = {
  speaker: string;
  text: string;
};

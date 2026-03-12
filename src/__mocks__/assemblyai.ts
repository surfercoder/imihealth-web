export class AssemblyAI {
  constructor() {}
  transcripts = {
    transcribe: jest.fn().mockResolvedValue({ text: '', utterances: null }),
  };
}

export type TranscriptUtterance = {
  speaker: string;
  text: string;
};

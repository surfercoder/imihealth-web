export type Phase = "idle" | "recording" | "paused" | "review" | "generating" | "success";

export interface State {
  open: boolean;
  phase: Phase;
  duration: number;
  liveTranscript: string;
  finalTranscript: string;
  itemsText: string;
  diagnostico: string;
  mergedUrl: string | null;
  error: string | null;
}

export type Action =
  | { type: "OPEN" }
  | { type: "CLOSE" }
  | { type: "START_RECORDING" }
  | { type: "PAUSE_RECORDING" }
  | { type: "RESUME_RECORDING" }
  | { type: "TICK" }
  | { type: "SET_LIVE_TRANSCRIPT"; transcript: string }
  | { type: "STOP_AND_REVIEW"; transcript: string; itemsText: string; diagnostico: string }
  | { type: "SET_ITEMS_TEXT"; value: string }
  | { type: "SET_DIAGNOSTICO"; value: string }
  | { type: "SET_GENERATING" }
  | { type: "SET_SUCCESS"; mergedUrl: string }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "RESET_TO_IDLE" };

export const initialState: State = {
  open: false,
  phase: "idle",
  duration: 0,
  liveTranscript: "",
  finalTranscript: "",
  itemsText: "",
  diagnostico: "",
  mergedUrl: null,
  error: null,
};

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "OPEN":
      return { ...initialState, open: true };
    case "CLOSE":
      return initialState;
    case "START_RECORDING":
      return {
        ...state,
        phase: "recording",
        duration: 0,
        liveTranscript: "",
        finalTranscript: "",
        error: null,
      };
    case "PAUSE_RECORDING":
      return { ...state, phase: "paused" };
    case "RESUME_RECORDING":
      return { ...state, phase: "recording" };
    case "TICK":
      return { ...state, duration: state.duration + 1 };
    case "SET_LIVE_TRANSCRIPT":
      return { ...state, liveTranscript: action.transcript };
    case "STOP_AND_REVIEW":
      return {
        ...state,
        phase: "review",
        finalTranscript: action.transcript,
        itemsText: action.itemsText,
        diagnostico: action.diagnostico,
      };
    case "SET_ITEMS_TEXT":
      return { ...state, itemsText: action.value };
    case "SET_DIAGNOSTICO":
      return { ...state, diagnostico: action.value };
    case "SET_GENERATING":
      return { ...state, phase: "generating", error: null };
    case "SET_SUCCESS":
      return { ...state, phase: "success", mergedUrl: action.mergedUrl };
    case "SET_ERROR":
      return { ...state, error: action.error };
    case "RESET_TO_IDLE":
      return { ...initialState, open: state.open };
  }
}

export function parseItemsText(text: string): string[] {
  const items: string[] = [];
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line.startsWith("-")) continue;
    const value = line.slice(1).trim();
    if (value) items.push(value);
  }
  return items;
}

export function itemsToText(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

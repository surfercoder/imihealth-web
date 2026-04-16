export type State = {
  open: boolean;
  daysOff: string;
  diagnosis: string;
  observations: string;
  certUrl: string | null;
};

export type Action =
  | { type: "OPEN" }
  | { type: "CLOSE" }
  | { type: "SET_FIELD"; field: "daysOff" | "diagnosis" | "observations"; value: string }
  | { type: "SET_CERT_URL"; url: string }
  | { type: "RESET_FORM"; defaultDiagnosis?: string };

export const initialState: State = {
  open: false,
  daysOff: "",
  diagnosis: "",
  observations: "",
  certUrl: null,
};

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "OPEN":
      return { ...state, open: true };
    case "CLOSE":
      return initialState;
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "SET_CERT_URL":
      return { ...state, certUrl: action.url };
    case "RESET_FORM":
      return { ...state, certUrl: null, daysOff: "", diagnosis: action.defaultDiagnosis ?? "", observations: "" };
    /* v8 ignore next 2 */
    default:
      return state;
  }
}

export function buildCertOptions(state: State) {
  return {
    daysOff: state.daysOff ? parseInt(state.daysOff, 10) : null,
    diagnosis: state.diagnosis.trim() || null,
    observations: state.observations.trim() || null,
  };
}

export type State = {
  open: boolean;
  items: string;
  pedidoUrls: string[] | null;
};

export type Action =
  | { type: "OPEN"; items: string }
  | { type: "CLOSE" }
  | { type: "SET_ITEMS"; value: string }
  | { type: "SET_PEDIDO_URLS"; urls: string[] }
  | { type: "RESET_FORM"; items: string };

export const initialState: State = {
  open: false,
  items: "",
  pedidoUrls: null,
};

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "OPEN":
      return { ...state, open: true, items: action.items };
    case "CLOSE":
      return initialState;
    case "SET_ITEMS":
      return { ...state, items: action.value };
    case "SET_PEDIDO_URLS":
      return { ...state, pedidoUrls: action.urls };
    case "RESET_FORM":
      return { ...state, pedidoUrls: null, items: action.items };
    default:
      return state;
  }
}

export function parseItems(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim())
    .filter(Boolean);
}

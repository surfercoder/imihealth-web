export type State = {
  open: boolean;
  items: string;
  pedidoUrls: string[] | null;
  mergedUrl: string | null;
};

export type Action =
  | { type: "OPEN"; items: string }
  | { type: "CLOSE" }
  | { type: "SET_ITEMS"; value: string }
  | { type: "SET_PEDIDO_URLS"; urls: string[]; mergedUrl: string }
  | { type: "RESET_FORM"; items: string };

export const initialState: State = {
  open: false,
  items: "",
  pedidoUrls: null,
  mergedUrl: null,
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
      return { ...state, pedidoUrls: action.urls, mergedUrl: action.mergedUrl };
    case "RESET_FORM":
      return { ...state, pedidoUrls: null, mergedUrl: null, items: action.items };
    default:
      return state;
  }
}

export function parseItems(text: string): string[] {
  const items: string[] = [];
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line.startsWith("-")) continue;
    const value = line.slice(1).trim();
    if (value) items.push(value);
  }
  return items;
}

import type { PatientSearchResult } from "@/actions/patients";

export interface SearchState {
  query: string;
  results: PatientSearchResult[];
  isOpen: boolean;
  activeIndex: number;
  hasSearched: boolean;
}

export type SearchAction =
  | { type: "SET_QUERY"; query: string }
  | { type: "SET_RESULTS"; results: PatientSearchResult[] }
  | { type: "SET_OPEN"; isOpen: boolean }
  | { type: "SET_ACTIVE_INDEX"; index: number }
  | { type: "CLEAR" }
  | { type: "CLOSE_DROPDOWN" };

export const initialState: SearchState = {
  query: "",
  results: [],
  isOpen: false,
  activeIndex: -1,
  hasSearched: false,
};

export function searchReducer(state: SearchState, action: SearchAction): SearchState {
  switch (action.type) {
    case "SET_QUERY":
      return { ...state, query: action.query };
    case "SET_RESULTS":
      return {
        ...state,
        results: action.results,
        hasSearched: true,
        isOpen: true,
        activeIndex: -1,
      };
    case "SET_OPEN":
      return { ...state, isOpen: action.isOpen };
    case "SET_ACTIVE_INDEX":
      return { ...state, activeIndex: action.index };
    case "CLEAR":
      return initialState;
    case "CLOSE_DROPDOWN":
      return { ...state, results: [], isOpen: false, hasSearched: false };
    /* v8 ignore next 2 */
    default:
      return state;
  }
}

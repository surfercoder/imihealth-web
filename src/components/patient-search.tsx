"use client";

import { Suspense, useReducer, useRef, useEffect, useCallback } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { searchPatients } from "@/actions/patients";
import type { PatientSearchResult } from "@/actions/patients";
import { useCurrentTab } from "@/hooks/use-current-tab";

interface SearchState {
  query: string;
  results: PatientSearchResult[];
  isOpen: boolean;
  activeIndex: number;
  hasSearched: boolean;
}

type SearchAction =
  | { type: "SET_QUERY"; query: string }
  | { type: "SET_RESULTS"; results: PatientSearchResult[] }
  | { type: "SET_OPEN"; isOpen: boolean }
  | { type: "SET_ACTIVE_INDEX"; index: number }
  | { type: "CLEAR" }
  | { type: "CLOSE_DROPDOWN" };

const initialState: SearchState = {
  query: "",
  results: [],
  isOpen: false,
  activeIndex: -1,
  hasSearched: false,
};

function searchReducer(state: SearchState, action: SearchAction): SearchState {
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

interface PatientSearchProps {
  className?: string;
  placeholder?: string;
  onSearchChange?: (query: string) => void;
}

function PatientSearchContent({
  className,
  placeholder,
  onSearchChange,
}: PatientSearchProps) {
  const t = useTranslations("patientSearch");
  const router = useRouter();
  const currentTab = useCurrentTab();
  const [state, dispatch] = useReducer(searchReducer, initialState);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        dispatch({ type: "SET_OPEN", isOpen: false });
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  const performSearch = useCallback(async (value: string) => {
    const result = await searchPatients(value);
    const data = result.data ?? [];
    dispatch({ type: "SET_RESULTS", results: data });
  }, []);

  const handleChange = (value: string) => {
    dispatch({ type: "SET_QUERY", query: value });
    /* v8 ignore next */
    onSearchChange?.(value);

    if (value.trim().length < 2) {
      dispatch({ type: "CLOSE_DROPDOWN" });
      if (debounceRef.current) clearTimeout(debounceRef.current);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  };

  const handleClear = () => {
    dispatch({ type: "CLEAR" });
    /* v8 ignore next */
    onSearchChange?.("");
    inputRef.current?.focus();
  };

  const selectPatient = (patient: PatientSearchResult) => {
    const url = currentTab ? `/patients/${patient.id}?tab=${currentTab}` : `/patients/${patient.id}`;
    router.push(url);
    dispatch({ type: "CLEAR" });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!state.isOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        dispatch({ type: "SET_ACTIVE_INDEX", index: Math.min(state.activeIndex + 1, state.results.length - 1) });
        break;
      case "ArrowUp":
        e.preventDefault();
        dispatch({ type: "SET_ACTIVE_INDEX", index: Math.max(state.activeIndex - 1, 0) });
        break;
      case "Enter":
        e.preventDefault();
        if (state.activeIndex >= 0 && state.activeIndex < state.results.length) {
          selectPatient(state.results[state.activeIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        dispatch({ type: "SET_OPEN", isOpen: false });
        break;
    }
  };

  const handleFocus = () => {
    if (state.results.length > 0 && state.query.trim().length >= 2) {
      dispatch({ type: "SET_OPEN", isOpen: true });
    }
  };

  const showDropdown = state.isOpen && state.hasSearched;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
      <Input
        ref={inputRef}
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls="patient-search-results"
        aria-autocomplete="list"
        value={state.query}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        placeholder={placeholder ?? t("placeholder")}
        className="pl-9 pr-9 bg-card border-border text-card-foreground placeholder:text-muted-foreground focus-visible:ring-primary/50"
        autoComplete="off"
      />
      {state.query && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground hover:text-card-foreground transition-colors"
          aria-label={t("clearSearch")}
        >
          <X className="size-4" />
        </button>
      )}
      {showDropdown && (
        <div
          id="patient-search-results"
          role="listbox"
          className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-80 overflow-y-auto"
        >
          {state.results.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">
              <p>{t("noResults", { query: state.query })}</p>
              <p className="text-xs mt-1">{t("noResultsHint")}</p>
            </div>
          ) : (
            state.results.map((patient, index) => (
              <div
                key={patient.id}
                role="option"
                aria-selected={index === state.activeIndex}
              >
                <button
                  type="button"
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors",
                    index === state.activeIndex && "bg-muted"
                  )}
                  onClick={() => selectPatient(patient)}
                  onMouseEnter={() => dispatch({ type: "SET_ACTIVE_INDEX", index })}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{patient.name}</span>
                      {patient.match_type === "report" && (
                        <span className="ml-2 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                          {t("inReport")}
                        </span>
                      )}
                    </div>
                    {patient.informe_count > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {patient.informe_count} {patient.informe_count === 1 ? t("report") : t("reports")}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {patient.phone}
                  </div>
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function PatientSearch(props: PatientSearchProps) {
  return (
    <Suspense fallback={null}>
      <PatientSearchContent {...props} />
    </Suspense>
  );
}

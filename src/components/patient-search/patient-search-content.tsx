"use client";

import { useReducer, useRef, useEffect, useCallback } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { searchPatients } from "@/actions/patients";
import type { PatientSearchResult } from "@/actions/patients";
import { useCurrentTab } from "@/hooks/use-current-tab";
import { searchReducer, initialState } from "./search-reducer";
import { PatientSearchResults } from "./patient-search-results";

export interface PatientSearchProps {
  className?: string;
  placeholder?: string;
  onSearchChange?: (query: string) => void;
}

export function PatientSearchContent({
  className,
  placeholder,
  onSearchChange,
}: PatientSearchProps) {
  const t = useTranslations("patientSearch");
  const { push } = useRouter();
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
    push(url);
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

  const handleSearchFocus = () => {
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
        onFocus={handleSearchFocus}
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
        <PatientSearchResults
          query={state.query}
          results={state.results}
          activeIndex={state.activeIndex}
          onSelect={selectPatient}
          onHover={(index) => dispatch({ type: "SET_ACTIVE_INDEX", index })}
        />
      )}
    </div>
  );
}

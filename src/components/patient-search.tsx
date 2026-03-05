"use client";

import { useState, useEffect, useRef, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, User, FileText, Phone, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { searchPatients, type PatientSearchResult } from "@/actions/patients";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";

interface PatientSearchProps {
  className?: string;
  placeholder?: string;
}

export function PatientSearch({
  className,
  placeholder,
}: PatientSearchProps) {
  const t = useTranslations("patientSearch");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PatientSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const { data } = await searchPatients(value);
        setResults(data ?? []);
        setOpen(true);
        setActiveIndex(-1);
      });
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  function handleSelect(patient: PatientSearchResult) {
    setOpen(false);
    setQuery("");
    router.push(`/patients/${patient.id}`);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(results[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showDropdown = open && query.trim().length >= 2;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            runSearch(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0 && query.trim().length >= 2) setOpen(true);
          }}
          placeholder={placeholder ?? t("placeholder")}
          className="pl-9 pr-9 bg-card border-border text-card-foreground placeholder:text-muted-foreground focus-visible:ring-primary/50"
          autoComplete="off"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls="patient-search-results"
          aria-autocomplete="list"
        />
        {isPending ? (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground animate-spin" />
        ) : query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
              setOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground hover:text-card-foreground transition-colors"
            aria-label={t("clearSearch")}
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      {showDropdown && (
        <div
          id="patient-search-results"
          role="listbox"
          className="absolute top-full mt-1.5 left-0 right-0 z-50 rounded-xl border border-border bg-card shadow-xl overflow-hidden"
        >
          {results.length === 0 && !isPending ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <User className="size-8 text-muted-foreground mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">{t("noResults", { query })}</p>
              <p className="text-xs text-muted-foreground mt-1 opacity-70">
                {t("noResultsHint")}
              </p>
            </div>
          ) : (
            <ul className="py-1 max-h-80 overflow-y-auto">
              {results.map((patient, i) => (
                <li key={patient.id} role="option" aria-selected={i === activeIndex}>
                  <button
                    type="button"
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                      "hover:bg-muted/50 focus:bg-muted/50 focus:outline-none",
                      i === activeIndex && "bg-muted/50"
                    )}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => handleSelect(patient)}
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <User className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-card-foreground truncate">
                          {patient.name}
                        </span>
                        {patient.match_type === "report" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 text-accent border border-accent/20 px-1.5 py-0.5 text-[10px] font-medium shrink-0">
                            <FileText className="size-2.5" />
                            {t("inReport")}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 truncate">
                          <Phone className="size-3 shrink-0" />
                          {patient.phone}
                        </span>
                        {patient.informe_count > 0 && (
                          <span className="flex items-center gap-1 shrink-0">
                            <FileText className="size-3" />
                            {patient.informe_count}{" "}
                            {patient.informe_count === 1 ? t("report") : t("reports")}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

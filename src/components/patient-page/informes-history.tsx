"use client";

import { useState, useMemo } from "react";
import { FileText, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { InformeHistoryItem, type InformeHistoryItemData } from "./informe-history-item";

interface InformesHistoryProps {
  informes: InformeHistoryItemData[];
  labels: {
    history: string;
    countLabel: string;
    noConsults: string;
    noConsultsHint: string;
    reportLinkLabel: string;
    searchPlaceholder: string;
    noSearchResults: string;
  };
}

export function InformesHistory({ informes, labels }: InformesHistoryProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return informes;
    return informes.filter((informe) => {
      const dateMatch =
        informe.date.toLowerCase().includes(q) ||
        informe.dateSearch.includes(q);
      const textMatch = informe.rawText?.toLowerCase().includes(q);
      return dateMatch || textMatch;
    });
  }, [query, informes]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">{labels.history}</h2>
        <Badge variant="secondary" className="text-xs">
          {labels.countLabel}
        </Badge>
      </div>

      {informes.length > 0 && (
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={labels.searchPlaceholder}
            className="pl-9 pr-9"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      )}

      {informes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-12 text-center shadow-sm">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
            <FileText className="size-6" />
          </div>
          <p className="font-medium text-card-foreground">{labels.noConsults}</p>
          <p className="mt-1 text-sm text-muted-foreground">{labels.noConsultsHint}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-12 text-center shadow-sm">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
            <Search className="size-6" />
          </div>
          <p className="font-medium text-card-foreground">
            {labels.noSearchResults.replace("{query}", query.trim())}
          </p>
        </div>
      ) : (
        <div className="max-h-[22rem] overflow-y-auto space-y-2 pr-1">
          {filtered.map((informe) => (
            <InformeHistoryItem
              key={informe.id}
              informe={informe}
              reportLinkLabel={labels.reportLinkLabel}
            />
          ))}
        </div>
      )}
    </div>
  );
}

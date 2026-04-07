import { AlertCircle, FileText, Loader2, Mic } from "lucide-react";

const statusIcons = {
  recording: Mic,
  processing: Loader2,
  completed: FileText,
  error: AlertCircle,
};

const statusClasses: Record<string, string> = {
  recording: "text-destructive bg-destructive/10 border-destructive/20",
  processing: "text-primary bg-primary/10 border-primary/20",
  completed: "text-emerald-600 bg-emerald-50 border-emerald-200",
  error: "text-destructive bg-destructive/10 border-destructive/20",
};

type InformeStatusKey = keyof typeof statusIcons;

export function resolveStatusIcon(status: string) {
  return statusIcons[status as InformeStatusKey] ?? AlertCircle;
}

export function resolveStatusClass(status: string): string {
  return statusClasses[status] ?? statusClasses.error;
}

import fs from "fs";
import path from "path";

const messagesPath = path.join(__dirname, "../../messages/es.json");
const messages = JSON.parse(fs.readFileSync(messagesPath, "utf-8"));

function getNestedValue(obj: Record<string, unknown>, key: string): unknown {
  return key.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

export function useTranslations(namespace?: string) {
  const base = namespace ? getNestedValue(messages, namespace) : messages;
  const t = (key: string, params?: Record<string, unknown>) => {
    const raw = getNestedValue(base as Record<string, unknown>, key);
    if (typeof raw !== "string") return key;
    if (!params) return raw;
    return raw.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
  };
  t.rich = (key: string, params?: Record<string, unknown>) => {
    const raw = getNestedValue(base as Record<string, unknown>, key);
    if (typeof raw !== "string") return key;
    let result = raw;
    if (params) {
      result = result.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
      result = result.replace(/<(\w+)>(.*?)<\/\1>/g, (_, tag, content) => {
        const fn = params[tag];
        if (typeof fn === "function") return String(fn(content));
        return content;
      });
    }
    return result;
  };
  t.markup = (key: string, params?: Record<string, unknown>) => {
    const raw = getNestedValue(base as Record<string, unknown>, key);
    if (typeof raw !== "string") return key;
    let result = raw;
    if (params) {
      result = result.replace(/<(\w+)>(.*?)<\/\1>/g, (_, tag, content) => {
        const fn = params[tag];
        if (typeof fn === "function") return String(fn(content));
        return content;
      });
      result = result.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
    }
    return result;
  };
  return t;
}

export const useLocale = jest.fn(() => "es");

export function useMessages() {
  return messages;
}

export function useNow() {
  return new Date();
}

export function useTimeZone() {
  return "America/Argentina/Buenos_Aires";
}

export function useFormatter() {
  return {
    number: (value: number) => String(value),
    dateTime: (value: Date) => value.toISOString(),
    relativeTime: (value: Date) => value.toISOString(),
  };
}

export function NextIntlClientProvider({ children }: { children: React.ReactNode }) {
  return children;
}

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

export async function getTranslations(namespace?: string) {
  const base = namespace ? getNestedValue(messages, namespace) : messages;
  return (key: string, params?: Record<string, unknown>) => {
    const raw = getNestedValue(base as Record<string, unknown>, key);
    if (typeof raw !== "string") return key;
    if (!params) return raw;
    return raw.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
  };
}

export async function getLocale() {
  return "es";
}

export async function getMessages() {
  return messages;
}

export async function getNow() {
  return new Date();
}

export async function getTimeZone() {
  return "America/Argentina/Buenos_Aires";
}

export async function getFormatter() {
  return {
    number: (value: number) => String(value),
    dateTime: (value: Date) => value.toISOString(),
    relativeTime: (value: Date) => value.toISOString(),
  };
}

export function setRequestLocale() {}

export async function getRequestConfig() {
  return { locale: "es" };
}

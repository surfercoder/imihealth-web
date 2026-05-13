import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

// Static-string imports per locale so the bundler can split each chunk; the
// dynamic-template form (`./messages/${locale}.json`) defeats code-splitting.
type Messages = Record<string, unknown>;
const messageLoaders: Record<"es" | "en", () => Promise<{ default: Messages }>> = {
  es: () => import("../../messages/es.json"),
  en: () => import("../../messages/en.json"),
};

export default getRequestConfig(async () => {
  const store = await cookies();
  const locale = store.get("locale")?.value ?? "es";
  const safeLocale: "es" | "en" = locale === "en" ? "en" : "es";

  return {
    locale: safeLocale,
    messages: (await messageLoaders[safeLocale]()).default,
  };
});

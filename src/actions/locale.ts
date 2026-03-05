"use server";

import { cookies } from "next/headers";

export async function setLocale(locale: string) {
  const validLocales = ["es", "en"];
  if (!validLocales.includes(locale)) return;
  const store = await cookies();
  store.set("locale", locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });
}

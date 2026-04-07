export function computePatientAge(dob: string | null): number | null {
  if (!dob) return null;
  const today = new Date();
  const birth = new Date(dob + "T00:00:00");
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function formatPatientDob(dob: string | null, locale: string): string | null {
  if (!dob) return null;
  /* v8 ignore next */
  return new Date(dob + "T00:00:00").toLocaleDateString(locale === "en" ? "en-US" : "es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/* v8 ignore next 9 */
export function formatInformeDate(createdAt: string, locale: string): string {
  return new Date(createdAt).toLocaleDateString(locale === "en" ? "en-US" : "es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function buildInformePreview(informeDoctor: string | null): string | null {
  if (!informeDoctor) return null;
  return informeDoctor.slice(0, 120).replace(/\n/g, " ") + "\u2026";
}

export function buildInformeHref(
  informeId: string,
  status: string,
  tab: string | undefined
): string {
  const baseHref =
    status === "recording" ? `/informes/${informeId}/grabar` : `/informes/${informeId}`;
  return `${baseHref}${tab ? `?tab=${tab}` : ""}`;
}

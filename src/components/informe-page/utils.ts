export function formatDob(dob: string | null, dateLocale: string): string | null {
  if (!dob) return null;
  return new Date(dob + "T00:00:00").toLocaleDateString(dateLocale, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function calculateAge(dob: string | null): number | null {
  if (!dob) return null;
  const today = new Date();
  const birth = new Date(dob + "T00:00:00");
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function formatCreatedAt(createdAt: string, dateLocale: string): string {
  return new Date(createdAt).toLocaleDateString(dateLocale, {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function normalizePhone(phone: string | null | undefined): string | undefined {
  if (!phone) return undefined;
  return phone.replace(/\D/g, "");
}

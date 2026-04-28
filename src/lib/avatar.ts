export const AVATAR_MAX_SIZE = 256;
export const AVATAR_QUALITY = 0.85;
export const AVATAR_MAX_FILE_BYTES = 5 * 1024 * 1024;

export function getDoctorInitials(name: string | null | undefined): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export async function fileToCompressedDataUrl(
  file: File,
  maxSize = AVATAR_MAX_SIZE,
  quality = AVATAR_QUALITY
): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    /* v8 ignore next */
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.drawImage(bitmap, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    bitmap.close();
  }
}

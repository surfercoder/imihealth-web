import { WA_API_URL, getCredentials } from "./client";

/**
 * Upload a file buffer directly to Meta's media API.
 * Returns a media ID that can be used in template messages.
 */
export async function uploadMediaToWhatsApp(
  fileBuffer: Buffer | Uint8Array,
  mimeType: string,
  filename: string
): Promise<{ success: true; mediaId: string } | { success: false; error: string }> {
  const creds = getCredentials();
  if (!creds) return { success: false, error: "WhatsApp service not configured" };

  const url = `${WA_API_URL}/${creds.phoneNumberId}/media`;

  const formData = new FormData();
  formData.append("messaging_product", "whatsapp");
  formData.append("type", mimeType);
  const bytes = fileBuffer instanceof Uint8Array
    ? new Uint8Array(fileBuffer)
    : fileBuffer;
  formData.append(
    "file",
    new Blob([bytes as BlobPart], { type: mimeType }),
    filename
  );

  console.log("[WhatsApp] Uploading media:", filename, mimeType);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${creds.accessToken}`,
    },
    body: formData,
  });

  const data = await res.json();

  if (!res.ok) {
    const errorMessage = data?.error?.message || "Failed to upload media";
    console.error("[WhatsApp] Media upload error:", JSON.stringify(data, null, 2));
    return { success: false, error: errorMessage };
  }

  return { success: true, mediaId: data.id };
}

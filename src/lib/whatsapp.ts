const WA_API_URL = "https://graph.facebook.com/v22.0";

interface SendTemplateMessageOptions {
  to: string;
  templateName: string;
  languageCode: string;
  parameters: string[];
}

export type WhatsAppResult =
  | { success: true; messageId: string }
  | { success: false; error: string };

function getCredentials() {
  const phoneNumberId = process.env.WA_PHONE_NUMBER_ID;
  const accessToken = process.env.WA_ACCESS_TOKEN;
  if (!phoneNumberId || !accessToken) return null;
  return { phoneNumberId, accessToken };
}

async function callWhatsAppAPI(body: Record<string, unknown>): Promise<WhatsAppResult> {
  const creds = getCredentials();
  if (!creds) return { success: false, error: "WhatsApp service not configured" };

  const url = `${WA_API_URL}/${creds.phoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    ...body,
  };

  console.log("[WhatsApp] Sending:", body.type, "to:", body.to);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${creds.accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    const errorMessage = data?.error?.message || "Failed to send WhatsApp message";
    console.error("[WhatsApp] API error:", JSON.stringify(data, null, 2));
    return { success: false, error: errorMessage };
  }

  return { success: true, messageId: data.messages?.[0]?.id ?? "unknown" };
}

/**
 * Meta requires Argentine numbers without the "9" after country code "54".
 * e.g. 5492616886005 → 542616886005
 */
function formatPhoneForMeta(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("549") && digits.length === 13) {
    return "54" + digits.slice(3);
  }
  return digits;
}

// ─── Media upload ────────────────────────────────────────────────

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

// ─── Template senders ────────────────────────────────────────────

export async function sendWhatsAppTemplate({
  to,
  templateName,
  languageCode,
  parameters,
}: SendTemplateMessageOptions): Promise<WhatsAppResult> {
  return callWhatsAppAPI({
    to: formatPhoneForMeta(to),
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      components: parameters.length > 0
        ? [
            {
              type: "body",
              parameters: parameters.map((value) => ({
                type: "text",
                text: value,
              })),
            },
          ]
        : undefined,
    },
  });
}

/**
 * Send a template with a DOCUMENT header using a Meta media ID.
 */
export async function sendWhatsAppTemplateWithDocument({
  to,
  templateName,
  languageCode,
  bodyParameters,
  mediaId,
  documentFilename,
}: {
  to: string;
  templateName: string;
  languageCode: string;
  bodyParameters: string[];
  mediaId: string;
  documentFilename: string;
}): Promise<WhatsAppResult> {
  const components: Record<string, unknown>[] = [
    {
      type: "header",
      parameters: [
        {
          type: "document",
          document: { id: mediaId, filename: documentFilename },
        },
      ],
    },
  ];

  if (bodyParameters.length > 0) {
    components.push({
      type: "body",
      parameters: bodyParameters.map((value) => ({
        type: "text",
        text: value,
      })),
    });
  }

  return callWhatsAppAPI({
    to: formatPhoneForMeta(to),
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      components,
    },
  });
}

/**
 * Send a template with an IMAGE header using a Meta media ID.
 */
export async function sendWhatsAppTemplateWithImage({
  to,
  templateName,
  languageCode,
  bodyParameters,
  mediaId,
}: {
  to: string;
  templateName: string;
  languageCode: string;
  bodyParameters: string[];
  mediaId: string;
}): Promise<WhatsAppResult> {
  const components: Record<string, unknown>[] = [
    {
      type: "header",
      parameters: [
        {
          type: "image",
          image: { id: mediaId },
        },
      ],
    },
  ];

  if (bodyParameters.length > 0) {
    components.push({
      type: "body",
      parameters: bodyParameters.map((value) => ({
        type: "text",
        text: value,
      })),
    });
  }

  return callWhatsAppAPI({
    to: formatPhoneForMeta(to),
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      components,
    },
  });
}

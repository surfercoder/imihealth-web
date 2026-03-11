const WA_API_URL = "https://graph.facebook.com/v22.0";

// Known 3-digit Argentine area codes (major cities)
const AR_THREE_DIGIT_AREA_CODES = new Set([
  "220", "221", "223", "230", "236", "237", "249",
  "260", "261", "263", "264", "266",
  "280", "291", "294", "297", "298", "299",
  "341", "342", "343", "345", "348",
  "351", "353", "358",
  "362", "364", "370", "376", "379",
  "380", "381", "383", "385", "387", "388",
]);

/**
 * Normalize Argentine mobile numbers for WhatsApp API.
 * Converts +549{area}{subscriber} → +54{area}15{subscriber}
 * WhatsApp requires the "15" format for Argentine numbers.
 */
function normalizePhoneForWhatsApp(phone: string): string {
  const match = phone.match(/^549(\d{10})$/);
  if (!match) return phone;

  const local = match[1]; // 10 digits: area_code + subscriber

  let areaCodeLen: number;
  if (local.startsWith("11")) {
    areaCodeLen = 2;
  } else if (AR_THREE_DIGIT_AREA_CODES.has(local.slice(0, 3))) {
    areaCodeLen = 3;
  } else {
    areaCodeLen = 4;
  }

  const areaCode = local.slice(0, areaCodeLen);
  const subscriber = local.slice(areaCodeLen);

  return `54${areaCode}15${subscriber}`;
}

interface SendTemplateMessageOptions {
  to: string;
  templateName: string;
  languageCode: string;
  parameters: string[];
}

export type WhatsAppResult =
  | { success: true; messageId: string }
  | { success: false; error: string };

async function callWhatsAppAPI(body: Record<string, unknown>): Promise<WhatsAppResult> {
  const phoneNumberId = process.env.WA_PHONE_NUMBER_ID;
  const accessToken = process.env.WA_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    return { success: false, error: "WhatsApp service not configured" };
  }

  // Normalize the recipient phone number
  const normalizedBody = {
    ...body,
    to: typeof body.to === "string" ? normalizePhoneForWhatsApp(body.to) : body.to,
  };

  const url = `${WA_API_URL}/${phoneNumberId}/messages`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      ...normalizedBody,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    const errorMessage = data?.error?.message || "Failed to send WhatsApp message";
    console.error("WhatsApp API error:", data);
    return { success: false, error: errorMessage };
  }

  return { success: true, messageId: data.messages?.[0]?.id ?? "unknown" };
}

export async function sendWhatsAppTemplate({
  to,
  templateName,
  languageCode,
  parameters,
}: SendTemplateMessageOptions): Promise<WhatsAppResult> {
  return callWhatsAppAPI({
    to,
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

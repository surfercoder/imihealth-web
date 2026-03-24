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

async function callWhatsAppAPI(body: Record<string, unknown>): Promise<WhatsAppResult> {
  const phoneNumberId = process.env.WA_PHONE_NUMBER_ID;
  const accessToken = process.env.WA_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    return { success: false, error: "WhatsApp service not configured" };
  }

  const url = `${WA_API_URL}/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    ...body,
  };

  console.log("[WhatsApp] Sending to:", body.to, "| Template:", (body.template as Record<string, unknown>)?.name ?? "N/A");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    const errorMessage = data?.error?.message || "Failed to send WhatsApp message";
    console.error("WhatsApp API error:", data);
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

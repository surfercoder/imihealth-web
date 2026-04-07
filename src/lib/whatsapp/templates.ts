import { callWhatsAppAPI, formatPhoneForMeta, WhatsAppResult } from "./client";

interface SendTemplateMessageOptions {
  to: string;
  templateName: string;
  languageCode: string;
  parameters: string[];
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

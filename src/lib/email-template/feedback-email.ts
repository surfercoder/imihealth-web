import { BRAND } from './brand';
import { brandedEmail } from './branded-email';
import { escapeHtml } from './escape';

/** Feedback / support email sent to the IMI Health team. */
export function feedbackEmail({
  senderName,
  senderEmail,
  reason,
  message,
  pageUrl,
  labels,
}: {
  senderName: string;
  senderEmail: string;
  reason: string;
  message: string;
  pageUrl?: string;
  labels: {
    subtitle: string;
    from: string;
    page: string;
    reason: string;
    preheader: string;
  };
}) {
  const body = `
    <p style="margin:0 0 8px;font-size:13px;color:${BRAND.gray};">${escapeHtml(labels.subtitle)}</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:16px;">
      <tr>
        <td style="padding:6px 0;font-weight:600;width:80px;vertical-align:top;">${escapeHtml(labels.from)}</td>
        <td style="padding:6px 0;">${escapeHtml(senderName)} (${escapeHtml(senderEmail)})</td>
      </tr>
      ${pageUrl ? `<tr>
        <td style="padding:6px 0;font-weight:600;vertical-align:top;">${escapeHtml(labels.page)}</td>
        <td style="padding:6px 0;"><a href="${escapeHtml(pageUrl)}" style="color:${BRAND.teal};">${escapeHtml(pageUrl)}</a></td>
      </tr>` : ''}
      <tr>
        <td style="padding:6px 0;font-weight:600;vertical-align:top;">${escapeHtml(labels.reason)}</td>
        <td style="padding:6px 0;">
          <span style="display:inline-block;background-color:${BRAND.teal};color:${BRAND.white};padding:2px 10px;border-radius:12px;font-size:13px;">
            ${escapeHtml(reason)}
          </span>
        </td>
      </tr>
    </table>
    <div style="background-color:${BRAND.lightBg};border-radius:8px;padding:16px 20px;border-left:4px solid ${BRAND.teal};">
      <p style="margin:0;white-space:pre-wrap;">${escapeHtml(message)}</p>
    </div>`;

  return brandedEmail({
    preheader: labels.preheader,
    body,
  });
}

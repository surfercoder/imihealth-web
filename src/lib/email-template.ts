/**
 * Branded HTML email templates for IMI Health.
 *
 * All templates use inline styles for maximum email-client compatibility.
 * Colors match the IMI Health brand:
 *   - Navy:  #0f172a  (primary text / headings)
 *   - Teal:  #2a9d90  (accent / highlight)
 *   - Light: #f1f5f9  (background)
 *   - White: #ffffff  (card background)
 *   - Gray:  #64748b  (muted text)
 *   - Border:#e2e8f0
 */

const BRAND = {
  navy: '#0f172a',
  teal: '#2a9d90',
  lightBg: '#f1f5f9',
  white: '#ffffff',
  gray: '#64748b',
  border: '#e2e8f0',
  fontFamily:
    "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
} as const;

/** Wrap any body HTML in the branded email shell. */
export function brandedEmail({
  preheader,
  body,
}: {
  /** Hidden preview text shown in inbox list (optional). */
  preheader?: string;
  /** Inner HTML placed inside the white card. */
  body: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>IMI Health</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${BRAND.lightBg};font-family:${BRAND.fontFamily};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}</div>` : ''}

  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.lightBg};">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <!-- Main card -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:${BRAND.white};border-radius:12px;overflow:hidden;border:1px solid ${BRAND.border};">

          <!-- Header / Logo bar -->
          <tr>
            <td style="background-color:${BRAND.navy};padding:24px 32px;text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="font-size:28px;font-weight:700;letter-spacing:-0.5px;">
                    <span style="color:${BRAND.white};">IMI</span>
                    <span style="color:${BRAND.teal};"> health</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;color:${BRAND.navy};font-size:15px;line-height:1.6;">
              ${body}
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 32px;">
              <hr style="border:none;border-top:1px solid ${BRAND.border};margin:0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;text-align:center;color:${BRAND.gray};font-size:12px;line-height:1.5;">
              <p style="margin:0 0 4px;">
                &copy; ${new Date().getFullYear()} IMI Health &mdash; AI-powered medical consultation reports
              </p>
              <p style="margin:0;">
                <a href="https://imihealth.ai" style="color:${BRAND.teal};text-decoration:none;">imihealth.ai</a>
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

/* ------------------------------------------------------------------ */
/*  Pre-built email content builders                                   */
/* ------------------------------------------------------------------ */

/** Medical report email sent to a doctor. */
export function doctorReportEmail({
  doctorName,
  reportContent,
}: {
  doctorName: string;
  reportContent: string;
}) {
  // Convert plain-text report to simple HTML paragraphs
  const reportHtml = reportContent
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '<br />';
      // Detect markdown-style headers
      if (trimmed.startsWith('#')) {
        const clean = trimmed.replace(/^#+\s*/, '').replace(/\*\*/g, '');
        return `<p style="font-weight:700;font-size:16px;color:${BRAND.navy};margin:16px 0 4px;">${escapeHtml(clean)}</p>`;
      }
      // Bold lines (e.g. **Section:**)
      if (/^\*\*[^*]+\*\*:?\s*$/.test(trimmed)) {
        const clean = trimmed.replace(/\*\*/g, '').trim();
        return `<p style="font-weight:600;color:${BRAND.navy};margin:12px 0 2px;">${escapeHtml(clean)}</p>`;
      }
      return `<p style="margin:4px 0;">${escapeHtml(trimmed)}</p>`;
    })
    .join('\n');

  const body = `
    <p style="margin:0 0 16px;">
      Hello <strong>Dr. ${escapeHtml(doctorName)}</strong>,
    </p>
    <p style="margin:0 0 24px;">
      Here is the medical consultation report generated by <span style="color:${BRAND.teal};font-weight:600;">IMI Health</span>:
    </p>
    <div style="background-color:${BRAND.lightBg};border-radius:8px;padding:20px 24px;border-left:4px solid ${BRAND.teal};">
      ${reportHtml}
    </div>
    <p style="margin:24px 0 0;font-size:13px;color:${BRAND.gray};">
      This report was generated using AI and should be reviewed by a medical professional before being shared with the patient.
    </p>`;

  return brandedEmail({
    preheader: `Medical report for Dr. ${doctorName}`,
    body,
  });
}

/** Feedback / support email sent to the IMI Health team. */
export function feedbackEmail({
  senderName,
  senderEmail,
  reason,
  message,
}: {
  senderName: string;
  senderEmail: string;
  reason: string;
  message: string;
}) {
  const body = `
    <p style="margin:0 0 8px;font-size:13px;color:${BRAND.gray};">New feedback received</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:16px;">
      <tr>
        <td style="padding:6px 0;font-weight:600;width:80px;vertical-align:top;">From:</td>
        <td style="padding:6px 0;">${escapeHtml(senderName)} (${escapeHtml(senderEmail)})</td>
      </tr>
      <tr>
        <td style="padding:6px 0;font-weight:600;vertical-align:top;">Reason:</td>
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
    preheader: `[${reason}] Feedback from ${senderName}`,
    body,
  });
}

/* ------------------------------------------------------------------ */

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

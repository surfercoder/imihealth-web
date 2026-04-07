/**
 * Branded HTML email shell for IMI Health.
 *
 * All templates use inline styles for maximum email-client compatibility.
 */
import { BRAND } from './brand';
import { escapeHtml } from './escape';

/** Wrap any body HTML in the branded email shell. */
export function brandedEmail({
  preheader,
  body,
  footerTagline = 'AI-powered medical consultation reports',
}: {
  /** Hidden preview text shown in inbox list (optional). */
  preheader?: string;
  /** Inner HTML placed inside the white card. */
  body: string;
  /** Localized tagline shown in the footer. */
  footerTagline?: string;
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
                &copy; ${new Date().getFullYear()} IMI Health &mdash; ${escapeHtml(footerTagline)}
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

import { BRAND } from './brand';
import { brandedEmail } from './branded-email';
import { escapeHtml } from './escape';

interface DoctorReportEmailOptions {
  doctorName: string;
  reportContent: string;
  /** Localized strings for the email body. */
  labels: {
    greeting: string;
    intro: string;
    disclaimer: string;
    preheader: string;
    footerTagline: string;
  };
}

/** Medical report email sent to a doctor. */
export function doctorReportEmail(options: DoctorReportEmailOptions) {
  const { reportContent, labels } = options;
  const t = labels;
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
      ${t.greeting}
    </p>
    <p style="margin:0 0 24px;">
      ${t.intro} <span style="color:${BRAND.teal};font-weight:600;">IMI Health</span>:
    </p>
    <div style="background-color:${BRAND.lightBg};border-radius:8px;padding:20px 24px;border-left:4px solid ${BRAND.teal};">
      ${reportHtml}
    </div>
    <p style="margin:24px 0 0;font-size:13px;color:${BRAND.gray};">
      ${t.disclaimer}
    </p>`;

  return brandedEmail({
    preheader: t.preheader,
    body,
    footerTagline: t.footerTagline,
  });
}

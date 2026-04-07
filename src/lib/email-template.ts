/**
 * Branded HTML email templates for IMI Health.
 *
 * This file is a barrel re-exporter. The actual implementations live under
 * `src/lib/email-template/`. The public API is preserved so consumers can
 * keep importing from `@/lib/email-template`.
 */
export { brandedEmail } from './email-template/branded-email';
export { doctorReportEmail } from './email-template/doctor-report-email';
export { patientReportEmail } from './email-template/patient-report-email';
export { feedbackEmail } from './email-template/feedback-email';

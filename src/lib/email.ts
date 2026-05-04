import { Resend } from 'resend';

interface SendEmailOptions {
  to: string;
  subject: string;
  /** Plain-text body (always included as fallback). */
  text: string;
  /** Optional HTML body for branded emails. */
  html?: string;
  /** Optional reply-to address (used by feedback emails so support can reply directly to the user). */
  replyTo?: string;
}

export async function sendEmail({ to, subject, text, html, replyTo }: SendEmailOptions) {
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM!,
      to,
      subject,
      text,
      ...(html && { html }),
      ...(replyTo && { replyTo }),
    });

    if (error) {
      console.error('Error sending email:', error);
      throw new Error('Failed to send email');
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    if (error instanceof Error && error.message === 'Failed to send email') {
      throw error;
    }
    console.error('Error sending email:', error);
    throw new Error('Failed to send email');
  }
}

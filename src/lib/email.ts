import nodemailer from 'nodemailer';

interface SendEmailOptions {
  to: string;
  subject: string;
  /** Plain-text body (always included as fallback). */
  text: string;
  /** Optional HTML body for branded emails. */
  html?: string;
}

export async function sendEmail({ to, subject, text, html }: SendEmailOptions) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
  });

  const mailOptions: nodemailer.SendMailOptions = {
    from: `"IMI Health" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    ...(html && { html }),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email');
  }
}

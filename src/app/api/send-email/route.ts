import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import { createClient } from '@/utils/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';

const FEEDBACK_ADDRESS = 'support@imihealth.ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, text, html } = body;

    // Allow unauthenticated requests only for feedback emails
    if (to !== FEEDBACK_ADDRESS) {
      const supabase = await createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }

      const { allowed, retryAfter } = checkRateLimit(user.id, {
        key: 'send-email',
        limit: 20,
        windowSeconds: 60,
      });
      if (!allowed) {
        return NextResponse.json(
          { success: false, error: 'Too many requests' },
          { status: 429, headers: { 'Retry-After': String(retryAfter) } }
        );
      }
    }

    if (!to || !subject || !text) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: to, subject, text' },
        { status: 400 }
      );
    }

    if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
      return NextResponse.json(
        { success: false, error: 'Email service not configured' },
        { status: 500 }
      );
    }

    const result = await sendEmail({ to, subject, text, ...(html && { html }) });

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error('Error in send-email API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send email' },
      { status: 500 }
    );
  }
}

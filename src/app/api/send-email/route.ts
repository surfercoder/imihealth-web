import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import { getAuthedSupabase } from '@/utils/supabase/api-auth';
import { checkRateLimit } from '@/lib/rate-limit';

const FEEDBACK_ADDRESS = 'support@imihealth.ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, text, html, replyTo } = body;

    // Allow unauthenticated requests only for feedback emails
    if (to !== FEEDBACK_ADDRESS) {
      const { user } = await getAuthedSupabase(request);
      if (!user) {
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

    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM) {
      return NextResponse.json(
        { success: false, error: 'Email service not configured' },
        { status: 500 }
      );
    }

    const result = await sendEmail({
      to,
      subject,
      text,
      ...(html && { html }),
      ...(replyTo && { replyTo }),
    });

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

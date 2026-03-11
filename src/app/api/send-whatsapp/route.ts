import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { sendWhatsAppTemplate } from "@/lib/whatsapp";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { to, templateName, languageCode, parameters } = body;

    if (!to || !templateName) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: to, templateName" },
        { status: 400 }
      );
    }

    const result = await sendWhatsAppTemplate({
      to,
      templateName,
      languageCode: languageCode || "es",
      parameters: parameters || [],
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, messageId: result.messageId });
  } catch (error) {
    console.error("Error in send-whatsapp API:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send WhatsApp message" },
      { status: 500 }
    );
  }
}

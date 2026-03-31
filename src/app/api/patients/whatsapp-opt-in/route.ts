import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

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
    const { patientId } = body;

    if (!patientId) {
      return NextResponse.json(
        { success: false, error: "Missing patientId" },
        { status: 400 }
      );
    }

    // Update patient record to mark WhatsApp as opted in
    const { error: updateError } = await supabase
      .from("patients")
      .update({
        whatsapp_opted_in: true,
        whatsapp_opted_in_at: new Date().toISOString(),
      })
      .eq("id", patientId)
      .eq("doctor_id", user.id);

    if (updateError) {
      console.error("Error updating patient opt-in status:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to update opt-in status" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in whatsapp-opt-in API:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

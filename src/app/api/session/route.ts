import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";


export const runtime = "edge";

// GET: Fetch session + answers for resume
export async function GET(req: NextRequest) {
  const sessionId = new URL(req.url).searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("*")
    .eq("session_id", sessionId)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ session: null, answers: [] });
  }

  const { data: answers } = await supabase
    .from("answers")
    .select("*")
    .eq("session_id", sessionId)
    .order("question_id");

  return NextResponse.json({ session, answers: answers || [] });
}

// POST: Create a new session
export async function POST(req: NextRequest) {
  try {
    const { sessionId, userAgent, interestLevel, interestReasons, interestOtherText } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Check if session already exists
    const { data: existing } = await supabase
      .from("sessions")
      .select("session_id")
      .eq("session_id", sessionId)
      .single();

    if (existing) {
      // Partial update: only update provided fields
      const updates: Record<string, unknown> = {};
      if (userAgent !== undefined) updates.user_agent = userAgent;
      if (interestLevel !== undefined) updates.interest_level = interestLevel;
      if (interestReasons !== undefined) updates.interest_reasons = interestReasons;
      if (interestOtherText !== undefined) updates.interest_other_text = interestOtherText;

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from("sessions")
          .update(updates)
          .eq("session_id", sessionId);

        if (updateError) {
          console.error("Session update error:", updateError);
          return NextResponse.json({ error: "セッションの更新に失敗しました。" }, { status: 500 });
        }
      }
    } else {
      // Create new session
      const { error: insertError } = await supabase.from("sessions").insert({
        session_id: sessionId,
        page_completed: 0,
        user_agent: userAgent || "",
        interest_level: interestLevel ?? null,
        interest_reasons: interestReasons ?? [],
        interest_other_text: interestOtherText ?? "",
      });

      if (insertError) {
        console.error("Session insert error:", insertError);
        return NextResponse.json({ error: "セッションの作成に失敗しました。" }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Session error:", error);
    return NextResponse.json({ error: "セッションの作成に失敗しました。" }, { status: 500 });
  }
}

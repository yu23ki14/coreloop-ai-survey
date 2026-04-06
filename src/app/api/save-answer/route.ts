import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, questionId, likert, freetext, questionText, isFollowup } = body;

    if (!sessionId || !questionId) {
      return NextResponse.json(
        { error: "sessionId and questionId are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check if answer already exists
    const { data: existing } = await supabase
      .from("answers")
      .select("id")
      .eq("session_id", sessionId)
      .eq("question_id", questionId)
      .single();

    if (existing) {
      // Partial update: only update provided fields
      const updates: Record<string, unknown> = {};
      if (likert !== undefined) updates.likert = likert || null;
      if (freetext !== undefined) updates.freetext = freetext;
      if (questionText !== undefined) updates.question_text = questionText;
      if (isFollowup !== undefined) updates.is_followup = isFollowup;

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from("answers")
          .update(updates)
          .eq("session_id", sessionId)
          .eq("question_id", questionId);

        if (error) {
          console.error("Answer update error:", error);
          return NextResponse.json({ error: "回答の保存に失敗しました。" }, { status: 500 });
        }
      }
    } else {
      // Insert new answer
      const { error } = await supabase.from("answers").insert({
        session_id: sessionId,
        question_id: questionId,
        question_text: questionText || "",
        likert: likert || null,
        freetext: freetext || "",
        is_followup: isFollowup || false,
      });

      if (error) {
        console.error("Answer insert error:", error);
        return NextResponse.json({ error: "回答の保存に失敗しました。" }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Save answer error:", error);
    return NextResponse.json({ error: "回答の保存に失敗しました。" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, data, page } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    if (page === 1) {
      // Upsert page 1 data
      const row: Record<string, unknown> = {
        session_id: sessionId,
        interest_level: data.interestLevel,
        page_completed: 1,
        user_agent: data.userAgent || "",
      };

      // Add Q1-Q6 answers
      for (let i = 1; i <= 6; i++) {
        const qId = `q${i}`;
        if (data.answers?.[qId]) {
          row[`${qId}_likert`] = data.answers[qId].likert || null;
          row[`${qId}_freetext`] = data.answers[qId].freetext || "";
        }
      }

      const { error } = await supabase.from("responses").upsert(row, {
        onConflict: "session_id",
      });

      if (error) {
        console.error("Supabase insert error:", error);
        return NextResponse.json(
          { error: "回答の保存に失敗しました。" },
          { status: 500 }
        );
      }
    } else if (page === 2) {
      // Update with page 2 data
      const row: Record<string, unknown> = {
        page_completed: 2,
        completed_at: new Date().toISOString(),
        additional_comments: data.additionalComments || "",
      };

      // Add Q7-Q10
      for (let i = 7; i <= 10; i++) {
        const qId = `q${i}`;
        if (data.followupQuestions) {
          const q = data.followupQuestions.find(
            (fq: { id: string }) => fq.id === qId
          );
          if (q) {
            row[`${qId}_text`] = q.text || "";
          }
        }
        if (data.followupAnswers?.[qId]) {
          row[`${qId}_likert`] = data.followupAnswers[qId] || null;
        }
        if (data.followupFreetexts?.[qId] !== undefined) {
          row[`${qId}_freetext`] = data.followupFreetexts[qId] || "";
        }
      }

      const { error } = await supabase
        .from("responses")
        .update(row)
        .eq("session_id", sessionId);

      if (error) {
        console.error("Supabase update error:", error);
        return NextResponse.json(
          { error: "回答の保存に失敗しました。" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Submit error:", error);
    return NextResponse.json(
      { error: "回答の送信中にエラーが発生しました。" },
      { status: 500 }
    );
  }
}

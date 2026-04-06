import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { SURVEY_QUESTIONS } from "@/lib/survey-data";

export const runtime = "edge";

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
      // Upsert session
      const { error: sessionError } = await supabase.from("sessions").upsert(
        {
          session_id: sessionId,
          interest_level: data.interestLevel,
          interest_reasons: data.interestReasons || [],
          interest_other_text: data.interestOtherText || "",
          page_completed: 1,
          user_agent: data.userAgent || "",
        },
        { onConflict: "session_id" }
      );

      if (sessionError) {
        console.error("Session upsert error:", sessionError);
        return NextResponse.json(
          { error: "回答の保存に失敗しました。" },
          { status: 500 }
        );
      }

      // Bulk upsert answers for Q1-QN
      const answerRows = Object.entries(
        data.answers as Record<string, { likert: string; freetext: string }>
      ).map(([qId, ans]) => {
        const question = SURVEY_QUESTIONS.find((q) => q.id === qId);
        return {
          session_id: sessionId,
          question_id: qId,
          question_text: question?.text || "",
          likert: ans.likert || null,
          freetext: ans.freetext || "",
          is_followup: false,
        };
      });

      if (answerRows.length > 0) {
        const { error: answersError } = await supabase
          .from("answers")
          .upsert(answerRows, { onConflict: "session_id,question_id" });

        if (answersError) {
          console.error("Answers upsert error:", answersError);
          return NextResponse.json(
            { error: "回答の保存に失敗しました。" },
            { status: 500 }
          );
        }
      }
    } else if (page === 2) {
      // Update session as completed
      const { error: sessionError } = await supabase
        .from("sessions")
        .update({
          page_completed: 2,
          completed_at: new Date().toISOString(),
          additional_comments: data.additionalComments || "",
        })
        .eq("session_id", sessionId);

      if (sessionError) {
        console.error("Session update error:", sessionError);
        return NextResponse.json(
          { error: "回答の保存に失敗しました。" },
          { status: 500 }
        );
      }

      // Bulk upsert followup answers
      const followupQuestions: { id: string; text: string }[] =
        data.followupQuestions || [];
      const followupAnswers: Record<string, { likert: string; freetext: string }> =
        data.followupAnswers || {};

      const answerRows = followupQuestions.map((fq) => ({
        session_id: sessionId,
        question_id: fq.id,
        question_text: fq.text || "",
        likert: followupAnswers[fq.id]?.likert || null,
        freetext: followupAnswers[fq.id]?.freetext || "",
        is_followup: true,
      }));

      if (answerRows.length > 0) {
        const { error: answersError } = await supabase
          .from("answers")
          .upsert(answerRows, { onConflict: "session_id,question_id" });

        if (answersError) {
          console.error("Followup answers upsert error:", answersError);
          return NextResponse.json(
            { error: "回答の保存に失敗しました。" },
            { status: 500 }
          );
        }
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

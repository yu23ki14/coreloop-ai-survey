import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

function checkAuth(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7);
  return token === process.env.ADMIN_PASSWORD;
}

interface AnswerRow {
  question_id: string;
  question_text: string | null;
  likert: string | null;
  freetext: string | null;
  is_followup: boolean | null;
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const url = new URL(req.url);
  const format = url.searchParams.get("format");

  // Fetch all sessions
  const { data: sessions, error: sessionsError } = await supabase
    .from("sessions")
    .select("*")
    .order("created_at", { ascending: false });

  if (sessionsError) {
    console.error("Admin fetch error:", sessionsError);
    return NextResponse.json(
      { error: "データの取得に失敗しました。" },
      { status: 500 }
    );
  }

  // Fetch all answers
  const { data: allAnswers, error: answersError } = await supabase
    .from("answers")
    .select("*")
    .order("question_id");

  if (answersError) {
    console.error("Admin answers fetch error:", answersError);
    return NextResponse.json(
      { error: "データの取得に失敗しました。" },
      { status: 500 }
    );
  }

  // Group answers by session_id
  const answersBySession: Record<string, AnswerRow[]> = {};
  for (const a of allAnswers || []) {
    if (!answersBySession[a.session_id]) {
      answersBySession[a.session_id] = [];
    }
    answersBySession[a.session_id].push(a);
  }

  if (format === "csv") {
    if (!sessions || sessions.length === 0) {
      return new NextResponse("No data", { status: 200 });
    }

    // Collect all distinct question_ids for dynamic columns
    const allQuestionIds = [
      ...new Set((allAnswers || []).map((a) => a.question_id)),
    ].sort();

    // CSV headers: session fields + dynamic question columns
    const sessionHeaders = [
      "session_id",
      "interest_level",
      "interest_reasons",
      "interest_other_text",
      "additional_comments",
      "page_completed",
      "user_agent",
      "created_at",
      "completed_at",
    ];
    const questionHeaders = allQuestionIds.flatMap((qId) => [
      `${qId}_question_text`,
      `${qId}_likert`,
      `${qId}_freetext`,
    ]);
    const headers = [...sessionHeaders, ...questionHeaders];

    const csvRows = [
      headers.join(","),
      ...sessions.map((s) => {
        const answers = answersBySession[s.session_id] || [];
        const answerMap: Record<string, AnswerRow> = {};
        for (const a of answers) {
          answerMap[a.question_id] = a;
        }

        const sessionVals = [
          s.session_id,
          s.interest_level ?? "",
          JSON.stringify(s.interest_reasons || []),
          s.interest_other_text || "",
          s.additional_comments || "",
          s.page_completed ?? "",
          s.user_agent || "",
          s.created_at || "",
          s.completed_at || "",
        ];

        const questionVals = allQuestionIds.flatMap((qId) => {
          const a = answerMap[qId];
          return [
            a?.question_text || "",
            a?.likert || "",
            a?.freetext || "",
          ];
        });

        return [...sessionVals, ...questionVals]
          .map((val) => {
            const str = String(val);
            if (str.includes(",") || str.includes('"') || str.includes("\n")) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          })
          .join(",");
      }),
    ];

    return new NextResponse(csvRows.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="survey-responses-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  }

  // JSON response with summary stats
  const total = sessions?.length || 0;
  const completed =
    sessions?.filter((r) => r.page_completed === 2).length || 0;
  const page1Only =
    sessions?.filter((r) => r.page_completed === 1).length || 0;

  // Likert distributions for base questions
  const likertDistributions: Record<string, Record<string, number>> = {};
  for (const a of allAnswers || []) {
    if (!a.is_followup && a.likert) {
      if (!likertDistributions[a.question_id]) {
        likertDistributions[a.question_id] = {};
      }
      likertDistributions[a.question_id][a.likert] =
        (likertDistributions[a.question_id][a.likert] || 0) + 1;
    }
  }

  // Followup data
  const followupData: { question_id: string; question_text: string; likert: string; freetext: string }[] = [];
  for (const a of allAnswers || []) {
    if (a.is_followup && a.question_text && a.likert) {
      followupData.push({
        question_id: a.question_id,
        question_text: a.question_text,
        likert: a.likert,
        freetext: a.freetext || "",
      });
    }
  }

  // Interest level distribution
  const interestDist: Record<string, number> = {};
  for (const s of sessions || []) {
    if (s.interest_level) {
      const key = String(s.interest_level);
      interestDist[key] = (interestDist[key] || 0) + 1;
    }
  }

  return NextResponse.json({
    summary: {
      total,
      completed,
      page1Only,
      startedButNotCompleted: total - completed - page1Only,
    },
    interestDistribution: interestDist,
    likertDistributions,
    followupData,
    sessions,
    answersBySession,
  });
}

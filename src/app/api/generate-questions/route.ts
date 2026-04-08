import { type NextRequest, NextResponse } from "next/server";
import { callOpenRouter } from "@/lib/openrouter";
import {
  FOLLOWUP_GENERATION_PROMPT,
  LIKERT_OPTIONS,
  SURVEY_QUESTIONS,
} from "@/lib/survey-data";

const FALLBACK_QUESTIONS = [
  {
    id: "q14",
    text: "テクノロジー企業は、政府よりも市民の安全を守る能力が高いと思いますか？",
    starterSentences: {
      agree: [
        "テクノロジー企業の方が技術力があるので、政府より迅速に対応できると思います。",
        "民間企業の方が柔軟で革新的な解決策を生み出せると思います。",
        "政府の対応は遅すぎることが多いので、企業に任せた方がいいと思います。",
      ],
      disagree: [
        "企業は利益優先なので、市民の安全を最優先にはしないと思います。",
        "政府には法的な強制力があるので、安全の確保は政府の役割だと思います。",
        "企業に任せると、対応にばらつきが出て不公平になると思います。",
      ],
      neutral: [
        "企業と政府のどちらにも強みと弱みがあり、一概には言えません。",
        "分野によって企業が得意な場合と政府が得意な場合があると思います。",
        "両者が協力するのが理想だと思いますが、どう役割分担すべきか迷います。",
      ],
      dont_know: [
        "テクノロジー企業がどの程度安全対策をしているか知りません。",
        "政府と企業の役割の違いがよくわからず、判断できません。",
        "この問題について考えたことがなく、意見を持てていません。",
      ],
    },
    freetextGuide: {
      agree: "賛成する理由を教えてください",
      disagree: "反対する理由を教えてください",
      neutral: "どちらとも言えない理由を教えてください",
      dont_know: "わからないと感じる理由を教えてください",
    },
  },
  {
    id: "q15",
    text: "多少の不便や制約があっても、詐欺被害を未然に防ぐための規制は必要だと思いますか？",
    starterSentences: {
      agree: [
        "被害を防ぐためなら、多少の不便は受け入れるべきだと思います。",
        "事後対応より予防の方がコストが低いと思います。",
        "規制がなければ、弱い立場の人が被害に遭いやすくなると思います。",
      ],
      disagree: [
        "規制が増えすぎると、正当な活動まで制限されてしまうと思います。",
        "不便さが大きすぎると、人々が規制を回避しようとするだけだと思います。",
        "自由な環境の方がイノベーションを生みやすいと思います。",
      ],
      neutral: [
        "規制の内容や程度によって賛否が変わると思います。",
        "予防は大事だが、過剰な規制は逆効果になりそうで迷います。",
        "バランスが重要だと思いますが、どこで線を引くか難しいです。",
      ],
      dont_know: [
        "具体的にどんな規制が検討されているのかわからず、判断できません。",
        "規制の影響がどの程度のものかイメージがわきません。",
        "この問題について詳しくないので、意見を持てていません。",
      ],
    },
    freetextGuide: {
      agree: "賛成する理由を教えてください",
      disagree: "反対する理由を教えてください",
      neutral: "どちらとも言えない理由を教えてください",
      dont_know: "わからないと感じる理由を教えてください",
    },
  },
  {
    id: "q16",
    text: "インターネット上の問題には、既存の法律の枠組みでは十分に対処できないと思いますか？",
    starterSentences: {
      agree: [
        "技術の進歩が速すぎて、既存の法律では追いつかないと思います。",
        "インターネットは国境を越えるので、国内法だけでは限界があると思います。",
        "新しい問題には新しいルールが必要だと思います。",
      ],
      disagree: [
        "基本的な法原則は変わらないので、既存の枠組みで対応できると思います。",
        "新しい法律を作るより、既存の法律の運用を改善すべきだと思います。",
        "法律を頻繁に変えると混乱を招くと思います。",
      ],
      neutral: [
        "一部は既存の法律で対応できるが、新しいルールも必要な部分があると思います。",
        "問題の種類によって対応の仕方が変わると思います。",
        "法改正の必要性は感じるが、どこまで変えるべきか判断しかねます。",
      ],
      dont_know: [
        "現行法がどこまでインターネットの問題に対応しているか知りません。",
        "法律の専門的な話は難しくて、判断する材料が足りません。",
        "この問題について考えたことがなく、意見がまとまっていません。",
      ],
    },
    freetextGuide: {
      agree: "賛成する理由を教えてください",
      disagree: "反対する理由を教えてください",
      neutral: "どちらとも言えない理由を教えてください",
      dont_know: "わからないと感じる理由を教えてください",
    },
  },
  {
    id: "q17",
    text: "詐欺被害が起きてから対処するよりも、事前に厳しく規制する方が社会全体のコストは低いと思いますか？",
    starterSentences: {
      agree: [
        "被害が起きてからでは取り返しがつかないことが多いと思います。",
        "事後対応のコスト（裁判、補償等）を考えると、予防の方が安上がりだと思います。",
        "被害者の精神的な苦痛は金銭では測れないので、予防が最優先だと思います。",
      ],
      disagree: [
        "事前規制は過剰になりがちで、かえって社会のコストが上がると思います。",
        "実際に問題が起きてから対処する方が、的確な対応ができると思います。",
        "事前規制はイノベーションを阻害し、長期的にはマイナスだと思います。",
      ],
      neutral: [
        "予防と事後対応のどちらも必要で、バランスが大事だと思います。",
        "コストの比較は難しく、状況によって最適な方法が変わると思います。",
        "理論的には予防が良いが、実際の運用コストを考えると判断が難しいです。",
      ],
      dont_know: [
        "予防と事後対応のコスト比較のデータがなく、判断できません。",
        "具体的にどんな規制が想定されているかわからず、意見を持てません。",
        "この問題について詳しくなく、考えがまとまっていません。",
      ],
    },
    freetextGuide: {
      agree: "賛成する理由を教えてください",
      disagree: "反対する理由を教えてください",
      neutral: "どちらとも言えない理由を教えてください",
      dont_know: "わからないと感じる理由を教えてください",
    },
  },
  {
    id: "q18",
    text: "オンライン詐欺の被害に遭うのは、個人の注意不足よりも社会の仕組みの問題だと思いますか？",
    starterSentences: {
      agree: [
        "詐欺の手口が巧妙化しているので、個人の注意だけでは防げないと思います。",
        "被害者を責めるのではなく、詐欺が起きにくい仕組みを作るべきだと思います。",
        "高齢者など情報弱者を社会全体で守る必要があると思います。",
      ],
      disagree: [
        "最終的には個人が自分の判断で行動する責任があると思います。",
        "リテラシー教育を充実させれば、多くの被害は防げると思います。",
        "社会の仕組みに頼りすぎると、個人の判断力が低下すると思います。",
      ],
      neutral: [
        "個人の注意も大事だが、社会の仕組みも同時に改善すべきだと思います。",
        "詐欺の種類によって、個人の責任と社会の責任の比重が変わると思います。",
        "どちらか一方の問題ではなく、両方が関係していると思います。",
      ],
      dont_know: [
        "被害の原因が個人と社会のどちらにあるかの判断基準がわかりません。",
        "具体的な被害事例を知らないので、意見を持てていません。",
        "この問題について考えたことがなく、判断する材料が足りません。",
      ],
    },
    freetextGuide: {
      agree: "賛成する理由を教えてください",
      disagree: "反対する理由を教えてください",
      neutral: "どちらとも言えない理由を教えてください",
      dont_know: "わからないと感じる理由を教えてください",
    },
  },
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      answers,
    }: {
      answers: Record<string, { likert: string; freetext: string }>;
    } = body;

    // Format answers for prompt
    const answersFormatted = SURVEY_QUESTIONS.map((q) => {
      const ans = answers[q.id];
      if (!ans) return `${q.id.toUpperCase()}: 未回答`;
      const likertLabel =
        LIKERT_OPTIONS.find((o) => o.value === ans.likert)?.label || ans.likert;
      return `${q.id.toUpperCase()} "${q.text}"
  回答: ${likertLabel}
  理由: ${ans.freetext || "（記述なし）"}`;
    }).join("\n\n");

    const questionCount = SURVEY_QUESTIONS.length;
    const result = await callOpenRouter(
      [
        { role: "system", content: FOLLOWUP_GENERATION_PROMPT },
        {
          role: "user",
          content: `回答者のQ1〜Q${questionCount}の回答:\n\n${answersFormatted}\n\nこの回答パターンから、背景にある価値観・考え方を探るフォローアップ質問を5つ生成してください。各質問にはスターター文とfreetextGuideも含めてください。JSON配列のみ出力してください。`,
        },
      ],
      { maxTokens: 3000, temperature: 0.6 },
    );

    // Parse JSON from response (handle markdown code blocks)
    let questions;
    try {
      let jsonStr = result.trim();
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr
          .replace(/^```(?:json)?\n?/, "")
          .replace(/\n?```$/, "");
      }
      questions = JSON.parse(jsonStr);

      // Validate structure
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error("Invalid response format");
      }

      // Ensure each question has required fields, fall back for missing starters
      questions = questions.map((q: Record<string, unknown>, i: number) => ({
        id: q.id || `q${questionCount + 1 + i}`,
        text: q.text || "",
        starterSentences: q.starterSentences ||
          FALLBACK_QUESTIONS[i]?.starterSentences || {
            agree: [],
            disagree: [],
            neutral: [],
            dont_know: [],
          },
        freetextGuide: q.freetextGuide ||
          FALLBACK_QUESTIONS[i]?.freetextGuide || {
            agree: "賛成する理由を教えてください",
            disagree: "反対する理由を教えてください",
            neutral: "どちらとも言えない理由を教えてください",
            dont_know: "わからないと感じる理由を教えてください",
          },
      }));
    } catch {
      console.error("Failed to parse AI response as JSON:", result);
      questions = FALLBACK_QUESTIONS;
    }

    return NextResponse.json({ questions });
  } catch (error) {
    console.error("Question generation error:", error);
    return NextResponse.json({ questions: FALLBACK_QUESTIONS });
  }
}

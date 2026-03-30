import { NextRequest, NextResponse } from "next/server";
import { callOpenRouter } from "@/lib/openrouter";
import {
  SURVEY_QUESTIONS,
  LIKERT_OPTIONS,
  FOLLOWUP_GENERATION_PROMPT,
} from "@/lib/survey-data";

export const runtime = "edge";

const FALLBACK_HINT_PROMPT = `あなたは市民意識調査の回答支援AIです。回答者がこの質問について自由記述で意見を書く際に、思考を深めるヒントを提示します。

目的：熟議の事前調査として、回答者の意見の「なぜ」を引き出すこと。

以下の方針でヒントを生成してください：
- 回答者の記述を踏まえ、まだ触れていない観点から一文の問いかけを提示する
- パッと読んで理解できる、簡潔で読みやすい一文にする
- トーンは「考えるヒント」程度。押しつけがましくない
- 日本語で、一文のみ出力する`;

const FALLBACK_QUESTIONS = [
  {
    id: "q7",
    text: "テクノロジー企業は、政府よりも市民の安全を守る能力が高いと思う。",
    starters: {
      strongly_agree: [
        "テクノロジー企業の方が技術力もスピードも政府より上だと思います。",
        "政府の対応は遅すぎるので、企業に任せた方が効果的だと思います。",
        "IT企業は問題の現場に一番近い存在なので、対応力が高いと思います。",
      ],
      agree: [
        "技術的な対応力では企業の方が優れていると感じます。",
        "政府よりも柔軟に対応できる点で企業に期待しています。",
        "日常的にサービスを運営している企業の方が現実的な対策を取れると思います。",
      ],
      neutral: [
        "企業にも政府にもそれぞれ得意な領域があり、一概には言えません。",
        "能力はあっても、企業には市民を守る義務がない点が気になります。",
        "場合によると思うので、どちらが上とは言い切れません。",
      ],
      disagree: [
        "企業は利益優先なので、市民の安全を最優先にはしないと思います。",
        "市民を守るのは政府の役割であり、企業に期待しすぎるのは危険だと思います。",
        "企業の技術力は認めるが、公共の安全は政府が責任を持つべきだと思います。",
      ],
      strongly_disagree: [
        "企業に市民の安全を委ねるのは根本的に間違っていると思います。",
        "利益と安全が相反する場面で、企業が安全を選ぶとは思えません。",
        "政府こそが法的権限を持ち、市民を守る唯一の主体だと思います。",
      ],
      dont_know: [
        "企業と政府の役割の違いがよくわからず、判断できません。",
        "どちらが能力が高いかを比較する基準がわかりません。",
        "この問題についてあまり考えたことがなく、意見が持てません。",
      ],
    },
    hintSystemPrompt: FALLBACK_HINT_PROMPT,
  },
  {
    id: "q8",
    text: "多少の不便や制約があっても、詐欺被害を未然に防ぐための規制は必要だと思う。",
    starters: {
      strongly_agree: [
        "被害を防ぐためなら多少の不便は受け入れるべきだと思います。",
        "規制がなければ被害は増え続けるので、制約は必要なコストだと思います。",
        "自由よりも安全を優先すべき場面は確実にあると思います。",
      ],
      agree: [
        "ある程度の規制は社会の安全のために仕方ないと思います。",
        "不便があっても、それで詐欺被害が減るなら許容できます。",
        "バランスは大事だが、現状では規制が足りないと感じます。",
      ],
      neutral: [
        "規制の内容や程度によって賛否が変わるので、一概には言えません。",
        "規制は必要だが、不便さの度合いが気になります。",
        "どの程度の制約なら許容できるか、具体的に見ないと判断できません。",
      ],
      disagree: [
        "不便や制約が大きすぎると、規制のデメリットの方が上回ると思います。",
        "規制よりも教育やリテラシー向上で対処すべきだと思います。",
        "過度な規制はイノベーションを阻害する恐れがあると思います。",
      ],
      strongly_disagree: [
        "個人の自由を制限する規制には原則として反対です。",
        "規制は既得権益を守る道具になりがちで、信用できません。",
        "不便を強いる規制は市民の権利を侵害していると思います。",
      ],
      dont_know: [
        "どの程度の規制が想定されているのかわからず、判断できません。",
        "規制のメリットとデメリットを比較する材料が足りません。",
        "この問題について考えたことがなく、まだ意見が持てません。",
      ],
    },
    hintSystemPrompt: FALLBACK_HINT_PROMPT,
  },
  {
    id: "q9",
    text: "インターネット上の問題には、既存の法律の枠組みでは十分に対処できないと思う。",
    starters: {
      strongly_agree: [
        "ネットの進化に法律が全く追いついていないと強く感じます。",
        "既存の法律はネット以前に作られたもので、根本的に不十分だと思います。",
        "新しい技術には新しいルールが必要だと確信しています。",
      ],
      agree: [
        "法律の改正スピードでは技術の変化に対応しきれないと思います。",
        "現行法では想定されていない問題がネット上には多いと感じます。",
        "既存の枠組みだけでは限界があるように思います。",
      ],
      neutral: [
        "既存の法律でも対処できる部分はあるが、不十分な点もあると思います。",
        "問題の種類によって既存の法律で対応できるものとできないものがある気がします。",
        "新しい法律が必要かどうかは、具体的な問題によると思います。",
      ],
      disagree: [
        "既存の法律を適切に運用すれば、ほとんどの問題に対処できると思います。",
        "新しい法律を作るよりも、既存の法律の執行を強化すべきだと思います。",
        "法律の枠組み自体は十分で、運用の問題だと思います。",
      ],
      strongly_disagree: [
        "既存の法律は十分に包括的で、ネットの問題にも対処できると思います。",
        "安易に新しい法律を作ると、かえって混乱を招くと思います。",
        "法律よりも自主規制や業界の取り組みで解決すべきだと思います。",
      ],
      dont_know: [
        "既存の法律がどうなっているかよく知らないので、判断できません。",
        "法律の専門的な内容がわからず、意見を持てません。",
        "この問題について考えたことがなく、まだ判断できません。",
      ],
    },
    hintSystemPrompt: FALLBACK_HINT_PROMPT,
  },
  {
    id: "q10",
    text: "詐欺被害が起きてから対処するよりも、事前に厳しく規制する方が社会全体のコストは低いと思う。",
    starters: {
      strongly_agree: [
        "被害が出てからでは遅すぎるので、予防こそが最優先だと思います。",
        "事後対応のコスト（捜査、裁判、被害回復）を考えれば、事前規制の方が明らかに安いと思います。",
        "被害者の精神的苦痛は金銭では測れないので、未然防止が最善だと思います。",
      ],
      agree: [
        "予防の方がコスト効率は良いと思います。",
        "被害が出た後では回復が難しいケースも多いので、事前対策が重要だと思います。",
        "事前規制にはコストがかかるが、被害を放置するよりはましだと思います。",
      ],
      neutral: [
        "事前規制と事後対応のどちらが良いかは、具体的な状況によると思います。",
        "コストの比較が難しく、一概にどちらが良いとは言えません。",
        "事前規制のコストも馬鹿にならないので、バランスが大事だと思います。",
      ],
      disagree: [
        "事前規制は過剰になりがちで、かえって社会的コストが増えると思います。",
        "問題が起きてから対処する方が、的確な対応ができると思います。",
        "厳しい事前規制はイノベーションを阻害し、経済的なコストが大きいと思います。",
      ],
      strongly_disagree: [
        "事前規制は自由を不当に制限するもので、社会的コストは極めて高いと思います。",
        "まだ起きていない被害のために市民の自由を制限すべきではないと思います。",
        "事前規制は権力の濫用を招きやすく、根本的に問題があると思います。",
      ],
      dont_know: [
        "社会全体のコストをどう計算するのかわからず、判断できません。",
        "事前規制と事後対応のそれぞれのコストが想像できません。",
        "この問題について考えたことがなく、意見をまとめられません。",
      ],
    },
    hintSystemPrompt: FALLBACK_HINT_PROMPT,
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

    const result = await callOpenRouter(
      [
        { role: "system", content: FOLLOWUP_GENERATION_PROMPT },
        {
          role: "user",
          content: `回答者のQ1〜Q6の回答:\n\n${answersFormatted}\n\nこの回答パターンから、背景にある価値観・考え方を探るフォローアップ質問を4つ生成してください。各質問にスターター文とAIヒント用システムプロンプトも含めてください。JSON配列のみ出力してください。`,
        },
      ],
      { maxTokens: 4096, temperature: 0.6 }
    );

    // Parse JSON from response (handle markdown code blocks)
    let questions;
    try {
      let jsonStr = result.trim();
      // Strip markdown code block if present
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      questions = JSON.parse(jsonStr);

      // Validate that questions have starters; if not, use fallback starters
      for (const q of questions) {
        if (!q.starters) {
          const fallback = FALLBACK_QUESTIONS.find((fq) => fq.id === q.id);
          if (fallback) {
            q.starters = fallback.starters;
            q.hintSystemPrompt = fallback.hintSystemPrompt;
          }
        }
        if (!q.hintSystemPrompt) {
          q.hintSystemPrompt = FALLBACK_HINT_PROMPT;
        }
      }
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

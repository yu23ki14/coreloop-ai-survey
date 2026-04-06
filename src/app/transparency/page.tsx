import { MODEL_INFO } from "@/lib/openrouter";
import {
  SURVEY_QUESTIONS,
  FOLLOWUP_GENERATION_PROMPT,
  FOLLOWUP_HINT_SYSTEM_PROMPT,
  HINT_USER_MESSAGE_TEMPLATE,
} from "@/lib/survey-data";
import Link from "next/link";
import { Title, Typography } from "@/components/Typography";

export const metadata = {
  title: "AIの使用について - 市民意識調査",
};

export default function TransparencyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-border bg-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-base font-bold text-primary leading-tight">
            AIの使用について
          </h1>
          <Link href="/" className="text-sm font-normal text-accent leading-relaxed hover:underline">
            調査に戻る
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-10">
        {/* Overview */}
        <section>
          <Title as="h2" className="mb-4">概要</Title>
          <div className="bg-surface border border-border rounded-xl p-6 space-y-3">
            <Typography as="p" size="regular" secondary>
              この市民意識調査では、回答体験を支援するためにAI（人工知能）を2つの場面で使用しています。
              以下に、使用しているモデル、各場面での使用目的、使用しているプロンプト（AIへの指示文）の全文を開示します。
            </Typography>
            <Typography as="p" size="regular" secondary>
              AIは回答者の意見を誘導するためではなく、考えを深めるきっかけを提供するために使用しています。
              AIが提示するヒントや問いかけは参考情報であり、回答者はこれらを無視して自由に回答することができます。
            </Typography>
          </div>
        </section>

        {/* Model Info */}
        <section>
          <Title as="h2" className="mb-4">使用モデル</Title>
          <div className="bg-white border border-border rounded-xl p-6">
            <dl className="space-y-3">
              <div className="flex gap-4">
                <Typography as="dt" size="regular" weight="bold" className="w-32 shrink-0">モデル名</Typography>
                <Typography as="dd" size="regular" secondary>{MODEL_INFO.name}</Typography>
              </div>
              <div className="flex gap-4">
                <Typography as="dt" size="regular" weight="bold" className="w-32 shrink-0">モデルID</Typography>
                <Typography as="dd" size="small" secondary className="font-mono">{MODEL_INFO.id}</Typography>
              </div>
              <div className="flex gap-4">
                <Typography as="dt" size="regular" weight="bold" className="w-32 shrink-0">提供元</Typography>
                <Typography as="dd" size="regular" secondary>{MODEL_INFO.provider}</Typography>
              </div>
              <div className="flex gap-4">
                <Typography as="dt" size="regular" weight="bold" className="w-32 shrink-0">説明</Typography>
                <Typography as="dd" size="regular" secondary>{MODEL_INFO.description}</Typography>
              </div>
            </dl>
          </div>
        </section>

        {/* Usage 1: Hints */}
        <section>
          <Title as="h2" className="mb-4">
            使用場面 1：自由記述の回答ヒント生成
          </Title>
          <div className="space-y-4">
            <Typography as="p" size="regular" secondary>
              各設問の自由記述欄で回答者が文章を入力する際、AIが「考えるヒント」を自動的に提示します。
              ヒントは回答者のリッカート尺度での回答内容と、自由記述の内容を踏まえて生成されます。
            </Typography>

            {/* User message template */}
            <div className="bg-white border border-border rounded-xl p-6">
              <Title as="h3" className="mb-2">ユーザーメッセージテンプレート</Title>
              <Typography as="p" size="small" muted className="mb-3">
                回答者の状態を踏まえてAIに送信されるメッセージのテンプレートです。
              </Typography>
              <pre className="bg-gray-50 rounded-lg p-4 text-xs overflow-x-auto whitespace-pre-wrap font-mono">
                {HINT_USER_MESSAGE_TEMPLATE}
              </pre>
            </div>

            {/* Per-question system prompts */}
            <Title as="h3" className="mt-6">設問別システムプロンプト（Q1〜Q{SURVEY_QUESTIONS.length}）</Title>
            {SURVEY_QUESTIONS.map((q, i) => (
              <details key={q.id} className="bg-white border border-border rounded-xl overflow-hidden">
                <summary className="px-6 py-4 cursor-pointer hover:bg-surface">
                  <Typography size="regular" weight="bold">
                    Q{i + 1}: {q.text.substring(0, 50)}...
                  </Typography>
                </summary>
                <div className="px-6 pb-4">
                  <pre className="bg-gray-50 rounded-lg p-4 text-xs overflow-x-auto whitespace-pre-wrap font-mono">
                    {q.hintSystemPrompt}
                  </pre>
                </div>
              </details>
            ))}

            {/* Followup hint prompt */}
            <div className="bg-white border border-border rounded-xl p-6">
              <Title as="h3" className="mb-2">フォローアップ質問用ヒントプロンプト</Title>
              <Typography as="p" size="small" muted className="mb-3">
                AI生成のフォローアップ質問に対する自由記述ヒントに使用されます。{`{{QUESTION_TEXT}}`} はAI生成の質問文で置換されます。
              </Typography>
              <pre className="bg-gray-50 rounded-lg p-4 text-xs overflow-x-auto whitespace-pre-wrap font-mono">
                {FOLLOWUP_HINT_SYSTEM_PROMPT}
              </pre>
            </div>
          </div>
        </section>

        {/* Usage 2: Follow-up Questions */}
        <section>
          <Title as="h2" className="mb-4">
            使用場面 2：フォローアップ質問の生成
          </Title>
          <div className="space-y-4">
            <Typography as="p" size="regular" secondary>
              2ページ目では、1ページ目（Q1〜Q{SURVEY_QUESTIONS.length}）の回答パターンに基づいて、
              回答者の価値観や考え方をより深く理解するための追加質問5問をAIが生成します。
              生成された質問は各回答者によって異なる場合があります。
            </Typography>
            <div className="bg-white border border-border rounded-xl p-6">
              <Title as="h3" className="mb-2">フォローアップ質問生成プロンプト</Title>
              <Typography as="p" size="small" muted className="mb-3">
                回答者のQ1〜Q{SURVEY_QUESTIONS.length}の回答パターンに基づいて、背景にある価値観を探る質問を生成するために使用されます。
              </Typography>
              <pre className="bg-gray-50 rounded-lg p-4 text-xs overflow-x-auto whitespace-pre-wrap font-mono">
                {FOLLOWUP_GENERATION_PROMPT}
              </pre>
            </div>
          </div>
        </section>

        {/* Data handling */}
        <section>
          <Title as="h2" className="mb-4">データの取り扱い</Title>
          <div className="bg-surface border border-border rounded-xl p-6 space-y-3">
            <Typography as="p" size="regular" secondary>
              回答データは匿名で収集されます。AIサービス（OpenRouter経由でGoogleのGeminiモデル）に送信されるデータは、
              回答内容のみであり、個人を特定する情報は含まれません。
            </Typography>
            <Typography as="p" size="regular" secondary>
              回答データはSupabaseのデータベースに保存されます。収集したデータは熟議型世論調査の論点整理の
              目的にのみ使用し、第三者への販売や目的外の利用は行いません。
            </Typography>
          </div>
        </section>
      </main>

      <footer className="border-t border-border mt-16 py-6">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Link href="/" className="text-sm font-normal text-accent leading-relaxed hover:underline">
            調査に戻る
          </Link>
        </div>
      </footer>
    </div>
  );
}

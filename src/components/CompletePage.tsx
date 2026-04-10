"use client";

import { useState } from "react";
import { Title, Typography } from "./Typography";

export default function CompletePage() {
  const [email, setEmail] = useState("");
  const [contactState, setContactState] = useState<
    "idle" | "submitting" | "done" | "error"
  >("idle");

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setContactState("submitting");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) throw new Error();
      setContactState("done");
    } catch {
      setContactState("error");
    }
  };

  return (
    <div className="text-center py-5 sm:py-10 space-y-6">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 border-2 border-green-200">
        <svg
          className="w-8 h-8 text-success"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      <div className="space-y-3">
        <h2 className="text-2xl font-bold text-text">
          ご回答ありがとうございました
        </h2>
        <Typography
          as="p"
          size="regular"
          secondary
          className="max-w-md mx-auto"
        >
          いただいたご意見は、今後予定している熟議型世論調査やワークショップでの論点整理に活用させていただきます。
        </Typography>
      </div>

      {/* Contact email collection */}
      <div className="bg-white border border-border rounded-2xl p-6 max-w-md mx-auto text-left space-y-3">
        <Title as="p">今後の情報を受け取りませんか？</Title>
        <Typography as="p" size="regular" secondary>
          追加ヒアリングのご案内やプロジェクトの進捗をお届けします。回答内容とメールアドレスは紐づきません。
        </Typography>

        {contactState === "done" ? (
          <div className="flex items-center gap-2 py-2 text-sm text-green-700">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            登録しました。ありがとうございます。
          </div>
        ) : (
          <form onSubmit={handleContactSubmit} className="space-y-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="メールアドレス"
              required
              className="w-full px-4 py-3 rounded-xl border border-border bg-white text-text text-sm placeholder:text-text-muted"
            />
            {contactState === "error" && (
              <p className="text-xs text-red-600">
                送信に失敗しました。もう一度お試しください。
              </p>
            )}
            <button
              type="submit"
              disabled={contactState === "submitting"}
              className="inline-block w-full text-center px-6 py-3 bg-primary text-white rounded-xl text-base font-semibold hover:bg-primary-light transition-all shadow-sm hover:shadow-md"
            >
              {contactState === "submitting" ? "送信中..." : "登録する"}
            </button>
          </form>
        )}
      </div>

      {/* Crowdfunding CTA */}
      <div className="bg-white border border-border rounded-2xl p-6 max-w-md mx-auto text-left space-y-3">
        <Title as="p">この取り組みを応援しませんか？</Title>
        <Typography as="p" size="regular" secondary>
          本プロジェクトを進めるために、クラウドファンディングを実施中です。オンライン広告詐欺のない社会の実現に向けて、ご支援いただけると幸いです。
        </Typography>
        <a
          href="https://camp-fire.jp/projects/930941/view"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block w-full text-center px-6 py-3 border-2 border-primary text-primary rounded-xl text-base font-semibold hover:bg-primary/5 transition-all"
        >
          クラウドファンディングを見る
        </a>
      </div>
    </div>
  );
}

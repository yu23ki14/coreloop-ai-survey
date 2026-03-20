"use client";

import { useState, useEffect, useCallback } from "react";
import { SURVEY_QUESTIONS, LIKERT_OPTIONS } from "@/lib/survey-data";

interface AdminData {
  summary: {
    total: number;
    completed: number;
    page1Only: number;
    startedButNotCompleted: number;
  };
  interestDistribution: Record<string, number>;
  likertDistributions: Record<string, Record<string, number>>;
  followupData: Record<string, { text: string; likert: string }[]>;
  responses: Record<string, unknown>[];
}

const INTEREST_LABELS: Record<string, string> = {
  "5": "非常に関心がある",
  "4": "やや関心がある",
  "3": "どちらとも言えない",
  "2": "あまり関心がない",
  "1": "ほとんど関心がない",
};

const LIKERT_LABELS: Record<string, string> = {};
for (const opt of LIKERT_OPTIONS) {
  LIKERT_LABELS[opt.value] = opt.label;
}

const LIKERT_COLORS: Record<string, string> = {
  strongly_agree: "bg-blue-600",
  agree: "bg-blue-400",
  neutral: "bg-gray-400",
  disagree: "bg-orange-400",
  strongly_disagree: "bg-red-500",
  dont_know: "bg-gray-300",
};

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [data, setData] = useState<AdminData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "q1-6" | "q7-10" | "responses">("overview");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin", {
        headers: { Authorization: `Bearer ${password}` },
      });
      if (response.status === 401) {
        setIsAuthenticated(false);
        setError("パスワードが正しくありません。");
        return;
      }
      if (!response.ok) throw new Error("Failed to fetch data");
      const result = await response.json();
      setData(result);
      setIsAuthenticated(true);
    } catch (err) {
      console.error("Admin fetch error:", err);
      setError("データの取得に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  }, [password]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const handleCsvDownload = async () => {
    try {
      const response = await fetch("/api/admin?format=csv", {
        headers: { Authorization: `Bearer ${password}` },
      });
      if (!response.ok) throw new Error("CSV download failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `survey-responses-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("CSV download error:", err);
      setError("CSVのダウンロードに失敗しました。");
    }
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchData]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <form
          onSubmit={handleLogin}
          className="bg-white border border-border rounded-xl p-8 shadow-sm max-w-sm w-full space-y-4"
        >
          <h1 className="text-lg font-bold text-text">管理者ダッシュボード</h1>
          <p className="text-sm text-text-secondary">
            パスワードを入力してください。
          </p>
          {error && <p className="text-sm text-error">{error}</p>}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="パスワード"
            className="w-full px-4 py-2 border border-border rounded-lg text-sm"
            autoFocus
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-light transition-all"
          >
            {isLoading ? "読み込み中..." : "ログイン"}
          </button>
        </form>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="bg-white border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-bold text-primary">管理者ダッシュボード</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="text-sm text-accent hover:underline disabled:opacity-50"
            >
              {isLoading ? "更新中..." : "データを更新"}
            </button>
            <button
              onClick={handleCsvDownload}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-light transition-all"
            >
              CSVダウンロード
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard label="総回答数" value={data.summary.total} />
          <SummaryCard label="完了（2ページ目まで）" value={data.summary.completed} />
          <SummaryCard label="1ページ目のみ完了" value={data.summary.page1Only} />
          <SummaryCard
            label="完了率"
            value={
              data.summary.total > 0
                ? `${Math.round((data.summary.completed / data.summary.total) * 100)}%`
                : "—"
            }
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-border rounded-lg p-1">
          {(
            [
              ["overview", "概要"],
              ["q1-6", "Q1-Q6 詳細"],
              ["q7-10", "Q7-Q10 詳細"],
              ["responses", "個別回答"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === key
                  ? "bg-primary text-white"
                  : "text-text-secondary hover:bg-surface"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Interest Distribution */}
            <div className="bg-white border border-border rounded-xl p-6">
              <h3 className="font-semibold text-text mb-4">関心度の分布</h3>
              <div className="space-y-2">
                {["5", "4", "3", "2", "1"].map((level) => {
                  const count = data.interestDistribution[level] || 0;
                  const total = data.summary.total || 1;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={level} className="flex items-center gap-3">
                      <span className="text-xs text-text-secondary w-40 shrink-0">
                        {INTEREST_LABELS[level]}
                      </span>
                      <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                        <div
                          className="h-full bg-accent rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-text-muted w-16 text-right">
                        {count} ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Q1-Q6 Likert Summary */}
            <div className="bg-white border border-border rounded-xl p-6">
              <h3 className="font-semibold text-text mb-4">Q1-Q6 回答分布</h3>
              <div className="space-y-4">
                {SURVEY_QUESTIONS.map((q, i) => {
                  const dist = data.likertDistributions[q.id] || {};
                  const total = Object.values(dist).reduce((s, v) => s + v, 0) || 1;
                  return (
                    <div key={q.id}>
                      <p className="text-xs text-text-secondary mb-1.5 leading-relaxed">
                        Q{i + 1}: {q.text.substring(0, 60)}...
                      </p>
                      <div className="flex h-6 rounded-md overflow-hidden">
                        {LIKERT_OPTIONS.map((opt) => {
                          const count = dist[opt.value] || 0;
                          const pct = (count / total) * 100;
                          if (pct === 0) return null;
                          return (
                            <div
                              key={opt.value}
                              className={`${LIKERT_COLORS[opt.value]} flex items-center justify-center text-white text-[10px] font-medium`}
                              style={{ width: `${pct}%` }}
                              title={`${opt.label}: ${count} (${Math.round(pct)}%)`}
                            >
                              {pct >= 8 ? `${Math.round(pct)}%` : ""}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {/* Legend */}
                <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
                  {LIKERT_OPTIONS.map((opt) => (
                    <div key={opt.value} className="flex items-center gap-1.5">
                      <div className={`w-3 h-3 rounded ${LIKERT_COLORS[opt.value]}`} />
                      <span className="text-[10px] text-text-muted">{opt.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "q1-6" && (
          <div className="space-y-6">
            {SURVEY_QUESTIONS.map((q, i) => {
              const dist = data.likertDistributions[q.id] || {};
              const freetexts = (data.responses || [])
                .filter((r) => r[`${q.id}_freetext`])
                .map((r) => ({
                  text: r[`${q.id}_freetext`] as string,
                  likert: r[`${q.id}_likert`] as string,
                }));

              return (
                <div
                  key={q.id}
                  className="bg-white border border-border rounded-xl p-6"
                >
                  <h3 className="font-semibold text-text mb-2">
                    Q{i + 1}: {q.text}
                  </h3>

                  {/* Distribution table */}
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2 my-4">
                    {LIKERT_OPTIONS.map((opt) => (
                      <div
                        key={opt.value}
                        className="bg-surface rounded-lg p-3 text-center"
                      >
                        <p className="text-xs text-text-muted">{opt.label}</p>
                        <p className="text-xl font-bold text-text">
                          {dist[opt.value] || 0}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Free text responses */}
                  <details>
                    <summary className="text-sm text-accent cursor-pointer hover:underline">
                      自由記述回答を見る ({freetexts.length}件)
                    </summary>
                    <div className="mt-3 space-y-2 max-h-96 overflow-y-auto">
                      {freetexts.length === 0 ? (
                        <p className="text-sm text-text-muted">
                          自由記述回答はありません。
                        </p>
                      ) : (
                        freetexts.map((ft, j) => (
                          <div
                            key={j}
                            className="bg-surface rounded-lg p-3 text-sm"
                          >
                            <span className="inline-block px-2 py-0.5 bg-gray-200 text-text-muted rounded text-xs mb-1">
                              {LIKERT_LABELS[ft.likert] || ft.likert}
                            </span>
                            <p className="text-text-secondary leading-relaxed">
                              {ft.text}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </details>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "q7-10" && (
          <div className="space-y-6">
            <div className="bg-surface border border-border rounded-xl p-5">
              <p className="text-sm text-text-secondary">
                Q7-Q10は回答者ごとにAIが個別生成した質問です。参加者ごとに質問と回答を表示します。
              </p>
            </div>
            {(() => {
              const respondents = (data.responses || []).filter(
                (r) => r.q7_text || r.q8_text || r.q9_text || r.q10_text
              );
              if (respondents.length === 0) {
                return (
                  <div className="bg-white border border-border rounded-xl p-6">
                    <p className="text-sm text-text-muted">Q7-Q10の回答はまだありません。</p>
                  </div>
                );
              }
              return respondents.map((r, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-border rounded-xl p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-text">
                      回答者 #{respondents.length - idx}
                    </h3>
                    <span className="text-xs text-text-muted">
                      {r.created_at
                        ? new Date(r.created_at as string).toLocaleString(
                            "ja-JP",
                            { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
                          )
                        : ""}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {(["q7", "q8", "q9", "q10"] as const).map((qId, qIdx) => {
                      const text = r[`${qId}_text`] as string | undefined;
                      const likert = r[`${qId}_likert`] as string | undefined;
                      if (!text) return null;
                      return (
                        <div key={qId} className="bg-surface rounded-lg p-4">
                          <p className="text-xs text-text-muted mb-1">Q{qIdx + 7}</p>
                          <p className="text-sm text-text mb-2">{text}</p>
                          {likert && (
                            <span
                              className={`inline-block text-xs px-2.5 py-1 rounded-full text-white ${LIKERT_COLORS[likert] || "bg-gray-400"}`}
                            >
                              {LIKERT_LABELS[likert] || likert}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}
          </div>
        )}

        {activeTab === "responses" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-text-secondary">
                全{data.responses?.length || 0}件の回答
              </p>
              <button
                onClick={handleCsvDownload}
                className="text-sm text-accent hover:underline"
              >
                CSVでダウンロード
              </button>
            </div>
            <div className="overflow-x-auto bg-white border border-border rounded-xl">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-surface">
                    <th className="px-3 py-2 text-left font-medium text-text-muted">
                      日時
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-text-muted">
                      関心度
                    </th>
                    {SURVEY_QUESTIONS.map((q, i) => (
                      <th
                        key={q.id}
                        className="px-3 py-2 text-left font-medium text-text-muted"
                      >
                        Q{i + 1}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-left font-medium text-text-muted">
                      完了
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(data.responses || []).map((r, i) => (
                    <tr
                      key={i}
                      className="border-b border-border last:border-0 hover:bg-surface"
                    >
                      <td className="px-3 py-2 text-text-secondary whitespace-nowrap">
                        {r.created_at
                          ? new Date(r.created_at as string).toLocaleString(
                              "ja-JP",
                              { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
                            )
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-text-secondary">
                        {String(r.interest_level ?? "—")}
                      </td>
                      {SURVEY_QUESTIONS.map((q) => (
                        <td key={q.id} className="px-3 py-2">
                          <span
                            className="inline-block px-1.5 py-0.5 rounded text-[10px]"
                            title={
                              LIKERT_LABELS[r[`${q.id}_likert`] as string] ||
                              "—"
                            }
                          >
                            {LIKERT_LABELS[r[`${q.id}_likert`] as string]?.charAt(0) || "—"}
                          </span>
                          {(r[`${q.id}_freetext`] as string) ? (
                            <span
                              className="ml-1 text-accent"
                              title={r[`${q.id}_freetext`] as string}
                            >
                              📝
                            </span>
                          ) : null}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-text-secondary">
                        {(r.page_completed as number) === 2 ? "✓" : `P${r.page_completed}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="bg-white border border-border rounded-xl p-4">
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className="text-2xl font-bold text-text">{value}</p>
    </div>
  );
}

# オンライン広告詐欺対策に関する市民意識調査システム

熟議型世論調査（Deliberative Polling）の事前調査として、オンライン広告詐欺対策に関する市民の意見を幅広く深く収集するためのWebアンケートシステムです。

## 体験フロー

```
[イントロ] → [ページ1: 関心度 + Q1-Q6] → [ページ2: AI生成Q7-Q10 + 自由記述] → [完了]
```

- **ページ1**: 6つの政策提案に対してLikert尺度で回答 + 任意の自由記述（AI回答ヒント付き）
- **ページ2**: Q1-Q6の回答パターンからAIが価値観を探るフォローアップ質問を4問生成
- 自由記述をスキップすれば約5分、じっくり書けば10-15分

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 |
| データベース | Supabase (PostgreSQL + RLS) |
| AI | Gemini 3 Flash Preview（OpenRouter経由） |
| ホスティング | Vercel |

## セットアップ

### 1. リポジトリをクローン

```bash
git clone <repository-url>
cd coreloop-ai-survey-2
npm install
```

### 2. Supabase プロジェクトを作成

1. [Supabase](https://supabase.com) でプロジェクトを作成
2. SQL Editor で `supabase-schema.sql` を実行

```bash
# Supabase CLI を使う場合
supabase db push < supabase-schema.sql
```

### 3. OpenRouter API キーを取得

1. [OpenRouter](https://openrouter.ai) でアカウント作成
2. API キーを発行
3. `google/gemini-2.5-flash-preview` モデルが使えることを確認

### 4. 環境変数を設定

```bash
cp .env.local.example .env.local
```

`.env.local` を編集：

```env
# Supabase（プロジェクト設定 > API から取得）
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...

# OpenRouter
OPENROUTER_API_KEY=sk-or-v1-...

# 管理者ダッシュボードのパスワード（任意の文字列）
ADMIN_PASSWORD=your-secure-password
```

### 5. ローカルで起動

```bash
npm run dev
```

- 調査ページ: http://localhost:3000
- 管理者ダッシュボード: http://localhost:3000/admin
- AI使用の透明性ページ: http://localhost:3000/transparency

### 6. Vercel にデプロイ

```bash
npx vercel --prod
```

または Vercel ダッシュボードでリポジトリを接続し、環境変数を Settings > Environment Variables に設定してください。

## ページ一覧

| パス | 説明 |
|------|------|
| `/` | 調査ページ（イントロ → ページ1 → ページ2 → 完了） |
| `/admin` | 管理者ダッシュボード（パスワード認証） |
| `/transparency` | AIの使用に関する透明性ページ（モデル・プロンプト全文開示） |

## API エンドポイント

| メソッド | パス | 説明 |
|---------|------|------|
| `POST` | `/api/submit` | 回答データの保存（ページ1 / ページ2） |
| `POST` | `/api/hints` | 自由記述のAI回答ヒント生成 |
| `POST` | `/api/generate-questions` | Q7-Q10フォローアップ質問の生成 |
| `GET` | `/api/admin` | 管理者用データ取得（JSON / CSV） |

## AIヒントシステムの設計

自由記述欄でのAIヒント更新は3つのトリガーで発火します：

1. **デバウンス**: タイピング停止後 **2秒** で発火
2. **文完成トリガー**: 句点（。）や改行で即座に発火
3. **手動更新**: 「ヒントを更新」ボタン

ヒント切り替え時は現在のヒントを表示したまま、新しいヒントが到着したらフェードで差し替えます。

## 管理者ダッシュボード

`/admin` にアクセスし、`ADMIN_PASSWORD` で認証すると以下が利用可能です：

- **概要タブ**: 回答数、完了率、関心度分布、Q1-Q6のLikert分布（積み上げバー）
- **Q1-Q6タブ**: 各設問の分布テーブル + 自由記述回答一覧
- **Q7-Q10タブ**: AI生成質問ごとの回答集計
- **個別回答タブ**: 全回答のテーブルビュー
- **CSVダウンロード**: 全カラムを含むCSVファイル

データは30秒ごとに自動更新されます。

## データベーススキーマ

`responses` テーブル1つにフラットに格納しています。詳細は `supabase-schema.sql` を参照してください。

主なカラム：
- `session_id` — 回答者のセッション識別子（UUID）
- `interest_level` — 関心度（1-5）
- `q1_likert` 〜 `q6_likert` — Q1-Q6のLikert回答
- `q1_freetext` 〜 `q6_freetext` — Q1-Q6の自由記述
- `q7_text` 〜 `q10_text` — AI生成質問テキスト
- `q7_likert` 〜 `q10_likert` — Q7-Q10のLikert回答
- `additional_comments` — 最終自由記述
- `page_completed` — 進捗（0/1/2）

## プロジェクト構成

```
src/
├── app/
│   ├── page.tsx                    # メイン調査ページ
│   ├── layout.tsx                  # ルートレイアウト
│   ├── globals.css                 # グローバルスタイル
│   ├── admin/page.tsx              # 管理者ダッシュボード
│   ├── transparency/page.tsx       # AI透明性ページ
│   └── api/
│       ├── submit/route.ts         # 回答保存API
│       ├── hints/route.ts          # AIヒント生成API
│       ├── generate-questions/route.ts  # フォローアップ質問生成API
│       └── admin/route.ts          # 管理者データAPI
├── components/
│   ├── SurveyPage1.tsx             # ページ1コンポーネント
│   ├── SurveyPage2.tsx             # ページ2コンポーネント
│   ├── FreeTextWithHints.tsx       # AI回答ヒント付き自由記述
│   ├── LikertScale.tsx             # Likert尺度セレクタ
│   └── ProgressBar.tsx             # 進捗バー
└── lib/
    ├── survey-data.ts              # 設問データ・Pros/Cons・AIプロンプト
    ├── openrouter.ts               # OpenRouter API クライアント
    ├── prompts.ts                  # プロンプト定義（透明性ページ用）
    └── supabase.ts                 # Supabase クライアント
```

## セキュリティ

- 回答データは匿名で収集（個人特定情報なし）
- Supabase RLS により、anon キーでは回答の読み取り不可（insert/update のみ）
- 管理者APIはパスワード認証（Bearer token）
- AI APIキーはサーバーサイドのみで使用（クライアントに露出しない）

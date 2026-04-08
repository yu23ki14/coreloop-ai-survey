# オンライン広告詐欺対策に関する市民意識調査システム

熟議型世論調査（Deliberative Polling）の事前調査として、オンライン広告詐欺対策に関する市民の意見を幅広く深く収集するためのWebアンケートシステムです。

## 体験フロー

```
[イントロ] → [ページ1: 関心度 + Q1-Q13] → [ページ2: AI生成フォローアップ5問] → [完了]
```

- **ページ1**: 13の設問に対してLikert尺度で回答 + 任意の自由記述（AI回答ヒント付き）
- **ページ2**: ページ1の回答パターンからAIが価値観を探るフォローアップ質問を5問生成
- 自由記述をスキップすれば約5分、じっくり書けば10-15分

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 |
| データベース | Supabase (PostgreSQL + RLS) |
| AI | Gemini 3 Flash Preview（OpenRouter経由） |
| ホスティング | Cloudflare Workers（@opennextjs/cloudflare） |
| Lint / Format | Biome |

## セットアップ

### 1. リポジトリをクローン

```bash
git clone git@github.com:digitaldemocracy2030/coreloop-ai-survey.git
cd coreloop-ai-survey
pnpm install
```

### 2. Supabase（ローカル開発）

```bash
supabase start                    # ローカルSupabase起動（localhost:54321）
supabase db reset                 # マイグレーション適用
supabase gen types typescript --local > src/lib/database.types.ts  # 型生成
```

### 3. 環境変数を設定

```bash
cp .env.local.example .env.development.local
```

`.env.development.local` を編集（ローカルSupabaseの値はデフォルトで入っています）。

### 4. ローカルで起動

```bash
pnpm dev
```

- 調査ページ: http://localhost:3000
- 管理者ダッシュボード: http://localhost:3000/admin
- AI使用の透明性ページ: http://localhost:3000/transparency

## 本番デプロイ

### Supabase（本番DB）

1. [Supabase](https://supabase.com) でプロジェクトを作成
2. マイグレーションを適用:
   ```bash
   supabase link --project-ref <PROJECT_REF>
   supabase db push
   ```

### Cloudflare Workers

1. `.env.production` を作成（`.env.production.example` を参照）
2. シークレットを設定:
   ```bash
   pnpm wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   pnpm wrangler secret put OPENROUTER_API_KEY
   pnpm wrangler secret put ADMIN_PASSWORD
   ```
3. ビルド＆デプロイ:
   ```bash
   pnpm build:worker
   pnpm wrangler deploy
   ```

> **注意**: `NEXT_PUBLIC_*` はビルド時に埋め込まれるため `.env.production` に記載が必要です。ローカル開発用の `.env.development.local` があるとビルド時に優先されてしまうので、ローカル用envファイルは `.env.development.local` を使ってください。

## コマンド一覧

```bash
pnpm dev              # 開発サーバー
pnpm build            # Next.jsビルド
pnpm build:worker     # Cloudflare Workers向けビルド
pnpm wrangler deploy  # Cloudflare Workersにデプロイ
pnpm check            # Biome lint + format（自動修正）
pnpm format           # Biome formatのみ
pnpm lint             # ESLint
```

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
| `POST` | `/api/generate-questions` | フォローアップ質問の生成（5問） |
| `GET/POST` | `/api/session` | セッションの取得・作成・更新 |
| `POST` | `/api/save-answer` | 個別回答の自動保存 |
| `GET` | `/api/admin` | 管理者用データ取得（JSON / CSV） |

## データベーススキーマ

正規化された2テーブル構成です。スキーマは `supabase/migrations/` で管理しています。

**sessions** — 回答者ごとに1レコード
- `session_id` — セッション識別子（UUID）
- `interest_level` — 関心度（1-5）
- `interest_reasons` — 関心の理由（JSONB）
- `page_completed` — 進捗（0/1/2）

**answers** — 設問ごとに1レコード（UNIQUE: session_id + question_id）
- `session_id` — セッション識別子（FK → sessions）
- `question_id` — 設問ID
- `likert` — Likert回答
- `freetext` — 自由記述
- `is_followup` — フォローアップ質問かどうか

## プロジェクト構成

```
src/
├── app/
│   ├── page.tsx                         # メイン調査ページ（全ステージ管理）
│   ├── layout.tsx                       # ルートレイアウト
│   ├── globals.css                      # グローバルスタイル
│   ├── admin/page.tsx                   # 管理者ダッシュボード
│   ├── transparency/page.tsx            # AI透明性ページ
│   └── api/
│       ├── submit/route.ts              # 回答保存API
│       ├── hints/route.ts               # AIヒント生成API
│       ├── generate-questions/route.ts  # フォローアップ質問生成API
│       ├── session/route.ts             # セッション管理API
│       ├── save-answer/route.ts         # 個別回答自動保存API
│       └── admin/route.ts              # 管理者データAPI
├── components/
│   ├── SurveyPage1.tsx                  # ページ1コンポーネント
│   ├── SurveyPage2.tsx                  # ページ2コンポーネント
│   ├── FreeTextWithHints.tsx            # AI回答ヒント付き自由記述
│   ├── FraudEducationCarousel.tsx       # イントロカルーセル
│   ├── LikertScale.tsx                  # Likert尺度セレクタ
│   ├── Typography.tsx                   # テキストサイズ統一コンポーネント
│   └── ProgressBar.tsx                  # 進捗バー
└── lib/
    ├── survey-data.ts                   # 設問データ・AIプロンプト定義
    ├── openrouter.ts                    # OpenRouter APIクライアント
    ├── llm-cache.ts                     # LLMレスポンスキャッシュ
    ├── supabase.ts                      # Supabaseクライアント
    └── database.types.ts               # DB型定義（自動生成）
```

## セキュリティ

- 回答データは匿名で収集（個人特定情報なし）
- Supabase RLS により、anon キーでは回答の読み取り不可（insert/update のみ）
- 管理者APIはパスワード認証（Bearer token）
- AI APIキーはサーバーサイドのみで使用（クライアントに露出しない）

## 環境変数

| 変数名 | 用途 | 設定場所 |
|--------|------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL | `.env.development.local` / `.env.production` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase公開キー | `.env.development.local` / `.env.production` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabaseサービスロールキー | `.env.development.local` / `wrangler secret` |
| `OPENROUTER_API_KEY` | OpenRouter APIキー | `.env.development.local` / `wrangler secret` |
| `ADMIN_PASSWORD` | 管理者ダッシュボードのパスワード | `.env.development.local` / `wrangler secret` |

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Deliberative Polling pre-survey web app on online ad fraud countermeasures. Users answer Page 1 (interest + policy Likert + free text with AI hints), then AI generates 5 follow-up questions based on their response patterns. All content is in Japanese.

Page 1の設問数は今後変更される予定。フォローアップは常に5問で固定。

## Commands

```bash
pnpm dev             # Dev server at localhost:3000
pnpm build           # Production build
pnpm lint            # ESLint
```

Supabase local development:
```bash
supabase start       # Start local Supabase (localhost:54321)
supabase db reset    # Reset DB and re-run migrations
supabase gen types typescript --local > src/lib/database.types.ts  # Regenerate DB types
```

## Important Constraints

- **Edge RuntimeとHTTPヘッダー**: API routes use Edge Runtime. HTTP headers (fetch含む) only accept ASCII (ByteString). Japanese text in headers causes TypeError. `X-Title` etc. must be ASCII only.
- **DB変更時は必ず型再生成**: スキーマ変更 → migration更新 → `supabase db reset` → `supabase gen types` → 型ファイル更新の順序を守る。型とDBの不一致はランタイムエラーになる。
- **UIの情報量は最小限に**: ユーザーは情報過多を嫌う。説明文・ラベル・補助テキストの追加は慎重に。削れるものは削る。
- **スキーマはマイグレーションで管理**: `supabase/migrations/` が正。手動SQLやスキーマファイルの二重管理はしない。

## Architecture

**Next.js 15 App Router** with TypeScript, Tailwind CSS v4, Supabase (PostgreSQL + RLS), and Gemini via OpenRouter.

### Flow

`Intro (carousel) → Page 1 (interest + Q1-Q6) → Page 2 (AI-generated follow-ups) → Complete (with crowdfunding CTA)`

### Key architectural decisions

- **Single-page survey** (`src/app/page.tsx`): All survey stages are managed as client-side state within one page component, not separate routes.
- **Session recovery**: Survey state is persisted to `sessionStorage` so users can resume mid-survey.
- **Edge runtime**: All API routes use Edge Runtime for low latency.
- **LLM caching**: AI responses are cached in Supabase `llm_cache` table keyed by SHA-256 hash of the request body. Cache writes are fire-and-forget (no await).
- **Flat schema**: All survey data stored in a single `responses` table (no normalization). Schema managed in `supabase/migrations/`.
- **Type-safe DB access**: `src/lib/database.types.ts` is auto-generated from Supabase. Submit API uses `TablesInsert` / `TablesUpdate` types.
- **Two Supabase clients** (`src/lib/supabase.ts`): `getSupabase()` for client-side (anon key) and `createAdminClient()` for server-side (service role key).
- **Survey content** (`src/lib/survey-data.ts`): All questions, options, pros/cons, starter sentences, and AI system prompts are defined in this single file.
- **AI hint triggers**: Debounce (2s after typing stops), sentence completion (。or newline), and manual button.

### API Routes (`src/app/api/`)

| Route | Purpose |
|-------|---------|
| `submit/route.ts` | Upsert survey responses by session_id (page 1 or page 2) |
| `hints/route.ts` | Generate free-text writing hints based on Likert stance |
| `generate-questions/route.ts` | Generate follow-up questions from Page 1 answers |
| `admin/route.ts` | Admin data endpoint (JSON/CSV), requires Bearer token |

### Pages

| Path | Description |
|------|-------------|
| `/` | Main survey (all stages) |
| `/admin` | Password-protected admin dashboard with stats and CSV export |
| `/transparency` | AI transparency page disclosing all prompts and model info |

## Environment Variables

Required in `.env.local` (see `.env.local.example`):
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase public config
- `SUPABASE_SERVICE_ROLE_KEY` — Server-side Supabase access
- `OPENROUTER_API_KEY` — AI model access via OpenRouter
- `ADMIN_PASSWORD` — Admin dashboard authentication

## Path Alias

`@/*` maps to `./src/*` (configured in tsconfig.json).

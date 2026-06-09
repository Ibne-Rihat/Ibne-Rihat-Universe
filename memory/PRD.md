# IBNE RIHAT UNIVERSE — Product Requirements Document

## Original Problem Statement
A luxury life operating system (personal SaaS) for Ibne Rihat to run business, money, content,
health, skills and life from one premium command center. Tagline: **Build. Grow. Dominate.**
Theme: Luxury Midnight Black + Neon Lime + Glassmorphism + Executive Workspace (Apple/Linear/Raycast/JARVIS).

## Stack (as built)
- Frontend: React 19, React Router 7, TanStack Query, Recharts, Framer Motion, Tailwind + shadcn/ui, sonner.
- Backend: FastAPI (single `server.py`), MongoDB (motor), httpx.
- Auth: Unified session-token mechanism for BOTH email/password (bcrypt) and Google (Emergent-managed OAuth).
  Session stored in `user_sessions`, delivered via httpOnly cookie + Bearer fallback (localStorage `iru_token`).

## User Persona
Solo entrepreneur/creator managing freelancing, clients, multiple income streams, a YouTube channel,
fitness, learning, and goals — wants one daily-driver dashboard with real, persistent data.

## Architecture / Tasks Done (2026-06-09)
- Auth: register, login, logout, /me, profile update, forgot/reset, Google session exchange, brute-force lockout, owner seeding.
- Generic CRUD factory over 21 collections (clients, projects, payments, income, expenses, youtube_videos,
  content_ideas, goals, tasks, habits, fitness_logs, weight_logs, body_progress, learning_progress, skills,
  ai_tools, focus_sessions, portfolio_projects, achievements, notifications, team_members) — each with
  create/read/update/delete + search/sort/status/category filters, user-scoped, with activity logging.
- Aggregations: `/api/dashboard` (revenue, net profit, clients, project status, goal/learning progress,
  workouts, focus, deadlines, recent activity, composite Life Score), `/api/analytics` (12-month revenue/expense,
  income-by-source, expense-by-category, client revenue, weight trend, skill radar, goals distribution).
- `/api/weather` via open-meteo (no key).
- Frontend modules: Dashboard, Clients (CRM table), Freelancing (drag Kanban), Money Center (income/expenses + charts),
  YouTube, Content Ideas, AI Tools, Team, Portfolio, Goals, Learning (XP), Fitness (logs + weight chart),
  Focus (pomodoro 25/50/90 + history), Analytics, Settings.
- Animated background: gradient mesh, floating particles, grain, grid overlay, cursor glow. Full data-testid coverage.

## Implemented & Verified
- Backend pytest: 38/38 passing (100%) — includes 8 AI assistant tests. Frontend QA: all owner + AI flows verified.
- Owner account seeded: `ibne@rihat.universe` / `Dominate2026`.

## AI Assistant ("JARVIS") + Discord (added 2026-06-09)
- `ai_assistant.py`: GPT-5.5 (via EMERGENT_LLM_KEY) turns plain text into real CRUD actions across all
  collections AND answers questions from a live data snapshot. Field-whitelist + safe match guards. Stores
  conversation in `ai_messages`. Shared by both the in-app chat and the Discord bot.
- Endpoints: POST `/api/ai/chat`, GET `/api/ai/messages`, GET `/api/ai/discord/status`.
- Frontend: floating `AiAssistant.jsx` panel (bottom-right) on every page; invalidates react-query caches so
  created data appears instantly in the right module.
- `discord_bot.py` (supervisor program `discord_bot`): idle until DISCORD_BOT_TOKEN + DISCORD_OWNER_ID are set;
  then the owner can manage the whole OS from Discord DMs/mentions. Activation steps in `/app/SELF_HOSTING.md`.
- `/app/SELF_HOSTING.md`: full self-hosting guide (stack, env vars, collections, run commands, Discord setup).

## Backlog / Remaining
- P1: Per-resource pydantic schemas for stricter validation; Mongo `$sum` aggregation for scale.
- P1: Client detail drawer (files, invoices, payment history, communication log) — currently summary fields only.
- P2: PWA manifest/service worker; real email delivery for password reset (currently logged to console).
- P2: Body progress photos / file uploads (object storage), notifications center UI, achievements gamification.
- P2: Split server.py into routers (auth/crud/aggregations).

## Next Tasks
1. Client detail view with invoices & payment history.
2. Cloud file uploads (progress photos, client files) via object storage.
3. PWA + offline shell.

# IBNE RIHAT UNIVERSE — Self-Hosting & Setup Guide

This is the complete list of everything the app uses and everything you need to run it
on your own hosting. Built as **React (frontend) + FastAPI (backend) + MongoDB (database)**.

---

## 1. What's inside (tech stack)

| Layer     | Technology |
|-----------|-----------|
| Frontend  | React 19, React Router, TanStack Query, Recharts, Tailwind + shadcn/ui, Framer Motion |
| Backend   | FastAPI (Python 3.11), Motor (async MongoDB driver), httpx |
| Database  | MongoDB |
| AI        | GPT-5.5 via the Emergent Universal LLM key (emergentintegrations) |
| Discord   | discord.py bot (optional, runs as a separate process) |
| Weather   | open-meteo.com (free, no key needed) |

---

## 2. Folders

```
/app
├── backend/
│   ├── server.py          # FastAPI app: auth, CRUD for 21 collections, dashboard, analytics, AI endpoints
│   ├── ai_assistant.py    # The "JARVIS" AI brain (text -> actions + answers)
│   ├── discord_bot.py     # Discord bot (idle until you add a token)
│   ├── requirements.txt   # Python dependencies
│   └── .env               # Backend secrets (see below)
└── frontend/
    ├── src/               # All React pages & components
    ├── package.json
    └── .env               # Frontend config (backend URL)
```

---

## 3. Environment variables you must set

### backend/.env
```
MONGO_URL="mongodb://localhost:27017"     # your MongoDB connection string
DB_NAME="ibne_rihat_universe"             # any database name you like
CORS_ORIGINS="https://your-frontend-domain.com"
JWT_SECRET="<a long random string>"       # generate: openssl rand -hex 32
ADMIN_EMAIL="you@email.com"               # your owner login email (auto-created on first boot)
ADMIN_PASSWORD="<a strong password>"      # your owner login password
FRONTEND_URL="https://your-frontend-domain.com"
EMERGENT_LLM_KEY="sk-emergent-..."        # universal key for the AI (from your Emergent profile)
AI_MODEL="gpt-5.5"                         # or gpt-5.4, claude-sonnet-4-6, gemini-3.1-pro-preview
DISCORD_BOT_TOKEN=""                       # optional — see section 6
DISCORD_OWNER_ID=""                        # optional — your Discord user id
```

### frontend/.env
```
REACT_APP_BACKEND_URL="https://your-backend-domain.com"
```
> All frontend API calls go to `REACT_APP_BACKEND_URL` + `/api`. The backend must be reachable at that URL.

---

## 4. Database — nothing to create manually

MongoDB collections are created automatically on first use. The app uses these collections:

`users`, `user_sessions`, `login_attempts`, `password_reset_tokens`, `activity_logs`,
`ai_messages`, and one per module:
`clients`, `projects`, `payments`, `income`, `expenses`, `youtube_videos`, `content_ideas`,
`goals`, `tasks`, `habits`, `fitness_logs`, `weight_logs`, `body_progress`,
`learning_progress`, `skills`, `ai_tools`, `focus_sessions`, `portfolio_projects`,
`achievements`, `notifications`, `team_members`.

On first boot the backend seeds your owner account from `ADMIN_EMAIL` / `ADMIN_PASSWORD`
and creates indexes. Just point `MONGO_URL` at any MongoDB (local, Atlas, etc.).

---

## 5. Running it

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001
```

### Frontend
```bash
cd frontend
yarn install
yarn build        # produces /build for static hosting
# or for dev:
yarn start
```

Serve the `frontend/build` folder from any static host (Nginx, Vercel, Netlify, etc.)
and run the backend on a server with Python + access to MongoDB.

---

## 6. Activating the Discord bot (optional)

1. Go to <https://discord.com/developers/applications> → **New Application**.
2. Open the **Bot** tab → **Add Bot** → copy the **Token**.
3. Under the Bot tab, enable **MESSAGE CONTENT INTENT** (required).
4. **OAuth2 → URL Generator**: scope `bot`, permissions `Send Messages` + `Read Message History`.
   Open the generated URL to invite the bot to your server (or just DM it).
5. Get **your** Discord user id: enable Developer Mode in Discord → right-click your name → Copy User ID.
6. Put both into `backend/.env`:
   ```
   DISCORD_BOT_TOKEN="your-bot-token"
   DISCORD_OWNER_ID="your-user-id"
   ```
7. Run the bot process:
   ```bash
   python backend/discord_bot.py
   ```
   (In this environment it runs under supervisor: `sudo supervisorctl restart discord_bot`)

Now DM the bot (or @mention it in a channel) things like:
> "Add a $500 Fiverr payment today and mark the logo project done"

…and it updates your Universe instantly, using the same AI brain as the in-app assistant.

---

## 7. The AI assistant

- In-app: click the lime **✦ button** (bottom-right) on any page to open JARVIS.
- It understands commands ("add", "log", "update", "mark done", "delete") and questions
  ("how much did I earn this month?").
- It writes to the same database, so anything it creates appears in the matching module instantly.
- Powered by `EMERGENT_LLM_KEY`. Top up balance anytime in your Emergent profile → Universal Key.

---

## 8. Owner login (default in this build)
- Email: `ibne@rihat.universe`
- Password: `Dominate2026`
- Change these by editing `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `backend/.env` before first boot.

from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, List

import bcrypt
import httpx
from fastapi import FastAPI, APIRouter, Request, Response, HTTPException, Depends, Query
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------
mongo_url = "mongodb+srv://mrrihadr_db_user:ljQTeSc8UisTLMUr@cluster0.6eadmxg.mongodb.net/?appName=Cluster0"
client = AsyncIOMotorClient(mongo_url)
db = client["ai_assistant_db"]

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("ibne_rihat_universe")

app = FastAPI(title="IBNE RIHAT UNIVERSE")
api = APIRouter(prefix="/api")

SESSION_DAYS = 7
EMERGENT_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def iso(dt: datetime) -> str:
    return dt.isoformat()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def public_user(doc: dict) -> dict:
    return {
        "user_id": doc["user_id"],
        "email": doc["email"],
        "name": doc.get("name", ""),
        "picture": doc.get("picture", ""),
        "role": doc.get("role", "owner"),
        "provider": doc.get("provider", "email"),
        "bio": doc.get("bio", ""),
        "settings": doc.get("settings", {}),
        "created_at": doc.get("created_at"),
    }


async def create_session(user_id: str, token: Optional[str] = None) -> str:
    token = token or f"sess_{uuid.uuid4().hex}{uuid.uuid4().hex}"
    expires = now_utc() + timedelta(days=SESSION_DAYS)
    await db.user_sessions.insert_one({
        "session_token": token,
        "user_id": user_id,
        "expires_at": iso(expires),
        "created_at": iso(now_utc()),
    })
    return token


def set_session_cookie(response: Response, token: str):
    response.set_cookie(
        key="session_token", value=token, httponly=True, secure=True,
        samesite="none", max_age=SESSION_DAYS * 24 * 3600, path="/",
    )


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < now_utc():
        raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def log_activity(user_id: str, action: str, entity: str, title: str):
    await db.activity_logs.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "action": action,
        "entity": entity,
        "title": title,
        "created_at": iso(now_utc()),
    })


# ---------------------------------------------------------------------------
# Auth models
# ---------------------------------------------------------------------------
class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ForgotIn(BaseModel):
    email: EmailStr


class ResetIn(BaseModel):
    token: str
    password: str = Field(min_length=6)


class ProfileIn(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    picture: Optional[str] = None
    settings: Optional[dict] = None


# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------
@api.post("/auth/register")
async def register(payload: RegisterIn, response: Response):
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    doc = {
        "user_id": user_id,
        "email": email,
        "name": payload.name,
        "picture": "",
        "password_hash": hash_password(payload.password),
        "role": "owner",
        "provider": "email",
        "bio": "",
        "settings": {},
        "created_at": iso(now_utc()),
    }
    await db.users.insert_one(doc)
    token = await create_session(user_id)
    set_session_cookie(response, token)
    return {"user": public_user(doc), "token": token}


@api.post("/auth/login")
async def login(payload: LoginIn, response: Response, request: Request):
    email = payload.email.lower()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"
    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt and attempt.get("count", 0) >= 5:
        locked_until = attempt.get("locked_until")
        if locked_until and datetime.fromisoformat(locked_until) > now_utc():
            raise HTTPException(status_code=429, detail="Too many attempts. Try again later.")
    user = await db.users.find_one({"email": email})
    if not user or not user.get("password_hash") or not verify_password(payload.password, user["password_hash"]):
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {"$inc": {"count": 1}, "$set": {"locked_until": iso(now_utc() + timedelta(minutes=15))}},
            upsert=True,
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")
    await db.login_attempts.delete_one({"identifier": identifier})
    token = await create_session(user["user_id"])
    set_session_cookie(response, token)
    return {"user": public_user(user), "token": token}


@api.post("/auth/google/session")
async def google_session(request: Request, response: Response):
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session id")
    async with httpx.AsyncClient(timeout=15) as hc:
        r = await hc.get(EMERGENT_SESSION_URL, headers={"X-Session-ID": session_id})
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Google session")
    data = r.json()
    email = data["email"].lower()
    user = await db.users.find_one({"email": email})
    if not user:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user = {
            "user_id": user_id,
            "email": email,
            "name": data.get("name", ""),
            "picture": data.get("picture", ""),
            "password_hash": None,
            "role": "owner",
            "provider": "google",
            "bio": "",
            "settings": {},
            "created_at": iso(now_utc()),
        }
        await db.users.insert_one(user)
    else:
        await db.users.update_one({"email": email}, {"$set": {"picture": data.get("picture", user.get("picture", ""))}})
    token = await create_session(user["user_id"], token=data.get("session_token"))
    set_session_cookie(response, token)
    return {"user": public_user(user), "token": token}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return public_user(user)


@api.put("/auth/profile")
async def update_profile(payload: ProfileIn, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if updates:
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": updates})
    fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return public_user(fresh)


@api.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


@api.post("/auth/forgot-password")
async def forgot_password(payload: ForgotIn):
    user = await db.users.find_one({"email": payload.email.lower()})
    if user:
        token = secrets.token_urlsafe(32)
        await db.password_reset_tokens.insert_one({
            "token": token,
            "user_id": user["user_id"],
            "expires_at": iso(now_utc() + timedelta(hours=1)),
            "used": False,
        })
        logger.info(f"[PASSWORD RESET] token for {payload.email}: {token}")
    return {"ok": True, "message": "If the email exists, a reset link was generated (check server logs)."}


@api.post("/auth/reset-password")
async def reset_password(payload: ResetIn):
    rec = await db.password_reset_tokens.find_one({"token": payload.token})
    if not rec or rec.get("used"):
        raise HTTPException(status_code=400, detail="Invalid or used token")
    if datetime.fromisoformat(rec["expires_at"]) < now_utc():
        raise HTTPException(status_code=400, detail="Token expired")
    await db.users.update_one({"user_id": rec["user_id"]}, {"$set": {"password_hash": hash_password(payload.password)}})
    await db.password_reset_tokens.update_one({"token": payload.token}, {"$set": {"used": True}})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Generic CRUD factory
# ---------------------------------------------------------------------------
RESOURCES = [
    "clients", "projects", "payments", "income", "expenses", "youtube_videos",
    "content_ideas", "goals", "tasks", "habits", "fitness_logs", "weight_logs",
    "body_progress", "learning_progress", "skills", "ai_tools", "focus_sessions",
    "portfolio_projects", "achievements", "notifications", "team_members", "reminders",
]

SEARCH_FIELDS = ["name", "title", "company", "email", "source", "category", "skill", "notes", "status"]


def make_crud(resource: str):
    coll = db[resource]

    @api.post(f"/{resource}")
    async def create_item(payload: dict, user: dict = Depends(get_current_user)):
        doc = dict(payload)
        doc.pop("_id", None)
        doc["id"] = str(uuid.uuid4())
        doc["user_id"] = user["user_id"]
        doc["created_at"] = iso(now_utc())
        doc["updated_at"] = iso(now_utc())
        await coll.insert_one(dict(doc))
        doc.pop("_id", None)
        await log_activity(user["user_id"], "created", resource, doc.get("name") or doc.get("title") or resource[:-1])
        return doc

    @api.get(f"/{resource}")
    async def list_items(
        user: dict = Depends(get_current_user),
        search: Optional[str] = Query(None),
        sort: Optional[str] = Query(None),
        order: str = Query("desc"),
        status: Optional[str] = Query(None),
        category: Optional[str] = Query(None),
    ):
        q = {"user_id": user["user_id"]}
        if status:
            q["status"] = status
        if category:
            q["category"] = category
        if search:
            q["$or"] = [{f: {"$regex": search, "$options": "i"}} for f in SEARCH_FIELDS]
        cursor = coll.find(q, {"_id": 0})
        if sort:
            cursor = cursor.sort(sort, 1 if order == "asc" else -1)
        else:
            cursor = cursor.sort("created_at", -1)
        return await cursor.to_list(2000)

    @api.get(f"/{resource}/{{item_id}}")
    async def get_item(item_id: str, user: dict = Depends(get_current_user)):
        doc = await coll.find_one({"id": item_id, "user_id": user["user_id"]}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Not found")
        return doc

    @api.put(f"/{resource}/{{item_id}}")
    async def update_item(item_id: str, payload: dict, user: dict = Depends(get_current_user)):
        updates = dict(payload)
        updates.pop("_id", None)
        updates.pop("id", None)
        updates.pop("user_id", None)
        updates["updated_at"] = iso(now_utc())
        res = await coll.update_one({"id": item_id, "user_id": user["user_id"]}, {"$set": updates})
        if res.matched_count == 0:
            raise HTTPException(status_code=404, detail="Not found")
        doc = await coll.find_one({"id": item_id, "user_id": user["user_id"]}, {"_id": 0})
        return doc

    @api.delete(f"/{resource}/{{item_id}}")
    async def delete_item(item_id: str, user: dict = Depends(get_current_user)):
        res = await coll.delete_one({"id": item_id, "user_id": user["user_id"]})
        if res.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Not found")
        return {"ok": True}


for _r in RESOURCES:
    make_crud(_r)


# ---------------------------------------------------------------------------
# Activity log (read only)
# ---------------------------------------------------------------------------
@api.get("/activity_logs")
async def get_activity(user: dict = Depends(get_current_user), limit: int = Query(30)):
    cursor = db.activity_logs.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).limit(limit)
    return await cursor.to_list(limit)


# ---------------------------------------------------------------------------
# Aggregation helpers
# ---------------------------------------------------------------------------
async def sum_field(coll_name: str, user_id: str, field: str = "amount", extra: dict = None) -> float:
    q = {"user_id": user_id}
    if extra:
        q.update(extra)
    total = 0.0
    async for d in db[coll_name].find(q, {field: 1, "_id": 0}):
        try:
            total += float(d.get(field, 0) or 0)
        except (ValueError, TypeError):
            pass
    return round(total, 2)


def parse_date(value) -> Optional[datetime]:
    if not value:
        return None
    try:
        if isinstance(value, str):
            return datetime.fromisoformat(value.replace("Z", "+00:00").split("T")[0])
    except Exception:
        return None
    return None


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------
@api.get("/dashboard")
async def dashboard(user: dict = Depends(get_current_user)):
    uid = user["user_id"]
    total_income = await sum_field("income", uid, "amount")
    total_payments = await sum_field("payments", uid, "amount")
    total_expenses = await sum_field("expenses", uid, "amount")
    revenue = round(total_income + total_payments, 2)
    net_profit = round(revenue - total_expenses, 2)

    clients = await db.clients.find({"user_id": uid}, {"_id": 0}).to_list(2000)
    active_clients = len([c for c in clients if str(c.get("status", "")).lower() in ("active", "ongoing")])

    projects = await db.projects.find({"user_id": uid}, {"_id": 0}).to_list(2000)
    project_status = {}
    for p in projects:
        s = str(p.get("status", "todo")).lower()
        project_status[s] = project_status.get(s, 0) + 1

    goals = await db.goals.find({"user_id": uid}, {"_id": 0}).to_list(2000)
    goal_progress = round(sum(float(g.get("progress", 0) or 0) for g in goals) / len(goals), 1) if goals else 0

    skills = await db.learning_progress.find({"user_id": uid}, {"_id": 0}).to_list(2000)
    learning_progress = round(sum(float(s.get("progress", 0) or 0) for s in skills) / len(skills), 1) if skills else 0

    workouts = await db.fitness_logs.count_documents({"user_id": uid})
    focus_count = await db.focus_sessions.count_documents({"user_id": uid})

    # Upcoming deadlines from projects + tasks
    deadlines = []
    for p in projects:
        d = parse_date(p.get("deadline") or p.get("due_date"))
        if d and str(p.get("status", "")).lower() not in ("done", "completed"):
            deadlines.append({"title": p.get("name") or p.get("title", "Project"), "date": p.get("deadline") or p.get("due_date"), "type": "project"})
    tasks = await db.tasks.find({"user_id": uid}, {"_id": 0}).to_list(2000)
    for t in tasks:
        d = parse_date(t.get("due_date") or t.get("deadline"))
        if d and str(t.get("status", "")).lower() not in ("done", "completed"):
            deadlines.append({"title": t.get("title") or t.get("name", "Task"), "date": t.get("due_date") or t.get("deadline"), "type": "task"})
    deadlines.sort(key=lambda x: x["date"] or "")
    deadlines = deadlines[:6]

    activity = await db.activity_logs.find({"user_id": uid}, {"_id": 0}).sort("created_at", -1).limit(8).to_list(8)

    # Life score: weighted composite
    score = 0
    score += min(revenue / 100, 30)  # revenue contributes up to 30
    score += goal_progress * 0.25  # up to 25
    score += learning_progress * 0.15  # up to 15
    score += min(workouts * 3, 15)  # up to 15
    score += min(focus_count * 2, 15)  # up to 15
    life_score = min(round(score), 100)

    return {
        "revenue": revenue,
        "total_income": total_income,
        "total_payments": total_payments,
        "total_expenses": total_expenses,
        "net_profit": net_profit,
        "active_clients": active_clients,
        "total_clients": len(clients),
        "project_status": project_status,
        "total_projects": len(projects),
        "goal_progress": goal_progress,
        "total_goals": len(goals),
        "learning_progress": learning_progress,
        "workouts": workouts,
        "focus_sessions": focus_count,
        "life_score": life_score,
        "upcoming_deadlines": deadlines,
        "recent_activity": activity,
    }


# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------
@api.get("/analytics")
async def analytics(user: dict = Depends(get_current_user)):
    uid = user["user_id"]

    # Monthly revenue/expense for last 12 months
    months = {}
    today = now_utc()
    for i in range(11, -1, -1):
        d = (today.replace(day=1) - timedelta(days=i * 30))
        key = d.strftime("%Y-%m")
        months[key] = {"month": d.strftime("%b"), "key": key, "income": 0.0, "expenses": 0.0}

    for coll in ("income", "payments"):
        async for rec in db[coll].find({"user_id": uid}, {"_id": 0}):
            d = parse_date(rec.get("date") or rec.get("created_at"))
            if d:
                key = d.strftime("%Y-%m")
                if key in months:
                    try:
                        months[key]["income"] += float(rec.get("amount", 0) or 0)
                    except (ValueError, TypeError):
                        pass
    async for rec in db.expenses.find({"user_id": uid}, {"_id": 0}):
        d = parse_date(rec.get("date") or rec.get("created_at"))
        if d:
            key = d.strftime("%Y-%m")
            if key in months:
                try:
                    months[key]["expenses"] += float(rec.get("amount", 0) or 0)
                except (ValueError, TypeError):
                    pass
    monthly = []
    for v in months.values():
        v["income"] = round(v["income"], 2)
        v["expenses"] = round(v["expenses"], 2)
        v["profit"] = round(v["income"] - v["expenses"], 2)
        monthly.append({k: v[k] for k in ("month", "income", "expenses", "profit")})

    # Income by source
    income_by_source = {}
    for coll in ("income", "payments"):
        async for rec in db[coll].find({"user_id": uid}, {"_id": 0}):
            src = rec.get("source") or rec.get("category") or "Other"
            try:
                income_by_source[src] = round(income_by_source.get(src, 0) + float(rec.get("amount", 0) or 0), 2)
            except (ValueError, TypeError):
                pass
    income_sources = [{"name": k, "value": v} for k, v in income_by_source.items()]

    # Expense by category
    expense_by_cat = {}
    async for rec in db.expenses.find({"user_id": uid}, {"_id": 0}):
        cat = rec.get("category") or "Other"
        try:
            expense_by_cat[cat] = round(expense_by_cat.get(cat, 0) + float(rec.get("amount", 0) or 0), 2)
        except (ValueError, TypeError):
            pass
    expense_categories = [{"name": k, "value": v} for k, v in expense_by_cat.items()]

    # Client revenue
    clients = await db.clients.find({"user_id": uid}, {"_id": 0}).to_list(2000)
    client_revenue = sorted(
        [{"name": c.get("name", "Client"), "value": float(c.get("revenue", 0) or 0)} for c in clients],
        key=lambda x: x["value"], reverse=True
    )[:8]

    # Weight trend
    weights = await db.weight_logs.find({"user_id": uid}, {"_id": 0}).to_list(2000)
    weight_trend = sorted(
        [{"date": (w.get("date") or w.get("created_at", ""))[:10], "weight": float(w.get("weight", 0) or 0)} for w in weights if w.get("weight")],
        key=lambda x: x["date"]
    )

    # Skill levels
    skills = await db.learning_progress.find({"user_id": uid}, {"_id": 0}).to_list(2000)
    skill_levels = [{"name": s.get("skill") or s.get("name", "Skill"), "progress": float(s.get("progress", 0) or 0), "xp": float(s.get("xp", 0) or 0)} for s in skills]

    # Goals by status
    goals = await db.goals.find({"user_id": uid}, {"_id": 0}).to_list(2000)
    goal_by_type = {}
    for g in goals:
        t = g.get("type") or g.get("category") or "general"
        goal_by_type[t] = goal_by_type.get(t, 0) + 1
    goals_distribution = [{"name": k, "value": v} for k, v in goal_by_type.items()]

    return {
        "monthly": monthly,
        "income_sources": income_sources,
        "expense_categories": expense_categories,
        "client_revenue": client_revenue,
        "weight_trend": weight_trend,
        "skill_levels": skill_levels,
        "goals_distribution": goals_distribution,
    }


# ---------------------------------------------------------------------------
# Weather (open-meteo, no key)
# ---------------------------------------------------------------------------
@api.get("/weather")
async def weather(lat: float = Query(23.81), lon: float = Query(90.41)):
    try:
        async with httpx.AsyncClient(timeout=10) as hc:
            r = await hc.get(
                "https://api.open-meteo.com/v1/forecast",
                params={"latitude": lat, "longitude": lon, "current": "temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m"},
            )
        data = r.json().get("current", {})
        codes = {0: "Clear", 1: "Mainly Clear", 2: "Partly Cloudy", 3: "Overcast", 45: "Foggy", 48: "Foggy",
                 51: "Drizzle", 61: "Rain", 63: "Rain", 65: "Heavy Rain", 71: "Snow", 80: "Showers", 95: "Storm"}
        return {
            "temperature": data.get("temperature_2m"),
            "humidity": data.get("relative_humidity_2m"),
            "wind": data.get("wind_speed_10m"),
            "condition": codes.get(data.get("weather_code"), "Clear"),
        }
    except Exception as e:
        logger.warning(f"weather error: {e}")
        return {"temperature": None, "condition": "Unavailable", "humidity": None, "wind": None}


@api.get("/")
async def root():
    return {"app": "IBNE RIHAT UNIVERSE", "status": "online"}


# ---------------------------------------------------------------------------
# AI Assistant (JARVIS)
# ---------------------------------------------------------------------------
import ai_assistant


class AiChatIn(BaseModel):
    message: str


@api.post("/ai/chat")
async def ai_chat(payload: AiChatIn, user: dict = Depends(get_current_user)):
    if not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message is empty")
    return await ai_assistant.process_message(user["user_id"], payload.message.strip(), channel="app")


@api.get("/ai/messages")
async def ai_messages(user: dict = Depends(get_current_user), limit: int = Query(40)):
    cursor = db.ai_messages.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).limit(limit)
    msgs = await cursor.to_list(limit)
    return list(reversed(msgs))


@api.get("/ai/discord/status")
async def discord_status(user: dict = Depends(get_current_user)):
    """Tells the frontend whether the Discord bot is configured."""
    return {
        "configured": bool(os.environ.get("DISCORD_BOT_TOKEN")),
        "owner_linked": bool(os.environ.get("DISCORD_OWNER_ID")),
    }


# ---------------------------------------------------------------------------
# Coach (proactive personal assistant)
# ---------------------------------------------------------------------------
import coach


@api.get("/coach/settings")
async def coach_get_settings(user: dict = Depends(get_current_user)):
    return await coach.get_settings(user["user_id"])


@api.put("/coach/settings")
async def coach_put_settings(payload: dict, user: dict = Depends(get_current_user)):
    return await coach.save_settings(user["user_id"], payload)


@api.get("/coach/today")
async def coach_today(user: dict = Depends(get_current_user)):
    return await coach.build_today(user["user_id"])


@api.get("/coach/tip")
async def coach_tip(user: dict = Depends(get_current_user)):
    return {"tip": await coach.coaching_tip(user["user_id"])}


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id")
    await db.user_sessions.create_index("session_token", unique=True)
    for r in RESOURCES + ["activity_logs"]:
        await db[r].create_index("user_id")
    # Seed owner account
    admin_email = os.environ.get("ADMIN_EMAIL", "").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "")
    if admin_email and admin_password:
        existing = await db.users.find_one({"email": admin_email})
        if not existing:
            await db.users.insert_one({
                "user_id": f"user_{uuid.uuid4().hex[:12]}",
                "email": admin_email,
                "name": "Ibne Rihat",
                "picture": "",
                "password_hash": hash_password(admin_password),
                "role": "owner",
                "provider": "email",
                "bio": "Founder. Build. Grow. Dominate.",
                "settings": {},
                "created_at": iso(now_utc()),
            })
            logger.info(f"Seeded owner account: {admin_email}")
        elif not verify_password(admin_password, existing.get("password_hash") or ""):
            await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
    logger.info("IBNE RIHAT UNIVERSE backend ready")


@app.on_event("shutdown")
async def shutdown():
    client.close()


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

"""
Coach engine for IBNE RIHAT UNIVERSE.

Owns the proactive personal-assistant logic: weekly home-workout split, daily
briefings, reminders, and check-ins. Shared by the FastAPI endpoints and the
Discord bot scheduler.
"""
import uuid
from datetime import datetime
from zoneinfo import ZoneInfo

from ai_assistant import _db, coach_text  # reuse single Mongo client + LLM helper

WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]

DEFAULT_PLAN = {
    "mon": "Push Day — Push-ups, Pike push-ups, Dips, Plank (3-4 sets)",
    "tue": "Legs Day — Squats, Lunges, Calf raises, Wall sit (3-4 sets)",
    "wed": "Pull Day — Towel rows, Supermans, Reverse snow angels",
    "thu": "Core & Abs — Crunches, Leg raises, Plank, Mountain climbers",
    "fri": "Full-Body HIIT — Burpees, Jumping jacks, Push-ups, Squats",
    "sat": "Cardio & Mobility — Brisk walk/run, Stretching, Yoga",
    "sun": "Rest & Recovery — Light stretch, Hydration, Good sleep",
}

DEFAULT_SETTINGS = {
    "timezone": "Asia/Dhaka",
    "briefing_time": "07:00",
    "checkin_time": "08:00",
    "briefing_enabled": True,
    "checkin_enabled": True,
    "workout_plan": DEFAULT_PLAN,
}

DEFAULT_REMINDERS = [
    {"title": "Home Workout", "category": "workout", "time": "18:00", "days": "daily", "message": "🏋️ Time for your home workout! Let's get it done.", "active": True},
    {"title": "Take Medicine", "category": "medicine", "time": "21:00", "days": "daily", "message": "💊 Reminder: take your medicine now.", "active": True},
    {"title": "Drink Water", "category": "meal", "time": "12:00", "days": "daily", "message": "💧 Hydration check — drink a glass of water.", "active": True},
]


def _now():
    return datetime.utcnow().isoformat()


async def get_settings(user_id: str) -> dict:
    doc = await _db.coach_settings.find_one({"user_id": user_id}, {"_id": 0})
    if not doc:
        doc = {"user_id": user_id, **DEFAULT_SETTINGS, "created_at": _now()}
        await _db.coach_settings.insert_one(dict(doc))
        # seed a few starter reminders so the bot has something to send
        for r in DEFAULT_REMINDERS:
            await _db.reminders.insert_one({
                "id": str(uuid.uuid4()), "user_id": user_id,
                "created_at": _now(), "updated_at": _now(), **r,
            })
        doc.pop("_id", None)
    # ensure all keys present
    merged = {**DEFAULT_SETTINGS, **{k: doc.get(k, DEFAULT_SETTINGS.get(k)) for k in DEFAULT_SETTINGS}}
    merged["workout_plan"] = {**DEFAULT_PLAN, **(doc.get("workout_plan") or {})}
    return merged


async def save_settings(user_id: str, payload: dict) -> dict:
    allowed = {k: payload[k] for k in DEFAULT_SETTINGS if k in payload}
    if "workout_plan" in allowed and isinstance(allowed["workout_plan"], dict):
        allowed["workout_plan"] = {**DEFAULT_PLAN, **allowed["workout_plan"]}
    allowed["updated_at"] = _now()
    await _db.coach_settings.update_one({"user_id": user_id}, {"$set": allowed}, upsert=True)
    return await get_settings(user_id)


def _today_key(tz: str) -> str:
    try:
        return WEEKDAYS[datetime.now(ZoneInfo(tz)).weekday()]
    except Exception:
        return WEEKDAYS[datetime.utcnow().weekday()]


async def reminders_today(user_id: str, tz: str) -> list:
    wk = _today_key(tz)
    out = []
    async for r in _db.reminders.find({"user_id": user_id}, {"_id": 0}):
        if not r.get("active", True):
            continue
        days = r.get("days", "daily")
        day_ok = days == "daily" or (isinstance(days, str) and (days == "" or wk in days)) or (isinstance(days, list) and wk in days)
        if day_ok:
            out.append({"title": r.get("title"), "category": r.get("category"), "time": r.get("time"), "message": r.get("message")})
    out.sort(key=lambda x: x.get("time") or "99:99")
    return out


async def build_today(user_id: str) -> dict:
    settings = await get_settings(user_id)
    tz = settings["timezone"]
    wk = _today_key(tz)
    try:
        local = datetime.now(ZoneInfo(tz))
    except Exception:
        local = datetime.utcnow()
    workout = settings["workout_plan"].get(wk, "Active recovery")
    reminders = await reminders_today(user_id, tz)

    goals = await _db.goals.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    active_goals = [g for g in goals if str(g.get("status", "")).lower() not in ("done", "completed")]

    # latest weight
    weights = await _db.weight_logs.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).limit(1).to_list(1)
    latest_weight = weights[0].get("weight") if weights else None

    return {
        "date": local.strftime("%A, %d %B %Y"),
        "weekday": wk,
        "workout_focus": workout,
        "reminders": reminders,
        "active_goals": [{"title": g.get("title"), "progress": g.get("progress", 0), "type": g.get("type")} for g in active_goals[:6]],
        "latest_weight": latest_weight,
        "timezone": tz,
    }


async def coaching_tip(user_id: str) -> str:
    today = await build_today(user_id)
    goals_txt = ", ".join(g["title"] for g in today["active_goals"]) or "general fitness & productivity"
    prompt = (
        f"Today is {today['date']}. Today's workout focus is: {today['workout_focus']}. "
        f"The user's active goals: {goals_txt}. Latest weight: {today['latest_weight']}.\n"
        "Give a short, energetic daily coaching note (max 4 sentences) for a person who works out at HOME (no gym). "
        "Include ONE specific food that's GOOD to eat today and ONE thing to AVOID. Be motivating and concrete."
    )
    system = "You are JARVIS, a personal fitness & life coach. Be concise, practical and motivating. Plain text only."
    return await coach_text(prompt, system)


async def build_briefing_text(user_id: str) -> str:
    t = await build_today(user_id)
    lines = [f"☀️ **Daily Briefing — {t['date']}**", ""]
    lines.append(f"🏋️ **Today's Workout:** {t['workout_focus']}")
    if t["reminders"]:
        lines.append("")
        lines.append("⏰ **Today's Schedule:**")
        for r in t["reminders"]:
            emoji = {"workout": "🏋️", "medicine": "💊", "meal": "🍽️", "meeting": "📅"}.get(r["category"], "•")
            lines.append(f"  {emoji} {r['time']} — {r['title']}")
    if t["active_goals"]:
        lines.append("")
        lines.append("🎯 **Active Goals:**")
        for g in t["active_goals"]:
            lines.append(f"  • {g['title']} ({g['progress']}%)")
    try:
        tip = await coaching_tip(user_id)
        lines.append("")
        lines.append(f"💡 {tip}")
    except Exception:
        pass
    lines.append("")
    lines.append("Reply here anytime to log progress, weight, meals or update anything. — JARVIS")
    return "\n".join(lines)

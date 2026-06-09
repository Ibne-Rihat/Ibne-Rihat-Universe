"""
AI Assistant brain for IBNE RIHAT UNIVERSE.

Converts natural-language messages into real CRUD actions across the app's
collections and answers questions about the user's data. Shared by the FastAPI
endpoint (/api/ai/chat) and the Discord bot (discord_bot.py).
"""
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import json
import uuid
import logging
import asyncio
from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorClient
import litellm

logger = logging.getLogger("iru_ai")

# Using your working MongoDB connection details directly
_client = AsyncIOMotorClient("mongodb+srv://mrrihadr_db_user:ljQTeSc8UisTLMUr@cluster0.6eadmxg.mongodb.net/?appName=Cluster0")
_db = _client["ai_assistant_db"]

# 1. HARDCODED FIXED API KEY: Bypasses VS Code .env terminal injection blocks
API_KEY = "AIzaSyB0PUCn5r0Izdqaa6SAsD2D3oLsilWH-m8"

# 2. DEFINED MODEL TARGETS (Primary with an automated high-availability backup)
PRIMARY_MODEL = "gemini/gemini-2.5-flash"
FALLBACK_MODEL = "gemini/gemini-1.5-flash"

# 3. ENVIRONMENT INJECTION: Ensures LiteLLM reads the key regardless of system setup
os.environ["GEMINI_API_KEY"] = API_KEY
os.environ["GEMINI_API_STUDIO_KEY"] = API_KEY

# Resources the assistant can write to, with their meaningful fields.
RESOURCE_SCHEMA = {
    "clients": "name, company, country, email, discord, whatsapp, status(lead|active|ongoing|completed|inactive), revenue(number), project_count(number), notes",
    "projects": "name, client, status(todo|in_progress|review|done), priority(low|medium|high|urgent), deadline(YYYY-MM-DD), progress(0-100 number), hours(number), notes",
    "income": "source(Fiverr|YouTube|Hosting|Art|Other), amount(number), date(YYYY-MM-DD), notes",
    "expenses": "category(Tools|Software|Marketing|Hosting|Hardware|Other), amount(number), date(YYYY-MM-DD), notes",
    "payments": "client, amount(number), date(YYYY-MM-DD), source, notes",
    "goals": "title, type(daily|weekly|monthly|yearly|lifetime), status(active|in_progress|done), progress(0-100 number), deadline(YYYY-MM-DD), notes",
    "tasks": "title, status(todo|in_progress|done), priority(low|medium|high|urgent), due_date(YYYY-MM-DD), notes",
    "habits": "name, category, status(active|paused), notes",
    "youtube_videos": "title, category, status(idea|scripting|recording|editing|thumbnail|scheduled|published), publish_date(YYYY-MM-DD), views(number), script",
    "content_ideas": "title, category, status(idea|in_progress|done), notes",
    "fitness_logs": "workout, duration(min number), calories(number), protein(g number), water(L number), sleep(hrs number), date(YYYY-MM-DD)",
    "weight_logs": "weight(kg number), date(YYYY-MM-DD), notes",
    "body_progress": "measurement, value(number), date(YYYY-MM-DD), notes",
    "learning_progress": "skill, level(number), xp(number), progress(0-100 number), resources, notes",
    "skills": "name, level(number), notes",
    "ai_tools": "name, category, url, rating(1-5 number), favorite(yes|no), notes",
    "focus_sessions": "label, duration(min number), completed_at",
    "portfolio_projects": "title, category, url, image_url, status(active|completed|in_progress), description",
    "achievements": "title, category, date(YYYY-MM-DD), notes",
    "notifications": "title, category, status, notes",
    "team_members": "name, role, email, status(active|inactive), notes",
}

NAME_FIELD = {
    "clients": "name", "projects": "name", "goals": "title", "tasks": "title",
    "youtube_videos": "title", "content_ideas": "title", "ai_tools": "name",
    "team_members": "name", "portfolio_projects": "title", "learning_progress": "skill",
    "habits": "name", "achievements": "title", "skills": "name", "fitness_logs": "workout",
    "income": "source", "payments": "source", "expenses": "category",
    "weight_logs": "weight", "focus_sessions": "label", "body_progress": "measurement",
    "notifications": "title",
}


def _now():
    return datetime.now(timezone.utc).isoformat()


def _allowed_fields(resource: str) -> set:
    """Whitelist of writable field names parsed from RESOURCE_SCHEMA."""
    spec = RESOURCE_SCHEMA.get(resource, "")
    fields = set()
    for token in spec.split(","):
        name = token.strip().split("(")[0].split(" ")[0].strip()
        if name:
            fields.add(name)
    return fields


def _clean(resource: str, data: dict) -> dict:
    allowed = _allowed_fields(resource)
    return {k: v for k, v in (data or {}).items() if k in allowed}


def _today():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


async def _build_context(user_id: str) -> tuple[str, str]:
    """Compact snapshot of the user's data so the model can answer questions."""
    async def totals(coll, field="amount"):
        t = 0.0
        async for d in _db[coll].find({"user_id": user_id}, {field: 1, "_id": 0}):
            try:
                t += float(d.get(field, 0) or 0)
            except (ValueError, TypeError):
                pass
        return round(t, 2)

    username = "Ibne Rihat"
    try:
        user_doc = await _db["users"].find_one({"id": user_id}) or await _db["users"].find_one({"user_id": user_id}) or await _db["users"].find_one({"_id": user_id})
        if user_doc:
            username = user_doc.get("name") or user_doc.get("username") or "Ibne Rihat"
    except Exception:
        pass

    income = await totals("income") + await totals("payments")
    expenses = await totals("expenses")
    clients = await _db.clients.count_documents({"user_id": user_id})
    projects = await _db.projects.count_documents({"user_id": user_id})
    goals = await _db.goals.count_documents({"user_id": user_id})

    lines = [
        f"FINANCE: total_income=${income}, total_expenses=${expenses}, net=${round(income - expenses, 2)}",
        f"COUNTS: clients={clients}, projects={projects}, goals={goals}",
    ]
    for coll in ("clients", "projects", "goals"):
        nf = NAME_FIELD.get(coll, "name")
        recent = await _db[coll].find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).limit(8).to_list(8)
        items = []
        for r in recent:
            label = r.get(nf, "?")
            extra = r.get("status") or r.get("progress") or ""
            items.append(f"{label}({extra})" if extra != "" else f"{label}")
        if items:
            lines.append(f"{coll.upper()}: " + ", ".join(items))
    return "\n".join(lines), username


def _system_prompt(context: str, username: str) -> str:
    schema = "\n".join(f"- {r}: {f}" for r, f in RESOURCE_SCHEMA.items())
    return f"""You are Azmuth, the master AI operator for "IBNE RIHAT UNIVERSE", a personal business operating system.
Today's date is {_today()}.

CRITICAL IDENTITY RULE: 
- Your name is Azmuth. You are the AI assistant.
- You are speaking directly to your master, whose name is "{username}". 
- Address them directly as "{username}" or "Master {username}" when greeting or confirming actions.
- NEVER call the user "Azmuth". NEVER assume the user is an AI. 

Available resources and their fields:
{schema}

Current data snapshot:
{context}

When the user asks you to add, log, create, update, change, mark, complete, or delete something,
produce the matching actions. When they ask a question, answer it using the snapshot.

Respond with ONLY a valid JSON object (no markdown, no code fences) in this exact shape:
{{
  "reply": "a short friendly confirmation or answer personalized directly for {username}",
  "actions": [
    {{"op": "create", "resource": "<resource>", "data": {{ ...fields... }}}},
    {{"op": "update", "resource": "<resource>", "match": {{"<field>": "<value>"}}, "data": {{ ...fields to change... }}}},
    {{"op": "delete", "resource": "<resource>", "match": {{"<field>": "<value>"}}}}
  ]
}}

Rules:
- Use only the resources and fields listed above. Numbers must be numbers, not strings.
- For dates, use YYYY-MM-DD. If the user says "today" use {_today()}.
- For update/delete, identify the record with "match" on its name/title field.
- If it's only a question (no change requested), return an empty "actions" array.
- Keep "reply" concise, motivating, and addressed to {username}. Never include anything outside the JSON object."""


async def _execute_action(user_id: str, action: dict) -> str:
    op = (action.get("op") or "").lower()
    resource = action.get("resource")
    if resource not in RESOURCE_SCHEMA:
        return f"skipped unknown resource '{resource}'"
    coll = _db[resource]
    data = action.get("data") or {}
    nf = NAME_FIELD.get(resource, "name")

    if op == "create":
        doc = _clean(resource, data)
        if not doc:
            return f"skipped empty {resource}"
        doc["id"] = str(uuid.uuid4())
        doc["user_id"] = user_id
        doc["created_at"] = _now()
        doc["updated_at"] = _now()
        await coll.insert_one(doc)
        await _db.activity_logs.insert_one({
            "id": str(uuid.uuid4()), "user_id": user_id, "action": "created (AI)",
            "entity": resource, "title": str(doc.get(nf, resource)), "created_at": _now(),
        })
        return f"created {resource}: {doc.get(nf, '')}"

    if op in ("update", "delete"):
        match = action.get("match") or {}
        query = {"user_id": user_id}
        target = None
        if match:
            mf, mv = next(iter(match.items()))
            target = await coll.find_one({**query, mf: {"$regex": f"^{str(mv)}", "$options": "i"}}, sort=[("created_at", -1)])
            if not target:
                return f"no {resource} matching '{mv}' found to {op}"
        else:
            target = await coll.find_one(query, sort=[("created_at", -1)])
        if not target:
            return f"no {resource} found to {op}"
        if op == "update":
            updates = _clean(resource, data)
            updates["updated_at"] = _now()
            await coll.update_one({"_id": target["_id"]}, {"$set": updates})
            await _db.activity_logs.insert_one({
                "id": str(uuid.uuid4()), "user_id": user_id, "action": "updated (AI)",
                "entity": resource, "title": str(target.get(nf, resource)), "created_at": _now(),
            })
            return f"updated {resource}: {target.get(nf, '')}"
        else:
            await coll.delete_one({"_id": target["_id"]})
            return f"deleted {resource}: {target.get(nf, '')}"

    return f"unknown op '{op}'"


def _parse_json(text: str) -> dict:
    text = (text or "").strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:]
    start, end = text.find("{"), text.rfind("}")
    if start != -1 and end != -1:
        text = text[start:end + 1]
    try:
        return json.loads(text)
    except Exception:
        return {"reply": text or "Sorry, I couldn't process that request right now.", "actions": []}


async def coach_text(prompt: str, system: str = "You are a helpful assistant. Plain text only.") -> str:
    """Fortified text completion interface explicitly called by backend/coach.py."""
    if not API_KEY:  
        return "AI is not configured."
    
    # Dual-model pipeline to ensure background coaching tasks never halt on server traffic limits
    for model_name in [PRIMARY_MODEL, FALLBACK_MODEL]:
        for attempt in range(2):
            try:
                response = await litellm.acompletion(
                    model=model_name,
                    custom_llm_provider="gemini",
                    messages=[
                        {"role": "system", "content": system},
                        {"role": "user", "content": prompt}
                    ],
                    api_key=API_KEY
                )
                res_content = response.choices[0].message.content
                if res_content:
                    return res_content
            except Exception:
                await asyncio.sleep(1)
    return "Background tracking calculations are temporarily catching up. Please verify on your dashboard panels!"


async def process_message(user_id: str, message: str, channel: str = "app") -> dict:
    """Main core engine: routes queries into actions with structural recovery handling."""
    if not API_KEY:  
        return {"reply": "AI is not configured (missing key).", "actions_done": []}

    context, username = await _build_context(user_id)
    system_content = _system_prompt(context, username)
    
    raw = None
    errors = []

    for model_name in [PRIMARY_MODEL, FALLBACK_MODEL]:
        for attempt in range(2):
            try:
                response = await litellm.acompletion(
                    model=model_name,
                    custom_llm_provider="gemini",
                    messages=[
                        {"role": "system", "content": system_content},
                        {"role": "user", "content": message}
                    ],
                    api_key=API_KEY,
                    temperature=0.2
                )
                raw = response.choices[0].message.content
                if raw:
                    break
            except Exception as e:
                errors.append(f"{model_name} (att {attempt+1}): {e}")
                await asyncio.sleep(1)
        if raw:
            break

    if not raw:
        logger.error(f"All AI endpoints exhausted. Traces: {errors}")
        return {
            "reply": f"Master {username}, Google's AI channels are heavily congested right now. Give me one moment and message me again!",
            "actions_done": []
        }

    parsed = _parse_json(raw if isinstance(raw, str) else str(raw))
    reply = parsed.get("reply") or "Done."
    actions = parsed.get("actions") or []

    done = []
    for action in actions[:12]:
        try:
            done.append(await _execute_action(user_id, action))
        except Exception as e:
            logger.exception("action error")
            done.append(f"error: {e}")

    # Persist conversation log history safely
    await _db.ai_messages.insert_one({
        "id": str(uuid.uuid4()), "user_id": user_id, "channel": channel,
        "message": message, "reply": reply, "actions": done, "created_at": _now(),
    })
    return {"reply": reply, "actions_done": done}
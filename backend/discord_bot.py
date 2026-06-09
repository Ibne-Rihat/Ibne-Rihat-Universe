"""
Discord bot for IBNE RIHAT UNIVERSE — proactive personal coach.
"""
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import asyncio
import logging
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

logging.basicConfig(level=logging.INFO, format="%(asctime)s - discord_bot - %(levelname)s - %(message)s")
logger = logging.getLogger("discord_bot")

# --- STATIC CONFIGURATION ---
TOKEN = ""
OWNER_ID = "930678185547407391"
ADMIN_EMAIL = "mrrihadr@gmail.com"


def main():
    if not TOKEN:
        logger.error("No token configured.")
        return

    import discord
    from discord.ext import tasks
    import ai_assistant
    import coach

    db = ai_assistant._db

    intents = discord.Intents.default()
    intents.message_content = True
    intents.dm_messages = True
    client = discord.Client(intents=intents)

    async def resolve_owner_user_id():
        """Finds the user ID using a case-insensitive search for your email."""
        try:
            import bson
            query = {"email": {"$regex": f"^{ADMIN_EMAIL}$", "$options": "i"}}
            
            # Check users collection first
            u = await db.users.find_one(query)
            if not u:
                # Fallback check for accounts collection
                u = await db.accounts.find_one(query)
            
            if u:
                # Extract clean string ID, handling MongoDB ObjectIds safely
                if "_id" in u and isinstance(u["_id"], bson.ObjectId):
                    return str(u["_id"])
                return str(u.get("user_id") or u.get("id") or u["_id"])
        except Exception as e:
            logger.error(f"Database lookup error during identity resolution: {e}")
        return None

    async def already_sent(key: str) -> bool:
        return bool(await db.coach_sent.find_one({"key": key}))

    async def mark_sent(key: str):
        await db.coach_sent.update_one(
            {"key": key}, 
            {"$set": {"key": key, "at": datetime.now(timezone.utc).isoformat()}}, 
            upsert=True
        )

    async def dm_owner(text: str):
        try:
            user = await client.fetch_user(int(OWNER_ID))
            for chunk in [text[i:i + 1900] for i in range(0, len(text), 1900)]:
                await user.send(chunk)
        except Exception as e:
            logger.warning(f"DM failed: {e}")

    @tasks.loop(seconds=60)
    async def scheduler():
        try:
            owner_user_id = await resolve_owner_user_id()
            if not owner_user_id:
                return
                
            settings = await coach.get_settings(owner_user_id)
            tz = settings.get("timezone", "UTC")
            try:
                local = datetime.now(ZoneInfo(tz))
            except Exception:
                local = datetime.now(timezone.utc)
            now_hm = local.strftime("%H:%M")
            date_key = local.strftime("%Y-%m-%d")

            # Daily briefing
            if settings.get("briefing_enabled") and now_hm == settings.get("briefing_time"):
                key = f"briefing:{date_key}"
                if not await already_sent(key):
                    text = await coach.build_briefing_text(owner_user_id)
                    await dm_owner(text)
                    await mark_sent(key)

            # Daily check-in
            if settings.get("checkin_enabled") and now_hm == settings.get("checkin_time"):
                key = f"checkin:{date_key}"
                if not await already_sent(key):
                    await dm_owner(
                        "📋 **Daily Check-in!**\nReply with today's **weight & height** (e.g. `75kg, 180cm`), "
                        "and tell me what you got done today — I'll update your logs and goals automatically."
                    )
                    await mark_sent(key)

            # Reminders
            reminders = await coach.reminders_today(owner_user_id, tz)
            for r in reminders:
                if r.get("time") == now_hm:
                    key = f"rem:{r.get('title')}:{r.get('time')}:{date_key}"
                    if not await already_sent(key):
                        await dm_owner(r.get("message") or f"⏰ Reminder: {r.get('title')}")
                        await mark_sent(key)
        except Exception:
            logger.exception("scheduler error")

    @client.event
    async def on_ready():
        logger.info(f"--- Discord Bot Online as {client.user} ---")
        
        # Identity diagnostic log
        owner_user_id = await resolve_owner_user_id()
        if owner_user_id:
            logger.info(f"👉 SUCCESS: Bot is connected to MongoDB User ID: [{owner_user_id}]")
        else:
            logger.warning(f"❌ WARNING: No document found in database matching email '{ADMIN_EMAIL}'")
            
        if not scheduler.is_running():
            scheduler.start()

    @client.event
    async def on_message(message):
        if message.author == client.user:
            return
        if str(message.author.id) != OWNER_ID:
            return
            
        is_dm = message.guild is None
        mentioned = client.user in getattr(message, "mentions", [])
        
        if not is_dm and not mentioned:
            return

        content = message.content
        if mentioned:
            content = content.replace(f"<@{client.user.id}>", "").replace(f"<@!{client.user.id}>", "").strip()
        if not content:
            return

        owner_user_id = await resolve_owner_user_id()
        if not owner_user_id:
            await message.channel.send(f"⚠️ Account mapping failed for email: `{ADMIN_EMAIL}`")
            return

        async with message.channel.typing():
            result = await ai_assistant.process_message(owner_user_id, content, channel="discord")

        reply = result.get("reply", "Done.")
        done = result.get("actions_done", [])
        if done:
            reply += "\n\n" + "\n".join(f"• {d}" for d in done)
        await message.channel.send(reply[:1900])

    client.run(TOKEN, log_handler=None)


if __name__ == "__main__":
    main()
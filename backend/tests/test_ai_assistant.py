"""Backend tests for the AI Assistant endpoints (JARVIS).

Covers:
- POST /api/ai/chat creates a real record and returns reply + actions
- GET /api/ai/messages returns chronological history including the new exchange
- GET /api/ai/discord/status returns configured:false (no token configured)
- Auth is required on /ai/chat and /ai/messages
"""
import time
import uuid
import requests


class TestAiDiscordStatus:
    def test_discord_status_unauth(self, api_url):
        r = requests.get(f"{api_url}/ai/discord/status", timeout=15)
        assert r.status_code == 401

    def test_discord_status_idle(self, auth_session, api_url):
        r = auth_session.get(f"{api_url}/ai/discord/status", timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "configured" in d
        assert d["configured"] is False, f"Discord should be idle but got {d}"


class TestAiChat:
    def test_chat_requires_auth(self, api_url):
        r = requests.post(f"{api_url}/ai/chat", json={"message": "hi"}, timeout=30)
        assert r.status_code == 401

    def test_chat_empty_message_rejected(self, auth_session, api_url):
        r = auth_session.post(f"{api_url}/ai/chat", json={"message": "   "}, timeout=30)
        assert r.status_code == 400

    def test_chat_creates_income_record(self, auth_session, api_url):
        marker = "AITESTYT_" + uuid.uuid4().hex[:6]
        # Baseline income total
        before = auth_session.get(f"{api_url}/dashboard", timeout=20).json()
        baseline_income = float(before.get("total_income", 0))

        message = f"Add a $300 YouTube income for today and tag note '{marker}'"
        r = auth_session.post(f"{api_url}/ai/chat", json={"message": message}, timeout=90)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "reply" in d and isinstance(d["reply"], str) and d["reply"].strip()
        assert "actions_done" in d and isinstance(d["actions_done"], list)
        # At least one creation action should have happened
        assert any("created" in a.lower() and "income" in a.lower() for a in d["actions_done"]), \
            f"Expected income creation, got actions: {d['actions_done']}"

        # Verify persistence by looking at income list
        time.sleep(0.5)
        inc_list = auth_session.get(f"{api_url}/income", timeout=20).json()
        assert isinstance(inc_list, list) and len(inc_list) > 0
        # find a YouTube 300 record created recently
        match = [
            x for x in inc_list
            if (str(x.get("source", "")).lower() == "youtube"
                and float(x.get("amount", 0) or 0) == 300)
        ]
        assert match, f"No matching YouTube $300 income found. Sample: {inc_list[:3]}"

        # Dashboard total income should have gone up by ~300
        after = auth_session.get(f"{api_url}/dashboard", timeout=20).json()
        delta = float(after["total_income"]) - baseline_income
        assert delta >= 299.99, f"Dashboard income did not reflect new entry (delta={delta})"

        # Cleanup the income record we created
        created_id = match[0]["id"]
        auth_session.delete(f"{api_url}/income/{created_id}")

    def test_chat_question_returns_text(self, auth_session, api_url):
        r = auth_session.post(
            f"{api_url}/ai/chat",
            json={"message": "How much total income do I have? Just answer."},
            timeout=90,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert isinstance(d.get("reply"), str) and len(d["reply"]) > 0


class TestAiMessages:
    def test_messages_requires_auth(self, api_url):
        r = requests.get(f"{api_url}/ai/messages", timeout=15)
        assert r.status_code == 401

    def test_messages_history_present(self, auth_session, api_url):
        # Send a chat first so we ensure there is at least one message
        unique = "AITESTHIST_" + uuid.uuid4().hex[:6]
        r = auth_session.post(
            f"{api_url}/ai/chat",
            json={"message": f"Just say hi. Tag '{unique}'"},
            timeout=90,
        )
        assert r.status_code == 200, r.text
        time.sleep(0.5)

        h = auth_session.get(f"{api_url}/ai/messages", timeout=20)
        assert h.status_code == 200, h.text
        msgs = h.json()
        assert isinstance(msgs, list) and len(msgs) > 0
        # No mongo _id leaking
        for m in msgs:
            assert "_id" not in m
            assert "message" in m and "reply" in m and "created_at" in m
        # Chronological order: created_at ascending
        timestamps = [m["created_at"] for m in msgs]
        assert timestamps == sorted(timestamps), "ai_messages must be chronological"
        # Our last sent message should appear
        assert any(unique in m.get("message", "") for m in msgs), \
            "Most-recent AI chat not present in history"

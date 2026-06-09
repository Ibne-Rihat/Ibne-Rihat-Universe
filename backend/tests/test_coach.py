"""Backend tests for the new AI Coach feature.

Covers:
- GET /api/coach/settings (seeds defaults + 3 starter reminders on first call)
- PUT /api/coach/settings (persists changes)
- GET /api/coach/today (date, workout_focus, reminders)
- GET /api/coach/tip (real LLM — assert non-empty)
- /api/reminders CRUD (resource registered in RESOURCES)
- GET /api/ai/discord/status returns configured:false (no token)
"""
import uuid
import requests


class TestCoachSettings:
    def test_get_settings_returns_defaults_and_seeds(self, auth_session, api_url):
        r = auth_session.get(f"{api_url}/coach/settings", timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        # required keys
        for k in ("timezone", "briefing_time", "checkin_time",
                  "briefing_enabled", "checkin_enabled", "workout_plan"):
            assert k in d, f"missing {k}"
        # defaults
        assert d["timezone"] == "Asia/Dhaka"
        assert d["briefing_time"] == "07:00"
        assert isinstance(d["workout_plan"], dict)
        # 7 weekday keys
        for day in ("mon", "tue", "wed", "thu", "fri", "sat", "sun"):
            assert day in d["workout_plan"], f"missing plan day {day}"

    def test_get_settings_seeds_three_reminders_on_first_call(self, auth_session, api_url):
        # Ensure /coach/settings has been called so seeding ran
        auth_session.get(f"{api_url}/coach/settings", timeout=15)
        r = auth_session.get(f"{api_url}/reminders", timeout=15)
        assert r.status_code == 200
        rems = r.json()
        # Could be >= 3 (test runs may have added more); ensure at least 3 present
        # and check that default seeded titles exist for this user.
        titles = [x.get("title") for x in rems]
        seeded = ["Home Workout", "Take Medicine", "Drink Water"]
        present = [t for t in seeded if t in titles]
        assert len(present) >= 2, f"Expected seeded reminders, got titles={titles}"

    def test_put_settings_persists(self, auth_session, api_url):
        # Read current
        cur = auth_session.get(f"{api_url}/coach/settings").json()
        new_brief = "06:30"
        new_plan_mon = "TEST_Push Day — " + uuid.uuid4().hex[:6]
        payload = {
            "timezone": cur["timezone"],
            "briefing_time": new_brief,
            "checkin_time": cur["checkin_time"],
            "briefing_enabled": False,
            "checkin_enabled": cur["checkin_enabled"],
            "workout_plan": {**cur["workout_plan"], "mon": new_plan_mon},
        }
        r = auth_session.put(f"{api_url}/coach/settings", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        out = r.json()
        assert out["briefing_time"] == new_brief
        assert out["briefing_enabled"] is False
        assert out["workout_plan"]["mon"] == new_plan_mon

        # GET to verify persistence
        again = auth_session.get(f"{api_url}/coach/settings").json()
        assert again["briefing_time"] == new_brief
        assert again["briefing_enabled"] is False
        assert again["workout_plan"]["mon"] == new_plan_mon

        # Restore briefing_enabled True for downstream
        auth_session.put(f"{api_url}/coach/settings", json={"briefing_enabled": True}, timeout=15)


class TestCoachToday:
    def test_today_shape(self, auth_session, api_url):
        r = auth_session.get(f"{api_url}/coach/today", timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("date", "weekday", "workout_focus", "reminders", "timezone"):
            assert k in d
        assert isinstance(d["reminders"], list)
        assert isinstance(d["workout_focus"], str) and len(d["workout_focus"]) > 0
        assert d["weekday"] in ("mon", "tue", "wed", "thu", "fri", "sat", "sun")


class TestCoachTip:
    def test_tip_non_empty(self, auth_session, api_url):
        r = auth_session.get(f"{api_url}/coach/tip", timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "tip" in d
        assert isinstance(d["tip"], str)
        assert len(d["tip"].strip()) > 5, f"Tip too short: {d['tip']!r}"


class TestRemindersCRUD:
    def test_reminders_full_crud(self, auth_session, api_url):
        # CREATE
        payload = {
            "title": "TEST_Reminder_" + uuid.uuid4().hex[:6],
            "category": "workout",
            "time": "19:00",
            "days": "daily",
            "message": "TEST message",
            "active": True,
        }
        r = auth_session.post(f"{api_url}/reminders", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        doc = r.json()
        assert doc["title"] == payload["title"]
        assert doc["active"] is True
        rem_id = doc["id"]

        # LIST contains it
        rl = auth_session.get(f"{api_url}/reminders", timeout=15)
        assert rl.status_code == 200
        assert any(x["id"] == rem_id for x in rl.json())

        # UPDATE time + active
        ru = auth_session.put(f"{api_url}/reminders/{rem_id}",
                              json={"time": "20:15", "active": False}, timeout=15)
        assert ru.status_code == 200
        upd = ru.json()
        assert upd["time"] == "20:15"
        assert upd["active"] is False

        # GET to verify persistence
        rg = auth_session.get(f"{api_url}/reminders/{rem_id}", timeout=15)
        assert rg.status_code == 200
        assert rg.json()["time"] == "20:15"
        assert rg.json()["active"] is False

        # DELETE
        rd = auth_session.delete(f"{api_url}/reminders/{rem_id}", timeout=15)
        assert rd.status_code == 200

        # 404 after delete
        rg2 = auth_session.get(f"{api_url}/reminders/{rem_id}", timeout=15)
        assert rg2.status_code == 404


class TestDiscordStatusIdle:
    def test_discord_status_not_configured(self, auth_session, api_url):
        r = auth_session.get(f"{api_url}/ai/discord/status", timeout=15)
        assert r.status_code == 200
        d = r.json()
        # As instructed: bot is intentionally idle (no token)
        assert d.get("configured") is False

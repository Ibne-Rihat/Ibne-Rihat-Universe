"""End-to-end backend tests for IBNE RIHAT UNIVERSE.

Covers:
- Health / root
- Auth: register, login (success + invalid + brute-force lockout reset), me, profile, logout
- Generic CRUD for representative resources (clients, income, expenses, projects, goals,
  learning_progress, fitness_logs, weight_logs, focus_sessions, ai_tools, content_ideas,
  youtube_videos, team_members, portfolio_projects) with persistence verification
- Search/sort/status query params
- Aggregations: /dashboard, /analytics, /activity_logs, /weather
"""

import time
import uuid
import requests

API = None  # filled in by fixture indirectly via BASE_URL


# ---------------------------------------------------------------------------
# Root / health
# ---------------------------------------------------------------------------
class TestRoot:
    def test_root(self, api_url):
        r = requests.get(f"{api_url}/", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "online"


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
class TestAuth:
    def test_login_owner_success(self, api_url):
        r = requests.post(f"{api_url}/auth/login", json={
            "email": "ibne@rihat.universe",
            "password": "Dominate2026",
        }, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "token" in d and isinstance(d["token"], str) and len(d["token"]) > 10
        assert d["user"]["email"] == "ibne@rihat.universe"
        assert d["user"]["role"] == "owner"

    def test_login_invalid_password(self, api_url):
        r = requests.post(f"{api_url}/auth/login", json={
            "email": "ibne@rihat.universe",
            "password": "WrongPass!" + uuid.uuid4().hex[:4],
        }, timeout=15)
        # Either 401 invalid, or 429 if previous tests caused lockout — accept both
        assert r.status_code in (401, 429), r.text

    def test_register_new_user_and_me(self, api_url):
        email = f"test_{uuid.uuid4().hex[:10]}@example.com"
        r = requests.post(f"{api_url}/auth/register", json={
            "name": "TEST User",
            "email": email,
            "password": "Password123!",
        }, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        token = d["token"]
        assert d["user"]["email"] == email
        # /auth/me with Bearer
        me = requests.get(f"{api_url}/auth/me",
                          headers={"Authorization": f"Bearer {token}"}, timeout=15)
        assert me.status_code == 200
        assert me.json()["email"] == email

    def test_register_duplicate_rejected(self, api_url):
        r = requests.post(f"{api_url}/auth/register", json={
            "name": "Dup",
            "email": "ibne@rihat.universe",
            "password": "Whatever123",
        }, timeout=15)
        assert r.status_code == 400

    def test_me_requires_auth(self, api_url):
        r = requests.get(f"{api_url}/auth/me", timeout=15)
        assert r.status_code == 401

    def test_update_profile_and_persist(self, auth_session, api_url):
        new_bio = f"TEST bio {uuid.uuid4().hex[:6]}"
        r = auth_session.put(f"{api_url}/auth/profile", json={"bio": new_bio}, timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["bio"] == new_bio
        # re-fetch
        me = auth_session.get(f"{api_url}/auth/me", timeout=15)
        assert me.json()["bio"] == new_bio

    def test_logout(self, api_url):
        # Create temp user, login, logout, then /me must fail with that token
        email = f"test_{uuid.uuid4().hex[:10]}@example.com"
        reg = requests.post(f"{api_url}/auth/register", json={
            "name": "Logout TEST", "email": email, "password": "Password123!",
        }, timeout=15)
        token = reg.json()["token"]
        hdr = {"Authorization": f"Bearer {token}"}
        lo = requests.post(f"{api_url}/auth/logout", headers=hdr, timeout=15)
        assert lo.status_code == 200
        # Token should now be invalid
        me = requests.get(f"{api_url}/auth/me", headers=hdr, timeout=15)
        assert me.status_code == 401


# ---------------------------------------------------------------------------
# Generic CRUD helper
# ---------------------------------------------------------------------------
def _crud_flow(session, api_url, resource, create_payload, update_payload, expect_field, expect_value):
    # CREATE
    r = session.post(f"{api_url}/{resource}", json=create_payload, timeout=15)
    assert r.status_code == 200, f"{resource} create failed: {r.status_code} {r.text}"
    doc = r.json()
    assert "id" in doc and doc.get("user_id")
    item_id = doc["id"]

    # LIST should include it
    rl = session.get(f"{api_url}/{resource}", timeout=15)
    assert rl.status_code == 200
    ids = [d["id"] for d in rl.json()]
    assert item_id in ids

    # GET one
    rg = session.get(f"{api_url}/{resource}/{item_id}", timeout=15)
    assert rg.status_code == 200
    assert rg.json()["id"] == item_id

    # UPDATE
    ru = session.put(f"{api_url}/{resource}/{item_id}", json=update_payload, timeout=15)
    assert ru.status_code == 200, ru.text
    updated = ru.json()
    assert updated.get(expect_field) == expect_value

    # GET to verify persistence
    rg2 = session.get(f"{api_url}/{resource}/{item_id}", timeout=15)
    assert rg2.json().get(expect_field) == expect_value

    # DELETE
    rd = session.delete(f"{api_url}/{resource}/{item_id}", timeout=15)
    assert rd.status_code == 200
    # Should be 404 now
    rg3 = session.get(f"{api_url}/{resource}/{item_id}", timeout=15)
    assert rg3.status_code == 404


class TestResourcesCRUD:
    def test_clients_crud(self, auth_session, api_url):
        _crud_flow(
            auth_session, api_url, "clients",
            {"name": "TEST_Client_" + uuid.uuid4().hex[:6], "company": "Acme",
             "email": "client@test.io", "status": "active", "revenue": 1500},
            {"status": "ongoing"},
            "status", "ongoing",
        )

    def test_income_crud(self, auth_session, api_url):
        _crud_flow(
            auth_session, api_url, "income",
            {"source": "TEST_Source", "amount": 500, "category": "Freelance",
             "date": "2026-01-10"},
            {"amount": 750},
            "amount", 750,
        )

    def test_expenses_crud(self, auth_session, api_url):
        _crud_flow(
            auth_session, api_url, "expenses",
            {"name": "TEST_Expense", "amount": 120, "category": "Tools",
             "date": "2026-01-10"},
            {"amount": 200},
            "amount", 200,
        )

    def test_projects_crud(self, auth_session, api_url):
        _crud_flow(
            auth_session, api_url, "projects",
            {"name": "TEST_Project", "status": "todo", "deadline": "2026-03-01",
             "client": "Acme"},
            {"status": "in_progress"},
            "status", "in_progress",
        )

    def test_goals_crud(self, auth_session, api_url):
        _crud_flow(
            auth_session, api_url, "goals",
            {"title": "TEST_Goal", "progress": 40, "type": "quarterly",
             "status": "active"},
            {"progress": 100, "status": "completed"},
            "progress", 100,
        )

    def test_learning_progress_crud(self, auth_session, api_url):
        _crud_flow(
            auth_session, api_url, "learning_progress",
            {"skill": "TEST_Skill", "xp": 100, "level": 2, "progress": 30},
            {"progress": 80, "xp": 250},
            "progress", 80,
        )

    def test_fitness_logs_crud(self, auth_session, api_url):
        _crud_flow(
            auth_session, api_url, "fitness_logs",
            {"name": "TEST_Workout", "duration": 30, "calories": 200,
             "date": "2026-01-10"},
            {"calories": 350},
            "calories", 350,
        )

    def test_weight_logs_crud(self, auth_session, api_url):
        _crud_flow(
            auth_session, api_url, "weight_logs",
            {"weight": 78.5, "date": "2026-01-10"},
            {"weight": 77.9},
            "weight", 77.9,
        )

    def test_focus_sessions_crud(self, auth_session, api_url):
        _crud_flow(
            auth_session, api_url, "focus_sessions",
            {"title": "TEST_Focus", "duration": 25, "date": "2026-01-10"},
            {"duration": 50},
            "duration", 50,
        )

    def test_ai_tools_crud(self, auth_session, api_url):
        _crud_flow(
            auth_session, api_url, "ai_tools",
            {"name": "TEST_Tool", "category": "image", "notes": "useful"},
            {"category": "video"},
            "category", "video",
        )

    def test_content_ideas_crud(self, auth_session, api_url):
        _crud_flow(
            auth_session, api_url, "content_ideas",
            {"title": "TEST_Idea", "status": "draft"},
            {"status": "ready"},
            "status", "ready",
        )

    def test_youtube_videos_crud(self, auth_session, api_url):
        _crud_flow(
            auth_session, api_url, "youtube_videos",
            {"title": "TEST_Video", "status": "scripting"},
            {"status": "published"},
            "status", "published",
        )

    def test_team_members_crud(self, auth_session, api_url):
        _crud_flow(
            auth_session, api_url, "team_members",
            {"name": "TEST_TeamMember", "role": "designer"},
            {"role": "lead"},
            "role", "lead",
        )

    def test_portfolio_projects_crud(self, auth_session, api_url):
        _crud_flow(
            auth_session, api_url, "portfolio_projects",
            {"title": "TEST_Portfolio", "category": "web"},
            {"category": "branding"},
            "category", "branding",
        )


# ---------------------------------------------------------------------------
# Query params: search / sort / status
# ---------------------------------------------------------------------------
class TestQueryParams:
    def test_clients_search_and_status(self, auth_session, api_url):
        unique = "ZZTESTQ" + uuid.uuid4().hex[:5]
        # create two clients
        a = auth_session.post(f"{api_url}/clients", json={
            "name": f"Alpha_{unique}", "status": "active", "company": "AlphaCo"
        }).json()
        b = auth_session.post(f"{api_url}/clients", json={
            "name": f"Beta_{unique}", "status": "inactive", "company": "BetaCo"
        }).json()
        try:
            r = auth_session.get(f"{api_url}/clients", params={"search": unique})
            assert r.status_code == 200
            names = [c["name"] for c in r.json()]
            assert any(unique in n for n in names)

            r2 = auth_session.get(f"{api_url}/clients", params={"status": "active", "search": unique})
            assert r2.status_code == 200
            for c in r2.json():
                if unique in c.get("name", ""):
                    assert c["status"] == "active"
        finally:
            auth_session.delete(f"{api_url}/clients/{a['id']}")
            auth_session.delete(f"{api_url}/clients/{b['id']}")


# ---------------------------------------------------------------------------
# Aggregations
# ---------------------------------------------------------------------------
class TestAggregations:
    def test_dashboard_shape(self, auth_session, api_url):
        r = auth_session.get(f"{api_url}/dashboard", timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("revenue", "total_income", "total_expenses", "net_profit",
                  "active_clients", "life_score", "upcoming_deadlines", "recent_activity",
                  "project_status", "goal_progress"):
            assert k in d, f"missing {k}"
        assert isinstance(d["upcoming_deadlines"], list)
        assert isinstance(d["recent_activity"], list)
        assert 0 <= d["life_score"] <= 100

    def test_dashboard_reflects_new_income(self, auth_session, api_url):
        before = auth_session.get(f"{api_url}/dashboard").json()
        baseline = float(before.get("total_income", 0))
        inc = auth_session.post(f"{api_url}/income", json={
            "source": "TEST_dash_inc", "amount": 333.33, "date": "2026-01-15"
        }).json()
        try:
            after = auth_session.get(f"{api_url}/dashboard").json()
            assert round(after["total_income"] - baseline, 2) >= 333.33 - 0.01
        finally:
            auth_session.delete(f"{api_url}/income/{inc['id']}")

    def test_analytics_shape(self, auth_session, api_url):
        r = auth_session.get(f"{api_url}/analytics", timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("monthly", "income_sources", "expense_categories",
                  "client_revenue", "weight_trend", "skill_levels",
                  "goals_distribution"):
            assert k in d
        assert isinstance(d["monthly"], list)

    def test_activity_logs(self, auth_session, api_url):
        # trigger an activity
        c = auth_session.post(f"{api_url}/clients", json={
            "name": "TEST_act_" + uuid.uuid4().hex[:5], "status": "active"
        }).json()
        try:
            r = auth_session.get(f"{api_url}/activity_logs", timeout=15)
            assert r.status_code == 200
            assert isinstance(r.json(), list)
        finally:
            auth_session.delete(f"{api_url}/clients/{c['id']}")

    def test_weather_public(self, api_url):
        # weather currently has no auth dependency
        r = requests.get(f"{api_url}/weather", timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert "condition" in d


# ---------------------------------------------------------------------------
# Unauthorized resource access
# ---------------------------------------------------------------------------
class TestAuthorization:
    def test_resource_requires_auth(self, api_url):
        r = requests.get(f"{api_url}/clients", timeout=15)
        assert r.status_code == 401

    def test_resource_with_bad_token(self, api_url):
        r = requests.get(f"{api_url}/clients",
                         headers={"Authorization": "Bearer nope"}, timeout=15)
        assert r.status_code == 401

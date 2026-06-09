import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://executive-dashboard-9.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def api_url():
    return API


@pytest.fixture(scope="session")
def owner_token():
    """Login as the seeded owner and return a Bearer token."""
    r = requests.post(f"{API}/auth/login", json={
        "email": "ibne@rihat.universe",
        "password": "Dominate2026",
    }, timeout=30)
    if r.status_code != 200:
        pytest.skip(f"Owner login failed: {r.status_code} {r.text}")
    return r.json()["token"]


@pytest.fixture()
def auth_session(owner_token):
    s = requests.Session()
    s.headers.update({
        "Authorization": f"Bearer {owner_token}",
        "Content-Type": "application/json",
    })
    return s

import hashlib
import secrets
from datetime import datetime, timedelta
from backend.config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
from supabase import create_client, Client

_client: Client = None
_sessions: dict = {}


def _get_client() -> Client:
    global _client
    if _client is None:
        _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    return _client


def _hash_password(password: str, salt: str = None) -> tuple[str, str]:
    if not salt:
        salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100000).hex()
    return hashed, salt


def signup(email: str, password: str, name: str = "") -> dict:
    client = _get_client()

    existing = client.table("users").select("id").eq("email", email).execute()
    if existing.data:
        raise ValueError("Email already registered")

    hashed, salt = _hash_password(password)
    user_id = secrets.token_hex(16)

    client.table("users").insert({
        "id": user_id,
        "email": email,
        "password_hash": hashed,
        "salt": salt,
        "name": name,
        "created_at": datetime.utcnow().isoformat(),
    }).execute()

    client.table("user_profiles").upsert({
        "id": user_id,
        "name": name,
        "daily_calorie_target": 2000,
    }).execute()

    token = _create_session(user_id)
    return {"user_id": user_id, "token": token, "name": name, "email": email}


def login(email: str, password: str) -> dict:
    client = _get_client()

    result = client.table("users").select("*").eq("email", email).execute()
    if not result.data:
        raise ValueError("Invalid email or password")

    user = result.data[0]
    hashed, _ = _hash_password(password, user["salt"])

    if hashed != user["password_hash"]:
        raise ValueError("Invalid email or password")

    token = _create_session(user["id"])
    return {"user_id": user["id"], "token": token, "name": user.get("name", ""), "email": email}


def _create_session(user_id: str) -> str:
    token = secrets.token_hex(32)
    _sessions[token] = {
        "user_id": user_id,
        "expires": datetime.utcnow() + timedelta(days=7),
    }
    return token


def validate_token(token: str) -> str:
    session = _sessions.get(token)
    if not session:
        return None
    if datetime.utcnow() > session["expires"]:
        del _sessions[token]
        return None
    return session["user_id"]


def logout(token: str):
    _sessions.pop(token, None)

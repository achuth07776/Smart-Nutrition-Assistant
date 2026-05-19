from supabase import create_client, Client
from datetime import date, datetime
from backend.config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

_client: Client = None


def _get_client() -> Client:
    global _client
    if _client is None:
        _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    return _client


# ── Meal Logs ────────────────────────────────────────────────────────────────

def create_meal_log(user_id: str, raw_voice: str, translated: str, food_items: list, nutrition_data: dict, meal_type: str = "snack") -> dict:
    client = _get_client()
    result = client.table("meal_logs").insert({
        "user_id": user_id,
        "raw_voice_input": raw_voice,
        "translated_input": translated,
        "food_items": food_items,
        "nutrition_data": nutrition_data,
        "confirmed": False,
        "meal_type": meal_type,
    }).execute()
    return result.data[0] if result.data else {}


def confirm_meal(meal_log_id: int, user_id: str, edited_items: list = None) -> dict:
    client = _get_client()
    update_data = {"confirmed": True}
    if edited_items:
        update_data["food_items"] = edited_items

    result = client.table("meal_logs").update(update_data).eq("id", meal_log_id).execute()
    meal = result.data[0] if result.data else {}

    if meal and meal.get("nutrition_data"):
        _update_daily_summary(user_id, meal["nutrition_data"])

    return meal


def get_meal_logs(user_id: str, limit: int = 20) -> list:
    client = _get_client()
    result = client.table("meal_logs").select("*").eq("user_id", user_id).order("logged_at", desc=True).limit(limit).execute()
    return result.data or []


# ── Daily Summary ────────────────────────────────────────────────────────────

def _update_daily_summary(user_id: str, nutrition_data: dict):
    client = _get_client()
    today = date.today().isoformat()
    total = nutrition_data.get("total", nutrition_data)

    existing = client.table("daily_summaries").select("*").eq("user_id", user_id).eq("date", today).execute()

    if existing.data:
        row = existing.data[0]
        client.table("daily_summaries").update({
            "total_calories": (row.get("total_calories") or 0) + total.get("calories", 0),
            "total_protein_g": (row.get("total_protein_g") or 0) + total.get("protein_g", 0),
            "total_carbs_g": (row.get("total_carbs_g") or 0) + total.get("carbs_g", 0),
            "total_fat_g": (row.get("total_fat_g") or 0) + total.get("fat_g", 0),
            "total_fiber_g": (row.get("total_fiber_g") or 0) + total.get("fiber_g", 0),
        }).eq("id", row["id"]).execute()
    else:
        client.table("daily_summaries").insert({
            "user_id": user_id,
            "date": today,
            "total_calories": total.get("calories", 0),
            "total_protein_g": total.get("protein_g", 0),
            "total_carbs_g": total.get("carbs_g", 0),
            "total_fat_g": total.get("fat_g", 0),
            "total_fiber_g": total.get("fiber_g", 0),
        }).execute()


def get_daily_summary(user_id: str, target_date: str = None) -> dict:
    client = _get_client()
    if not target_date:
        target_date = date.today().isoformat()
    result = client.table("daily_summaries").select("*").eq("user_id", user_id).eq("date", target_date).execute()
    return result.data[0] if result.data else {
        "total_calories": 0,
        "total_protein_g": 0,
        "total_carbs_g": 0,
        "total_fat_g": 0,
        "total_fiber_g": 0,
    }


# ── Chat Messages ────────────────────────────────────────────────────────────

def save_chat_messages(user_id: str, user_msg: str, assistant_msg: str):
    client = _get_client()
    client.table("chat_messages").insert([
        {"user_id": user_id, "role": "user", "content": user_msg},
        {"user_id": user_id, "role": "assistant", "content": assistant_msg},
    ]).execute()


def get_chat_history(user_id: str, limit: int = 20) -> list:
    client = _get_client()
    result = client.table("chat_messages").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(limit).execute()
    messages = result.data or []
    messages.reverse()
    return [{"role": m["role"], "content": m["content"]} for m in messages]


# ── User Profile ─────────────────────────────────────────────────────────────

def get_user_profile(user_id: str) -> dict:
    client = _get_client()
    result = client.table("user_profiles").select("*").eq("id", user_id).execute()
    return result.data[0] if result.data else {}


def upsert_user_profile(user_id: str, profile_data: dict) -> dict:
    client = _get_client()
    profile_data["id"] = user_id
    result = client.table("user_profiles").upsert(profile_data).execute()
    return result.data[0] if result.data else {}

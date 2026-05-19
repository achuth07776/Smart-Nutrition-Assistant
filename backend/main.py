import os
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
from contextlib import asynccontextmanager

from backend.services import rag, llm, voice, database, auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    rag.initialize()
    yield


app = FastAPI(title="NutriVoice API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request Models ───────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    user_id: str
    conversation_history: Optional[list] = None


class VoiceLogRequest(BaseModel):
    audio_base64: str
    language_code: Optional[str] = "unknown"
    user_id: str


class TextLogRequest(BaseModel):
    text: str
    user_id: str
    language: Optional[str] = "en"


class ConfirmMealRequest(BaseModel):
    meal_log_id: int
    user_id: str
    edited_items: Optional[list] = None


class ProfileRequest(BaseModel):
    user_id: str
    name: Optional[str] = None
    age: Optional[int] = None
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    activity_level: Optional[str] = "moderate"
    dietary_goal: Optional[str] = "balanced"
    preferred_language: Optional[str] = "en"
    daily_calorie_target: Optional[int] = 2000


class ImageLogRequest(BaseModel):
    image_base64: str
    user_id: str
    mime_type: Optional[str] = "image/jpeg"


class SignupRequest(BaseModel):
    email: str
    password: str
    name: Optional[str] = ""


class LoginRequest(BaseModel):
    email: str
    password: str


# ── Auth ─────────────────────────────────────────────────────────────────────

@app.post("/api/auth/signup")
def signup(req: SignupRequest):
    try:
        result = auth.signup(req.email, req.password, req.name)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/auth/login")
def login(req: LoginRequest):
    try:
        result = auth.login(req.email, req.password)
        return result
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/auth/logout")
def logout(token: str = ""):
    auth.logout(token)
    return {"success": True}


# ── Health Check ─────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "chunks_loaded": len(rag._chunks)}


# ── Chat (RAG) ───────────────────────────────────────────────────────────────

@app.post("/api/chat")
def chat(req: ChatRequest):
    try:
        context_chunks = rag.search(req.message)
        daily_summary = database.get_daily_summary(req.user_id)

        history = req.conversation_history
        if not history:
            history = database.get_chat_history(req.user_id)

        answer = llm.chat_with_context(
            query=req.message,
            context_chunks=context_chunks,
            conversation_history=history,
            daily_summary=daily_summary,
        )

        database.save_chat_messages(req.user_id, req.message, answer)

        return {
            "reply": answer,
            "sources": [{"page": c["page_number"], "score": c["score"]} for c in context_chunks[:3]],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Voice Food Log ───────────────────────────────────────────────────────────

@app.post("/api/voice-log")
async def voice_log(req: VoiceLogRequest):
    try:
        transcription = await voice.transcribe_and_translate(
            req.audio_base64, req.language_code
        )

        translated_text = transcription["translated_text"]
        food_data = llm.extract_food_items(translated_text)

        food_query = " ".join([item["name"] for item in food_data["items"]])
        context_chunks = rag.search(food_query)
        nutrition = llm.get_nutrition_from_context(food_data["items"], context_chunks)

        meal_type = food_data["items"][0].get("meal_type", "snack") if food_data["items"] else "snack"
        meal_log = database.create_meal_log(
            user_id=req.user_id,
            raw_voice=transcription["transcript"],
            translated=translated_text,
            food_items=food_data["items"],
            nutrition_data=nutrition,
            meal_type=meal_type,
        )

        return {
            "meal_log_id": meal_log.get("id"),
            "transcript": transcription["transcript"],
            "translated_text": translated_text,
            "food_items": food_data["items"],
            "nutrition": nutrition,
            "needs_confirmation": True,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Text Food Log (for typed input) ─────────────────────────────────────────

@app.post("/api/text-log")
def text_log(req: TextLogRequest):
    try:
        food_data = llm.extract_food_items(req.text)

        food_query = " ".join([item["name"] for item in food_data["items"]])
        context_chunks = rag.search(food_query)
        nutrition = llm.get_nutrition_from_context(food_data["items"], context_chunks)

        meal_type = food_data["items"][0].get("meal_type", "snack") if food_data["items"] else "snack"
        meal_log = database.create_meal_log(
            user_id=req.user_id,
            raw_voice=req.text,
            translated=req.text,
            food_items=food_data["items"],
            nutrition_data=nutrition,
            meal_type=meal_type,
        )

        return {
            "meal_log_id": meal_log.get("id"),
            "transcript": req.text,
            "translated_text": req.text,
            "food_items": food_data["items"],
            "nutrition": nutrition,
            "needs_confirmation": True,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Image Food Log ───────────────────────────────────────────────────────────

@app.post("/api/image-log")
def image_log(req: ImageLogRequest):
    try:
        food_data = llm.extract_food_from_image(req.image_base64, req.mime_type)

        food_query = " ".join([item["name"] for item in food_data["items"]])
        context_chunks = rag.search(food_query)
        nutrition = llm.get_nutrition_from_context(food_data["items"], context_chunks)

        meal_type = food_data["items"][0].get("meal_type", "snack") if food_data["items"] else "snack"
        meal_log = database.create_meal_log(
            user_id=req.user_id,
            raw_voice="[image upload]",
            translated=food_data.get("description", food_query),
            food_items=food_data["items"],
            nutrition_data=nutrition,
            meal_type=meal_type,
        )

        return {
            "meal_log_id": meal_log.get("id"),
            "transcript": food_data.get("description", food_query),
            "translated_text": food_data.get("description", food_query),
            "food_items": food_data["items"],
            "nutrition": nutrition,
            "needs_confirmation": True,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Confirm Meal ─────────────────────────────────────────────────────────────

@app.post("/api/confirm-meal")
def confirm_meal(req: ConfirmMealRequest):
    try:
        meal = database.confirm_meal(req.meal_log_id, req.user_id, req.edited_items)
        return {"success": True, "meal": meal}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Dashboard Data ───────────────────────────────────────────────────────────

@app.get("/api/dashboard/{user_id}")
def dashboard(user_id: str):
    try:
        summary = database.get_daily_summary(user_id)
        meals = database.get_meal_logs(user_id, limit=10)
        profile = database.get_user_profile(user_id)

        target = profile.get("daily_calorie_target", 2000) if profile else 2000

        return {
            "daily_summary": summary,
            "recent_meals": meals,
            "calorie_target": target,
            "profile": profile,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Meal History ─────────────────────────────────────────────────────────────

@app.get("/api/history/{user_id}")
def history(user_id: str, limit: int = 50):
    try:
        meals = database.get_meal_logs(user_id, limit=limit)
        return {"meals": meals}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Profile ──────────────────────────────────────────────────────────────────

@app.get("/api/profile/{user_id}")
def get_profile(user_id: str):
    try:
        profile = database.get_user_profile(user_id)
        return {"profile": profile}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/profile")
def update_profile(req: ProfileRequest):
    try:
        data = req.model_dump(exclude_none=True, exclude={"user_id"})
        profile = database.upsert_user_profile(req.user_id, data)
        return {"profile": profile}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Serve Frontend (production) ──────────────────────────────────────────────

STATIC_DIR = Path(__file__).parent / "static"
if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file_path = STATIC_DIR / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(STATIC_DIR / "index.html")

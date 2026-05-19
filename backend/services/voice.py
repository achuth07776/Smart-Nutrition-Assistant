import httpx
import base64
import io
from backend.config import SARVAM_API_KEY

SARVAM_STT_URL = "https://api.sarvam.ai/speech-to-text-translate"
SARVAM_TRANSLATE_URL = "https://api.sarvam.ai/translate"


async def transcribe_and_translate(audio_base64: str, language_code: str = "hi-IN") -> dict:
    audio_bytes = base64.b64decode(audio_base64)
    audio_file = io.BytesIO(audio_bytes)

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Step 1: Speech-to-text
        stt_response = await client.post(
            SARVAM_STT_URL,
            headers={"api-subscription-key": SARVAM_API_KEY},
            files={"file": ("audio.wav", audio_file, "audio/wav")},
            data={"language_code": language_code, "model": "saaras:v2.5"},
        )
        stt_response.raise_for_status()
        stt_data = stt_response.json()
        transcript = stt_data.get("transcript", "")

        if not transcript:
            return {"transcript": "", "translated_text": "", "language_detected": language_code}

        # Step 2: Translate to English if not already English
        if language_code and not language_code.startswith("en"):
            translate_response = await client.post(
                SARVAM_TRANSLATE_URL,
                headers={
                    "api-subscription-key": SARVAM_API_KEY,
                    "Content-Type": "application/json",
                },
                json={
                    "input": transcript,
                    "source_language_code": language_code,
                    "target_language_code": "en-IN",
                    "model": "mayura:v1",
                },
            )
            translate_response.raise_for_status()
            translate_data = translate_response.json()
            translated_text = translate_data.get("translated_text", transcript)
        else:
            translated_text = transcript

        return {
            "transcript": transcript,
            "translated_text": translated_text,
            "language_detected": language_code,
        }

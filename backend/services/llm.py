from groq import Groq
from backend.config import GROQ_API_KEY, GROQ_MODEL

_client = None

# Vision-capable model on Groq (supports image inputs)
GROQ_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"


def _get_client():
    global _client
    if _client is None:
        _client = Groq(api_key=GROQ_API_KEY)
    return _client


def chat_with_context(query: str, context_chunks: list[dict], conversation_history: list[dict] = None, daily_summary: dict = None) -> str:
    client = _get_client()

    context = "\n\n".join([f"- {c['content']}" for c in context_chunks])

    daily_info = ""
    if daily_summary:
        daily_info = f"\nToday's intake so far: {daily_summary.get('total_calories', 0):.0f} kcal, {daily_summary.get('total_protein_g', 0):.0f}g protein, {daily_summary.get('total_carbs_g', 0):.0f}g carbs, {daily_summary.get('total_fat_g', 0):.0f}g fat."

    system_prompt = f"""You are NutriVoice, a friendly and knowledgeable nutrition assistant.
Use the reference material below to answer questions accurately and concisely.
Be warm, actionable, and cite specific numbers when relevant.
If the context doesn't contain enough info, say so honestly.{daily_info}

NUTRITION REFERENCE:
{context}"""

    messages = [{"role": "system", "content": system_prompt}]

    if conversation_history:
        messages.extend(conversation_history[-10:])

    messages.append({"role": "user", "content": query})

    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=messages,
        temperature=0.7,
        max_tokens=800,
    )

    return response.choices[0].message.content


def extract_food_items(text: str) -> dict:
    client = _get_client()

    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[{
            "role": "user",
            "content": f"""Extract food items and quantities from this text. Return ONLY valid JSON, no explanation.
Text: "{text}"
Format: {{"items": [{{"name": "food name", "quantity": 1, "unit": "piece/cup/gram/plate/bowl", "meal_type": "breakfast/lunch/dinner/snack"}}]}}
If quantity is unclear, estimate a reasonable default. Always return at least the food name."""
        }],
        temperature=0.1,
        max_tokens=500,
    )

    import json
    raw = response.choices[0].message.content.strip()
    # Handle markdown code blocks
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()
    return json.loads(raw)


def get_nutrition_from_context(food_items: list[dict], context_chunks: list[dict]) -> dict:
    client = _get_client()

    context = "\n\n".join([c["content"] for c in context_chunks])

    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[{
            "role": "user",
            "content": f"""Using the nutrition reference below, estimate nutritional values for these foods.
Return ONLY valid JSON, no explanation.

Foods: {food_items}

Reference: {context}

Return JSON format:
{{
  "total": {{"calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0, "fiber_g": 0}},
  "per_item": [{{"name": "", "quantity": 1, "unit": "", "calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0}}],
  "summary": "brief 1-sentence friendly summary"
}}

Estimate reasonable values based on standard serving sizes if exact data isn't in the reference."""
        }],
        temperature=0.2,
        max_tokens=800,
    )

    import json
    raw = response.choices[0].message.content.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()
    return json.loads(raw)


def extract_food_from_image(image_base64: str, mime_type: str = "image/jpeg") -> dict:
    """Use a vision model to identify food items from a base64-encoded image."""
    client = _get_client()

    import json
    response = client.chat.completions.create(
        model=GROQ_VISION_MODEL,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{mime_type};base64,{image_base64}",
                    },
                },
                {
                    "type": "text",
                    "text": """Look at this food image and identify all visible food items and their approximate quantities.
Return ONLY valid JSON, no explanation.
Format: {
  "description": "brief description of what you see",
  "items": [{"name": "food name", "quantity": 1, "unit": "piece/cup/gram/plate/bowl", "meal_type": "breakfast/lunch/dinner/snack"}]
}
If quantity is unclear, estimate a reasonable default based on what's visible.
Always include at least one food item if any food is present."""
                },
            ],
        }],
        temperature=0.1,
        max_tokens=500,
    )

    raw = response.choices[0].message.content.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()
    return json.loads(raw)

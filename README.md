# NutriVoice AI

Real-time nutrition companion with voice food logging, RAG chatbot, and daily macro tracking.

## Architecture

```
Frontend (React + Vite)  →  FastAPI Backend  →  Groq (Llama 3.1 70B)
                                             →  Sarvam AI (Voice STT)
                                             →  Sentence-Transformers (Embeddings)
                                             →  Supabase (Database)
```

## Features

- **Voice Food Logger** — Speak in any Indian language, get nutrition data back
- **RAG Chatbot** — Ask nutrition questions grounded in a textbook
- **Daily Dashboard** — Calorie ring, macro bars, recent meals
- **Meal Confirmation** — Review & edit detected foods before saving
- **History** — Calendar-grouped meal timeline
- **Profile** — Set calorie targets, activity level, dietary goals

## Quick Start (Local)

### 1. Prerequisites
- Python 3.11+
- Node.js 18+
- API keys (Groq, Sarvam, Supabase)

### 2. Setup

```bash
# Clone and enter directory
cd "Nutritional RAG"

# Create .env from template
cp .env.example .env
# Fill in your API keys in .env

# Install Python deps
pip install -r backend/requirements.txt

# Install frontend deps
cd frontend && npm install && cd ..
```

### 3. Supabase Setup

Run this SQL in your Supabase SQL editor to create the required tables:

```sql
-- User profiles
create table if not exists public.user_profiles (
  id text primary key,
  name text,
  age int,
  weight_kg float,
  height_cm float,
  activity_level text default 'moderate',
  dietary_goal text default 'balanced',
  preferred_language text default 'en',
  daily_calorie_target int default 2000,
  created_at timestamptz default now()
);

-- Meal logs
create table if not exists public.meal_logs (
  id bigserial primary key,
  user_id text not null,
  logged_at timestamptz default now(),
  raw_voice_input text,
  translated_input text,
  food_items jsonb not null default '[]',
  nutrition_data jsonb not null default '{}',
  confirmed boolean default false,
  meal_type text default 'snack'
);

-- Daily summaries
create table if not exists public.daily_summaries (
  id bigserial primary key,
  user_id text not null,
  date date not null default current_date,
  total_calories float default 0,
  total_protein_g float default 0,
  total_carbs_g float default 0,
  total_fat_g float default 0,
  total_fiber_g float default 0,
  unique(user_id, date)
);

-- Chat messages
create table if not exists public.chat_messages (
  id bigserial primary key,
  user_id text not null,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz default now()
);
```

### 4. Run

```bash
# Option A: Run both together
python run_dev.py

# Option B: Run separately
# Terminal 1 - Backend (auto-reloads)
python -m uvicorn backend.main:app --reload --port 8000

# Terminal 2 - Frontend
cd frontend && npm run dev
```

Open http://localhost:5173

## Deploy to Railway

1. Push code to GitHub
2. Connect repo on railway.app
3. Add environment variables (GROQ_API_KEY, SARVAM_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
4. Deploy — Railway auto-detects the Dockerfile

## Deploy to Render

1. Push code to GitHub
2. Create new Web Service on render.com
3. Connect repo, select Docker
4. Add environment variables
5. Deploy

## Tech Stack

| Layer | Tool | Purpose |
|-------|------|---------|
| Frontend | React + Vite | RetroUI-styled mobile-first app |
| LLM | Groq (Llama 3.1 70B) | Chat, food extraction, nutrition calc |
| Voice | Sarvam AI | Multilingual speech-to-text + translation |
| Embeddings | all-MiniLM-L6-v2 | Local sentence embeddings (384 dims) |
| Vector Search | In-memory NumPy | Cosine similarity over PDF chunks |
| Database | Supabase Postgres | Meals, summaries, chat, profiles |
| Backend | FastAPI | REST API with async support |

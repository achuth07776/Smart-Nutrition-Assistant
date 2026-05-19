# Smart Nutrition Assistant

> AI-powered nutrition companion with multilingual voice food logging, RAG-based Q&A, and real-time macro tracking.

[![Python](https://img.shields.io/badge/Python-3.11+-blue?logo=python)](https://python.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## Overview

Smart Nutrition Assistant lets you **speak your meals in any Indian language** and instantly get calorie/macro breakdowns. It combines a RAG chatbot (grounded in a nutrition textbook) with a voice-first food logger and daily dashboard — all in a mobile-friendly retro UI.

### Key Features

- **Voice Food Logging** — Record meals in Hindi, Tamil, Telugu, or any Indian language; AI extracts food items and calculates nutrition
- **RAG Chatbot** — Ask nutrition questions answered from a real textbook using retrieval-augmented generation
- **Daily Dashboard** — Calorie progress ring, macro breakdown bars, and recent meal cards
- **Meal Confirmation** — Review and edit AI-detected foods before saving
- **Meal History** — Calendar-grouped timeline of all logged meals
- **User Profile** — Set calorie targets, activity level, and dietary goals

---

## Architecture

```
┌─────────────────┐       ┌──────────────────────────────────────────┐
│  React + Vite   │──────▶│           FastAPI Backend                 │
│  (Frontend)     │◀──────│                                          │
└─────────────────┘       │  ┌─────────────┐  ┌──────────────────┐  │
                          │  │  Groq LLM   │  │   Sarvam AI      │  │
                          │  │ (Llama 3.1) │  │ (Voice STT)      │  │
                          │  └─────────────┘  └──────────────────┘  │
                          │  ┌─────────────┐  ┌──────────────────┐  │
                          │  │  Embeddings │  │   Supabase       │  │
                          │  │(MiniLM-L6)  │  │  (PostgreSQL)    │  │
                          │  └─────────────┘  └──────────────────┘  │
                          └──────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React + Vite | RetroUI-styled mobile-first SPA |
| LLM | Groq (Llama 3.1 70B) | Chat responses, food extraction, nutrition calculation |
| Voice | Sarvam AI | Multilingual speech-to-text + translation |
| Embeddings | all-MiniLM-L6-v2 | Sentence embeddings (384 dims) for RAG |
| Vector Search | In-memory NumPy | Cosine similarity over PDF chunks |
| Database | Supabase (PostgreSQL) | Meals, daily summaries, chat history, profiles |
| Backend | FastAPI | Async REST API |
| Deployment | Docker + Railway/Render | Containerized cloud deployment |

---

## Project Structure

```
Smart-Nutrition-Assistant/
├── backend/
│   ├── main.py                 # FastAPI app entry point
│   ├── config.py               # Environment config
│   └── services/
│       ├── auth.py             # User authentication
│       ├── database.py         # Supabase interactions
│       ├── llm.py              # Groq LLM integration
│       ├── rag.py              # RAG pipeline (embeddings + retrieval)
│       └── voice.py            # Sarvam AI voice processing
├── frontend/
│   ├── src/
│   │   ├── App.jsx             # Main app with routing
│   │   ├── api/client.js       # API client
│   │   ├── components/
│   │   │   ├── Auth.jsx        # Login/signup
│   │   │   ├── Chat.jsx        # RAG chatbot UI
│   │   │   ├── Dashboard.jsx   # Daily calorie/macro dashboard
│   │   │   ├── History.jsx     # Meal history timeline
│   │   │   ├── Profile.jsx     # User settings
│   │   │   └── VoiceLogger.jsx # Voice recording + meal logging
│   │   └── styles/global.css   # RetroUI styling
│   └── index.html
├── human-nutrition-text.pdf    # Source textbook for RAG
├── Production_RAG.ipynb        # Research notebook
├── Dockerfile                  # Production container
├── railway.json                # Railway deployment config
├── render.yaml                 # Render deployment config
└── run_dev.py                  # Dev server launcher
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- API keys: [Groq](https://console.groq.com), [Sarvam AI](https://www.sarvam.ai), [Supabase](https://supabase.com)

### Installation

```bash
# Clone the repository
git clone https://github.com/achuth07776/Smart-Nutrition-Assistant.git
cd Smart-Nutrition-Assistant

# Create environment file
cp .env.example .env
# Add your API keys to .env

# Install backend dependencies
pip install -r backend/requirements.txt

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### Environment Variables

```env
GROQ_API_KEY=your_groq_api_key_here
SARVAM_API_KEY=your_sarvam_api_key_here
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

### Database Setup

Run this SQL in your [Supabase SQL Editor](https://supabase.com/dashboard):

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

### Run Locally

```bash
# Option A: Run both frontend + backend together
python run_dev.py

# Option B: Run separately
# Terminal 1 - Backend (auto-reloads)
python -m uvicorn backend.main:app --reload --port 8000

# Terminal 2 - Frontend
cd frontend && npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Deployment

### Docker

```bash
docker build -t smart-nutrition-assistant .
docker run -p 8000:8000 --env-file .env smart-nutrition-assistant
```

### Railway

1. Push code to GitHub
2. Connect repo on [railway.app](https://railway.app)
3. Add environment variables
4. Deploy — Railway auto-detects the Dockerfile

### Render

1. Push code to GitHub
2. Create new Web Service on [render.com](https://render.com)
3. Connect repo, select Docker runtime
4. Add environment variables
5. Deploy

---

## How It Works

### Voice Food Logging
1. User records audio in any Indian language
2. Sarvam AI transcribes and translates to English
3. Groq LLM extracts food items with portions
4. LLM calculates nutrition (calories, protein, carbs, fat, fiber)
5. User confirms/edits, then saves to database

### RAG Chatbot
1. Nutrition textbook is chunked and embedded using all-MiniLM-L6-v2
2. User question is embedded and matched against chunks via cosine similarity
3. Top relevant chunks are passed as context to Groq LLM
4. LLM generates a grounded answer with textbook knowledge

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/voice/transcribe` | Transcribe voice audio |
| POST | `/api/meals/log` | Log a meal |
| GET | `/api/meals/history` | Get meal history |
| GET | `/api/dashboard/summary` | Get daily nutrition summary |
| POST | `/api/chat` | Chat with RAG bot |
| GET/PUT | `/api/profile` | Get/update user profile |

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is open source and available under the [MIT License](LICENSE).

---

Built with Groq, Sarvam AI, and Supabase

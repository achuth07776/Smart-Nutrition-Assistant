import os
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv(usecwd=True))

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
SARVAM_API_KEY = os.environ.get("SARVAM_API_KEY", "")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

PDF_PATH = os.path.join(os.path.dirname(__file__), "..", "human-nutrition-text.pdf")
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
GROQ_MODEL = "llama-3.3-70b-versatile"
CHUNK_SIZE = 10
CHUNK_OVERLAP = 2
MIN_TOKENS = 50
MAX_TOKENS = 1300
TOP_K = 5

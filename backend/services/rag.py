import re
import os
import pickle
import fitz
import numpy as np
from sentence_transformers import SentenceTransformer
from scipy.spatial.distance import cdist
from backend.config import PDF_PATH, EMBEDDING_MODEL, CHUNK_SIZE, CHUNK_OVERLAP, MIN_TOKENS, MAX_TOKENS, TOP_K

_model = None
_chunks = []
_embeddings = None

# Cache file lives next to the PDF
_CACHE_PATH = os.path.join(os.path.dirname(PDF_PATH), ".rag_cache.pkl")


def _get_model():
    global _model
    if _model is None:
        _model = SentenceTransformer(EMBEDDING_MODEL)
    return _model


def _split_sentences(text: str) -> list[str]:
    raw = re.split(r'(?<=[.!?])\s+', text)
    return [s.strip() for s in raw if s.strip()]


def _estimate_tokens(text: str) -> int:
    return len(text) // 4


def _build_chunks(pages: list[dict]) -> list[dict]:
    chunks = []
    step = CHUNK_SIZE - CHUNK_OVERLAP

    for page in pages:
        sentences = _split_sentences(page["text"])
        for start in range(0, len(sentences), step):
            window = sentences[start:start + CHUNK_SIZE]
            chunk_text = " ".join(window)
            tokens = _estimate_tokens(chunk_text)

            if tokens < MIN_TOKENS:
                continue
            if tokens > MAX_TOKENS:
                trimmed, acc = [], 0
                for s in window:
                    t = _estimate_tokens(s)
                    if acc + t > MAX_TOKENS:
                        break
                    trimmed.append(s)
                    acc += t
                chunk_text = " ".join(trimmed)

            chunks.append({
                "content": chunk_text,
                "page_number": page["page_number"],
                "token_count": _estimate_tokens(chunk_text),
            })

            if start + CHUNK_SIZE >= len(sentences):
                break

    return chunks


def _extract_pdf(path: str) -> list[dict]:
    doc = fitz.open(path)
    pages = []
    for i, page in enumerate(doc):
        text = page.get_text().replace("\n", " ").strip()
        if text:
            pages.append({"page_number": i, "text": text})
    doc.close()
    return pages


def _cache_is_valid() -> bool:
    """Return True if cache exists and is newer than the PDF."""
    if not os.path.exists(_CACHE_PATH):
        return False
    cache_mtime = os.path.getmtime(_CACHE_PATH)
    pdf_mtime = os.path.getmtime(PDF_PATH)
    return cache_mtime >= pdf_mtime


def initialize():
    global _chunks, _embeddings

    if _cache_is_valid():
        print("[RAG] Loading embeddings from cache...")
        with open(_CACHE_PATH, "rb") as f:
            cached = pickle.load(f)
        _chunks = cached["chunks"]
        _embeddings = cached["embeddings"]
        print(f"[RAG] Cache loaded: {len(_chunks)} chunks, embeddings shape {_embeddings.shape}")
        return

    print("[RAG] Extracting PDF text...")
    pages = _extract_pdf(PDF_PATH)
    print(f"[RAG] Extracted {len(pages)} pages")

    print("[RAG] Building chunks...")
    _chunks = _build_chunks(pages)
    print(f"[RAG] Created {len(_chunks)} chunks")

    print("[RAG] Computing embeddings (this may take a minute)...")
    model = _get_model()
    texts = [c["content"] for c in _chunks]
    _embeddings = model.encode(texts, show_progress_bar=True, convert_to_numpy=True)
    print(f"[RAG] Embeddings ready: shape {_embeddings.shape}")

    print("[RAG] Saving cache to disk...")
    with open(_CACHE_PATH, "wb") as f:
        pickle.dump({"chunks": _chunks, "embeddings": _embeddings}, f)
    print(f"[RAG] Cache saved to {_CACHE_PATH}")


def search(query: str, top_k: int = TOP_K) -> list[dict]:
    if _embeddings is None or len(_chunks) == 0:
        return []

    model = _get_model()
    query_embedding = model.encode([query], convert_to_numpy=True)

    distances = cdist(query_embedding, _embeddings, metric="cosine")[0]
    top_indices = np.argsort(distances)[:top_k]

    results = []
    for idx in top_indices:
        results.append({
            "content": _chunks[idx]["content"],
            "page_number": _chunks[idx]["page_number"],
            "score": float(1 - distances[idx]),
        })

    return results


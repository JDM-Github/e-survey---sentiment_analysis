import requests
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from app.config import Config
from app.models.prompts import (
    SINGLE_SENTIMENT_SYSTEM, single_sentiment_user,
    BATCH_SENTIMENT_SYSTEM,  batch_sentiment_user,
    single_category_system,  single_category_user,
    batch_category_system,   batch_category_user,
)

# ─────────────────────────────────────────────────────────────────────────────
#  Fallback models (defined here; can also be moved to Config)
# ─────────────────────────────────────────────────────────────────────────────

FALLBACK_MODELS = [
    "gemma3:27b-cloud",
    "gemma3:12b-cloud",
    "gemma3:4b-cloud",
]

# ─────────────────────────────────────────────────────────────────────────────
#  Scoring
# ─────────────────────────────────────────────────────────────────────────────

SCORE_TABLE = {
    ("Positive", "Positive"): 1.0,
    ("Positive", "Neutral"):  0.5,
    ("Positive", "Negative"): 0.0,
    ("Negative", "Negative"): 1.0,
    ("Negative", "Neutral"):  0.5,
    ("Negative", "Positive"): 0.0,
    ("Neutral",  "Neutral"):  1.0,
    ("Neutral",  "Positive"): 0.5,
    ("Neutral",  "Negative"): 0.5,
}

VALID_SENTIMENTS = ("Positive", "Negative", "Neutral")

def score(expected: str, predicted: str) -> float:
    return SCORE_TABLE.get((expected, predicted), 0.0)


# ─────────────────────────────────────────────────────────────────────────────
#  Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _make_headers() -> dict:
    return {
        "Authorization": f"Bearer {Config.OLLAMA_API_KEY}",
        "Content-Type": "application/json",
    }

def _parse_sentiment(raw: str) -> str:
    """Extract the first valid sentiment label from a raw string."""
    for valid in VALID_SENTIMENTS:
        if valid.lower() in raw.lower():
            return valid
    return "Neutral"

def _chunk(lst: list, size: int) -> list[list]:
    """Split a list into chunks of at most `size` items."""
    return [lst[i : i + size] for i in range(0, len(lst), size)]

def _filter_by_length(
    texts: list[str],
    min_char_length: int,
) -> tuple[list[str], list[int], list[int]]:
    """
    Split texts into those to process and those to skip.

    Returns:
        to_process   : texts whose length > min_char_length
        process_idxs : original indices of to_process
        skip_idxs    : original indices of skipped texts
    """
    if min_char_length <= 0:
        return texts, list(range(len(texts))), []

    to_process, process_idxs, skip_idxs = [], [], []
    for i, t in enumerate(texts):
        if len(t) > min_char_length:
            to_process.append(t)
            process_idxs.append(i)
        else:
            skip_idxs.append(i)
    return to_process, process_idxs, skip_idxs


# ─────────────────────────────────────────────────────────────────────────────
#  Single-text calls with fallback
# ─────────────────────────────────────────────────────────────────────────────

def _call_ollama(text: str) -> str:
    """Send one text, return one predicted sentiment label.
    Tries primary model, then each fallback model on failure."""
    models_to_try = [Config.OLLAMA_MODEL] + FALLBACK_MODELS
    last_exception = None

    for model in models_to_try:
        try:
            resp = requests.post(
                Config.OLLAMA_API_URL,
                json={
                    "model": model,
                    "messages": [
                        {"role": "system",  "content": SINGLE_SENTIMENT_SYSTEM},
                        {"role": "user",    "content": single_sentiment_user(text)},
                    ],
                    "stream": False,
                    "options": {"temperature": 0, "num_predict": 10},
                },
                headers=_make_headers(),
                timeout=Config.REQUEST_TIMEOUT,
            )
            label = resp.json()["message"]["content"].strip()
            return _parse_sentiment(label)
        except Exception as e:
            last_exception = e
            continue   # try next fallback model

    # All models failed
    return "Error"


def _call_ollama_with_category(text: str, categories: list[str]) -> dict:
    """Send one text, return sentiment + category. Uses fallback models."""
    models_to_try = [Config.OLLAMA_MODEL] + FALLBACK_MODELS

    for model in models_to_try:
        try:
            resp = requests.post(
                Config.OLLAMA_API_URL,
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": single_category_system(categories)},
                        {"role": "user",   "content": single_category_user(text)},
                    ],
                    "stream": False,
                    "options": {"temperature": 0, "num_predict": 20},
                },
                headers=_make_headers(),
                timeout=Config.REQUEST_TIMEOUT,
            )
            raw = resp.json()["message"]["content"].strip()
            sentiment = "Neutral"
            category  = categories[0]

            for line in raw.splitlines():
                line = line.strip()
                if line.lower().startswith("sentiment:"):
                    sentiment = _parse_sentiment(line.split(":", 1)[1].strip())
                elif line.lower().startswith("category:"):
                    label = line.split(":", 1)[1].strip()
                    for cat in categories:
                        if cat.lower() in label.lower():
                            category = cat
                            break
            return {"sentiment": sentiment, "category": category}
        except Exception:
            continue

    return {"sentiment": "Error", "category": "Error"}


# ─────────────────────────────────────────────────────────────────────────────
#  Batch-inference calls with fallback
# ─────────────────────────────────────────────────────────────────────────────

def _call_ollama_batch(texts: list[str]) -> list[str]:
    """
    Send N texts in a single API call, return N sentiment labels in order.
    Falls back to other models if primary fails.
    """
    models_to_try = [Config.OLLAMA_MODEL] + FALLBACK_MODELS

    for model in models_to_try:
        try:
            resp = requests.post(
                Config.OLLAMA_API_URL,
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": BATCH_SENTIMENT_SYSTEM},
                        {"role": "user",   "content": batch_sentiment_user(texts)},
                    ],
                    "stream": False,
                    "options": {"temperature": 0, "num_predict": len(texts) * 5},
                },
                headers=_make_headers(),
                timeout=Config.REQUEST_TIMEOUT,
            )
            raw_lines = [
                line.strip()
                for line in resp.json()["message"]["content"].strip().splitlines()
                if line.strip()
            ]
            labels = [_parse_sentiment(line) for line in raw_lines]
            if len(labels) < len(texts):
                labels += ["Neutral"] * (len(texts) - len(labels))
            return labels[: len(texts)]
        except Exception:
            continue

    return ["Error"] * len(texts)


def _call_ollama_batch_with_category(
    texts: list[str], categories: list[str]
) -> list[dict]:
    """
    Send N texts in a single API call, return N {sentiment, category} dicts.
    Uses fallback models.
    """
    default = {"sentiment": "Neutral", "category": categories[0]}
    models_to_try = [Config.OLLAMA_MODEL] + FALLBACK_MODELS

    for model in models_to_try:
        try:
            resp = requests.post(
                Config.OLLAMA_API_URL,
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": batch_category_system(categories)},
                        {"role": "user",   "content": batch_category_user(texts)},
                    ],
                    "stream": False,
                    "options": {"temperature": 0, "num_predict": len(texts) * 10},
                },
                headers=_make_headers(),
                timeout=Config.REQUEST_TIMEOUT,
            )
            raw_lines = [
                line.strip()
                for line in resp.json()["message"]["content"].strip().splitlines()
                if line.strip()
            ]

            results = []
            for line in raw_lines:
                parts = line.split("|", 1)
                sentiment = _parse_sentiment(parts[0].strip()) if parts else "Neutral"
                category  = categories[0]
                if len(parts) == 2:
                    label = parts[1].strip()
                    for cat in categories:
                        if cat.lower() in label.lower():
                            category = cat
                            break
                results.append({"sentiment": sentiment, "category": category})

            if len(results) < len(texts):
                results += [default] * (len(texts) - len(results))
            return results[: len(texts)]
        except Exception:
            continue

    return [{"sentiment": "Error", "category": "Error"}] * len(texts)


# ─────────────────────────────────────────────────────────────────────────────
#  Public API (unchanged except fallback is now built into low-level calls)
# ─────────────────────────────────────────────────────────────────────────────

def classify_one(text: str) -> dict:
    """Classify a single text, return dict with predicted label and metadata."""
    start     = time.time()
    predicted = _call_ollama(text)
    elapsed   = time.time() - start
    return {
        "text":      text,
        "predicted": predicted,
        "elapsed":   elapsed,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
    }


def classify_batch(
    texts: list[str],
    max_workers: int = None,
    batch_size: int = 1,
    min_char_length: int = 0,
) -> list[dict]:
    """
    Classify many texts.

    min_char_length: texts with len(text) <= min_char_length are skipped entirely
                     and not included in the returned results.
    batch_size = 1  → one API call per text  (original behaviour)
    batch_size = N  → send N texts per API call; concurrent over chunks
    max_workers     → controls concurrent chunks (default: Config.MAX_WORKERS)
    """
    if max_workers is None:
        max_workers = Config.MAX_WORKERS

    # Filter out short texts — they are not returned at all
    to_process, process_idxs, _ = _filter_by_length(texts, min_char_length)

    if not to_process:
        return []

    batch_size = max(1, batch_size)
    chunks     = _chunk(to_process, batch_size)
    # Results slot per processable text (by position in to_process)
    results    = [None] * len(to_process)

    def _process_chunk(chunk: list[str], start_idx: int) -> tuple[int, list[dict]]:
        chunk_start = time.time()

        if len(chunk) == 1:
            labels = [_call_ollama(chunk[0])]
        else:
            labels = _call_ollama_batch(chunk)

        chunk_elapsed = time.time() - chunk_start
        chunk_results = []
        for text, label in zip(chunk, labels):
            chunk_results.append({
                "text":      text,
                "predicted": label,
                "elapsed":   round(chunk_elapsed / len(chunk), 4),
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            })
        return start_idx, chunk_results

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {
            executor.submit(_process_chunk, chunk, i * batch_size): i
            for i, chunk in enumerate(chunks)
        }
        for future in as_completed(futures):
            try:
                start_idx, chunk_results = future.result()
                for offset, res in enumerate(chunk_results):
                    results[start_idx + offset] = res
            except Exception as e:
                chunk_idx = futures[future]
                start_idx = chunk_idx * batch_size
                chunk     = chunks[chunk_idx]
                for offset, text in enumerate(chunk):
                    results[start_idx + offset] = {
                        "text":      text,
                        "predicted": "Error",
                        "elapsed":   0,
                        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                        "error":     str(e),
                    }

    return results


def run_accuracy_test(
    samples: list,
    max_workers: int = None,
    batch_size: int = 1,
) -> dict:
    """
    Run accuracy test on labeled samples.
    samples   : list of (text, expected_label)
    batch_size: texts per API call (1 = original behaviour)
    No min_char_length here — accuracy samples are curated, nothing to skip.
    """
    if not samples:
        return {
            "total_samples":    0,
            "total_score":      0.0,
            "overall_accuracy": 0.0,
            "results":          [],
        }

    texts, expected = zip(*samples)
    predictions     = classify_batch(list(texts), max_workers, batch_size)

    results     = []
    total_score = 0.0
    for idx, (text, exp, pred_info) in enumerate(zip(texts, expected, predictions)):
        pred = pred_info["predicted"]
        s    = score(exp, pred)
        total_score += s
        results.append({
            "index":     idx + 1,
            "text":      text,
            "expected":  exp,
            "predicted": pred,
            "score":     s,
            "elapsed":   pred_info["elapsed"],
            "timestamp": pred_info["timestamp"],
        })

    overall_accuracy = (total_score / len(samples)) * 100
    return {
        "total_samples":    len(samples),
        "total_score":      total_score,
        "overall_accuracy": round(overall_accuracy, 2),
        "results":          results,
    }


def classify_one_with_category(text: str, categories: list[str]) -> dict:
    start   = time.time()
    result  = _call_ollama_with_category(text, categories)
    elapsed = time.time() - start
    return {
        "text":      text,
        "predicted": result["sentiment"],
        "category":  result["category"],
        "elapsed":   elapsed,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
    }


def classify_batch_with_categories(
    texts: list[str],
    categories: list[str],
    max_workers: int = None,
    batch_size: int = 1,
    min_char_length: int = 0,
) -> list[dict]:
    """
    Classify texts — AI decides both sentiment and category from the shared categories list.

    min_char_length: texts with len(text) <= min_char_length are skipped entirely.
    categories is a shared pool — not required to match texts length.
    batch_size = 1  → one API call per text
    batch_size = N  → send N texts per API call; concurrent over chunks
    """
    if max_workers is None:
        max_workers = Config.MAX_WORKERS

    # Filter out short texts
    to_process, process_idxs, _ = _filter_by_length(texts, min_char_length)

    if not to_process:
        return []

    batch_size = max(1, batch_size)
    chunks     = _chunk(to_process, batch_size)
    results    = [None] * len(to_process)

    def _process_chunk(chunk: list[str], start_idx: int) -> tuple[int, list[dict]]:
        chunk_start = time.time()

        if len(chunk) == 1:
            raw = [_call_ollama_with_category(chunk[0], categories)]
        else:
            raw = _call_ollama_batch_with_category(chunk, categories)

        chunk_elapsed = time.time() - chunk_start
        chunk_results = []
        for text, item in zip(chunk, raw):
            chunk_results.append({
                "text":      text,
                "predicted": item["sentiment"],
                "category":  item["category"],
                "elapsed":   round(chunk_elapsed / len(chunk), 4),
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            })
        return start_idx, chunk_results

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {
            executor.submit(_process_chunk, chunk, i * batch_size): i
            for i, chunk in enumerate(chunks)
        }
        for future in as_completed(futures):
            try:
                start_idx, chunk_results = future.result()
                for offset, res in enumerate(chunk_results):
                    results[start_idx + offset] = res
            except Exception as e:
                chunk_idx = futures[future]
                start_idx = chunk_idx * batch_size
                chunk     = chunks[chunk_idx]
                for offset, text in enumerate(chunk):
                    results[start_idx + offset] = {
                        "text":      text,
                        "predicted": "Error",
                        "category":  "Error",
                        "elapsed":   0,
                        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                        "error":     str(e),
                    }

    return results
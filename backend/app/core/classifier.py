import requests
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from app.config import Config

SYSTEM_PROMPT = """You are a sentiment classifier for Filipino/Taglish text (a mix of Tagalog and English).

Classify the sentiment as exactly ONE of: Positive, Negative, Neutral

Rules:
- Positive = overall satisfaction, happiness, recommendation
- Negative = complaints, disappointment, frustration
- Neutral  = neither good nor bad, factual, or mixed feelings

Reply with ONLY the single label. No explanation. No punctuation."""

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

def score(expected: str, predicted: str) -> float:
    return SCORE_TABLE.get((expected, predicted), 0.0)

def _call_ollama(text: str) -> str:
    """Raw API call to Ollama Cloud, returns predicted label."""
    headers = {
        "Authorization": f"Bearer {Config.OLLAMA_API_KEY}",
        "Content-Type": "application/json"
    }
    try:
        resp = requests.post(
            Config.OLLAMA_API_URL,
            json={
                "model": Config.OLLAMA_MODEL,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": f"Text: {text}"}
                ],
                "stream": False,
                "options": {
                    "temperature": 0,
                    "num_predict": 10
                }
            },
            headers=headers,
            timeout=Config.REQUEST_TIMEOUT
        )
        data = resp.json()
        label = data["message"]["content"].strip()
        for valid in ("Positive", "Negative", "Neutral"):
            if valid.lower() in label.lower():
                return valid
        return "Neutral"
    except Exception:
        return "Error"

def classify_one(text: str) -> dict:
    """Classify a single text, return dict with predicted label and metadata."""
    start = time.time()
    predicted = _call_ollama(text)
    elapsed = time.time() - start
    return {
        "text": text,
        "predicted": predicted,
        "elapsed": elapsed,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }

def classify_batch(texts: list, max_workers: int = None) -> list:
    """Classify many texts concurrently. Returns list of results in original order."""
    if max_workers is None:
        max_workers = Config.MAX_WORKERS

    results = [None] * len(texts)
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_idx = {executor.submit(classify_one, text): idx for idx, text in enumerate(texts)}
        for future in as_completed(future_to_idx):
            idx = future_to_idx[future]
            try:
                results[idx] = future.result()
            except Exception as e:
                results[idx] = {
                    "text": texts[idx],
                    "predicted": "Error",
                    "elapsed": 0,
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                    "error": str(e)
                }
    return results

def run_accuracy_test(samples: list, max_workers: int = None) -> dict:
    """
    Run accuracy test on labeled samples.
    samples: list of (text, expected_label)
    Returns detailed results + overall score.
    """
    texts, expected = zip(*samples) if samples else ([], [])
    predictions = classify_batch(texts, max_workers)
    results = []
    total_score = 0.0
    for idx, (text, exp, pred_info) in enumerate(zip(texts, expected, predictions)):
        pred = pred_info["predicted"]
        s = score(exp, pred)
        total_score += s
        results.append({
            "index": idx + 1,
            "text": text,
            "expected": exp,
            "predicted": pred,
            "score": s,
            "elapsed": pred_info["elapsed"],
            "timestamp": pred_info["timestamp"]
        })
    overall_accuracy = (total_score / len(samples)) * 100 if samples else 0
    return {
        "total_samples": len(samples),
        "total_score": total_score,
        "overall_accuracy": round(overall_accuracy, 2),
        "results": results
    }

def _call_ollama_with_category(text: str, categories: list[str]) -> dict:
    category_list = ", ".join(categories)
    system_prompt = f"""You are a sentiment and category classifier for Filipino/Taglish text (a mix of Tagalog and English).

Given a text, classify:
1. Sentiment: exactly ONE of: Positive, Negative, Neutral
2. Category: exactly ONE of: {category_list}

Rules for Sentiment:
- Positive = overall satisfaction, happiness, recommendation
- Negative = complaints, disappointment, frustration
- Neutral  = neither good nor bad, factual, or mixed feelings

Rules for Category:
- Pick the category that best describes what the text is about.
- Choose strictly from the provided list only.

Reply with ONLY this format, nothing else:
Sentiment: <label>
Category: <label>"""

    headers = {
        "Authorization": f"Bearer {Config.OLLAMA_API_KEY}",
        "Content-Type": "application/json"
    }
    try:
        resp = requests.post(
            Config.OLLAMA_API_URL,
            json={
                "model": Config.OLLAMA_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Text: {text}"}
                ],
                "stream": False,
                "options": {
                    "temperature": 0,
                    "num_predict": 20
                }
            },
            headers=headers,
            timeout=Config.REQUEST_TIMEOUT
        )
        raw = resp.json()["message"]["content"].strip()

        sentiment = "Neutral"
        category = categories[0]

        for line in raw.splitlines():
            line = line.strip()
            if line.lower().startswith("sentiment:"):
                label = line.split(":", 1)[1].strip()
                for valid in ("Positive", "Negative", "Neutral"):
                    if valid.lower() in label.lower():
                        sentiment = valid
                        break
            elif line.lower().startswith("category:"):
                label = line.split(":", 1)[1].strip()
                for cat in categories:
                    if cat.lower() in label.lower():
                        category = cat
                        break

        return {"sentiment": sentiment, "category": category}

    except Exception:
        return {"sentiment": "Error", "category": "Error"}

def classify_one_with_category(text: str, categories: list[str]) -> dict:
    start = time.time()
    result = _call_ollama_with_category(text, categories)
    elapsed = time.time() - start
    return {
        "text": text,
        "predicted": result["sentiment"],
        "category": result["category"],
        "elapsed": elapsed,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }

def classify_batch_with_categories(texts: list, categories: list[str], max_workers: int = None) -> list:
    """Classify texts concurrently — AI decides both sentiment and category."""
    if max_workers is None:
        max_workers = Config.MAX_WORKERS

    results = [None] * len(texts)
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_idx = {
            executor.submit(classify_one_with_category, text, categories): idx
            for idx, text in enumerate(texts)
        }
        for future in as_completed(future_to_idx):
            idx = future_to_idx[future]
            try:
                results[idx] = future.result()
            except Exception as e:
                results[idx] = {
                    "text": texts[idx],
                    "predicted": "Error",
                    "category": "Error",
                    "elapsed": 0,
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                    "error": str(e)
                }
    return results
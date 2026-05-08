from flask import Blueprint, request
from app.core.classifier import classify_one, classify_batch, run_accuracy_test, classify_batch_with_categories
from app.models.samples import SAMPLES
from app.utils.responses import success, error
from app.utils.validators import validate_json, require_access
import json
import os
import random

sentiment_bp = Blueprint("sentiment", __name__, url_prefix="/api/sentiment")


def load_samples_from_json(size: int, max_total: int = 2000) -> list[tuple[str, str]]:
    """
    Load size samples randomly from resources/samples.json without duplicates.
    Returns list of (text, label). Caps size at min(size, max_total, total_available).
    """
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    json_path = os.path.join(base_dir, "resources", "samples.json")

    with open(json_path, "r", encoding="utf-8") as f:
        all_samples = json.load(f)

    pairs           = [(item["text"], item["label"]) for item in all_samples]
    total_available = len(pairs)
    sample_count    = min(size, max_total, total_available)
    return random.sample(pairs, sample_count)


def _parse_int(value, default: int, min_val: int, max_val: int, field: str):
    """Validate and clamp an optional integer field. Returns (value, error_response)."""
    if value is None:
        return default, None
    if not isinstance(value, int):
        return None, error(f"'{field}' must be an integer", 400)
    return max(min_val, min(max_val, value)), None


# ─────────────────────────────────────────────────────────────────────────────

@sentiment_bp.route("/classify", methods=["POST"])
@require_access
@validate_json("text")
def classify_single(data):
    """Classify a single text."""
    text = data["text"]
    if not isinstance(text, str) or not text.strip():
        return error("Text must be a non-empty string", 400)
    result = classify_one(text)
    return success(result, "Classification successful")


@sentiment_bp.route("/classify/batch", methods=["POST"])
@require_access
@validate_json("texts")
def classify_batch_endpoint(data):
    """
    Classify multiple texts.

    Body:
    {
        "texts":          ["text1", "text2", ...],
        "batch_size":     2,   // texts per API call (default 1, max 20)
        "max_workers":    2,   // concurrent chunk requests (default Config.MAX_WORKERS, max 4)
        "min_char_length": 10  // ignore texts with length <= this value (default 0 = no filter)
    }
    """
    texts = data["texts"]
    if not isinstance(texts, list) or len(texts) == 0:
        return error("'texts' must be a non-empty list of strings", 400)
    for t in texts:
        if not isinstance(t, str) or not t.strip():
            return error("Each text must be a non-empty string", 400)

    batch_size, err = _parse_int(data.get("batch_size"), 1, 1, 20, "batch_size")
    if err:
        return err

    max_workers, err = _parse_int(data.get("max_workers"), None, 1, 4, "max_workers")
    if err:
        return err

    min_char_length, err = _parse_int(data.get("min_char_length"), 0, 0, 9999, "min_char_length")
    if err:
        return err

    results = classify_batch(
        texts,
        max_workers=max_workers,
        batch_size=batch_size,
        min_char_length=min_char_length,
    )
    return success({"results": results}, f"Classified {len(results)} items")


@sentiment_bp.route("/accuracy", methods=["POST"])
@require_access
def accuracy_test():
    """
    Run accuracy test on randomly selected samples from resources/samples.json.

    Body (all optional):
    {
        "size":        500,  // number of samples (default 30, max 2000)
        "max_workers": 4,    // concurrency over chunks (default 1, max 4)
        "batch_size":  5     // texts per API call (default 1, max 20)
    }
    """
    data = request.get_json(silent=True) or {}

    size, err = _parse_int(data.get("size", 30), 30, 1, 2000, "size")
    if err:
        return err

    max_workers, err = _parse_int(data.get("max_workers", 1), 1, 1, 4, "max_workers")
    if err:
        return err

    batch_size, err = _parse_int(data.get("batch_size", 1), 1, 1, 20, "batch_size")
    if err:
        return err

    try:
        samples = load_samples_from_json(size, max_total=2000)
    except FileNotFoundError:
        return error("Samples file not found. Please ensure resources/samples.json exists.", 500)
    except Exception as e:
        return error(f"Failed to load samples: {str(e)}", 500)

    report = run_accuracy_test(samples, max_workers=max_workers, batch_size=batch_size)
    return success(report, f"Accuracy test completed on {len(samples)} samples")


@sentiment_bp.route("/classify_category/batch", methods=["POST"])
@require_access
@validate_json("texts", "categories")
def classify_category_batch(data):
    """
    Classify texts with sentiment + category.
    Categories is a shared list — any number of categories for any number of texts.

    Body:
    {
        "texts":           [...],
        "categories":      [...],  // shared list, not required to match texts length
        "batch_size":      2,      // texts per API call (default 1, max 20)
        "max_workers":     2,      // concurrent chunk requests (default Config.MAX_WORKERS, max 4)
        "min_char_length": 10      // ignore texts with length <= this value (default 0 = no filter)
    }
    """
    texts      = data["texts"]
    categories = data["categories"]

    if not isinstance(texts, list) or len(texts) == 0:
        return error("'texts' must be a non-empty list of strings", 400)
    if not isinstance(categories, list) or len(categories) == 0:
        return error("'categories' must be a non-empty list of strings", 400)

    for t in texts:
        if not isinstance(t, str) or not t.strip():
            return error("Each text must be a non-empty string", 400)
    for c in categories:
        if not isinstance(c, str) or not c.strip():
            return error("Each category must be a non-empty string", 400)

    batch_size, err = _parse_int(data.get("batch_size"), 1, 1, 20, "batch_size")
    if err:
        return err

    max_workers, err = _parse_int(data.get("max_workers"), None, 1, 4, "max_workers")
    if err:
        return err

    min_char_length, err = _parse_int(data.get("min_char_length"), 0, 0, 9999, "min_char_length")
    if err:
        return err

    results = classify_batch_with_categories(
        texts,
        categories,
        max_workers=max_workers,
        batch_size=batch_size,
        min_char_length=min_char_length,
    )
    return success({"results": results}, f"Classified {len(results)} items")


@sentiment_bp.route("/health", methods=["GET"])
@require_access
def health():
    return success({"status": "ok"}, "Service is running")
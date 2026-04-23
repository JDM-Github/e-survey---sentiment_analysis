from flask import Blueprint, request
from app.core.classifier import classify_one, classify_batch, run_accuracy_test, classify_batch_with_categories
from app.models.samples import SAMPLES
from app.utils.responses import success, error
from app.utils.validators import validate_json

sentiment_bp = Blueprint("sentiment", __name__, url_prefix="/api/sentiment")

@sentiment_bp.route("/classify", methods=["POST"])
@validate_json("text")
def classify_single(data):
    """Classify a single text."""
    text = data["text"]
    if not isinstance(text, str) or not text.strip():
        return error("Text must be a non-empty string", 400)
    result = classify_one(text)
    return success(result, "Classification successful")

@sentiment_bp.route("/classify/batch", methods=["POST"])
@validate_json("texts")
def classify_batch_endpoint(data):
    """Classify multiple texts. Expects {"texts": ["text1","text2",...]}."""
    texts = data["texts"]
    if not isinstance(texts, list) or len(texts) == 0:
        return error("'texts' must be a non‑empty list of strings", 400)
    for t in texts:
        if not isinstance(t, str) or not t.strip():
            return error("Each text must be a non-empty string", 400)
    results = classify_batch(texts)
    return success({"results": results}, f"Classified {len(results)} items")

@sentiment_bp.route("/accuracy", methods=["POST"])
def accuracy_test():
    """
    Run the predefined 30-sample accuracy test.
    Optional JSON body: {"max_workers": 4}
    """
    max_workers = request.get_json().get("max_workers") if request.is_json else None
    if max_workers is not None and (not isinstance(max_workers, int) or max_workers < 1):
        return error("max_workers must be a positive integer", 400)

    report = run_accuracy_test(SAMPLES, max_workers)
    return success(report, "Accuracy test completed")

@sentiment_bp.route("/classify_category/batch", methods=["POST"])
@validate_json("texts", "categories")
def classify_category_batch(data):
    """Classify texts with a category per text.
    Expects {"texts": [...], "categories": [...]} — must be the same length.
    """
    texts = data["texts"]
    categories = data["categories"]

    if not isinstance(texts, list) or len(texts) == 0:
        return error("'texts' must be a non-empty list of strings", 400)
    if not isinstance(categories, list) or len(categories) == 0:
        return error("'categories' must be a non-empty list of strings", 400)
    if len(texts) != len(categories):
        return error(f"'texts' and 'categories' must be the same length (got {len(texts)} vs {len(categories)})", 400)

    for t in texts:
        if not isinstance(t, str) or not t.strip():
            return error("Each text must be a non-empty string", 400)
    for c in categories:
        if not isinstance(c, str) or not c.strip():
            return error("Each category must be a non-empty string", 400)

    results = classify_batch_with_categories(texts, categories)
    return success({"results": results}, f"Classified {len(results)} items")

@sentiment_bp.route("/health", methods=["GET"])
def health():
    return success({"status": "ok"}, "Service is running")

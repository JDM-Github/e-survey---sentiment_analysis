from flask import Blueprint
from app.utils.responses import success

health_bp = Blueprint("health", __name__)

@health_bp.route("/health", methods=["GET"])
def health():
    return success({"status": "ok"}, "Service is running")
from flask import Blueprint, send_from_directory
import os

static_bp = Blueprint("static", __name__)

REACT_BUILD_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "build")

@static_bp.route("/", defaults={"path": ""})
@static_bp.route("/<path:path>")
def serve_react(path):
    """Serve React static files."""
    if not path:
        return send_from_directory(REACT_BUILD_PATH, "index.html")
    
    file_path = os.path.join(REACT_BUILD_PATH, path)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return send_from_directory(REACT_BUILD_PATH, path)
    else:
        return send_from_directory(REACT_BUILD_PATH, "index.html")
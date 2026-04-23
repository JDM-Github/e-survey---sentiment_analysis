import sys
import os
import waitress  # type: ignore

def resource_path(relative_path):
    """Resolve paths correctly whether running as script or PyInstaller bundle."""
    try:
        base_path = sys._MEIPASS
    except AttributeError:
        base_path = os.path.abspath(".")
    return os.path.join(base_path, relative_path)

os.environ.setdefault("FLASK_ENV", "production")
from app import create_app

static_folder = resource_path("static")
app = create_app(config_name="production", static_folder=static_folder)
port = int(os.environ.get("FLASK_PORT", 5000))

print("=" * 50)
print("Production server starting...")
print(f"Environment: {app.config.get('FLASK_ENV', 'production')}")
print(f"Serving on http://127.0.0.1:{port}")
print("Press Ctrl+C to stop")
print("=" * 50)

waitress.serve(app, host="0.0.0.0", port=port)
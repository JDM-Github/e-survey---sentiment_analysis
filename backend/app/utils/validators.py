import os
from functools import wraps
from flask import request
from .responses import error


def validate_json(*required_fields):
    """Decorator: ensure request has JSON and required fields."""
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            if not request.is_json:
                return error("Request must be application/json", 415)
            data = request.get_json()
            if data is None:
                return error("Invalid or empty JSON body", 400)
            missing = [field for field in required_fields if field not in data]
            if missing:
                return error(f"Missing fields: {', '.join(missing)}", 400)
            return f(data, *args, **kwargs)
        return wrapper
    return decorator


def require_access(f):
    """Decorator: validates X-Auth-Token header against API_ACCESS in .env."""
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("X-Auth-Token", "")
        if not auth_header.startswith("Bearer "):
            return error("Missing or invalid X-Auth-Token header", 401)

        token = auth_header.split(" ", 1)[1].strip()
        expected = os.getenv("API_ACCESS", "")

        if not expected:
            return error("Server is not configured with an API access token", 500)
        if token != expected:
            return error("Unauthorized", 401)

        return f(*args, **kwargs)
    return wrapper
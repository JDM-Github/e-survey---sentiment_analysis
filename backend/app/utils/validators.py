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
            missing = [field for field in required_fields if field not in data]
            if missing:
                return error(f"Missing fields: {', '.join(missing)}", 400)
            return f(data, *args, **kwargs)
        return wrapper
    return decorator
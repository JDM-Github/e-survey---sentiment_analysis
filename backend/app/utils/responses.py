from flask import jsonify

def success(data=None, message="OK", status=200):
    """Unified success response."""
    resp = {"success": True, "message": message}
    if data is not None:
        resp["data"] = data
    return jsonify(resp), status

def error(message, status=400, details=None):
    """Unified error response."""
    resp = {"success": False, "message": message}
    if details:
        resp["details"] = details
    return jsonify(resp), status
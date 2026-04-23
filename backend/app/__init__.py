from flask import Flask, send_from_directory
from flask_cors import CORS
from app.config import DevelopmentConfig, ProductionConfig
import os

def create_app(config_name=None, static_folder='static'):
    app = Flask(__name__, static_folder=static_folder, static_url_path='/static')
    CORS(app, origins="*")

    if config_name is None:
        config_name = os.getenv("FLASK_ENV", "development")
    if config_name == "production":
        app.config.from_object(ProductionConfig)
    else:
        app.config.from_object(DevelopmentConfig)

    from app.api.health import health_bp
    from app.api.sentiment import sentiment_bp
    app.register_blueprint(health_bp, url_prefix="/api")
    app.register_blueprint(sentiment_bp)

    # ---- React SPA Catch-All Route ----
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_react(path):
        if path and os.path.exists(os.path.join(app.static_folder, path)):
            return send_from_directory(app.static_folder, path)
        return send_from_directory(app.static_folder, 'index.html')
    # ------------------------------------

    from app.static_routes import static_bp
    app.register_blueprint(static_bp)
    return app
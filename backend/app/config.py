import os
import sys
from dotenv import load_dotenv

def _load_env():
    meipass = getattr(sys, '_MEIPASS', None)
    if meipass:
        load_dotenv(os.path.join(meipass, '.env'))
    load_dotenv(os.path.join(os.path.abspath('.'), '.env'), override=False)

_load_env()
class Config:
    OLLAMA_API_URL   = os.getenv("OLLAMA_API_URL", "http://localhost:11434/v1/chat/completions")
    OLLAMA_API_KEY   = os.getenv("OLLAMA_API_KEY", "")
    OLLAMA_MODEL     = os.getenv("OLLAMA_MODEL", "deepseek-v3.1:671b-cloud")
    MAX_WORKERS      = int(os.getenv("MAX_WORKERS", "2"))
    REQUEST_TIMEOUT  = int(os.getenv("REQUEST_TIMEOUT", "60"))

class DevelopmentConfig(Config):
    FLASK_ENV = "development"
    DEBUG     = True

class ProductionConfig(Config):
    FLASK_ENV = "production"
    DEBUG     = False

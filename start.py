import subprocess
import sys
import os

# Lance le bot et l'API en parallèle
bot = subprocess.Popen([sys.executable, "bot/bot.py"])
api = subprocess.Popen([
    sys.executable, "-m", "uvicorn",
    "backend.main:app",
    "--host", "0.0.0.0",
    "--port", os.getenv("PORT", "8000")
])

bot.wait()
api.wait()

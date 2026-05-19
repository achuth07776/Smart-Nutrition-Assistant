"""
Dev server launcher - starts both FastAPI backend and Vite frontend.
Usage: python run_dev.py
"""
import subprocess
import sys
import os
import signal

ROOT = os.path.dirname(os.path.abspath(__file__))

def main():
    # Start FastAPI backend
    backend = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "backend.main:app", "--reload", "--port", "8000"],
        cwd=ROOT,
    )

    # Start Vite frontend
    frontend = subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=os.path.join(ROOT, "frontend"),
        shell=True,
    )

    try:
        backend.wait()
    except KeyboardInterrupt:
        backend.terminate()
        frontend.terminate()
        print("\nShutting down...")

if __name__ == "__main__":
    main()

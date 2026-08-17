"""Uvicorn entrypoint shim.

This module lets the app run with:

    uvicorn app.main:app

when the current working directory is ``backend/``.
It adds the project root to ``sys.path`` and then re-exports the real
FastAPI application from ``backend.main``.
"""

from __future__ import annotations

import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.main import app  # noqa: E402


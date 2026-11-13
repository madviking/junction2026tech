"""FastAPI entry point. Register module routers here; all routes live under /api."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.health.router import router as health_router


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Junction 2026 API", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(health_router, prefix="/api")
    return app


app = create_app()

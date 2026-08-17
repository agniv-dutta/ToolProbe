from pathlib import Path

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from typing import AsyncGenerator
from urllib.parse import urlparse, unquote

from backend.config import settings


PROJECT_ROOT = Path(__file__).resolve().parent.parent


class Base(DeclarativeBase):
    pass


def _build_url() -> str:
    if settings.DATABASE_URL.startswith("sqlite"):
        parsed = urlparse(settings.DATABASE_URL)

        # SQLite URLs are often configured relative to the repository root.
        # When the app starts from backend/, resolve those paths against the
        # project root so the database file is found consistently.
        if parsed.path and not Path(unquote(parsed.path)).is_absolute():
            relative_path = Path(unquote(parsed.path.lstrip("/")))
            db_path = (PROJECT_ROOT / relative_path).resolve()
            db_path.parent.mkdir(parents=True, exist_ok=True)
            return f"sqlite+aiosqlite:///{db_path.as_posix()}"

        return settings.DATABASE_URL.replace("sqlite://", "sqlite+aiosqlite://")
    return settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")


engine = create_async_engine(
    _build_url(),
    echo=settings.DB_ECHO,
    future=True,
    pool_pre_ping=True,
    **({"connect_args": {"check_same_thread": False}} if "sqlite" in settings.DATABASE_URL else {}),
)

AsyncSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

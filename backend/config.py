from pathlib import Path

from pydantic_settings import BaseSettings
from pydantic import Field
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = Field(default="sqlite:///./research_data/research_db.sqlite", description="SQLAlchemy DB URL")
    DB_ECHO: bool = Field(default=False, description="SQL echo for debugging")
    GROQ_API_KEY: str = Field(default="", description="Groq API key")
    LOG_LEVEL: str = Field(default="INFO", description="Python logging level")
    CORS_ORIGINS: str = Field(default="http://localhost:5173,http://localhost:3000", description="Comma-separated CORS origins")
    RESEARCH_MODEL: str = Field(default="openai/gpt-oss-120b", description="Groq model for research agent")
    VERIFICATION_MODEL: str = Field(default="openai/gpt-oss-120b", description="Groq model for verification")
    LLM_MODEL: str = Field(default="openai/gpt-oss-120b", description="Groq model for LLM features")
    RESEARCH_BATCH_SIZE: int = Field(default=5, description="Apps per batch")
    RESEARCH_RATE_LIMIT_DELAY: float = Field(default=0.7, description="Seconds between batches")
    RESEARCH_MAX_WORKERS: int = Field(default=3, description="Parallel worker count")

    model_config = {
        "env_file": str(Path(__file__).resolve().parent / ".env"),
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
    }


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

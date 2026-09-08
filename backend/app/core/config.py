from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Centralized application settings, loaded from environment variables
    (and from backend/.env during local development).

    Pydantic validates these at startup — if DATABASE_URL is missing or
    malformed, the app fails immediately with a clear error instead of
    crashing later inside some unrelated function.
    """

    database_url: str          # pooled — used by the running app
    database_url_direct: str   # direct — used only by Alembic migrations
    gemini_api_key: str
    jwt_secret_key: str

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )


# Single shared instance — other files import this rather than
# re-reading environment variables themselves.
settings = Settings()
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./chronolens.db"
    SECRET_KEY: str = "change-me-to-a-random-64-char-hex-string"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days

    # App base URL — used to build invite links in emails
    APP_URL: str = "http://localhost:5173"

    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:4173"

    # ── Email / SMTP ───────────────────────────────────────────────────────────
    # Set SMTP_CONSOLE_MODE=true to skip SMTP and print invite links to the
    # server console instead (useful during development).
    SMTP_CONSOLE_MODE: bool = True
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_TLS: bool = True
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "ChronoLens <noreply@chronolens.app>"

    # ── Brute-force protection ─────────────────────────────────────────────────
    LOGIN_MAX_ATTEMPTS: int = 5
    LOGIN_LOCKOUT_SECONDS: int = 900     # 15 minutes

    # ── Invite TTL ────────────────────────────────────────────────────────────
    INVITE_EXPIRE_HOURS: int = 24

    model_config = {"env_file": ".env", "extra": "ignore"}

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]


settings = Settings()

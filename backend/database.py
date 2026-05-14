import os
import re

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Try loading from current dir, then from parent (root .env)
load_dotenv()
if not os.getenv("DATABASE_URL"):
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is not set.")


def _postgres_url_host(url: str) -> str:
    m = re.search(r"://(?:[^@/]*@)?([^/:?]+)", url)
    return m.group(1) if m else ""


def _reject_render_internal_db_url(url: str) -> None:
    """Render internal hostnames (e.g. dpg-xxx-a) do not resolve outside Render's network."""
    if not url.startswith("postgresql"):
        return
    host = _postgres_url_host(url)
    if host.startswith("dpg-") and "." not in host:
        raise RuntimeError(
            "DATABASE_URL points at Render's internal Postgres hostname "
            f"({host!r}), which does not resolve on your machine or on Vercel. "
            "In the Render dashboard, open your Postgres → Connect → copy the "
            "**External** Database URL (host ends with .render.com, often "
            "region-postgres.render.com) and set DATABASE_URL to that in "
            "backend/.env, frontend/.env.local, and Vercel env vars. "
            "Use the internal URL only for services running on Render in the same region."
        )


_reject_render_internal_db_url(DATABASE_URL)

# ── Database Connection Configuration ──────────────────────────────────────────
# Different drivers expect different arguments. 
# 'sslmode' is specific to PostgreSQL (psycopg2). 
# Adding it to SQLite or other drivers will cause a TypeError.
connect_args = {}

if DATABASE_URL.startswith("postgresql"):
    # Render (and most managed Postgres providers) require SSL.
    # Default to "require" but allow override via DB_SSL_MODE.
    _ssl_mode = os.getenv("DB_SSL_MODE", "require")
    connect_args["sslmode"] = _ssl_mode

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Modern SQLAlchemy 2.0 style Base
Base = declarative_base()


def get_db():
    """FastAPI dependency — yields a DB session and closes it on exit."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

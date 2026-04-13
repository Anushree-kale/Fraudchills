import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

# Try loading from current dir, then from parent (root .env)
load_dotenv()
if not os.getenv("DATABASE_URL"):
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is not set.")

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

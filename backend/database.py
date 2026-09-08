import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from database_url import resolve_database_url

# Try loading from current dir, then from parent (root .env)
load_dotenv()
if not os.getenv("DATABASE_URL") and not os.getenv("SUPABASE_DB_PASSWORD"):
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

DATABASE_URL = resolve_database_url()

connect_args: dict = {}

if DATABASE_URL.startswith("postgresql"):
    # Supabase and other managed Postgres require SSL.
    _ssl_mode = os.getenv("DB_SSL_MODE", "require")
    connect_args["sslmode"] = _ssl_mode

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency — yields a DB session and closes it on exit."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

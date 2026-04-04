"""Apply schema_migration.sql to align DB with models.py."""
from pathlib import Path

from database import engine


def run_migration() -> None:
    path = Path(__file__).resolve().parent / "schema_migration.sql"
    sql = path.read_text(encoding="utf-8")
    raw = engine.raw_connection()
    try:
        raw.autocommit = False
        cur = raw.cursor()
        cur.execute(sql)
        raw.commit()
        print("Migration completed successfully:", path.name)
    except Exception:
        raw.rollback()
        raise
    finally:
        raw.close()


if __name__ == "__main__":
    run_migration()

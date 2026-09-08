"""Resolve PostgreSQL connection URL — Supabase-first, optional explicit DATABASE_URL."""

from __future__ import annotations

import os
import re
from urllib.parse import quote_plus


def supabase_project_ref() -> str | None:
    ref = (os.getenv("SUPABASE_PROJECT_REF") or "").strip()
    if ref:
        return ref
    base = (os.getenv("SUPABASE_URL") or "").strip().rstrip("/")
    if not base:
        return None
    m = re.match(r"https?://([a-z0-9]+)\.supabase\.co", base, re.I)
    return m.group(1) if m else None


def resolve_database_url() -> str:
    """
    Prefer DATABASE_URL when set. Otherwise build a Supabase Postgres URI from
    SUPABASE_URL + SUPABASE_DB_PASSWORD (Settings → Database in Supabase dashboard).
    """
    direct = (os.getenv("DATABASE_URL") or "").strip()
    if direct:
        return direct

    password = (os.getenv("SUPABASE_DB_PASSWORD") or os.getenv("POSTGRES_PASSWORD") or "").strip()
    ref = supabase_project_ref()
    if not password or not ref:
        raise RuntimeError(
            "DATABASE_URL is not set. Add your Supabase Postgres URI to backend/.env "
            "(Supabase → Project Settings → Database → Connection string → URI), "
            "or set SUPABASE_URL and SUPABASE_DB_PASSWORD."
        )

    pooler_host = (os.getenv("SUPABASE_DB_HOST") or "").strip()
    if pooler_host:
        port = (os.getenv("SUPABASE_DB_PORT") or "6543").strip()
        user = f"postgres.{ref}" if "pooler" in pooler_host else "postgres"
    return (
            f"postgresql://{user}:{quote_plus(password)}@{pooler_host}:{port}/postgres"
        )

    return (
        f"postgresql://postgres:{quote_plus(password)}@db.{ref}.supabase.co:5432/postgres"
    )

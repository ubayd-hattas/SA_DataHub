"""PostgreSQL connection for ETL (psycopg)."""

from __future__ import annotations

from contextlib import contextmanager
from typing import Generator

import psycopg

from etl.lib.env import get_database_url


@contextmanager
def get_connection() -> Generator[psycopg.Connection, None, None]:
    conn = psycopg.connect(get_database_url(), autocommit=False)
    try:
        yield conn
    finally:
        conn.close()

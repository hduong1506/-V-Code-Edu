import os
from pathlib import Path
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

BASE_DIR = Path(__file__).resolve().parents[2]
DEFAULT_SQLITE_URL = f"sqlite:///{(BASE_DIR / 'vcode_edu.db').as_posix()}"

# Hỗ trợ đồng thời MySQL (mysql+pymysql://...), PostgreSQL (postgresql://...) và SQLite
DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_SQLITE_URL).strip()
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
elif DATABASE_URL.startswith("mysql://"):
    DATABASE_URL = DATABASE_URL.replace("mysql://", "mysql+pymysql://", 1)

is_sqlite = DATABASE_URL.startswith("sqlite")
if is_sqlite:
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False}, echo=False, future=True)
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()
else:
    # Connection Pooling tối ưu cho MySQL / PostgreSQL khi có lượng truy cập lớn
    engine = create_engine(
        DATABASE_URL,
        pool_size=20,
        max_overflow=40,
        pool_pre_ping=True,
        pool_recycle=1800,
        echo=False,
        future=True
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

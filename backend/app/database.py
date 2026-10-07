import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.engine import URL
from sqlalchemy.orm import declarative_base, sessionmaker
from pymongo import MongoClient

# Ensure .env is discovered whether running from workspace root or backend
env_paths = [
    os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
    ".env",
    "backend/.env",
]
for p in env_paths:
    if os.path.exists(p):
        load_dotenv(p, override=True)
load_dotenv()

# ==============================================================================
# PostgreSQL Database Configuration (SQLAlchemy)
# ==============================================================================
POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "postgres")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
POSTGRES_DB = os.getenv("POSTGRES_DB", "itbis")

DATABASE_URL = URL.create(
    drivername="postgresql+psycopg2",
    username=POSTGRES_USER,
    password=POSTGRES_PASSWORD,
    host=POSTGRES_HOST,
    port=int(POSTGRES_PORT),
    database=POSTGRES_DB,
)

# SQLAlchemy engine & session factory
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

from sqlalchemy import text

# Declarative Base for models
Base = declarative_base()


def init_db():
    """Initializes tables and ensures all columns exist in PostgreSQL."""
    try:
        Base.metadata.create_all(bind=engine)
        with engine.begin() as conn:
            # Safe schema migrations for incidents
            conn.execute(text("ALTER TABLE incidents ADD COLUMN IF NOT EXISTS summary TEXT;"))
            conn.execute(text("ALTER TABLE incidents ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);"))
            conn.execute(text("ALTER TABLE incidents ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP;"))
            conn.execute(text("ALTER TABLE incidents ADD COLUMN IF NOT EXISTS resolution_summary TEXT;"))

            # Safe schema migrations for alerts
            conn.execute(text("ALTER TABLE alerts ADD COLUMN IF NOT EXISTS incident_id INTEGER REFERENCES incidents(id);"))
            conn.execute(text("ALTER TABLE alerts ADD COLUMN IF NOT EXISTS escalated VARCHAR(10) DEFAULT 'false';"))
            conn.execute(text("ALTER TABLE alerts ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP;"))
    except Exception as e:
        print(f"[init_db] Warning: Database schema update encountered: {e}")


def get_db():
    """FastAPI dependency yielding a PostgreSQL database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ==============================================================================
# MongoDB Configuration (PyMongo)
# ==============================================================================
MONGODB_HOST = os.getenv("MONGODB_HOST", "localhost")
MONGODB_PORT = os.getenv("MONGODB_PORT", "27017")
MONGODB_DB_NAME = os.getenv("MONGODB_DB", "itbis")
MONGODB_URL = os.getenv(
    "MONGODB_URL",
    f"mongodb://{MONGODB_HOST}:{MONGODB_PORT}/"
)

# PyMongo client & database instance
mongo_client = MongoClient(MONGODB_URL, serverSelectionTimeoutMS=2000)
mongo_db = mongo_client[MONGODB_DB_NAME]


def get_mongo_db():
    """FastAPI dependency / helper returning the MongoDB database instance."""
    return mongo_db

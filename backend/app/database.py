import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.engine import URL
from sqlalchemy.orm import declarative_base, sessionmaker
from pymongo import MongoClient

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

# Declarative Base for models
Base = declarative_base()


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

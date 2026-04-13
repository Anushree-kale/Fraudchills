import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base, get_db
from main import app

# Use an isolated SQLite database for tests to prevent data corruption in the dev DB.
SQLALCHEMY_DATABASE_URL = "sqlite:///./_tmp_test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Create all tables before tests and drop them after."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def db_session():
    """Provide a fresh session for each test, rolling back changes afterward."""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture(scope="function")
def client(db_session):
    """Provide a test client with a database dependency override."""
    def _get_db_override():
        try:
            yield db_session
        finally:
            pass
            
    app.dependency_overrides[get_db] = _get_db_override
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

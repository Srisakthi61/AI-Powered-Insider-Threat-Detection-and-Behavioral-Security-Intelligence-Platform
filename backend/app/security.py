import os
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, ExpiredSignatureError, jwt
from passlib.context import CryptContext
from fastapi import Request, HTTPException, status, Depends

load_dotenv()

# Password hashing context using bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT configuration
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = int(os.getenv("ACCESS_TOKEN_EXPIRE_HOURS", "8"))


def get_jwt_secret_key() -> str:
    """
    Retrieve the JWT secret key strictly from the environment variable.
    Raises RuntimeError if JWT_SECRET_KEY is not configured.
    """
    secret_key = os.getenv("JWT_SECRET_KEY")
    if not secret_key:
        raise RuntimeError(
            "JWT_SECRET_KEY environment variable is not configured. "
            "Please set JWT_SECRET_KEY in your environment before generating or verifying tokens."
        )
    return secret_key


def hash_password(password: str) -> str:
    """
    Hash a plain-text password using Passlib bcrypt.
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain-text password against a bcrypt hash.
    """
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a signed JWT access token containing sub (user ID), role, and exp claims.
    """
    secret_key = get_jwt_secret_key()
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, secret_key, algorithm=ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> dict:
    """
    Decode and validate a JWT access token.
    Rejects invalid signatures, expired tokens, or missing claims.
    """
    secret_key = get_jwt_secret_key()
    try:
        payload = jwt.decode(token, secret_key, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        role = payload.get("role")
        if user_id is None or role is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return payload
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except (JWTError, Exception):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(request: Request) -> dict:
    """
    FastAPI dependency that extracts and validates the JWT from the Authorization header.
    Expected format: Authorization: Bearer <token>
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    parts = auth_header.split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer" or not parts[1].strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = parts[1].strip()
    return decode_token(token)


def require_role(*allowed_roles: str):
    """
    FastAPI dependency factory to enforce Role-Based Access Control (RBAC).
    Checks whether the authenticated user's role is in the allowed roles list.
    """
    def role_checker(current_user: dict = Depends(get_current_user)) -> dict:
        user_role = current_user.get("role")
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: role '{user_role}' is not authorized to access this resource"
            )
        return current_user

    return role_checker

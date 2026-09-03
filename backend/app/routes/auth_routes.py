from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.security import hash_password, verify_password, create_access_token

router = APIRouter()


class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    role: Literal["security_analyst", "soc_engineer", "security_manager", "admin"]


class SignupResponse(BaseModel):
    message: str
    user_id: int
    role: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    role: str


@router.post("/signup", response_model=SignupResponse, status_code=status.HTTP_201_CREATED)
def signup(request: SignupRequest, db: Session = Depends(get_db)):
    """
    Register a new platform user with a hashed password and assigned role.
    """
    # 1. Check whether the email already exists
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # 2. Hash the plain password using bcrypt
    hashed_pwd = hash_password(request.password)

    # 3. Create User record and persist to database
    new_user = User(
        email=request.email,
        password_hash=hashed_pwd,
        role=request.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # 4. Return created user info (password hash is omitted)
    return SignupResponse(
        message="User created",
        user_id=new_user.id,
        role=new_user.role
    )


@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate a user by email and password, returning a signed JWT access token.
    """
    # 1. Find user by email
    user = db.query(User).filter(User.email == request.email).first()

    # 2. Verify submitted password against password_hash
    if not user or not verify_password(request.password, user.password_hash):
        # Do NOT reveal whether email exists
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # 3. Create JWT with sub=user ID, role=user role, exp=expiration
    token_payload = {
        "sub": str(user.id),
        "role": user.role
    }
    access_token = create_access_token(data=token_payload)

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        role=user.role
    )

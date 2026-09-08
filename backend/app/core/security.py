from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer

from app.db.database import get_db
from app.models.user import User

from app.core.config import settings

password_hash = PasswordHash.recommended()

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours, since there is no refresh token in this project's scope

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def hash_password(plain_password: str) -> str:
    """Hashes a plain-text password for storage. Never store plain_password anywhere."""
    return password_hash.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Checks a login attempt's password against the stored hash."""
    return password_hash.verify(plain_password, hashed_password)


def create_access_token(user_id: int) -> str:
    """
    Creates a signed JWT containing the user's id and an expiration
    time. The signature (using JWT_SECRET_KEY) is what makes this
    unforgeable, not the content itself, which is plainly readable by
    anyone who has the token.
    """
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> int | None:
    """
    Verifies a token's signature and expiration, returning the user id
    it was issued for. Returns None for any invalid, tampered, or
    expired token, rather than raising, so callers can uniformly treat
    "no valid user" as a single case.
    """
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[JWT_ALGORITHM])
        return int(payload["sub"])
    except jwt.PyJWTError:
        return None

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Extracts and verifies the request's token, then looks up and
    returns the User it belongs to. Raises 401 if the token is
    missing, invalid, expired, or refers to a user that no longer
    exists.
    """
    user_id = decode_access_token(token)

    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    user = db.query(User).filter(User.id == user_id).first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists",
        )

    return user
from pydantic import BaseModel, EmailStr, ConfigDict


class UserSignup(BaseModel):
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    receive_digest: bool

    model_config = ConfigDict(from_attributes=True)


class DigestPreferenceUpdate(BaseModel):
    """Body for toggling weekly email digests on or off."""

    receive_digest: bool
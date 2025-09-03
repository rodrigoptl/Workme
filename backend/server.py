from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import bcrypt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
SECRET_KEY = "workme-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# User Models
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: str
    user_type: str  # "client" or "professional"

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class ProfessionalProfile(BaseModel):
    user_id: str
    bio: Optional[str] = None
    services: List[str] = []
    price_range: Optional[str] = None
    availability: Optional[str] = None
    location: Optional[str] = None
    verification_status: str = "pending"  # "pending", "verified", "rejected"
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ClientProfile(BaseModel):
    user_id: str
    location: Optional[str] = None
    preferences: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Service Categories
SERVICE_CATEGORIES = [
    "Casa & Construção",
    "Limpeza & Diarista", 
    "Beleza & Bem-estar",
    "Tecnologia & Suporte",
    "Cuidados com Pets",
    "Eventos & Serviços"
]

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"email": email})
    if user is None:
        raise credentials_exception
    return User(**user)

# Auth Routes
@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    hashed_password = get_password_hash(user_data.password)
    user_dict = user_data.dict()
    del user_dict["password"]
    
    user_obj = User(**user_dict)
    user_dict_with_password = user_obj.dict()
    user_dict_with_password["hashed_password"] = hashed_password
    
    await db.users.insert_one(user_dict_with_password)
    
    # Create profile based on user type
    if user_data.user_type == "professional":
        profile = ProfessionalProfile(user_id=user_obj.id)
        await db.professional_profiles.insert_one(profile.dict())
    else:
        profile = ClientProfile(user_id=user_obj.id)
        await db.client_profiles.insert_one(profile.dict())
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_data.email}, expires_delta=access_token_expires
    )
    
    return Token(access_token=access_token, token_type="bearer", user=user_obj)

@api_router.post("/auth/login", response_model=Token)
async def login(user_credentials: UserLogin):
    user = await db.users.find_one({"email": user_credentials.email})
    if not user or not verify_password(user_credentials.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_credentials.email}, expires_delta=access_token_expires
    )
    
    user_obj = User(**user)
    return Token(access_token=access_token, token_type="bearer", user=user_obj)

@api_router.get("/auth/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

# Profile Routes
@api_router.get("/profile/professional/{user_id}")
async def get_professional_profile(user_id: str):
    profile = await db.professional_profiles.find_one({"user_id": user_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Professional profile not found")
    return profile

@api_router.get("/profile/client/{user_id}")
async def get_client_profile(user_id: str):
    profile = await db.client_profiles.find_one({"user_id": user_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Client profile not found")
    return profile

@api_router.get("/categories")
async def get_service_categories():
    return {"categories": SERVICE_CATEGORIES}

# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "WorkMe API is running", "status": "healthy"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
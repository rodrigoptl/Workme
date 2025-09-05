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
import stripe
import base64
from decimal import Decimal
import json
from emergentintegrations.llm.chat import LlmChat, UserMessage

# Import Sentry configuration
from sentry_config import init_sentry
from health_check import router as health_router

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Initialize Sentry for error tracking
init_sentry()

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Beta Environment Configuration
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
BETA_ACCESS_CODE = os.getenv("BETA_ACCESS_CODE", "WORKME2025BETA")
MAX_BETA_USERS = int(os.getenv("MAX_BETA_USERS", "50"))
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@workme.com.br")

# Stripe configuration (Test keys for development)
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "sk_test_51234567890abcdef...")
STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY", "pk_test_51234567890abcdef...")

# Create the main app without a prefix
app = FastAPI(
    title="WorkMe API - Beta Environment" if ENVIRONMENT == "beta" else "WorkMe API",
    description="Conectando clientes e profissionais - Ambiente Beta" if ENVIRONMENT == "beta" else "Conectando clientes e profissionais",
    version="1.0.0-beta" if ENVIRONMENT == "beta" else "1.0.0"
)

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
    beta_access_code: Optional[str] = None  # Required for beta environment

class User(UserBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    is_beta_user: bool = False
    beta_joined_at: Optional[datetime] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

# Beta Test Models
class BetaInvite(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invite_code: str
    email: Optional[str] = None
    max_uses: int = 1
    used_count: int = 0
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None
    is_active: bool = True

class BetaFeedback(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    screen_name: str
    feedback_type: str  # "bug", "suggestion", "complaint", "praise"
    rating: Optional[int] = None  # 1-5 scale
    message: str
    screenshot_data: Optional[str] = None  # base64 encoded
    device_info: dict = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserAnalytics(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    session_id: str
    event_type: str  # "screen_view", "button_click", "form_submit", "error", "app_open", "app_close"
    screen_name: Optional[str] = None
    action_name: Optional[str] = None
    properties: dict = {}
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class BetaStats(BaseModel):
    total_beta_users: int
    active_sessions_today: int
    total_feedback_count: int
    average_session_time: float
    top_screens: List[dict]
    conversion_funnel: dict
    error_rate: float

# Feedback Models
class FeedbackSubmission(BaseModel):
    screen_name: str
    feedback_type: str
    rating: Optional[int] = None
    message: str
    screenshot_data: Optional[str] = None
    device_info: dict = {}

# Analytics Models
class AnalyticsEvent(BaseModel):
    session_id: str
    event_type: str
    screen_name: Optional[str] = None
    action_name: Optional[str] = None
    properties: dict = {}

# Document Models
class DocumentUpload(BaseModel):
    document_type: str  # "rg_front", "rg_back", "cpf", "address_proof", "certificate", "selfie"
    file_data: str  # base64 encoded
    file_name: str
    description: Optional[str] = None

class Document(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    document_type: str
    file_data: str  # base64 encoded
    file_name: str
    description: Optional[str] = None
    status: str = "pending"  # "pending", "approved", "rejected"
    admin_notes: Optional[str] = None
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[str] = None

# Portfolio Models
class PortfolioItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    description: str
    image_data: str  # base64 encoded
    category: str
    work_date: Optional[datetime] = None
    client_feedback: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PortfolioUpload(BaseModel):
    title: str
    description: str
    image_data: str  # base64 encoded
    category: str
    work_date: Optional[str] = None
    client_feedback: Optional[str] = None

# Enhanced Professional Profile
class ProfessionalProfileUpdate(BaseModel):
    bio: Optional[str] = None
    services: List[str] = []
    specialties: List[str] = []
    experience_years: Optional[int] = None
    hourly_rate: Optional[float] = None
    service_radius_km: Optional[int] = None
    availability_hours: Optional[dict] = None  # {"monday": "9-17", "tuesday": "9-17"}
    location: Optional[str] = None
    certifications: List[str] = []
    languages: List[str] = ["Português"]

class ProfessionalProfile(BaseModel):
    user_id: str
    bio: Optional[str] = None
    services: List[str] = []
    specialties: List[str] = []
    experience_years: Optional[int] = None
    hourly_rate: Optional[float] = None
    service_radius_km: Optional[int] = None
    availability_hours: Optional[dict] = None
    location: Optional[str] = None
    certifications: List[str] = []
    languages: List[str] = ["Português"]
    verification_status: str = "pending"  # "pending", "verified", "rejected"
    profile_completion: float = 0.0
    rating: float = 0.0
    reviews_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ClientProfile(BaseModel):
    user_id: str
    location: Optional[str] = None
    preferences: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Verification Models
class VerificationRequest(BaseModel):
    user_id: str
    status: str = "submitted"  # "submitted", "under_review", "approved", "rejected"
    submitted_at: datetime = Field(default_factory=datetime.utcnow)
    reviewed_at: Optional[datetime] = None
    admin_notes: Optional[str] = None

class AdminDocumentReview(BaseModel):
    document_id: str
    status: str  # "approved", "rejected"
    admin_notes: Optional[str] = None

# Payment Models
class Wallet(BaseModel):
    user_id: str
    balance: float = 0.0
    cashback_balance: float = 0.0
    currency: str = "BRL"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Transaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    amount: float
    type: str  # "deposit", "withdrawal", "payment", "cashback", "escrow_hold", "escrow_release"
    status: str  # "pending", "completed", "failed", "cancelled"
    payment_method: str  # "pix", "credit_card", "wallet_balance"
    stripe_payment_intent_id: Optional[str] = None
    description: str
    metadata: Optional[dict] = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class PaymentIntent(BaseModel):
    amount: float
    currency: str = "brl"
    payment_method_types: List[str] = ["pix", "card"]
    description: str
    metadata: Optional[dict] = {}

class DepositRequest(BaseModel):
    amount: float
    payment_method: str  # "pix" or "credit_card"

class WithdrawRequest(BaseModel):
    amount: float
    pix_key: str

# Service Booking Models
class ServiceBooking(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    professional_id: str
    service_category: str
    description: str
    amount: float
    status: str  # "pending", "accepted", "in_progress", "completed", "cancelled"
    payment_status: str  # "pending", "escrowed", "released", "refunded"
    escrow_transaction_id: Optional[str] = None
    scheduled_date: datetime
    completed_date: Optional[datetime] = None
    client_rating: Optional[int] = None
    client_review: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class BookingStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None

class BookingReview(BaseModel):
    rating: int  # 1-5
    review: str

# AI Matching Models
class AIMatchingRequest(BaseModel):
    client_request: str  # Natural language description of what client needs
    location: Optional[str] = None
    budget_range: Optional[str] = None
    urgency: Optional[str] = "normal"  # "urgent", "normal", "flexible"
    preferred_time: Optional[str] = None

class MatchingScore(BaseModel):
    professional_id: str
    score: float
    reasoning: str
    match_factors: dict

class AIMatchingResponse(BaseModel):
    matches: List[MatchingScore]
    search_interpretation: str
    suggestions: List[str]

# Smart Search Models
class SmartSearchRequest(BaseModel):
    query: str
    location: Optional[str] = None
    limit: int = 10

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

async def get_or_create_wallet(user_id: str):
    """Get user wallet or create if doesn't exist"""
    wallet = await db.wallets.find_one({"user_id": user_id})
    if not wallet:
        wallet = Wallet(user_id=user_id)
        await db.wallets.insert_one(wallet.dict())
        return wallet
    return Wallet(**wallet)

def calculate_profile_completion(profile: dict, documents: list, portfolio_items: list) -> float:
    """Calculate profile completion percentage"""
    score = 0.0
    total_points = 10.0
    
    # Basic info (3 points)
    if profile.get("bio"): score += 0.5
    if profile.get("services"): score += 0.5
    if profile.get("specialties"): score += 0.5
    if profile.get("experience_years"): score += 0.5
    if profile.get("hourly_rate"): score += 0.5
    if profile.get("location"): score += 0.5
    
    # Documents (4 points)
    required_docs = ["rg_front", "rg_back", "cpf", "address_proof", "selfie"]
    approved_docs = [doc for doc in documents if doc.get("status") == "approved"]
    doc_types = [doc.get("document_type") for doc in approved_docs]
    
    for doc_type in required_docs:
        if doc_type in doc_types:
            score += 0.8
    
    # Portfolio (3 points)
    portfolio_score = min(len(portfolio_items) * 0.5, 3.0)
    score += portfolio_score
    
    return min(score / total_points * 100, 100.0)

async def log_user_analytics(user_id: str, session_id: str, event_type: str, 
                           screen_name: str = None, action_name: str = None, properties: dict = {}):
    """Log user analytics event"""
    analytics_event = UserAnalytics(
        user_id=user_id,
        session_id=session_id,
        event_type=event_type,
        screen_name=screen_name,
        action_name=action_name,
        properties=properties
    )
    
    await db.user_analytics.insert_one(analytics_event.dict())

# Beta Environment Routes
@api_router.get("/beta/environment")
async def get_beta_environment():
    """Get beta environment information"""
    beta_users_count = await db.users.count_documents({"is_beta_user": True})
    
    return {
        "environment": ENVIRONMENT,
        "is_beta": ENVIRONMENT == "beta",
        "beta_users_count": beta_users_count,
        "max_beta_users": MAX_BETA_USERS,
        "beta_spots_remaining": max(0, MAX_BETA_USERS - beta_users_count),
        "version": "1.0.0-beta"
    }

@api_router.post("/beta/validate-access")
async def validate_beta_access(access_code: str):
    """Validate beta access code"""
    if ENVIRONMENT != "beta":
        return {"valid": True, "message": "Beta validation not required in this environment"}
    
    if access_code == BETA_ACCESS_CODE:
        beta_users_count = await db.users.count_documents({"is_beta_user": True})
        if beta_users_count < MAX_BETA_USERS:
            return {"valid": True, "message": "Código de acesso válido"}
        else:
            return {"valid": False, "message": "Limite de usuários beta atingido"}
    else:
        return {"valid": False, "message": "Código de acesso inválido"}

# Beta Analytics Routes
@api_router.post("/beta/analytics/track")
async def track_analytics_event(
    event: AnalyticsEvent,
    current_user: User = Depends(get_current_user)
):
    """Track user analytics event"""
    await log_user_analytics(
        user_id=current_user.id,
        session_id=event.session_id,
        event_type=event.event_type,
        screen_name=event.screen_name,
        action_name=event.action_name,
        properties=event.properties
    )
    
    return {"status": "success", "message": "Event tracked"}

@api_router.post("/beta/feedback/submit")
async def submit_feedback(
    feedback: FeedbackSubmission,
    current_user: User = Depends(get_current_user)
):
    """Submit user feedback"""
    beta_feedback = BetaFeedback(
        user_id=current_user.id,
        screen_name=feedback.screen_name,
        feedback_type=feedback.feedback_type,
        rating=feedback.rating,
        message=feedback.message,
        screenshot_data=feedback.screenshot_data,
        device_info=feedback.device_info
    )
    
    await db.beta_feedback.insert_one(beta_feedback.dict())
    
    return {"status": "success", "message": "Feedback enviado com sucesso"}

# Beta Admin Routes
@api_router.get("/beta/admin/stats")
async def get_beta_stats(current_user: User = Depends(get_current_user)):
    """Get comprehensive beta testing statistics"""
    # TODO: Add admin role check
    
    try:
        # Basic counts
        total_beta_users = await db.users.count_documents({"is_beta_user": True})
        total_feedback = await db.beta_feedback.count_documents({})
        
        # Recent activity (last 24 hours)
        yesterday = datetime.utcnow() - timedelta(days=1)
        active_sessions_today = await db.user_analytics.count_documents({
            "timestamp": {"$gte": yesterday},
            "event_type": "app_open"
        })
        
        # Top screens by visits
        screen_visits_pipeline = [
            {"$match": {"event_type": "screen_view"}},
            {"$group": {"_id": "$screen_name", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        top_screens_cursor = db.user_analytics.aggregate(screen_visits_pipeline)
        top_screens = await top_screens_cursor.to_list(10)
        
        # Feedback breakdown
        feedback_pipeline = [
            {"$group": {"_id": "$feedback_type", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        feedback_breakdown_cursor = db.beta_feedback.aggregate(feedback_pipeline)
        feedback_breakdown = await feedback_breakdown_cursor.to_list(10)
        
        # Error rate (approximate)
        total_events = await db.user_analytics.count_documents({})
        error_events = await db.user_analytics.count_documents({"event_type": "error"})
        error_rate = (error_events / max(total_events, 1)) * 100
        
        # Conversion funnel (simplified)
        registered_users = await db.users.count_documents({"is_beta_user": True})
        completed_profiles = await db.professional_profiles.count_documents({"verification_status": "verified"})
        completed_bookings = await db.bookings.count_documents({"status": "completed"})
        
        conversion_funnel = {
            "registered": registered_users,
            "verified_professionals": completed_profiles,
            "completed_bookings": completed_bookings,
            "registration_to_verification": (completed_profiles / max(registered_users, 1)) * 100,
            "verification_to_booking": (completed_bookings / max(completed_profiles, 1)) * 100
        }
        
        return {
            "total_beta_users": total_beta_users,
            "active_sessions_today": active_sessions_today,
            "total_feedback_count": total_feedback,
            "average_session_time": 5.5,  # Mock for now
            "top_screens": top_screens,
            "feedback_breakdown": feedback_breakdown,
            "conversion_funnel": conversion_funnel,
            "error_rate": round(error_rate, 2)
        }
        
    except Exception as e:
        logger.error(f"Beta stats error: {str(e)}")
        return {"error": "Unable to fetch beta stats", "details": str(e)}

@api_router.get("/beta/admin/feedback")
async def get_beta_feedback(
    limit: int = 50,
    feedback_type: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get beta feedback with filtering"""
    # TODO: Add admin role check
    
    query = {}
    if feedback_type:
        query["feedback_type"] = feedback_type
    
    feedback_list = await db.beta_feedback.find(query).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Enrich with user data
    enriched_feedback = []
    for feedback in feedback_list:
        if "_id" in feedback:
            feedback["_id"] = str(feedback["_id"])
        
        # Get user info
        user = await db.users.find_one({"id": feedback["user_id"]})
        if user:
            feedback["user_name"] = user.get("full_name")
            feedback["user_email"] = user.get("email")
            feedback["user_type"] = user.get("user_type")
        
        enriched_feedback.append(feedback)
    
    return {"feedback": enriched_feedback}

@api_router.get("/beta/admin/users")
async def get_beta_users(current_user: User = Depends(get_current_user)):
    """Get list of beta users with activity data"""
    # TODO: Add admin role check
    
    beta_users = await db.users.find({"is_beta_user": True}).sort("beta_joined_at", -1).to_list(100)
    
    # Enrich with activity data
    enriched_users = []
    for user in beta_users:
        if "_id" in user:
            user["_id"] = str(user["_id"])
        
        # Get last activity
        last_activity = await db.user_analytics.find_one(
            {"user_id": user["id"]},
            sort=[("timestamp", -1)]
        )
        
        # Get session count
        session_count = await db.user_analytics.count_documents({
            "user_id": user["id"],
            "event_type": "app_open"
        })
        
        # Get feedback count
        feedback_count = await db.beta_feedback.count_documents({"user_id": user["id"]})
        
        user["last_activity"] = last_activity.get("timestamp") if last_activity else None
        user["session_count"] = session_count
        user["feedback_count"] = feedback_count
        
        enriched_users.append(user)
    
    return {"beta_users": enriched_users}

# Auth Routes (Enhanced for Beta)
@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    # Beta environment validation
    if ENVIRONMENT == "beta":
        if not user_data.beta_access_code or user_data.beta_access_code != BETA_ACCESS_CODE:
            raise HTTPException(status_code=403, detail="Código de acesso beta necessário")
        
        # Check beta user limit
        beta_users_count = await db.users.count_documents({"is_beta_user": True})
        if beta_users_count >= MAX_BETA_USERS:
            raise HTTPException(status_code=403, detail="Limite de usuários beta atingido")
    
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    hashed_password = get_password_hash(user_data.password)
    user_dict = user_data.dict()
    del user_dict["password"]
    if "beta_access_code" in user_dict:
        del user_dict["beta_access_code"]
    
    user_obj = User(**user_dict)
    
    # Set beta user flag
    if ENVIRONMENT == "beta":
        user_obj.is_beta_user = True
        user_obj.beta_joined_at = datetime.utcnow()
    
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
    
    # Create wallet for user
    wallet = Wallet(user_id=user_obj.id)
    await db.wallets.insert_one(wallet.dict())
    
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

# Document Upload Routes
@api_router.post("/documents/upload")
async def upload_document(
    document_data: DocumentUpload,
    current_user: User = Depends(get_current_user)
):
    """Upload a document for verification"""
    try:
        # Validate document type
        valid_types = ["rg_front", "rg_back", "cpf", "address_proof", "certificate", "selfie"]
        if document_data.document_type not in valid_types:
            raise HTTPException(status_code=400, detail="Invalid document type")
        
        # Check if document already exists
        existing_doc = await db.documents.find_one({
            "user_id": current_user.id,
            "document_type": document_data.document_type
        })
        
        if existing_doc:
            # Update existing document
            await db.documents.update_one(
                {"_id": existing_doc["_id"]},
                {
                    "$set": {
                        "file_data": document_data.file_data,
                        "file_name": document_data.file_name,
                        "description": document_data.description,
                        "status": "pending",
                        "uploaded_at": datetime.utcnow(),
                        "admin_notes": None,
                        "reviewed_at": None
                    }
                }
            )
            doc_id = str(existing_doc["_id"])
        else:
            # Create new document
            document = Document(
                user_id=current_user.id,
                document_type=document_data.document_type,
                file_data=document_data.file_data,
                file_name=document_data.file_name,
                description=document_data.description
            )
            
            result = await db.documents.insert_one(document.dict())
            doc_id = str(result.inserted_id)
        
        return {"status": "success", "document_id": doc_id, "message": "Document uploaded successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/documents/{user_id}")
async def get_user_documents(
    user_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get all documents for a user"""
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    documents = await db.documents.find({"user_id": user_id}).to_list(100)
    
    # Convert ObjectId to string and remove file_data for list view
    for doc in documents:
        if "_id" in doc:
            doc["_id"] = str(doc["_id"])
        # Remove file_data to reduce response size
        if "file_data" in doc:
            doc["has_file"] = True
            del doc["file_data"]
    
    return {"documents": documents}

@api_router.get("/documents/view/{document_id}")
async def get_document(
    document_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get a specific document with file data"""
    try:
        from bson import ObjectId
        document = await db.documents.find_one({"_id": ObjectId(document_id)})
    except:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Check access permissions
    if document["user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Convert ObjectId to string
    if "_id" in document:
        document["_id"] = str(document["_id"])
    
    return document

# Portfolio Routes
@api_router.post("/portfolio/upload")
async def upload_portfolio_item(
    portfolio_data: PortfolioUpload,
    current_user: User = Depends(get_current_user)
):
    """Upload a portfolio item"""
    if current_user.user_type != "professional":
        raise HTTPException(status_code=403, detail="Only professionals can upload portfolio items")
    
    try:
        portfolio_item = PortfolioItem(
            user_id=current_user.id,
            title=portfolio_data.title,
            description=portfolio_data.description,
            image_data=portfolio_data.image_data,
            category=portfolio_data.category,
            work_date=datetime.fromisoformat(portfolio_data.work_date) if portfolio_data.work_date else None,
            client_feedback=portfolio_data.client_feedback
        )
        
        result = await db.portfolio.insert_one(portfolio_item.dict())
        
        return {
            "status": "success", 
            "portfolio_id": str(result.inserted_id),
            "message": "Portfolio item uploaded successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/portfolio/{user_id}")
async def get_user_portfolio(user_id: str):
    """Get portfolio items for a professional"""
    portfolio_items = await db.portfolio.find({"user_id": user_id}).sort("created_at", -1).to_list(50)
    
    # Convert ObjectId to string
    for item in portfolio_items:
        if "_id" in item:
            item["_id"] = str(item["_id"])
    
    return {"portfolio": portfolio_items}

@api_router.delete("/portfolio/{portfolio_id}")
async def delete_portfolio_item(
    portfolio_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a portfolio item"""
    try:
        from bson import ObjectId
        item = await db.portfolio.find_one({"_id": ObjectId(portfolio_id)})
    except:
        raise HTTPException(status_code=404, detail="Portfolio item not found")
    
    if not item:
        raise HTTPException(status_code=404, detail="Portfolio item not found")
    
    if item["user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.portfolio.delete_one({"_id": ObjectId(portfolio_id)})
    
    return {"status": "success", "message": "Portfolio item deleted"}

# Enhanced Profile Routes
@api_router.put("/profile/professional")
async def update_professional_profile(
    profile_data: ProfessionalProfileUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update professional profile"""
    if current_user.user_type != "professional":
        raise HTTPException(status_code=403, detail="Only professionals can update professional profile")
    
    update_data = profile_data.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    # Calculate profile completion
    existing_profile = await db.professional_profiles.find_one({"user_id": current_user.id})
    documents = await db.documents.find({"user_id": current_user.id}).to_list(100)
    portfolio_items = await db.portfolio.find({"user_id": current_user.id}).to_list(100)
    
    # Merge existing profile with updates
    merged_profile = {**existing_profile, **update_data}
    completion = calculate_profile_completion(merged_profile, documents, portfolio_items)
    update_data["profile_completion"] = completion
    
    await db.professional_profiles.update_one(
        {"user_id": current_user.id},
        {"$set": update_data}
    )
    
    return {"status": "success", "profile_completion": completion}

@api_router.get("/profile/professional/{user_id}")
async def get_professional_profile(user_id: str):
    profile = await db.professional_profiles.find_one({"user_id": user_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Professional profile not found")
    
    # Convert ObjectId to string for JSON serialization
    if "_id" in profile:
        profile["_id"] = str(profile["_id"])
    
    # Get user basic info
    user = await db.users.find_one({"id": user_id})
    if user:
        profile["user_name"] = user.get("full_name")
        profile["user_email"] = user.get("email")
        profile["user_phone"] = user.get("phone")
    
    # Get portfolio count
    portfolio_count = await db.portfolio.count_documents({"user_id": user_id})
    profile["portfolio_count"] = portfolio_count
    
    # Get verification documents count
    verified_docs_count = await db.documents.count_documents({
        "user_id": user_id, 
        "status": "approved"
    })
    profile["verified_documents"] = verified_docs_count
    
    return profile

@api_router.get("/profile/client/{user_id}")
async def get_client_profile(user_id: str):
    profile = await db.client_profiles.find_one({"user_id": user_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Client profile not found")
    
    # Convert ObjectId to string for JSON serialization
    if "_id" in profile:
        profile["_id"] = str(profile["_id"])
    
    return profile

@api_router.get("/categories")
async def get_service_categories():
    return {"categories": SERVICE_CATEGORIES}

# Professional Search & Discovery
@api_router.get("/professionals/search")
async def search_professionals(
    category: Optional[str] = None,
    location: Optional[str] = None,
    min_rating: Optional[float] = None,
    verified_only: bool = False,
    limit: int = 20
):
    """Search for professionals"""
    query = {}
    
    if category:
        query["services"] = {"$in": [category]}
    
    if location:
        query["location"] = {"$regex": location, "$options": "i"}
    
    if min_rating:
        query["rating"] = {"$gte": min_rating}
    
    if verified_only:
        query["verification_status"] = "verified"
    
    professionals = await db.professional_profiles.find(query).limit(limit).to_list(limit)
    
    # Enrich with user data and portfolio
    result = []
    for prof in professionals:
        if "_id" in prof:
            prof["_id"] = str(prof["_id"])
        
        # Get user basic info
        user = await db.users.find_one({"id": prof["user_id"]})
        if user:
            prof["user_name"] = user.get("full_name")
            prof["user_phone"] = user.get("phone")
        
        # Get portfolio sample (first 3 items)
        portfolio_sample = await db.portfolio.find(
            {"user_id": prof["user_id"]}
        ).limit(3).to_list(3)
        
        for item in portfolio_sample:
            if "_id" in item:
                item["_id"] = str(item["_id"])
            # Remove image_data to reduce response size
            if "image_data" in item:
                item["has_image"] = True
                del item["image_data"]
        
        prof["portfolio_sample"] = portfolio_sample
        result.append(prof)
    
    return {"professionals": result}

# Admin Routes
@api_router.get("/admin/documents/pending")
async def get_pending_documents(current_user: User = Depends(get_current_user)):
    """Get all pending documents for admin review"""
    # TODO: Add admin role check
    
    documents = await db.documents.find({"status": "pending"}).sort("uploaded_at", 1).to_list(100)
    
    # Enrich with user data
    result = []
    for doc in documents:
        if "_id" in doc:
            doc["_id"] = str(doc["_id"])
        
        # Get user info
        user = await db.users.find_one({"id": doc["user_id"]})
        if user:
            doc["user_name"] = user.get("full_name")
            doc["user_email"] = user.get("email")
        
        # Remove file_data for list view
        if "file_data" in doc:
            doc["has_file"] = True
            del doc["file_data"]
        
        result.append(doc)
    
    return {"pending_documents": result}

@api_router.post("/admin/documents/review")
async def review_document(
    review: AdminDocumentReview,
    current_user: User = Depends(get_current_user)
):
    """Admin review of a document"""
    # TODO: Add admin role check
    
    try:
        from bson import ObjectId
        
        # Update document status
        await db.documents.update_one(
            {"_id": ObjectId(review.document_id)},
            {
                "$set": {
                    "status": review.status,
                    "admin_notes": review.admin_notes,
                    "reviewed_at": datetime.utcnow(),
                    "reviewed_by": current_user.id
                }
            }
        )
        
        # Get document to update professional profile
        document = await db.documents.find_one({"_id": ObjectId(review.document_id)})
        if document:
            # Recalculate profile completion
            professional = await db.professional_profiles.find_one({"user_id": document["user_id"]})
            if professional:
                documents = await db.documents.find({"user_id": document["user_id"]}).to_list(100)
                portfolio_items = await db.portfolio.find({"user_id": document["user_id"]}).to_list(100)
                
                completion = calculate_profile_completion(professional, documents, portfolio_items)
                
                # Check if professional should be verified
                required_docs = ["rg_front", "rg_back", "cpf", "address_proof", "selfie"]
                approved_docs = [doc for doc in documents if doc.get("status") == "approved"]
                doc_types = [doc.get("document_type") for doc in approved_docs]
                
                verification_status = "verified" if all(doc_type in doc_types for doc_type in required_docs) else "pending"
                
                await db.professional_profiles.update_one(
                    {"user_id": document["user_id"]},
                    {
                        "$set": {
                            "profile_completion": completion,
                            "verification_status": verification_status,
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
        
        return {"status": "success", "message": f"Document {review.status}"}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/admin/stats")
async def get_admin_stats(current_user: User = Depends(get_current_user)):
    """Get platform statistics for admin dashboard"""
    # TODO: Add admin role check
    
    stats = {}
    
    # User stats
    stats["total_users"] = await db.users.count_documents({})
    stats["total_clients"] = await db.users.count_documents({"user_type": "client"})
    stats["total_professionals"] = await db.users.count_documents({"user_type": "professional"})
    
    # Verification stats
    stats["verified_professionals"] = await db.professional_profiles.count_documents({"verification_status": "verified"})
    stats["pending_documents"] = await db.documents.count_documents({"status": "pending"})
    
    # Booking stats
    stats["total_bookings"] = await db.bookings.count_documents({})
    stats["completed_bookings"] = await db.bookings.count_documents({"status": "completed"})
    stats["active_bookings"] = await db.bookings.count_documents({"status": {"$in": ["pending", "accepted", "in_progress"]}})
    
    # Financial stats
    transactions = await db.transactions.find({"status": "completed"}).to_list(10000)
    total_volume = sum(abs(t.get("amount", 0)) for t in transactions)
    platform_revenue = sum(abs(t.get("amount", 0)) * 0.05 for t in transactions if t.get("type") == "escrow_hold")
    
    stats["total_transaction_volume"] = total_volume
    stats["platform_revenue"] = platform_revenue
    
    return stats

# Wallet & Payment Routes (keeping existing ones)
@api_router.get("/wallet/{user_id}")
async def get_wallet(user_id: str, current_user: User = Depends(get_current_user)):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    wallet = await get_or_create_wallet(user_id)
    return wallet

@api_router.get("/config/stripe-key")
async def get_stripe_publishable_key():
    """Get Stripe publishable key for frontend"""
    return {"publishable_key": STRIPE_PUBLISHABLE_KEY}

@api_router.post("/payment/create-intent")
async def create_payment_intent(
    payment_data: PaymentIntent, 
    current_user: User = Depends(get_current_user)
):
    """Create Stripe Payment Intent for deposits"""
    try:
        # Convert amount to cents (Stripe uses cents)
        amount_cents = int(payment_data.amount * 100)
        
        intent = stripe.PaymentIntent.create(
            amount=amount_cents,
            currency=payment_data.currency,
            payment_method_types=payment_data.payment_method_types,
            metadata={
                "user_id": current_user.id,
                "type": "wallet_deposit",
                **payment_data.metadata
            }
        )
        
        # Create transaction record
        transaction = Transaction(
            user_id=current_user.id,
            amount=payment_data.amount,
            type="deposit",
            status="pending",
            payment_method="stripe",
            stripe_payment_intent_id=intent.id,
            description=payment_data.description
        )
        
        await db.transactions.insert_one(transaction.dict())
        
        return {
            "client_secret": intent.client_secret,
            "payment_intent_id": intent.id
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/payment/deposit")
async def deposit_to_wallet(
    deposit_data: DepositRequest, 
    current_user: User = Depends(get_current_user)
):
    """Process wallet deposit via PIX or Credit Card"""
    try:
        # Create Payment Intent
        payment_intent_data = PaymentIntent(
            amount=deposit_data.amount,
            payment_method_types=[deposit_data.payment_method],
            description=f"Depósito na carteira - {current_user.full_name}"
        )
        
        return await create_payment_intent(payment_intent_data, current_user)
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/payment/confirm/{payment_intent_id}")
async def confirm_payment(
    payment_intent_id: str,
    current_user: User = Depends(get_current_user)
):
    """Confirm payment and update wallet balance"""
    try:
        # Retrieve payment intent from Stripe
        intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        
        if intent.status == "succeeded":
            # Update transaction status
            await db.transactions.update_one(
                {"stripe_payment_intent_id": payment_intent_id},
                {
                    "$set": {
                        "status": "completed",
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            # Update wallet balance
            amount = intent.amount / 100  # Convert from cents
            await db.wallets.update_one(
                {"user_id": current_user.id},
                {
                    "$inc": {"balance": amount},
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )
            
            return {"status": "success", "amount": amount}
        else:
            return {"status": "pending", "payment_status": intent.status}
            
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/payment/withdraw")
async def withdraw_from_wallet(
    withdraw_data: WithdrawRequest,
    current_user: User = Depends(get_current_user)
):
    """Withdraw money from wallet via PIX"""
    try:
        wallet = await get_or_create_wallet(current_user.id)
        
        if wallet.balance < withdraw_data.amount:
            raise HTTPException(status_code=400, detail="Insufficient balance")
        
        # For demo purposes, we'll simulate PIX withdrawal
        # In production, integrate with Brazilian payment processors
        
        # Create withdrawal transaction
        transaction = Transaction(
            user_id=current_user.id,
            amount=-withdraw_data.amount,
            type="withdrawal",
            status="pending",
            payment_method="pix",
            description=f"Saque PIX para {withdraw_data.pix_key}",
            metadata={"pix_key": withdraw_data.pix_key}
        )
        
        await db.transactions.insert_one(transaction.dict())
        
        # Update wallet balance (deduct amount)
        await db.wallets.update_one(
            {"user_id": current_user.id},
            {
                "$inc": {"balance": -withdraw_data.amount},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        # Simulate immediate completion for demo
        await db.transactions.update_one(
            {"id": transaction.id},
            {"$set": {"status": "completed", "updated_at": datetime.utcnow()}}
        )
        
        return {"status": "success", "transaction_id": transaction.id}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/transactions/{user_id}")
async def get_user_transactions(
    user_id: str, 
    current_user: User = Depends(get_current_user)
):
    """Get user transaction history"""
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    transactions = await db.transactions.find(
        {"user_id": user_id}
    ).sort("created_at", -1).to_list(100)
    
    # Convert ObjectId to string
    for transaction in transactions:
        if "_id" in transaction:
            transaction["_id"] = str(transaction["_id"])
    
    return {"transactions": transactions}

# Service Booking & Escrow Routes
@api_router.post("/booking/create")
async def create_service_booking(
    booking_data: ServiceBooking,
    current_user: User = Depends(get_current_user)
):
    """Create service booking with escrow payment"""
    try:
        # Ensure client is booking
        if current_user.user_type != "client":
            raise HTTPException(status_code=403, detail="Only clients can book services")
        
        # Check wallet balance
        wallet = await get_or_create_wallet(current_user.id)
        if wallet.balance < booking_data.amount:
            raise HTTPException(status_code=400, detail="Insufficient wallet balance")
        
        # Create booking
        booking_data.client_id = current_user.id
        booking_data.status = "pending"
        booking_data.payment_status = "pending"
        
        await db.bookings.insert_one(booking_data.dict())
        
        # Create escrow transaction (hold payment)
        escrow_transaction = Transaction(
            user_id=current_user.id,
            amount=-booking_data.amount,
            type="escrow_hold",
            status="completed",
            payment_method="wallet_balance",
            description=f"Pagamento em garantia - {booking_data.service_category}",
            metadata={"booking_id": booking_data.id}
        )
        
        await db.transactions.insert_one(escrow_transaction.dict())
        
        # Update wallet balance (hold amount)
        await db.wallets.update_one(
            {"user_id": current_user.id},
            {
                "$inc": {"balance": -booking_data.amount},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        # Update booking with escrow transaction
        await db.bookings.update_one(
            {"id": booking_data.id},
            {
                "$set": {
                    "payment_status": "escrowed",
                    "escrow_transaction_id": escrow_transaction.id
                }
            }
        )
        
        return {"status": "success", "booking_id": booking_data.id}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/bookings/my")
async def get_my_bookings(current_user: User = Depends(get_current_user)):
    """Get bookings for current user (client or professional)"""
    if current_user.user_type == "client":
        query = {"client_id": current_user.id}
    else:
        query = {"professional_id": current_user.id}
    
    bookings = await db.bookings.find(query).sort("created_at", -1).to_list(100)
    
    # Enrich with user data
    result = []
    for booking in bookings:
        if "_id" in booking:
            booking["_id"] = str(booking["_id"])
        
        # Get client info
        client = await db.users.find_one({"id": booking["client_id"]})
        if client:
            booking["client_name"] = client.get("full_name")
            booking["client_phone"] = client.get("phone")
        
        # Get professional info  
        professional = await db.users.find_one({"id": booking["professional_id"]})
        if professional:
            booking["professional_name"] = professional.get("full_name")
            booking["professional_phone"] = professional.get("phone")
        
        result.append(booking)
    
    return {"bookings": result}

@api_router.put("/booking/{booking_id}/status")
async def update_booking_status(
    booking_id: str,
    status_update: BookingStatusUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update booking status"""
    booking = await db.bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Check permissions
    if current_user.user_type == "client" and booking["client_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    elif current_user.user_type == "professional" and booking["professional_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Update booking
    await db.bookings.update_one(
        {"id": booking_id},
        {
            "$set": {
                "status": status_update.status,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return {"status": "success", "message": f"Booking status updated to {status_update.status}"}

@api_router.post("/booking/{booking_id}/complete")
async def complete_service_booking(
    booking_id: str,
    current_user: User = Depends(get_current_user)
):
    """Complete service and release escrow payment to professional"""
    try:
        # Get booking
        booking = await db.bookings.find_one({"id": booking_id})
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        # Only client can mark as complete
        if booking["client_id"] != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        if booking["payment_status"] != "escrowed":
            raise HTTPException(status_code=400, detail="Payment not in escrow")
        
        # Release payment to professional
        professional_wallet = await get_or_create_wallet(booking["professional_id"])
        
        # Calculate amounts (5% platform fee, 2% cashback)
        total_amount = booking["amount"]
        platform_fee = total_amount * 0.05
        cashback_amount = total_amount * 0.02
        professional_amount = total_amount - platform_fee
        
        # Create release transaction for professional
        release_transaction = Transaction(
            user_id=booking["professional_id"],
            amount=professional_amount,
            type="escrow_release",
            status="completed",
            payment_method="wallet_balance",
            description=f"Pagamento recebido - {booking['service_category']}",
            metadata={"booking_id": booking_id}
        )
        
        await db.transactions.insert_one(release_transaction.dict())
        
        # Create cashback transaction for client
        cashback_transaction = Transaction(
            user_id=current_user.id,
            amount=cashback_amount,
            type="cashback",
            status="completed",
            payment_method="wallet_balance",
            description=f"Cashback - {booking['service_category']}",
            metadata={"booking_id": booking_id}
        )
        
        await db.transactions.insert_one(cashback_transaction.dict())
        
        # Update wallets
        await db.wallets.update_one(
            {"user_id": booking["professional_id"]},
            {
                "$inc": {"balance": professional_amount},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        await db.wallets.update_one(
            {"user_id": current_user.id},
            {
                "$inc": {"cashback_balance": cashback_amount},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        # Update booking status
        await db.bookings.update_one(
            {"id": booking_id},
            {
                "$set": {
                    "status": "completed",
                    "payment_status": "released",
                    "completed_date": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return {
            "status": "success",
            "professional_amount": professional_amount,
            "cashback_amount": cashback_amount
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/booking/{booking_id}/review")
async def review_booking(
    booking_id: str,
    review_data: BookingReview,
    current_user: User = Depends(get_current_user)
):
    """Add review and rating to completed booking"""
    booking = await db.bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Only client can review
    if booking["client_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if booking["status"] != "completed":
        raise HTTPException(status_code=400, detail="Can only review completed bookings")
    
    # Update booking with review
    await db.bookings.update_one(
        {"id": booking_id},
        {
            "$set": {
                "client_rating": review_data.rating,
                "client_review": review_data.review,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    # Update professional's average rating
    all_ratings = await db.bookings.find({
        "professional_id": booking["professional_id"],
        "client_rating": {"$exists": True}
    }).to_list(1000)
    
    if all_ratings:
        avg_rating = sum(b["client_rating"] for b in all_ratings) / len(all_ratings)
        await db.professional_profiles.update_one(
            {"user_id": booking["professional_id"]},
            {
                "$set": {
                    "rating": round(avg_rating, 1),
                    "reviews_count": len(all_ratings),
                    "updated_at": datetime.utcnow()
                }
            }
        )
    
    return {"status": "success", "message": "Review submitted successfully"}

# AI Matching Routes using Emergent LLM
@api_router.post("/ai/match-professionals", response_model=AIMatchingResponse)
async def ai_match_professionals(
    request: AIMatchingRequest,
    current_user: User = Depends(get_current_user)
):
    """AI-powered professional matching based on client needs"""
    if current_user.user_type != "client":
        raise HTTPException(status_code=403, detail="Only clients can request professional matching")
    
    try:
        # Get all verified professionals
        professionals = await db.professional_profiles.find({
            "verification_status": "verified"
        }).to_list(100)
        
        if not professionals:
            return AIMatchingResponse(
                matches=[],
                search_interpretation="Nenhum profissional verificado encontrado.",
                suggestions=["Tente novamente mais tarde quando mais profissionais estiverem disponíveis."]
            )
        
        # Initialize LLM Chat
        chat = LlmChat(
            api_key=os.getenv("EMERGENT_LLM_KEY"),
            session_id=f"matching_{current_user.id}_{datetime.utcnow().timestamp()}",
            system_message="""Você é um especialista em matching de profissionais de serviços no Brasil. 
            
            Sua tarefa é analisar a solicitação do cliente e classificar cada profissional com um score de 0-100 baseado em:
            1. Relevância dos serviços oferecidos (40%)
            2. Especialidades específicas (25%)
            3. Localização (15%)
            4. Avaliações e experiência (10%)
            5. Disponibilidade e adequação ao perfil (10%)
            
            Sempre responda em JSON válido no formato:
            {
                "interpretation": "Interpretação da solicitação do cliente",
                "matches": [
                    {
                        "professional_id": "id_do_profissional",
                        "score": 85,
                        "reasoning": "Explicação detalhada do match",
                        "match_factors": {
                            "service_relevance": 90,
                            "specialties_match": 80,
                            "location_score": 85,
                            "rating_experience": 85,
                            "availability_fit": 90
                        }
                    }
                ],
                "suggestions": ["Sugestão 1", "Sugestão 2"]
            }"""
        ).with_model("openai", "gpt-4o-mini")
        
        # Prepare professional data for AI analysis
        professionals_data = []
        for prof in professionals:
            # Get user info
            user = await db.users.find_one({"id": prof["user_id"]})
            if user:
                prof_data = {
                    "id": prof["user_id"],
                    "name": user.get("full_name", ""),
                    "services": prof.get("services", []),
                    "specialties": prof.get("specialties", []),
                    "location": prof.get("location", ""),
                    "experience_years": prof.get("experience_years", 0),
                    "hourly_rate": prof.get("hourly_rate", 0),
                    "rating": prof.get("rating", 0),
                    "reviews_count": prof.get("reviews_count", 0),
                    "bio": prof.get("bio", "")
                }
                professionals_data.append(prof_data)
        
        # Create AI prompt
        prompt = f"""
        SOLICITAÇÃO DO CLIENTE: "{request.client_request}"
        LOCALIZAÇÃO: {request.location or "Não especificada"}
        ORÇAMENTO: {request.budget_range or "Não especificado"}
        URGÊNCIA: {request.urgency}
        HORÁRIO PREFERIDO: {request.preferred_time or "Flexível"}
        
        PROFISSIONAIS DISPONÍVEIS:
        {json.dumps(professionals_data, ensure_ascii=False, indent=2)}
        
        Analise a solicitação e classifique todos os profissionais relevantes. 
        Retorne apenas os top 5 matches com score >= 60.
        """
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Parse AI response
        try:
            ai_result = json.loads(response)
            
            matches = []
            for match in ai_result.get("matches", []):
                matches.append(MatchingScore(
                    professional_id=match["professional_id"],
                    score=match["score"],
                    reasoning=match["reasoning"],
                    match_factors=match["match_factors"]
                ))
            
            return AIMatchingResponse(
                matches=matches,
                search_interpretation=ai_result.get("interpretation", ""),
                suggestions=ai_result.get("suggestions", [])
            )
            
        except json.JSONDecodeError:
            # Fallback to traditional search if AI fails
            fallback_matches = await traditional_professional_search(request.client_request, professionals_data)
            return AIMatchingResponse(
                matches=fallback_matches,
                search_interpretation=f"Analisando: '{request.client_request}'",
                suggestions=["Tente ser mais específico sobre o tipo de serviço que precisa."]
            )
        
    except Exception as e:
        logger.error(f"AI Matching error: {str(e)}")
        # Fallback to traditional search
        professionals = await db.professional_profiles.find({
            "verification_status": "verified"
        }).limit(5).to_list(5)
        
        fallback_matches = []
        for prof in professionals:
            fallback_matches.append(MatchingScore(
                professional_id=prof["user_id"],
                score=75.0,
                reasoning="Match baseado em disponibilidade",
                match_factors={"service_relevance": 75, "location_score": 50}
            ))
        
        return AIMatchingResponse(
            matches=fallback_matches,
            search_interpretation="Busca tradicional aplicada",
            suggestions=["Sistema de IA temporariamente indisponível, usando busca padrão."]
        )

async def traditional_professional_search(query: str, professionals_data: list) -> List[MatchingScore]:
    """Fallback traditional search when AI is unavailable"""
    matches = []
    query_lower = query.lower()
    
    for prof in professionals_data:
        score = 50  # Base score
        reasoning_parts = []
        
        # Check services match
        for service in prof.get("services", []):
            if any(word in service.lower() for word in query_lower.split()):
                score += 20
                reasoning_parts.append(f"Oferece serviços em {service}")
        
        # Check specialties match
        for specialty in prof.get("specialties", []):
            if any(word in specialty.lower() for word in query_lower.split()):
                score += 15
                reasoning_parts.append(f"Especialista em {specialty}")
        
        # Bonus for high ratings
        if prof.get("rating", 0) >= 4.5:
            score += 10
            reasoning_parts.append("Alta avaliação dos clientes")
        
        # Bonus for experience
        experience = prof.get("experience_years", 0)
        if experience >= 5:
            score += 5
            reasoning_parts.append(f"{experience} anos de experiência")
        
        if score >= 60:
            matches.append(MatchingScore(
                professional_id=prof["id"],
                score=min(score, 100),
                reasoning=". ".join(reasoning_parts) or "Profissional qualificado",
                match_factors={"service_relevance": score, "location_score": 50}
            ))
    
    # Sort by score and return top 5
    matches.sort(key=lambda x: x.score, reverse=True)
    return matches[:5]

@api_router.post("/ai/smart-search")
async def smart_search_professionals(
    request: SmartSearchRequest,
    current_user: User = Depends(get_current_user)
):
    """Smart search with natural language understanding"""
    try:
        # Use AI matching with the search query
        ai_request = AIMatchingRequest(
            client_request=request.query,
            location=request.location
        )
        
        result = await ai_match_professionals(ai_request, current_user)
        
        # Enrich results with professional data
        enriched_matches = []
        for match in result.matches:
            prof_profile = await db.professional_profiles.find_one({"user_id": match.professional_id})
            if prof_profile:
                user = await db.users.find_one({"id": match.professional_id})
                portfolio_count = await db.portfolio.count_documents({"user_id": match.professional_id})
                
                enriched_match = {
                    "professional_id": match.professional_id,
                    "score": match.score,
                    "reasoning": match.reasoning,
                    "match_factors": match.match_factors,
                    "profile": {
                        "name": user.get("full_name") if user else "Nome não disponível",
                        "rating": prof_profile.get("rating", 0),
                        "reviews_count": prof_profile.get("reviews_count", 0),
                        "services": prof_profile.get("services", []),
                        "specialties": prof_profile.get("specialties", []),
                        "location": prof_profile.get("location", ""),
                        "hourly_rate": prof_profile.get("hourly_rate"),
                        "portfolio_count": portfolio_count,
                        "verification_status": prof_profile.get("verification_status", "pending")
                    }
                }
                enriched_matches.append(enriched_match)
        
        return {
            "matches": enriched_matches[:request.limit],
            "search_interpretation": result.search_interpretation,
            "suggestions": result.suggestions,
            "total_found": len(enriched_matches)
        }
        
    except Exception as e:
        logger.error(f"Smart search error: {str(e)}")
        raise HTTPException(status_code=500, detail="Erro na busca inteligente")

@api_router.get("/ai/search-suggestions")
async def get_search_suggestions():
    """Get AI-powered search suggestions based on popular requests"""
    suggestions = [
        "Preciso de um eletricista para instalar chuveiro elétrico",
        "Busco diarista para limpeza semanal da casa",
        "Quero fazer luzes e mechas no cabelo",
        "Preciso consertar meu iPhone que não liga",
        "Busco dog walker para passear com meu cachorro",
        "Quero contratar fotógrafo para casamento",
        "Preciso de encanador para vazamento urgente",
        "Busco manicure que atende em domicílio",
        "Quero reformar minha cozinha completa",
        "Preciso de técnico para instalar TV na parede"
    ]
    
    return {"suggestions": suggestions}

# Root endpoint
@api_router.get("/")
async def root():
    return {
        "message": "WorkMe API is running", 
        "status": "healthy", 
        "environment": ENVIRONMENT,
        "ai_enabled": True,
        "version": "1.0.0-beta" if ENVIRONMENT == "beta" else "1.0.0"
    }

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
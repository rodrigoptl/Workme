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
from decimal import Decimal

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Stripe configuration (Test keys for development)
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "sk_test_51234567890abcdef...")
STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY", "pk_test_51234567890abcdef...")

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
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

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

# Profile Routes
@api_router.get("/profile/professional/{user_id}")
async def get_professional_profile(user_id: str):
    profile = await db.professional_profiles.find_one({"user_id": user_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Professional profile not found")
    
    # Convert ObjectId to string for JSON serialization
    if "_id" in profile:
        profile["_id"] = str(profile["_id"])
    
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

# Wallet & Payment Routes
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
from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
from passlib.context import CryptContext
import jwt
from enum import Enum

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

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = "hotel_access_management_secret_key"  # In production, use an environment variable
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/token")

# Enums
class RoomStatus(str, Enum):
    AVAILABLE = "available"
    OCCUPIED = "occupied"
    MAINTENANCE = "maintenance"
    CLEANING = "cleaning"

class UserRole(str, Enum):
    GUEST = "guest"
    ADMIN = "admin"

class LightStatus(str, Enum):
    ON = "on"
    OFF = "off"

class ACStatus(str, Enum):
    ON = "on"
    OFF = "off"

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    full_name: str
    hashed_password: str
    role: UserRole
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: UserRole = UserRole.GUEST

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: UserRole

class Room(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    room_number: str
    floor: int
    price_per_night: float
    description: str
    status: RoomStatus = RoomStatus.AVAILABLE
    features: List[str] = []

class RoomCreate(BaseModel):
    room_number: str
    floor: int
    price_per_night: float
    description: str
    features: List[str] = []

class RoomStatus(BaseModel):
    light: LightStatus = LightStatus.OFF
    ac: ACStatus = ACStatus.OFF
    room_id: str
    last_updated: datetime = Field(default_factory=datetime.utcnow)

class Booking(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    room_id: str
    user_id: str
    check_in_date: datetime
    check_out_date: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = "pending"  # pending, confirmed, cancelled, completed, paid
    payment_status: str = "pending"  # pending, paid, refunded
    payment_id: Optional[str] = None
    amount: float = 0.0
    booking_stages: List[str] = ["created"]  # created, confirmed, paid, checked_in, checked_out

class BookingCreate(BaseModel):
    room_id: str
    check_in_date: datetime
    check_out_date: datetime

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

async def get_user_by_email(email: str):
    user = await db.users.find_one({"email": email})
    if user:
        return User(**user)
    return None

async def authenticate_user(email: str, password: str):
    user = await get_user_by_email(email)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except jwt.PyJWTError:
        raise credentials_exception
    user = await get_user_by_email(email=token_data.email)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)):
    return current_user

async def get_admin_user(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this resource"
        )
    return current_user

# Routes
@api_router.post("/users", response_model=UserResponse)
async def create_user(user: UserCreate):
    # Check if user already exists
    existing_user = await get_user_by_email(user.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user.password)
    user_data = User(
        email=user.email,
        full_name=user.full_name,
        hashed_password=hashed_password,
        role=user.role
    )
    
    # Insert into database
    user_dict = user_data.dict()
    await db.users.insert_one(user_dict)
    
    # Return user without password
    return UserResponse(
        id=user_data.id,
        email=user_data.email,
        full_name=user_data.full_name,
        role=user_data.role
    )

@api_router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.post("/login", response_model=Token)
async def login(user_data: UserLogin):
    user = await authenticate_user(user_data.email, user_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.get("/users/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role
    )

# Room management (Admin only)
@api_router.post("/rooms", response_model=Room)
async def create_room(room: RoomCreate, current_user: User = Depends(get_admin_user)):
    # Check if room number already exists
    existing_room = await db.rooms.find_one({"room_number": room.room_number})
    if existing_room:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Room number already exists"
        )
    
    # Create new room
    room_data = Room(
        room_number=room.room_number,
        floor=room.floor,
        price_per_night=room.price_per_night,
        description=room.description,
        features=room.features
    )
    
    # Insert into database
    room_dict = room_data.dict()
    await db.rooms.insert_one(room_dict)
    
    # Initialize room status
    room_status = RoomStatus(room_id=room_data.id)
    await db.room_status.insert_one(room_status.dict())
    
    return room_data

@api_router.get("/rooms", response_model=List[Room])
async def get_rooms():
    rooms = await db.rooms.find().to_list(1000)
    return [Room(**room) for room in rooms]

@api_router.get("/rooms/{room_id}", response_model=Room)
async def get_room(room_id: str):
    room = await db.rooms.find_one({"id": room_id})
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
    return Room(**room)

@api_router.put("/rooms/{room_id}", response_model=Room)
async def update_room(room_id: str, room: RoomCreate, current_user: User = Depends(get_admin_user)):
    existing_room = await db.rooms.find_one({"id": room_id})
    if not existing_room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
    
    updated_room = Room(
        id=room_id,
        room_number=room.room_number,
        floor=room.floor,
        price_per_night=room.price_per_night,
        description=room.description,
        features=room.features,
        status=existing_room["status"]
    )
    
    await db.rooms.update_one(
        {"id": room_id},
        {"$set": updated_room.dict()}
    )
    
    return updated_room

@api_router.put("/rooms/{room_id}/status", response_model=Room)
async def update_room_status(room_id: str, status: RoomStatus, current_user: User = Depends(get_admin_user)):
    existing_room = await db.rooms.find_one({"id": room_id})
    if not existing_room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
    
    room_dict = dict(existing_room)
    room_dict["status"] = status.value
    
    await db.rooms.update_one(
        {"id": room_id},
        {"$set": {"status": status.value}}
    )
    
    return Room(**room_dict)

# Booking endpoints
@api_router.post("/bookings", response_model=Booking)
async def create_booking(booking: BookingCreate, current_user: User = Depends(get_current_active_user)):
    # Check if room exists
    room = await db.rooms.find_one({"id": booking.room_id})
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
    
    # Check if room is available
    if room["status"] != RoomStatus.AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Room is not available for booking"
        )
    
    # Check if there are any overlapping bookings
    overlapping_booking = await db.bookings.find_one({
        "room_id": booking.room_id,
        "status": "active",
        "$or": [
            {
                "check_in_date": {"$lte": booking.check_in_date},
                "check_out_date": {"$gte": booking.check_in_date}
            },
            {
                "check_in_date": {"$lte": booking.check_out_date},
                "check_out_date": {"$gte": booking.check_out_date}
            },
            {
                "check_in_date": {"$gte": booking.check_in_date},
                "check_out_date": {"$lte": booking.check_out_date}
            }
        ]
    })
    
    if overlapping_booking:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Room is already booked for the selected dates"
        )
    
    # Create new booking
    booking_data = Booking(
        room_id=booking.room_id,
        user_id=current_user.id,
        check_in_date=booking.check_in_date,
        check_out_date=booking.check_out_date
    )
    
    # Insert into database
    booking_dict = booking_data.dict()
    await db.bookings.insert_one(booking_dict)
    
    # Update room status
    await db.rooms.update_one(
        {"id": booking.room_id},
        {"$set": {"status": RoomStatus.OCCUPIED}}
    )
    
    return booking_data

@api_router.get("/bookings", response_model=List[Booking])
async def get_bookings(current_user: User = Depends(get_current_active_user)):
    if current_user.role == UserRole.ADMIN:
        # Admins can see all bookings
        bookings = await db.bookings.find().to_list(1000)
    else:
        # Guests can only see their own bookings
        bookings = await db.bookings.find({"user_id": current_user.id}).to_list(1000)
    
    return [Booking(**booking) for booking in bookings]

@api_router.get("/bookings/{booking_id}", response_model=Booking)
async def get_booking(booking_id: str, current_user: User = Depends(get_current_active_user)):
    booking = await db.bookings.find_one({"id": booking_id})
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    if current_user.role != UserRole.ADMIN and booking["user_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this booking"
        )
    
    return Booking(**booking)

@api_router.put("/bookings/{booking_id}/cancel", response_model=Booking)
async def cancel_booking(booking_id: str, current_user: User = Depends(get_current_active_user)):
    booking = await db.bookings.find_one({"id": booking_id})
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    if current_user.role != UserRole.ADMIN and booking["user_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to cancel this booking"
        )
    
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"status": "cancelled"}}
    )
    
    # Update room status
    await db.rooms.update_one(
        {"id": booking["room_id"]},
        {"$set": {"status": RoomStatus.AVAILABLE}}
    )
    
    booking["status"] = "cancelled"
    return Booking(**booking)

# Room control endpoints (BLE simulation)
@api_router.get("/room-status/{room_id}", response_model=RoomStatus)
async def get_room_control_status(room_id: str, current_user: User = Depends(get_current_active_user)):
    # Check if user has access to this room
    has_active_booking = False
    
    if current_user.role == UserRole.ADMIN:
        has_active_booking = True
    else:
        booking = await db.bookings.find_one({
            "room_id": room_id,
            "user_id": current_user.id,
            "status": "active",
            "check_in_date": {"$lte": datetime.utcnow()},
            "check_out_date": {"$gte": datetime.utcnow()}
        })
        
        if booking:
            has_active_booking = True
    
    if not has_active_booking:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this room's controls"
        )
    
    # Get room status
    room_status = await db.room_status.find_one({"room_id": room_id})
    if not room_status:
        # Initialize if not exists
        room_status = RoomStatus(room_id=room_id)
        await db.room_status.insert_one(room_status.dict())
        return room_status
    
    return RoomStatus(**room_status)

@api_router.put("/room-status/{room_id}/light", response_model=RoomStatus)
async def update_room_light(room_id: str, light_status: LightStatus, current_user: User = Depends(get_current_active_user)):
    # Check if user has access to this room
    has_active_booking = False
    
    if current_user.role == UserRole.ADMIN:
        has_active_booking = True
    else:
        booking = await db.bookings.find_one({
            "room_id": room_id,
            "user_id": current_user.id,
            "status": "active",
            "check_in_date": {"$lte": datetime.utcnow()},
            "check_out_date": {"$gte": datetime.utcnow()}
        })
        
        if booking:
            has_active_booking = True
    
    if not has_active_booking:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this room's controls"
        )
    
    # Update light status
    room_status = await db.room_status.find_one({"room_id": room_id})
    if not room_status:
        room_status = RoomStatus(room_id=room_id, light=light_status)
        await db.room_status.insert_one(room_status.dict())
    else:
        await db.room_status.update_one(
            {"room_id": room_id},
            {"$set": {"light": light_status, "last_updated": datetime.utcnow()}}
        )
        room_status["light"] = light_status
        room_status["last_updated"] = datetime.utcnow()
    
    return RoomStatus(**room_status)

@api_router.put("/room-status/{room_id}/ac", response_model=RoomStatus)
async def update_room_ac(room_id: str, ac_status: ACStatus, current_user: User = Depends(get_current_active_user)):
    # Check if user has access to this room
    has_active_booking = False
    
    if current_user.role == UserRole.ADMIN:
        has_active_booking = True
    else:
        booking = await db.bookings.find_one({
            "room_id": room_id,
            "user_id": current_user.id,
            "status": "active",
            "check_in_date": {"$lte": datetime.utcnow()},
            "check_out_date": {"$gte": datetime.utcnow()}
        })
        
        if booking:
            has_active_booking = True
    
    if not has_active_booking:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this room's controls"
        )
    
    # Update AC status
    room_status = await db.room_status.find_one({"room_id": room_id})
    if not room_status:
        room_status = RoomStatus(room_id=room_id, ac=ac_status)
        await db.room_status.insert_one(room_status.dict())
    else:
        await db.room_status.update_one(
            {"room_id": room_id},
            {"$set": {"ac": ac_status, "last_updated": datetime.utcnow()}}
        )
        room_status["ac"] = ac_status
        room_status["last_updated"] = datetime.utcnow()
    
    return RoomStatus(**room_status)

@api_router.post("/door-control/{room_id}/unlock")
async def unlock_door(room_id: str, current_user: User = Depends(get_current_active_user)):
    # Check if user has access to this room
    has_active_booking = False
    
    if current_user.role == UserRole.ADMIN:
        has_active_booking = True
    else:
        booking = await db.bookings.find_one({
            "room_id": room_id,
            "user_id": current_user.id,
            "status": "active",
            "check_in_date": {"$lte": datetime.utcnow()},
            "check_out_date": {"$gte": datetime.utcnow()}
        })
        
        if booking:
            has_active_booking = True
    
    if not has_active_booking:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to unlock this door"
        )
    
    # In a real system, this would send a BLE command to unlock the door
    # For the demo, we'll just return success
    return {"status": "success", "message": "Door unlocked successfully"}

# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "Welcome to Hotel Access Management API"}

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

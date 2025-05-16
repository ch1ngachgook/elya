import requests
import json
from datetime import datetime, timedelta

# API endpoint
BASE_URL = "http://localhost:8001/api"

# Create admin user
def create_admin():
    admin_data = {
        "email": "admin@hotel.com",
        "password": "admin123",
        "full_name": "Hotel Admin",
        "role": "admin"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/users", json=admin_data)
        print(f"Admin user created: {response.status_code}")
        print(response.json())
    except Exception as e:
        print(f"Error creating admin: {e}")

# Create test guest
def create_guest():
    guest_data = {
        "email": "guest@test.com",
        "password": "guest123",
        "full_name": "Test Guest",
        "role": "guest"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/users", json=guest_data)
        print(f"Guest user created: {response.status_code}")
        print(response.json())
    except Exception as e:
        print(f"Error creating guest: {e}")

# Login as admin and get token
def get_admin_token():
    login_data = {
        "email": "admin@hotel.com",
        "password": "admin123"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/login", json=login_data)
        token = response.json().get("access_token")
        print(f"Admin login: {response.status_code}")
        return token
    except Exception as e:
        print(f"Error logging in as admin: {e}")
        return None

# Create sample rooms
def create_rooms(token):
    if not token:
        print("No token available")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    rooms = [
        {
            "room_number": "101",
            "floor": 1,
            "price_per_night": 100.0,
            "description": "Standard room with queen bed, city view, and modern amenities.",
            "features": ["WiFi", "TV", "Mini Bar", "Air Conditioning"]
        },
        {
            "room_number": "102",
            "floor": 1,
            "price_per_night": 120.0,
            "description": "Deluxe room with king bed, park view, and premium amenities.",
            "features": ["WiFi", "TV", "Mini Bar", "Air Conditioning", "Coffee Machine"]
        },
        {
            "room_number": "201",
            "floor": 2,
            "price_per_night": 150.0,
            "description": "Suite with separate living area, bedroom with king bed, and luxury amenities.",
            "features": ["WiFi", "TV", "Mini Bar", "Air Conditioning", "Coffee Machine", "Work Desk"]
        },
        {
            "room_number": "202",
            "floor": 2,
            "price_per_night": 180.0,
            "description": "Premium suite with balcony, city view, king bed, and all premium amenities.",
            "features": ["WiFi", "TV", "Mini Bar", "Air Conditioning", "Coffee Machine", "Work Desk", "Balcony"]
        },
        {
            "room_number": "301",
            "floor": 3,
            "price_per_night": 250.0,
            "description": "Executive suite with separate bedroom, living room, dining area, and premium amenities.",
            "features": ["WiFi", "TV", "Mini Bar", "Air Conditioning", "Coffee Machine", "Work Desk", "Balcony", "Jacuzzi"]
        }
    ]
    
    for room in rooms:
        try:
            response = requests.post(f"{BASE_URL}/rooms", json=room, headers=headers)
            print(f"Room {room['room_number']} created: {response.status_code}")
        except Exception as e:
            print(f"Error creating room {room['room_number']}: {e}")

if __name__ == "__main__":
    create_admin()
    create_guest()
    token = get_admin_token()
    create_rooms(token)
    print("Test data creation completed!")
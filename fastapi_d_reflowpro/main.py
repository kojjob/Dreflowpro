from fastapi import FastAPI, Request, status, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
from datetime import datetime
import uuid

app = FastAPI(title="DReflowPro API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class User(BaseModel):
    id: str
    name: str
    email: str
    created_at: datetime
    is_active: bool = True

class UserCreate(BaseModel):
    name: str
    email: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    is_active: Optional[bool] = None

# In-memory storage (replace with database in production)
users_db = []

@app.get("/")
async def root():
    return {"message": "Welcome to DReflowPro API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now()}

# User Management Endpoints
@app.get("/users", response_model=List[User])
async def get_users():
    """Get all users"""
    return users_db

@app.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str):
    """Get a specific user by ID"""
    user = next((user for user in users_db if user["id"] == user_id), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.post("/users", response_model=User, status_code=201)
async def create_user(user: UserCreate):
    """Create a new user"""
    # Check if email already exists
    if any(u["email"] == user.email for u in users_db):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = {
        "id": str(uuid.uuid4()),
        "name": user.name,
        "email": user.email,
        "created_at": datetime.now(),
        "is_active": True
    }
    users_db.append(new_user)
    return new_user

@app.put("/users/{user_id}", response_model=User)
async def update_user(user_id: str, user_update: UserUpdate):
    """Update a user"""
    user = next((user for user in users_db if user["id"] == user_id), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update fields if provided
    if user_update.name is not None:
        user["name"] = user_update.name
    if user_update.email is not None:
        # Check if new email already exists (but not for current user)
        if any(u["email"] == user_update.email and u["id"] != user_id for u in users_db):
            raise HTTPException(status_code=400, detail="Email already registered")
        user["email"] = user_update.email
    if user_update.is_active is not None:
        user["is_active"] = user_update.is_active
    
    return user

@app.delete("/users/{user_id}")
async def delete_user(user_id: str):
    """Delete a user"""
    user_index = next((i for i, user in enumerate(users_db) if user["id"] == user_id), None)
    if user_index is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    deleted_user = users_db.pop(user_index)
    return {"message": f"User {deleted_user['name']} deleted successfully"}

# Additional utility endpoints
@app.get("/stats")
async def get_stats():
    """Get application statistics"""
    total_users = len(users_db)
    active_users = len([u for u in users_db if u["is_active"]])
    return {
        "total_users": total_users,
        "active_users": active_users,
        "inactive_users": total_users - active_users
    }

# expose an alias named `main` so commands like `uvicorn main:main` work
main = app

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000) 

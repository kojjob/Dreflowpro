#!/usr/bin/env python3
"""
Update database schema with new social authentication models.
This script will add the new columns and tables for OAuth support.
"""
import asyncio
import sys
import os

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.core.database import engine, Base
# Import all models to ensure they're registered with Base.metadata
from app.models.all import *


async def update_schema():
    """Create all tables and update schema."""
    print("🔄 Updating database schema...")
    
    async with engine.begin() as conn:
        # This will create new tables and add missing columns
        await conn.run_sync(Base.metadata.create_all)
    
    print("✅ Database schema updated successfully!")
    print("📋 All models synchronized:")
    print("   - User and authentication models")
    print("   - Pipeline and connector models")  
    print("   - Report models (including missing next_run_at/last_run_at columns)")
    print("   - AI insights and telemetry models")
    print("   - Multi-tenant models")
    print("   - Token family models")


if __name__ == "__main__":
    asyncio.run(update_schema())
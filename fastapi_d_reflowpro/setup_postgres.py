#!/usr/bin/env python3
"""
PostgreSQL Database Setup Script for DReflowPro
"""

import asyncio
import asyncpg
import urllib.parse
from sqlalchemy.ext.asyncio import create_async_engine
from app.core.config import settings
from app.models.user import Base


async def create_database():
    """Create the database if it doesn't exist."""
    # Parse the database URL to get connection info
    parsed_url = urllib.parse.urlparse(settings.DATABASE_URL.replace('postgresql+asyncpg', 'postgresql'))
    
    db_name = parsed_url.path[1:]  # Remove leading slash
    host = parsed_url.hostname or 'localhost'
    port = parsed_url.port or 5432
    username = parsed_url.username or 'postgres'
    password = parsed_url.password or 'postgres'
    
    print(f"🔄 Connecting to PostgreSQL at {host}:{port}")
    
    try:
        # Connect to the default postgres database first
        conn = await asyncpg.connect(
            host=host,
            port=port,
            user=username,
            password=password,
            database='postgres'
        )
        
        # Check if our database exists
        db_exists = await conn.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = $1", db_name
        )
        
        if not db_exists:
            print(f"📦 Creating database: {db_name}")
            await conn.execute(f'CREATE DATABASE "{db_name}"')
            print(f"✅ Database '{db_name}' created successfully!")
        else:
            print(f"✅ Database '{db_name}' already exists")
        
        await conn.close()
        
    except Exception as e:
        print(f"❌ Error connecting to PostgreSQL: {e}")
        print("💡 Make sure PostgreSQL is running and you have the correct credentials")
        raise


async def create_tables():
    """Create all database tables."""
    print("🔄 Creating database tables...")
    
    engine = create_async_engine(settings.DATABASE_URL, echo=True)
    
    try:
        async with engine.begin() as conn:
            # Drop all existing tables (for development)
            await conn.run_sync(Base.metadata.drop_all)
            # Create all tables
            await conn.run_sync(Base.metadata.create_all)
        
        print("✅ Database tables created successfully!")
        
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        raise
    finally:
        await engine.dispose()


async def verify_connection():
    """Verify the database connection works."""
    print("🔄 Verifying database connection...")
    
    engine = create_async_engine(settings.DATABASE_URL)
    
    try:
        async with engine.begin() as conn:
            # Test simple query
            result = await conn.execute("SELECT version()")
            print(f"✅ PostgreSQL connection verified!")
            
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        raise
    finally:
        await engine.dispose()


async def main():
    """Main setup function."""
    print("🚀 Setting up PostgreSQL database for DReflowPro...")
    print("-" * 50)
    
    try:
        await create_database()
        await create_tables()
        print("-" * 50)
        print("🎉 PostgreSQL setup completed successfully!")
        print(f"📝 Database URL: {settings.DATABASE_URL}")
        print("🔧 You can now start the FastAPI server with: uv run uvicorn main:app --reload")
        
    except Exception as e:
        print(f"💥 Setup failed: {e}")
        return 1
    
    return 0


if __name__ == "__main__":
    exit_code = asyncio.run(main())
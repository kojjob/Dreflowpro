#!/usr/bin/env python3
"""Test database connection."""
import asyncio
import sys
sys.path.insert(0, '.')

from app.core.database import engine, get_session
from sqlalchemy import text

async def test_connection():
    """Test database connection."""
    try:
        print("Testing database connection...")
        # get_session is an async generator, use it properly with FastAPI dependency injection
        # For direct testing, we'll create a session directly
        from app.core.database import AsyncSessionFactory
        
        async with AsyncSessionFactory() as session:
            result = await session.execute(text('SELECT 1'))
            value = result.scalar()
            print(f"Database query successful: SELECT 1 = {value}")
            
            # Check pool status from the engine
            if hasattr(engine, 'sync_engine') and hasattr(engine.sync_engine, 'pool'):
                pool = engine.sync_engine.pool
                # NullPool doesn't have these attributes
                if hasattr(pool, 'size'):
                    print(f"Pool size: {pool.size()}")
                    print(f"Checked in connections: {pool.checkedin()}")
                    print(f"Checked out connections: {pool.checkedout()}")
                    print(f"Overflow: {pool.overflow()}")
                    print(f"Total connections: {pool.size() + pool.overflow()}")
                else:
                    print(f"Pool type: {type(pool).__name__} (no detailed stats available)")
            else:
                print("No pool information available")
                
            return True
    except Exception as e:
        print(f"Database connection failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    asyncio.run(test_connection())
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool, QueuePool
from sqlalchemy import event, text
from typing import AsyncGenerator, Optional
import logging
import time
from contextlib import asynccontextmanager
from .config import settings

logger = logging.getLogger(__name__)


def get_database_url() -> str:
    """Get database URL for migrations."""
    return settings.DATABASE_URL


# Database connection pool configuration
POOL_CONFIG = {
    "pool_size": 20,  # Number of persistent connections
    "max_overflow": 10,  # Maximum overflow connections
    "pool_timeout": 30,  # Timeout for getting connection from pool
    "pool_recycle": 3600,  # Recycle connections after 1 hour
    "pool_pre_ping": True,  # Verify connections before using
    "echo_pool": settings.DEBUG,  # Log pool checkouts/checkins
}

# Create async engine with optimized pooling
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    poolclass=QueuePool if not settings.DEBUG else NullPool,
    **POOL_CONFIG if not settings.DEBUG else {},
    # Additional performance settings
    connect_args={
        "server_settings": {
            "application_name": "dreflowpro",
            "jit": "on",
            "statement_timeout": "30000",  # 30 seconds
            "idle_in_transaction_session_timeout": "60000",  # 60 seconds
        },
        "command_timeout": 60,
        "prepared_statement_cache_size": 100,
        "prepared_statement_name_func": lambda idx: f"__asyncpg_{idx}__",
    } if "postgresql" in settings.DATABASE_URL else {}
)

# Create session factory
AsyncSessionFactory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency to get database session."""
    async with AsyncSessionFactory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """Initialize database - create all tables."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db() -> None:
    """Close database connection."""
    await engine.dispose()


# Alias for compatibility
get_db = get_session


class DatabaseMonitor:
    """Monitor database performance and query execution."""
    
    def __init__(self, slow_query_threshold: float = 1.0):
        self.slow_query_threshold = slow_query_threshold
        self.query_stats = {}
        self.slow_queries = []
    
    def log_query(self, query: str, duration: float, params: Optional[dict] = None):
        """Log query execution details."""
        if duration > self.slow_query_threshold:
            self.slow_queries.append({
                "query": query,
                "duration": duration,
                "params": params,
                "timestamp": time.time()
            })
            logger.warning(f"Slow query detected ({duration:.2f}s): {query[:100]}...")
        
        # Update query statistics
        query_key = self._normalize_query(query)
        if query_key not in self.query_stats:
            self.query_stats[query_key] = {
                "count": 0,
                "total_time": 0,
                "max_time": 0,
                "min_time": float('inf')
            }
        
        stats = self.query_stats[query_key]
        stats["count"] += 1
        stats["total_time"] += duration
        stats["max_time"] = max(stats["max_time"], duration)
        stats["min_time"] = min(stats["min_time"], duration)
    
    def _normalize_query(self, query: str) -> str:
        """Normalize query for statistical grouping."""
        # Remove specific values to group similar queries
        import re
        normalized = re.sub(r'\b\d+\b', '?', query)  # Replace numbers
        normalized = re.sub(r"'[^']*'", '?', normalized)  # Replace string literals
        return normalized[:200]  # Limit length for key
    
    def get_stats(self) -> dict:
        """Get query performance statistics."""
        return {
            "query_stats": self.query_stats,
            "slow_queries": self.slow_queries[-100:],  # Keep last 100 slow queries
            "total_queries": sum(s["count"] for s in self.query_stats.values())
        }
    
    def reset_stats(self):
        """Reset collected statistics."""
        self.query_stats = {}
        self.slow_queries = []


# Global database monitor instance
db_monitor = DatabaseMonitor()


# Add event listeners for query monitoring
@event.listens_for(engine.sync_engine, "before_execute")
def before_execute(conn, clauseelement, multiparams, params, execution_options):
    """Track query start time."""
    conn.info["query_start_time"] = time.time()


@event.listens_for(engine.sync_engine, "after_execute")
def after_execute(conn, clauseelement, multiparams, params, execution_options, result):
    """Log query execution time."""
    start_time = conn.info.get("query_start_time")
    if start_time:
        duration = time.time() - start_time
        db_monitor.log_query(str(clauseelement), duration, params)


@asynccontextmanager
async def get_optimized_session():
    """Get an optimized database session with query hints."""
    async with AsyncSessionFactory() as session:
        try:
            # Set session-level optimization hints for PostgreSQL
            if "postgresql" in settings.DATABASE_URL:
                await session.execute(text("SET work_mem = '256MB'"))
                await session.execute(text("SET random_page_cost = 1.1"))
                
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
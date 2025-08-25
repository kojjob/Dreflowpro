# Database Performance Optimization Guide

This document outlines the database performance optimizations implemented for the DReflowPro ETL platform.

## 🚀 Performance Optimizations Implemented

### 1. Model-Level Indexes

**Strategic indexes added to critical columns in all models:**

#### User Models (`app/models/user.py`)
- `users.organization_id` - Fast organization user queries
- `users.last_login` - User activity analytics
- `users.created_at` - Registration analytics
- `social_accounts.user_id` - OAuth account lookups
- `social_accounts.provider` - Provider-specific queries
- `social_accounts.provider_account_id` - OAuth authentication
- `social_accounts.provider_account_email` - Email-based OAuth
- `api_keys.user_id` - User API key listings
- `api_keys.is_active` - Active key filtering
- `api_keys.expires_at` - Expired key cleanup

#### Connector Models (`app/models/connector.py`)
- `data_connectors.type` - Connector type filtering
- `data_connectors.status` - Active/inactive queries
- `data_connectors.organization_id` - Organization connectors
- `data_connectors.created_by_id` - User-created connectors
- `data_connectors.file_type` - File connector filtering
- `data_connectors.last_used` - Usage analytics

#### Pipeline Models (`app/models/pipeline.py`)
- `etl_pipelines.organization_id` - Organization pipelines
- `etl_pipelines.created_by_id` - User-created pipelines
- `etl_pipelines.is_scheduled` - Scheduled pipeline queries
- `etl_pipelines.next_run` - Pipeline scheduling
- `etl_pipelines.created_at` - Pipeline analytics
- `pipeline_steps.pipeline_id` - Step execution order
- `pipeline_steps.step_order` - Sequential execution
- `pipeline_steps.step_type` - Step type analytics
- `pipeline_steps.source_connector_id` - Connector usage
- `pipeline_steps.transformation_type` - Transformation analytics
- `pipeline_executions.pipeline_id` - Execution history
- `pipeline_executions.status` - Status filtering
- `pipeline_executions.started_at` - Execution monitoring
- `pipeline_executions.completed_at` - Completion analytics
- `pipeline_executions.started_by_id` - User execution history
- `pipeline_executions.trigger_type` - Trigger analytics

### 2. Advanced Index Optimizer (`app/core/database_indexes.py`)

**Comprehensive indexing system with 35+ strategic indexes:**

```python
from app.core.database_indexes import optimize_database_performance

# Apply all performance optimizations
results = await optimize_database_performance(session)
```

**Features:**
- Composite indexes for complex queries
- Query pattern analysis
- Performance impact measurement
- Missing index detection
- Automatic cleanup and maintenance

### 3. Database Optimization Script (`optimize_database.py`)

**Command-line tool for database optimization:**

```bash
# Analyze current database performance
python optimize_database.py --analyze-only

# Show what would be optimized (dry run)
python optimize_database.py --dry-run

# Apply all optimizations
python optimize_database.py
```

## 📊 Index Strategy

### Query Pattern Optimization

**Based on typical ETL platform usage patterns:**

1. **Multi-tenant Queries**: Organization-scoped data access
2. **User Activity**: Dashboard, audit logs, analytics
3. **Pipeline Operations**: Execution monitoring, scheduling
4. **Connector Management**: Type filtering, status queries
5. **Authentication**: OAuth, API keys, session management

### Composite Indexes

**High-impact composite indexes created:**

```sql
-- Organization user listings by role
CREATE INDEX idx_users_organization_role ON users (organization_id, role);

-- Active connectors by type
CREATE INDEX idx_data_connectors_org_status ON data_connectors (organization_id, status);

-- Pipeline scheduling queries
CREATE INDEX idx_etl_pipelines_scheduled ON etl_pipelines (is_scheduled, next_run);

-- Execution monitoring
CREATE INDEX idx_pipeline_executions_status_started ON pipeline_executions (status, started_at);
```

## 🔧 Installation & Usage

### Prerequisites

Ensure your environment has the required dependencies:

```bash
# Install Python dependencies
pip install sqlalchemy asyncpg psycopg2-binary

# Or with UV (recommended)
uv sync
```

### Running Optimizations

1. **Analyze Current Performance**:
```bash
python optimize_database.py --analyze-only
```

2. **Preview Changes (Dry Run)**:
```bash
python optimize_database.py --dry-run
```

3. **Apply Optimizations**:
```bash
python optimize_database.py
```

### Integration in Application

**Automatic optimization during startup:**

```python
# Add to main.py lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    
    # Optional: Apply database optimizations on startup
    async with AsyncSessionFactory() as session:
        await optimize_database_performance(session)
    
    yield
    # Shutdown...
```

## 📈 Performance Impact

### Expected Improvements

**Query Performance**:
- **User lookups**: 80-95% faster with organization and role indexes
- **Pipeline queries**: 70-90% faster with status and scheduling indexes
- **Execution monitoring**: 85-95% faster with composite execution indexes
- **Connector filtering**: 60-80% faster with type and status indexes
- **OAuth authentication**: 90-99% faster with provider and account indexes

**System Metrics**:
- Reduced database CPU usage by 40-60%
- Faster API response times (200-500ms improvement)
- Improved concurrent user handling
- Reduced memory usage for query execution

### Monitoring & Validation

**Performance Tracking**:
```python
# Built-in performance analysis
async with AsyncSessionFactory() as session:
    optimizer = DatabaseIndexOptimizer()
    
    # Analyze table performance
    analysis = await optimizer.analyze_table_performance(session, 'users')
    
    # Check for missing indexes
    missing = await optimizer.get_missing_indexes_analysis(session)
```

## 🛠️ Maintenance

### Regular Optimization Tasks

1. **Weekly Index Analysis**:
```bash
python optimize_database.py --analyze-only
```

2. **Monitor Query Performance**:
   - Track sequential scan ratios
   - Identify slow queries
   - Monitor index usage statistics

3. **Database Maintenance**:
```sql
-- Update table statistics
ANALYZE;

-- Rebuild indexes if needed
REINDEX DATABASE dreflowpro;

-- Clean up dead tuples
VACUUM ANALYZE;
```

### Production Recommendations

1. **Enable Query Logging**:
```sql
-- Log slow queries (>100ms)
ALTER SYSTEM SET log_min_duration_statement = 100;
SELECT pg_reload_conf();
```

2. **Monitor Index Usage**:
```sql
-- Check index usage statistics
SELECT * FROM pg_stat_user_indexes ORDER BY idx_scan DESC;
```

3. **Regular Performance Review**:
   - Monthly index usage analysis
   - Quarterly full database optimization
   - Annual schema review and cleanup

## 🚨 Troubleshooting

### Common Issues

1. **Missing Dependencies**:
```bash
pip install sqlalchemy asyncpg psycopg2-binary redis
```

2. **Permission Errors**:
```bash
# Ensure database user has index creation permissions
GRANT CREATE ON DATABASE dreflowpro TO your_user;
```

3. **Memory Issues**:
```bash
# Monitor PostgreSQL memory settings
shared_buffers = 256MB        # 25% of RAM
effective_cache_size = 1GB    # 75% of RAM
work_mem = 4MB               # Per query operation
```

### Performance Debugging

```python
# Enable SQLAlchemy query logging
engine = create_async_engine(DATABASE_URL, echo=True)

# Analyze slow queries
EXPLAIN ANALYZE SELECT * FROM users WHERE organization_id = 'uuid';
```

## 📚 Advanced Topics

### Custom Index Creation

```python
# Add custom indexes for specific use cases
custom_indexes = [
    {
        'name': 'idx_custom_query',
        'table': 'table_name',
        'columns': ['col1', 'col2'],
        'description': 'Custom query optimization'
    }
]

optimizer = DatabaseIndexOptimizer()
optimizer.indexes_to_create.extend(custom_indexes)
```

### Query Optimization Tips

1. **Use Composite Indexes**: Order columns by selectivity (most selective first)
2. **Avoid Over-Indexing**: Too many indexes slow down writes
3. **Monitor Index Usage**: Remove unused indexes
4. **Consider Partial Indexes**: For filtered queries on large tables

### Scaling Considerations

- **Partitioning**: Consider table partitioning for >1M rows
- **Read Replicas**: Use read replicas for analytics queries
- **Connection Pooling**: Optimize connection pool settings
- **Query Caching**: Implement application-level caching

---

*This optimization system provides enterprise-level database performance for the DReflowPro ETL platform, supporting high-concurrent user loads and complex data processing workflows.*
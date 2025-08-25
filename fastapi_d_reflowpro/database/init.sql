-- DReflowPro ETL Platform Database Initialization Script
-- This script runs when PostgreSQL container starts up

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'user', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE pipeline_status AS ENUM ('draft', 'active', 'paused', 'error', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE connector_type AS ENUM ('source', 'destination', 'transformer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE data_quality_status AS ENUM ('passed', 'warning', 'failed', 'skipped');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create performance optimization indexes after tables are created
-- This will be handled by Alembic migrations, but we set up the foundation

-- Optimized configuration for production
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET track_activity_query_size = 2048;
ALTER SYSTEM SET pg_stat_statements.track = 'all';
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_duration = on;
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log queries longer than 1 second

-- Connection and performance settings
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;

-- Logging configuration
ALTER SYSTEM SET log_destination = 'stderr';
ALTER SYSTEM SET logging_collector = on;
ALTER SYSTEM SET log_directory = 'pg_log';
ALTER SYSTEM SET log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log';
ALTER SYSTEM SET log_truncate_on_rotation = on;
ALTER SYSTEM SET log_rotation_age = '1d';
ALTER SYSTEM SET log_rotation_size = '100MB';
ALTER SYSTEM SET log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h ';
ALTER SYSTEM SET log_checkpoints = on;
ALTER SYSTEM SET log_connections = on;
ALTER SYSTEM SET log_disconnections = on;
ALTER SYSTEM SET log_lock_waits = on;
ALTER SYSTEM SET log_temp_files = 10MB;

-- Security settings
ALTER SYSTEM SET ssl = on;
ALTER SYSTEM SET password_encryption = 'scram-sha-256';

-- Create a function to generate API keys
CREATE OR REPLACE FUNCTION generate_api_key() RETURNS TEXT AS $$
BEGIN
    RETURN 'dreflowpro_' || encode(gen_random_bytes(32), 'base64');
END;
$$ LANGUAGE plpgsql;

-- Create a function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a function for audit logging
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (table_name, operation, old_values, user_id, timestamp)
        VALUES (TG_TABLE_NAME, TG_OP, row_to_json(OLD), current_setting('app.current_user_id', true)::uuid, CURRENT_TIMESTAMP);
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (table_name, operation, old_values, new_values, user_id, timestamp)
        VALUES (TG_TABLE_NAME, TG_OP, row_to_json(OLD), row_to_json(NEW), current_setting('app.current_user_id', true)::uuid, CURRENT_TIMESTAMP);
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (table_name, operation, new_values, user_id, timestamp)
        VALUES (TG_TABLE_NAME, TG_OP, row_to_json(NEW), current_setting('app.current_user_id', true)::uuid, CURRENT_TIMESTAMP);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create a function for tenant isolation
CREATE OR REPLACE FUNCTION tenant_isolation_check()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if current user has access to the tenant
    IF NEW.tenant_id IS NOT NULL AND NEW.tenant_id != current_setting('app.current_tenant_id', true)::uuid THEN
        RAISE EXCEPTION 'Access denied: Invalid tenant access';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a function for data quality checks
CREATE OR REPLACE FUNCTION validate_json_schema(data jsonb, schema jsonb)
RETURNS boolean AS $$
BEGIN
    -- Simplified JSON schema validation
    -- In production, you might want to use a proper JSON schema validator
    RETURN true; -- Placeholder implementation
END;
$$ LANGUAGE plpgsql;

-- Create utility functions for pipeline management
CREATE OR REPLACE FUNCTION calculate_pipeline_health_score(pipeline_id uuid)
RETURNS decimal AS $$
DECLARE
    success_rate decimal;
    avg_duration decimal;
    error_count integer;
    health_score decimal;
BEGIN
    -- Calculate success rate from recent pipeline executions
    SELECT 
        COALESCE(
            (COUNT(CASE WHEN status = 'completed' THEN 1 END)::decimal / NULLIF(COUNT(*), 0)) * 100,
            0
        ),
        AVG(EXTRACT(epoch FROM (completed_at - started_at))),
        COUNT(CASE WHEN status = 'failed' THEN 1 END)
    INTO success_rate, avg_duration, error_count
    FROM pipeline_executions 
    WHERE pipeline_id = calculate_pipeline_health_score.pipeline_id
    AND created_at > CURRENT_TIMESTAMP - INTERVAL '7 days';
    
    -- Calculate health score (0-100)
    health_score = (success_rate * 0.6) + 
                  (CASE WHEN avg_duration < 300 THEN 30 ELSE GREATEST(0, 30 - (avg_duration / 300) * 10) END) +
                  (CASE WHEN error_count = 0 THEN 10 ELSE GREATEST(0, 10 - error_count) END);
    
    RETURN LEAST(100, GREATEST(0, health_score));
END;
$$ LANGUAGE plpgsql;

-- Create notification settings table if not exists
CREATE TABLE IF NOT EXISTS notification_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    tenant_id uuid,
    notification_type varchar(100) NOT NULL,
    enabled boolean DEFAULT true,
    email boolean DEFAULT true,
    in_app boolean DEFAULT true,
    webhook_url text,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP
);

-- Create system settings table
CREATE TABLE IF NOT EXISTS system_settings (
    key varchar(255) PRIMARY KEY,
    value jsonb NOT NULL,
    description text,
    category varchar(100),
    is_public boolean DEFAULT false,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP
);

-- Insert default system settings
INSERT INTO system_settings (key, value, description, category, is_public) VALUES
    ('platform.name', '"DReflowPro ETL Platform"', 'Platform name', 'general', true),
    ('platform.version', '"1.0.0"', 'Platform version', 'general', true),
    ('platform.maintenance_mode', 'false', 'Maintenance mode flag', 'general', false),
    ('security.password_min_length', '8', 'Minimum password length', 'security', false),
    ('security.session_timeout', '3600', 'Session timeout in seconds', 'security', false),
    ('limits.max_file_size', '104857600', 'Maximum file upload size in bytes', 'limits', false),
    ('limits.max_pipelines_per_user', '50', 'Maximum pipelines per user', 'limits', false),
    ('email.from_address', '"noreply@dreflowpro.com"', 'Default from email address', 'email', false),
    ('webhooks.default_timeout', '30', 'Default webhook timeout in seconds', 'webhooks', false)
ON CONFLICT (key) DO NOTHING;

-- Create performance monitoring views
CREATE OR REPLACE VIEW pipeline_performance_summary AS
SELECT 
    p.id,
    p.name,
    p.tenant_id,
    COUNT(pe.id) as total_executions,
    COUNT(CASE WHEN pe.status = 'completed' THEN 1 END) as successful_executions,
    COUNT(CASE WHEN pe.status = 'failed' THEN 1 END) as failed_executions,
    ROUND((COUNT(CASE WHEN pe.status = 'completed' THEN 1 END)::decimal / NULLIF(COUNT(pe.id), 0)) * 100, 2) as success_rate,
    AVG(EXTRACT(epoch FROM (pe.completed_at - pe.started_at))) as avg_duration_seconds,
    MAX(pe.created_at) as last_execution,
    calculate_pipeline_health_score(p.id) as health_score
FROM pipelines p
LEFT JOIN pipeline_executions pe ON p.id = pe.pipeline_id
WHERE pe.created_at > CURRENT_TIMESTAMP - INTERVAL '30 days' OR pe.created_at IS NULL
GROUP BY p.id, p.name, p.tenant_id;

-- Create system health monitoring view
CREATE OR REPLACE VIEW system_health_summary AS
SELECT 
    'database' as component,
    CASE 
        WHEN pg_database_size(current_database()) > 0 THEN 'healthy'
        ELSE 'unhealthy'
    END as status,
    pg_size_pretty(pg_database_size(current_database())) as details,
    CURRENT_TIMESTAMP as last_check
UNION ALL
SELECT 
    'active_connections' as component,
    CASE 
        WHEN COUNT(*) < (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') * 0.8 THEN 'healthy'
        WHEN COUNT(*) < (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') * 0.9 THEN 'warning'
        ELSE 'critical'
    END as status,
    COUNT(*)::text || '/' || (SELECT setting FROM pg_settings WHERE name = 'max_connections') as details,
    CURRENT_TIMESTAMP as last_check
FROM pg_stat_activity
WHERE state = 'active';

-- Performance optimization: Create indexes after initial setup
-- These will be managed by Alembic migrations in the application

-- Create a cleanup job for old audit logs
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM audit_logs WHERE timestamp < CURRENT_TIMESTAMP - INTERVAL '90 days';
    DELETE FROM pipeline_executions WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 year' AND status != 'failed';
    DELETE FROM system_logs WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '30 days' AND level != 'ERROR';
    
    -- Analyze tables after cleanup
    ANALYZE audit_logs;
    ANALYZE pipeline_executions;
    ANALYZE system_logs;
END;
$$ LANGUAGE plpgsql;

-- Create a maintenance function
CREATE OR REPLACE FUNCTION database_maintenance()
RETURNS void AS $$
BEGIN
    -- Update table statistics
    ANALYZE;
    
    -- Clean up old temporary files and logs
    PERFORM cleanup_old_audit_logs();
    
    -- Reindex if needed (this is intensive, consider scheduling)
    -- REINDEX DATABASE CONCURRENTLY;
    
    RAISE NOTICE 'Database maintenance completed at %', CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Create basic monitoring table for health checks
CREATE TABLE IF NOT EXISTS health_checks (
    id serial PRIMARY KEY,
    component varchar(100) NOT NULL,
    status varchar(20) NOT NULL,
    details jsonb,
    checked_at timestamp DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial health check
INSERT INTO health_checks (component, status, details) VALUES
    ('database', 'healthy', '{"message": "Database initialized successfully"}');

-- Final setup
SELECT 'DReflowPro database initialization completed successfully' as status;
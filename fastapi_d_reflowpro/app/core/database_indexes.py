"""
Database performance optimization through strategic indexing.
This module provides index creation for common query patterns in the ETL platform.
"""

from sqlalchemy import Index, text
from sqlalchemy.ext.asyncio import AsyncSession
import logging

logger = logging.getLogger(__name__)


class DatabaseIndexOptimizer:
    """Database index optimizer for performance enhancement."""
    
    def __init__(self):
        self.indexes_to_create = [
            # USER TABLE OPTIMIZATION
            # Already has: email (unique index)
            {
                'name': 'idx_users_organization_role',
                'table': 'users',
                'columns': ['organization_id', 'role'],
                'description': 'Optimize organization user listings by role'
            },
            {
                'name': 'idx_users_auth_method_active',
                'table': 'users',
                'columns': ['auth_method', 'is_active'],
                'description': 'Optimize authentication method filtering'
            },
            {
                'name': 'idx_users_last_login',
                'table': 'users',
                'columns': ['last_login'],
                'description': 'Optimize user activity analytics'
            },
            {
                'name': 'idx_users_created_at',
                'table': 'users',
                'columns': ['created_at'],
                'description': 'Optimize user registration analytics'
            },
            
            # ORGANIZATION TABLE OPTIMIZATION
            {
                'name': 'idx_organizations_domain',
                'table': 'organizations',
                'columns': ['domain'],
                'description': 'Optimize domain-based lookups (already unique but explicit index)'
            },
            {
                'name': 'idx_organizations_plan_active',
                'table': 'organizations',
                'columns': ['plan_type', 'is_active'],
                'description': 'Optimize plan-based queries and billing'
            },
            {
                'name': 'idx_organizations_created_at',
                'table': 'organizations',
                'columns': ['created_at'],
                'description': 'Optimize organization analytics'
            },
            
            # SOCIAL ACCOUNTS OPTIMIZATION
            {
                'name': 'idx_social_accounts_user_provider',
                'table': 'social_accounts',
                'columns': ['user_id', 'provider'],
                'description': 'Optimize OAuth account lookups'
            },
            {
                'name': 'idx_social_accounts_provider_account_id',
                'table': 'social_accounts',
                'columns': ['provider', 'provider_account_id'],
                'description': 'Optimize OAuth provider lookups'
            },
            {
                'name': 'idx_social_accounts_provider_email',
                'table': 'social_accounts',
                'columns': ['provider_account_email'],
                'description': 'Optimize OAuth email-based lookups'
            },
            
            # API KEYS OPTIMIZATION
            {
                'name': 'idx_api_keys_user_active',
                'table': 'api_keys',
                'columns': ['user_id', 'is_active'],
                'description': 'Optimize active API key lookups'
            },
            {
                'name': 'idx_api_keys_key_hash',
                'table': 'api_keys',
                'columns': ['key_hash'],
                'description': 'Optimize API key authentication (already unique but explicit index)'
            },
            {
                'name': 'idx_api_keys_expires_at',
                'table': 'api_keys',
                'columns': ['expires_at'],
                'description': 'Optimize expired key cleanup'
            },
            
            # DATA CONNECTORS OPTIMIZATION
            {
                'name': 'idx_data_connectors_org_type',
                'table': 'data_connectors',
                'columns': ['organization_id', 'type'],
                'description': 'Optimize connector listings by type'
            },
            {
                'name': 'idx_data_connectors_org_status',
                'table': 'data_connectors',
                'columns': ['organization_id', 'status'],
                'description': 'Optimize active/inactive connector queries'
            },
            {
                'name': 'idx_data_connectors_created_by',
                'table': 'data_connectors',
                'columns': ['created_by_id'],
                'description': 'Optimize user-created connector listings'
            },
            {
                'name': 'idx_data_connectors_last_used',
                'table': 'data_connectors',
                'columns': ['last_used'],
                'description': 'Optimize connector usage analytics'
            },
            {
                'name': 'idx_data_connectors_file_type',
                'table': 'data_connectors',
                'columns': ['file_type'],
                'description': 'Optimize file connector filtering'
            },
            
            # DATA PREVIEWS OPTIMIZATION
            {
                'name': 'idx_data_previews_connector_id',
                'table': 'data_previews',
                'columns': ['connector_id'],
                'description': 'Optimize preview lookups by connector'
            },
            {
                'name': 'idx_data_previews_created_at',
                'table': 'data_previews',
                'columns': ['created_at'],
                'description': 'Optimize preview cleanup and analytics'
            },
            
            # ETL PIPELINES OPTIMIZATION
            {
                'name': 'idx_etl_pipelines_org_status',
                'table': 'etl_pipelines',
                'columns': ['organization_id', 'status'],
                'description': 'Optimize pipeline listings by status'
            },
            {
                'name': 'idx_etl_pipelines_created_by',
                'table': 'etl_pipelines',
                'columns': ['created_by_id'],
                'description': 'Optimize user-created pipeline listings'
            },
            {
                'name': 'idx_etl_pipelines_scheduled',
                'table': 'etl_pipelines',
                'columns': ['is_scheduled', 'next_run'],
                'description': 'Optimize scheduled pipeline execution'
            },
            {
                'name': 'idx_etl_pipelines_status_next_run',
                'table': 'etl_pipelines',
                'columns': ['status', 'next_run'],
                'description': 'Optimize pipeline scheduler queries'
            },
            {
                'name': 'idx_etl_pipelines_created_at',
                'table': 'etl_pipelines',
                'columns': ['created_at'],
                'description': 'Optimize pipeline analytics'
            },
            
            # PIPELINE STEPS OPTIMIZATION
            {
                'name': 'idx_pipeline_steps_pipeline_order',
                'table': 'pipeline_steps',
                'columns': ['pipeline_id', 'step_order'],
                'description': 'Optimize pipeline step execution order'
            },
            {
                'name': 'idx_pipeline_steps_connector',
                'table': 'pipeline_steps',
                'columns': ['source_connector_id'],
                'description': 'Optimize connector usage tracking'
            },
            {
                'name': 'idx_pipeline_steps_type',
                'table': 'pipeline_steps',
                'columns': ['step_type'],
                'description': 'Optimize step type analytics'
            },
            {
                'name': 'idx_pipeline_steps_transformation',
                'table': 'pipeline_steps',
                'columns': ['transformation_type'],
                'description': 'Optimize transformation analytics'
            },
            
            # PIPELINE EXECUTIONS OPTIMIZATION
            {
                'name': 'idx_pipeline_executions_pipeline_status',
                'table': 'pipeline_executions',
                'columns': ['pipeline_id', 'status'],
                'description': 'Optimize execution history queries'
            },
            {
                'name': 'idx_pipeline_executions_status_started',
                'table': 'pipeline_executions',
                'columns': ['status', 'started_at'],
                'description': 'Optimize running execution monitoring'
            },
            {
                'name': 'idx_pipeline_executions_started_by',
                'table': 'pipeline_executions',
                'columns': ['started_by_id'],
                'description': 'Optimize user execution history'
            },
            {
                'name': 'idx_pipeline_executions_trigger_type',
                'table': 'pipeline_executions',
                'columns': ['trigger_type'],
                'description': 'Optimize execution trigger analytics'
            },
            {
                'name': 'idx_pipeline_executions_created_at',
                'table': 'pipeline_executions',
                'columns': ['created_at'],
                'description': 'Optimize execution timeline queries'
            },
            {
                'name': 'idx_pipeline_executions_completed_at',
                'table': 'pipeline_executions',
                'columns': ['completed_at'],
                'description': 'Optimize completion analytics'
            },
            
            # TRANSFORMATION TEMPLATES OPTIMIZATION
            {
                'name': 'idx_transformation_templates_category',
                'table': 'transformation_templates',
                'columns': ['category'],
                'description': 'Optimize template browsing by category'
            },
            {
                'name': 'idx_transformation_templates_type',
                'table': 'transformation_templates',
                'columns': ['transformation_type'],
                'description': 'Optimize template filtering by type'
            },
            {
                'name': 'idx_transformation_templates_active_usage',
                'table': 'transformation_templates',
                'columns': ['is_active', 'usage_count'],
                'description': 'Optimize popular template queries'
            }
        ]
        
    async def create_indexes(self, session: AsyncSession) -> dict:
        """Create all database indexes for performance optimization."""
        results = {
            'created': [],
            'failed': [],
            'already_exists': []
        }
        
        logger.info(f"Starting creation of {len(self.indexes_to_create)} performance indexes")
        
        for index_info in self.indexes_to_create:
            try:
                # Create index with IF NOT EXISTS to avoid errors
                columns_str = ', '.join(index_info['columns'])
                create_sql = f"""
                CREATE INDEX IF NOT EXISTS {index_info['name']} 
                ON {index_info['table']} ({columns_str})
                """
                
                await session.execute(text(create_sql))
                results['created'].append({
                    'name': index_info['name'],
                    'table': index_info['table'],
                    'columns': index_info['columns'],
                    'description': index_info['description']
                })
                logger.info(f"Created index: {index_info['name']} on {index_info['table']}({columns_str})")
                
            except Exception as e:
                error_msg = str(e)
                if "already exists" in error_msg.lower():
                    results['already_exists'].append(index_info['name'])
                    logger.info(f"Index already exists: {index_info['name']}")
                else:
                    results['failed'].append({
                        'name': index_info['name'],
                        'error': error_msg
                    })
                    logger.error(f"Failed to create index {index_info['name']}: {error_msg}")
        
        await session.commit()
        
        # Log summary
        logger.info(f"Index creation complete: {len(results['created'])} created, "
                   f"{len(results['already_exists'])} already existed, "
                   f"{len(results['failed'])} failed")
        
        return results
    
    async def analyze_table_performance(self, session: AsyncSession, table_name: str) -> dict:
        """Analyze table performance statistics."""
        try:
            # Get table statistics
            stats_sql = f"""
            SELECT 
                schemaname,
                tablename,
                n_tup_ins as inserts,
                n_tup_upd as updates,
                n_tup_del as deletes,
                n_live_tup as live_rows,
                n_dead_tup as dead_rows,
                seq_scan as sequential_scans,
                seq_tup_read as sequential_reads,
                idx_scan as index_scans,
                idx_tup_fetch as index_reads
            FROM pg_stat_user_tables 
            WHERE tablename = '{table_name}'
            """
            
            result = await session.execute(text(stats_sql))
            stats = result.fetchone()
            
            if stats:
                return {
                    'table': table_name,
                    'live_rows': stats.live_rows,
                    'dead_rows': stats.dead_rows,
                    'sequential_scans': stats.sequential_scans,
                    'sequential_reads': stats.sequential_reads,
                    'index_scans': stats.index_scans or 0,
                    'index_reads': stats.index_reads or 0,
                    'scan_ratio': (stats.idx_scan or 0) / max((stats.seq_scan or 0) + (stats.idx_scan or 0), 1)
                }
            else:
                return {'table': table_name, 'error': 'Table not found'}
                
        except Exception as e:
            logger.error(f"Error analyzing table {table_name}: {e}")
            return {'table': table_name, 'error': str(e)}
    
    async def get_missing_indexes_analysis(self, session: AsyncSession) -> list:
        """Analyze potentially missing indexes based on query patterns."""
        try:
            # Query to find tables with high sequential scan ratios
            missing_indexes_sql = """
            SELECT 
                tablename,
                seq_scan,
                seq_tup_read,
                idx_scan,
                n_live_tup,
                CASE 
                    WHEN seq_scan > 0 AND idx_scan > 0 THEN 
                        ROUND((seq_scan::float / (seq_scan + idx_scan)::float) * 100, 2)
                    WHEN seq_scan > 0 AND (idx_scan IS NULL OR idx_scan = 0) THEN 100.0
                    ELSE 0.0
                END as seq_scan_percentage
            FROM pg_stat_user_tables 
            WHERE n_live_tup > 100  -- Only analyze tables with substantial data
            ORDER BY seq_scan_percentage DESC, seq_scan DESC
            LIMIT 10
            """
            
            result = await session.execute(text(missing_indexes_sql))
            rows = result.fetchall()
            
            return [
                {
                    'table': row.tablename,
                    'sequential_scans': row.seq_scan,
                    'sequential_reads': row.seq_tup_read,
                    'index_scans': row.idx_scan or 0,
                    'live_rows': row.n_live_tup,
                    'seq_scan_percentage': float(row.seq_scan_percentage)
                }
                for row in rows
            ]
            
        except Exception as e:
            logger.error(f"Error analyzing missing indexes: {e}")
            return []


# Utility function to run index optimization
async def optimize_database_performance(session: AsyncSession) -> dict:
    """Main function to optimize database performance with indexes."""
    optimizer = DatabaseIndexOptimizer()
    
    # Create performance indexes
    results = await optimizer.create_indexes(session)
    
    # Analyze table performance
    performance_analysis = []
    critical_tables = [
        'users', 'organizations', 'data_connectors', 'etl_pipelines', 
        'pipeline_executions', 'pipeline_steps'
    ]
    
    for table in critical_tables:
        analysis = await optimizer.analyze_table_performance(session, table)
        performance_analysis.append(analysis)
    
    # Get missing indexes analysis
    missing_indexes = await optimizer.get_missing_indexes_analysis(session)
    
    return {
        'index_creation': results,
        'performance_analysis': performance_analysis,
        'missing_indexes_analysis': missing_indexes,
        'recommendations': [
            "Monitor sequential scan ratios - high ratios indicate missing indexes",
            "Consider partitioning large tables (>1M rows) for better performance",
            "Regular VACUUM and ANALYZE operations for optimal query planning",
            "Monitor query performance with pg_stat_statements extension"
        ]
    }
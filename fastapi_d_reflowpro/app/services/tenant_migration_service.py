"""
Tenant migration service for adding multi-tenant support to existing models.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, inspect
import logging

logger = logging.getLogger(__name__)


class TenantMigrationService:
    """Service to handle database migrations for multi-tenant support."""
    
    @staticmethod
    async def migrate_existing_models(db: AsyncSession):
        """
        Add tenant_id columns to existing models if they don't exist.
        This ensures backward compatibility while adding multi-tenant support.
        """
        try:
            # Get database inspector
            inspector = inspect(db.bind)
            
            # List of tables that need tenant_id columns
            tables_to_migrate = [
                "users",
                "etl_pipelines", 
                "data_connectors"
            ]
            
            for table_name in tables_to_migrate:
                await TenantMigrationService._add_tenant_id_column(db, table_name, inspector)
            
            logger.info("Tenant migration completed successfully")
            
        except Exception as e:
            logger.error(f"Error during tenant migration: {e}")
            raise
    
    @staticmethod
    async def _add_tenant_id_column(db: AsyncSession, table_name: str, inspector):
        """Add tenant_id column to a table if it doesn't exist."""
        try:
            # Get existing columns
            columns = [col['name'] for col in inspector.get_columns(table_name)]
            
            # Check if tenant_id already exists
            if 'tenant_id' in columns:
                logger.info(f"Table {table_name} already has tenant_id column, skipping")
                return
            
            # Add tenant_id column
            await db.execute(text(f"""
                ALTER TABLE {table_name} 
                ADD COLUMN tenant_id VARCHAR REFERENCES tenants(id)
            """))
            
            # Create index for better performance
            await db.execute(text(f"""
                CREATE INDEX IF NOT EXISTS ix_{table_name}_tenant_id 
                ON {table_name}(tenant_id)
            """))
            
            await db.commit()
            logger.info(f"Successfully added tenant_id column to {table_name}")
            
        except Exception as e:
            # For SQLite, ALTER TABLE ADD COLUMN with REFERENCES might not work
            # Try without the reference constraint
            try:
                await db.rollback()
                
                # Add column without reference constraint (SQLite limitation)
                await db.execute(text(f"""
                    ALTER TABLE {table_name} 
                    ADD COLUMN tenant_id VARCHAR
                """))
                
                # Create index
                await db.execute(text(f"""
                    CREATE INDEX IF NOT EXISTS ix_{table_name}_tenant_id 
                    ON {table_name}(tenant_id)
                """))
                
                await db.commit()
                logger.info(f"Successfully added tenant_id column to {table_name} (without FK constraint)")
                
            except Exception as inner_e:
                await db.rollback()
                logger.warning(f"Could not add tenant_id to {table_name}: {inner_e}")
    
    @staticmethod
    async def verify_migration(db: AsyncSession) -> dict:
        """
        Verify that the tenant migration was successful.
        Returns a dict with migration status for each table.
        """
        results = {}
        inspector = inspect(db.bind)
        
        tables_to_check = [
            "users",
            "etl_pipelines",
            "data_connectors",
            "tenants",
            "tenant_api_keys",
            "tenant_usage_logs",
            "tenant_invitations"
        ]
        
        for table_name in tables_to_check:
            try:
                if inspector.has_table(table_name):
                    columns = [col['name'] for col in inspector.get_columns(table_name)]
                    results[table_name] = {
                        "exists": True,
                        "has_tenant_id": 'tenant_id' in columns,
                        "columns": len(columns)
                    }
                else:
                    results[table_name] = {
                        "exists": False,
                        "has_tenant_id": False,
                        "columns": 0
                    }
            except Exception as e:
                logger.warning(f"Error checking table {table_name}: {e}")
                results[table_name] = {
                    "exists": False,
                    "has_tenant_id": False,
                    "error": str(e)
                }
        
        return results
    
    @staticmethod
    async def create_default_tenant(
        db: AsyncSession,
        name: str = "Default Organization",
        slug: str = "default"
    ) -> str:
        """
        Create a default tenant for existing data.
        Returns the tenant_id of the created tenant.
        """
        try:
            from app.models.tenant import Tenant
            
            # Check if default tenant already exists
            result = await db.execute(text("SELECT id FROM tenants WHERE slug = :slug"), {"slug": slug})
            existing_tenant = result.fetchone()
            
            if existing_tenant:
                logger.info(f"Default tenant already exists: {existing_tenant[0]}")
                return existing_tenant[0]
            
            # Create default tenant
            tenant = Tenant(
                name=name,
                slug=slug,
                plan_type="professional",  # Give existing installations professional features
                max_users=50,
                max_pipelines=100,
                max_data_size_gb=100,
                max_api_calls_monthly=100000,
                is_active=True,
                is_suspended=False
            )
            
            db.add(tenant)
            await db.commit()
            await db.refresh(tenant)
            
            logger.info(f"Created default tenant: {tenant.name} ({tenant.id})")
            return tenant.id
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Error creating default tenant: {e}")
            raise
    
    @staticmethod
    async def assign_existing_data_to_tenant(db: AsyncSession, tenant_id: str):
        """
        Assign existing data (users, pipelines, connectors) to the default tenant.
        """
        try:
            # Update existing users without tenant_id
            await db.execute(text("""
                UPDATE users 
                SET tenant_id = :tenant_id 
                WHERE tenant_id IS NULL
            """), {"tenant_id": tenant_id})
            
            # Update existing pipelines without tenant_id  
            await db.execute(text("""
                UPDATE etl_pipelines 
                SET tenant_id = :tenant_id 
                WHERE tenant_id IS NULL
            """), {"tenant_id": tenant_id})
            
            # Update existing connectors without tenant_id
            await db.execute(text("""
                UPDATE data_connectors 
                SET tenant_id = :tenant_id 
                WHERE tenant_id IS NULL
            """), {"tenant_id": tenant_id})
            
            await db.commit()
            logger.info(f"Assigned existing data to tenant: {tenant_id}")
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Error assigning data to tenant: {e}")
            raise
    
    @staticmethod 
    async def run_complete_migration(db: AsyncSession):
        """
        Run the complete migration process:
        1. Add tenant_id columns to existing tables
        2. Create default tenant
        3. Assign existing data to default tenant
        4. Verify migration
        """
        try:
            logger.info("Starting complete tenant migration...")
            
            # Step 1: Migrate existing models
            await TenantMigrationService.migrate_existing_models(db)
            
            # Step 2: Create default tenant
            tenant_id = await TenantMigrationService.create_default_tenant(db)
            
            # Step 3: Assign existing data to tenant
            await TenantMigrationService.assign_existing_data_to_tenant(db, tenant_id)
            
            # Step 4: Verify migration
            verification = await TenantMigrationService.verify_migration(db)
            
            logger.info("Complete tenant migration finished successfully")
            return {
                "success": True,
                "default_tenant_id": tenant_id,
                "verification": verification
            }
            
        except Exception as e:
            logger.error(f"Complete migration failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }
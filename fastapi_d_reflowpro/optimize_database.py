#!/usr/bin/env python3
"""
Database Performance Optimization Script
Applies strategic database indexes for improved query performance.

Usage:
    python optimize_database.py [--analyze-only] [--dry-run]

Options:
    --analyze-only    Only analyze current performance, don't create indexes
    --dry-run        Show what would be done without making changes
"""

import asyncio
import argparse
import sys
import json
from pathlib import Path

# Add the app directory to Python path
sys.path.append(str(Path(__file__).parent / "app"))

from app.core.database import AsyncSessionFactory, init_db
from app.core.database_indexes import optimize_database_performance, DatabaseIndexOptimizer
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def analyze_database_performance():
    """Analyze current database performance without making changes."""
    async with AsyncSessionFactory() as session:
        optimizer = DatabaseIndexOptimizer()
        
        print("🔍 Analyzing Database Performance...")
        print("=" * 60)
        
        # Analyze critical tables
        critical_tables = [
            'users', 'organizations', 'data_connectors', 'etl_pipelines', 
            'pipeline_executions', 'pipeline_steps', 'social_accounts', 
            'api_keys', 'data_previews', 'transformation_templates'
        ]
        
        print("\n📊 Table Performance Analysis:")
        print("-" * 40)
        
        for table in critical_tables:
            analysis = await optimizer.analyze_table_performance(session, table)
            if 'error' not in analysis:
                scan_ratio = analysis.get('scan_ratio', 0) * 100
                status = "🟢 Good" if scan_ratio > 0.8 else "🟡 Fair" if scan_ratio > 0.5 else "🔴 Poor"
                
                print(f"{table:25} | Rows: {analysis['live_rows']:8,} | "
                      f"Index Ratio: {scan_ratio:5.1f}% | {status}")
            else:
                print(f"{table:25} | ❌ {analysis['error']}")
        
        # Missing indexes analysis
        missing_indexes = await optimizer.get_missing_indexes_analysis(session)
        
        if missing_indexes:
            print("\n⚠️  Tables with High Sequential Scan Ratios:")
            print("-" * 50)
            for table_info in missing_indexes:
                if table_info['seq_scan_percentage'] > 10:  # More than 10% sequential scans
                    print(f"{table_info['table']:25} | "
                          f"Seq Scans: {table_info['seq_scan_percentage']:5.1f}% | "
                          f"Rows: {table_info['live_rows']:,}")
        
        print(f"\n📈 Performance Recommendations:")
        print("-" * 35)
        print("• Tables with <80% index usage need optimization")
        print("• High sequential scan ratios indicate missing indexes")
        print("• Monitor query performance regularly")
        print("• Consider partitioning for tables >1M rows")


async def apply_database_optimization(dry_run=False):
    """Apply database performance optimizations."""
    if dry_run:
        print("🧪 DRY RUN MODE - No changes will be made")
        print("=" * 50)
    else:
        print("🚀 Applying Database Performance Optimizations...")
        print("=" * 55)
    
    async with AsyncSessionFactory() as session:
        optimizer = DatabaseIndexOptimizer()
        
        if dry_run:
            print(f"\n📋 Would create {len(optimizer.indexes_to_create)} indexes:")
            print("-" * 45)
            
            for index_info in optimizer.indexes_to_create:
                columns_str = ', '.join(index_info['columns'])
                print(f"• {index_info['name']}")
                print(f"  Table: {index_info['table']}")
                print(f"  Columns: {columns_str}")
                print(f"  Purpose: {index_info['description']}")
                print()
        else:
            # Apply optimizations
            results = await optimize_database_performance(session)
            
            print("\n✅ Index Creation Results:")
            print("-" * 25)
            print(f"Created: {len(results['index_creation']['created'])}")
            print(f"Already Existed: {len(results['index_creation']['already_exists'])}")
            print(f"Failed: {len(results['index_creation']['failed'])}")
            
            if results['index_creation']['failed']:
                print("\n❌ Failed Indexes:")
                for failed in results['index_creation']['failed']:
                    print(f"• {failed['name']}: {failed['error']}")
            
            if results['index_creation']['created']:
                print("\n🎉 Successfully Created Indexes:")
                for created in results['index_creation']['created']:
                    print(f"• {created['name']} on {created['table']}")
            
            print("\n📊 Performance Impact Analysis:")
            print("-" * 33)
            for analysis in results['performance_analysis']:
                if 'error' not in analysis:
                    scan_ratio = analysis.get('scan_ratio', 0) * 100
                    print(f"{analysis['table']:20} | Index Ratio: {scan_ratio:5.1f}%")
            
            print("\n💡 Optimization Recommendations:")
            print("-" * 35)
            for rec in results['recommendations']:
                print(f"• {rec}")


async def main():
    """Main execution function."""
    parser = argparse.ArgumentParser(description='Database Performance Optimization')
    parser.add_argument('--analyze-only', action='store_true', 
                       help='Only analyze performance, don\'t create indexes')
    parser.add_argument('--dry-run', action='store_true',
                       help='Show what would be done without making changes')
    
    args = parser.parse_args()
    
    try:
        # Ensure database is initialized
        await init_db()
        
        if args.analyze_only:
            await analyze_database_performance()
        else:
            await apply_database_optimization(dry_run=args.dry_run)
            
        print("\n✨ Database optimization complete!")
        
    except Exception as e:
        logger.error(f"Database optimization failed: {e}")
        print(f"\n❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
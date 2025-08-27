#!/usr/bin/env python3
"""
Create seed data for DReflowPro ETL system.
This script populates the database with transformation templates only.
"""

import asyncio
import uuid
from datetime import datetime, UTC
from typing import Dict, Any

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.core.database import get_database_url
from app.models.pipeline import TransformationTemplate, TransformationType
from app.models.user import Organization  # Import to resolve relationships
from app.models.connector import DataConnector  # Import to resolve relationships


async def create_transformation_templates(session: AsyncSession):
    """Create transformation templates for the pipeline builder."""
    
    templates = [
        {
            "name": "Filter Data",
            "transformation_type": TransformationType.FILTER,
            "category": "data_quality",
            "description": "Filter rows based on conditions (e.g., age > 18, status = 'active')",
            "config_schema": {
                "type": "object",
                "properties": {
                    "conditions": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "column": {"type": "string"},
                                "operator": {"type": "string", "enum": ["=", "!=", ">", "<", ">=", "<=", "contains", "starts_with", "ends_with"]},
                                "value": {"type": ["string", "number", "boolean"]},
                                "logic": {"type": "string", "enum": ["AND", "OR"], "default": "AND"}
                            },
                            "required": ["column", "operator", "value"]
                        }
                    }
                },
                "required": ["conditions"]
            },
            "example_config": {
                "conditions": [
                    {"column": "age", "operator": ">", "value": 18},
                    {"column": "status", "operator": "=", "value": "active", "logic": "AND"}
                ]
            }
        },
        {
            "name": "Select Columns",
            "transformation_type": TransformationType.MAP,
            "category": "data_structure",
            "description": "Select specific columns from the dataset",
            "config_schema": {
                "type": "object",
                "properties": {
                    "columns": {
                        "type": "array",
                        "items": {"type": "string"},
                        "minItems": 1
                    },
                    "exclude": {
                        "type": "boolean",
                        "default": False,
                        "description": "If true, exclude the specified columns instead of selecting them"
                    }
                },
                "required": ["columns"]
            },
            "example_config": {
                "columns": ["name", "email", "created_at"],
                "exclude": False
            }
        },
        {
            "name": "Rename Columns",
            "transformation_type": TransformationType.MAP,
            "category": "data_structure",
            "description": "Rename columns in the dataset",
            "config_schema": {
                "type": "object",
                "properties": {
                    "column_mapping": {
                        "type": "object",
                        "patternProperties": {
                            ".*": {"type": "string"}
                        }
                    }
                },
                "required": ["column_mapping"]
            },
            "example_config": {
                "column_mapping": {
                    "old_name": "new_name",
                    "user_id": "customer_id",
                    "created_date": "registration_date"
                }
            }
        },
        {
            "name": "Add Calculated Column",
            "transformation_type": TransformationType.CALCULATE,
            "category": "data_enhancement",
            "description": "Add a new column based on calculations or expressions",
            "config_schema": {
                "type": "object",
                "properties": {
                    "new_column": {"type": "string"},
                    "expression": {"type": "string"},
                    "data_type": {"type": "string", "enum": ["string", "integer", "float", "boolean", "date"], "default": "string"}
                },
                "required": ["new_column", "expression"]
            },
            "example_config": {
                "new_column": "full_name",
                "expression": "first_name + ' ' + last_name",
                "data_type": "string"
            }
        },
        {
            "name": "Group By & Aggregate",
            "transformation_type": TransformationType.AGGREGATE,
            "category": "data_analysis",
            "description": "Group data and perform aggregations (sum, count, average, etc.)",
            "config_schema": {
                "type": "object",
                "properties": {
                    "group_by": {
                        "type": "array",
                        "items": {"type": "string"},
                        "minItems": 1
                    },
                    "aggregations": {
                        "type": "object",
                        "patternProperties": {
                            ".*": {
                                "type": "object",
                                "properties": {
                                    "function": {"type": "string", "enum": ["sum", "count", "avg", "min", "max", "std", "var"]},
                                    "column": {"type": "string"}
                                },
                                "required": ["function"]
                            }
                        }
                    }
                },
                "required": ["group_by", "aggregations"]
            },
            "example_config": {
                "group_by": ["category", "region"],
                "aggregations": {
                    "total_sales": {"function": "sum", "column": "sales_amount"},
                    "order_count": {"function": "count"},
                    "avg_price": {"function": "avg", "column": "price"}
                }
            }
        },
        {
            "name": "Sort Data",
            "transformation_type": TransformationType.SORT,
            "category": "data_structure",
            "description": "Sort data by one or more columns",
            "config_schema": {
                "type": "object",
                "properties": {
                    "sort_columns": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "column": {"type": "string"},
                                "direction": {"type": "string", "enum": ["asc", "desc"], "default": "asc"}
                            },
                            "required": ["column"]
                        },
                        "minItems": 1
                    }
                },
                "required": ["sort_columns"]
            },
            "example_config": {
                "sort_columns": [
                    {"column": "created_at", "direction": "desc"},
                    {"column": "name", "direction": "asc"}
                ]
            }
        },
        {
            "name": "Remove Duplicates",
            "transformation_type": TransformationType.DEDUPLICATE,
            "category": "data_quality",
            "description": "Remove duplicate rows based on specified columns",
            "config_schema": {
                "type": "object",
                "properties": {
                    "columns": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Columns to check for duplicates. If empty, checks all columns"
                    },
                    "keep": {"type": "string", "enum": ["first", "last"], "default": "first"}
                }
            },
            "example_config": {
                "columns": ["email"],
                "keep": "first"
            }
        },
        {
            "name": "Fill Missing Values",
            "transformation_type": TransformationType.VALIDATE,
            "category": "data_quality",
            "description": "Handle missing values by filling with specified values or strategies",
            "config_schema": {
                "type": "object",
                "properties": {
                    "strategy": {"type": "string", "enum": ["value", "mean", "median", "mode", "forward_fill", "backward_fill"]},
                    "fill_value": {"type": ["string", "number", "null"]},
                    "columns": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Specific columns to fill. If empty, applies to all columns"
                    }
                },
                "required": ["strategy"]
            },
            "example_config": {
                "strategy": "value",
                "fill_value": "Unknown",
                "columns": ["category", "description"]
            }
        },
        {
            "name": "Join Data",
            "transformation_type": TransformationType.JOIN,
            "category": "data_integration",
            "description": "Join data with another dataset",
            "config_schema": {
                "type": "object",
                "properties": {
                    "join_type": {"type": "string", "enum": ["inner", "left", "right", "outer"]},
                    "left_on": {"type": "string"},
                    "right_on": {"type": "string"},
                    "suffix": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2, "default": ["_left", "_right"]}
                },
                "required": ["join_type", "left_on", "right_on"]
            },
            "example_config": {
                "join_type": "left",
                "left_on": "user_id",
                "right_on": "id",
                "suffix": ["", "_profile"]
            }
        },
        {
            "name": "Pivot Table",
            "transformation_type": TransformationType.MAP,
            "category": "data_analysis",
            "description": "Create a pivot table from the data",
            "config_schema": {
                "type": "object",
                "properties": {
                    "index": {"type": "string"},
                    "columns": {"type": "string"},
                    "values": {"type": "string"},
                    "aggfunc": {"type": "string", "enum": ["sum", "count", "mean", "min", "max"], "default": "sum"}
                },
                "required": ["index", "columns", "values"]
            },
            "example_config": {
                "index": "product_category",
                "columns": "month",
                "values": "sales_amount",
                "aggfunc": "sum"
            }
        }
    ]
    
    created_templates = []
    for template_data in templates:
        template = TransformationTemplate(
            name=template_data["name"],
            transformation_type=template_data["transformation_type"],
            category=template_data["category"],
            description=template_data["description"],
            template_config=template_data["config_schema"],
            ui_config=template_data["example_config"],
            is_active=True,
            usage_count=0
        )
        session.add(template)
        created_templates.append(template)
    
    await session.commit()
    print(f"✅ Created {len(created_templates)} transformation templates")
    return created_templates


# Skipping connectors for now to avoid organization dependency issues


async def main():
    """Main function to create seed data."""
    print("🌱 Creating seed data for DReflowPro ETL system...")
    
    # Create async engine
    database_url = get_database_url()
    if not database_url.startswith("postgresql+asyncpg://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://")
    
    engine = create_async_engine(database_url)
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with async_session() as session:
        # Create transformation templates
        templates = await create_transformation_templates(session)
        
        print(f"\n🎉 Seed data creation completed!")
        print(f"   • {len(templates)} transformation templates")
        print("\nYou can now test the pipeline builder with these templates.")


if __name__ == "__main__":
    asyncio.run(main())
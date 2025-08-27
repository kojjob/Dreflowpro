"""Configuration API endpoints for dynamic settings management."""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, Optional, List
import logging

from ....core.deps import get_current_user
from ....models.user import User
from ....core.config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/config", tags=["config"])

# Default transformation options
DEFAULT_TRANSFORMATIONS = [
    {
        "type": "deduplicate",
        "name": "Remove Duplicates",
        "description": "Remove duplicate rows from your data",
        "icon": "Zap",
        "enabled": True,
        "config_schema": {
            "columns": {
                "type": "array",
                "description": "Specific columns to check for duplicates (empty for all)",
                "default": []
            },
            "keep": {
                "type": "string",
                "enum": ["first", "last"],
                "description": "Which duplicate to keep",
                "default": "first"
            }
        }
    },
    {
        "type": "validate",
        "name": "Data Validation",
        "description": "Validate and clean your data",
        "icon": "Eye",
        "enabled": True,
        "config_schema": {
            "remove_empty_rows": {
                "type": "boolean",
                "description": "Remove completely empty rows",
                "default": True
            },
            "standardize_text": {
                "type": "boolean",
                "description": "Standardize text formatting",
                "default": True
            },
            "validate_email": {
                "type": "boolean",
                "description": "Validate email format",
                "default": False
            }
        }
    },
    {
        "type": "aggregate",
        "name": "Aggregate Data",
        "description": "Group and summarize your data",
        "icon": "Download",
        "enabled": True,
        "config_schema": {
            "group_by": {
                "type": "array",
                "description": "Columns to group by",
                "required": True
            },
            "aggregations": {
                "type": "object",
                "description": "Column aggregation methods",
                "default": {}
            }
        }
    },
    {
        "type": "filter",
        "name": "Filter Data",
        "description": "Filter rows based on conditions",
        "icon": "Filter",
        "enabled": True,
        "config_schema": {
            "conditions": {
                "type": "array",
                "description": "Filter conditions",
                "required": True
            }
        }
    },
    {
        "type": "sort",
        "name": "Sort Data",
        "description": "Sort data by specified columns",
        "icon": "ArrowUpDown",
        "enabled": True,
        "config_schema": {
            "columns": {
                "type": "array",
                "description": "Columns to sort by",
                "required": True
            },
            "ascending": {
                "type": "boolean",
                "description": "Sort in ascending order",
                "default": True
            }
        }
    }
]

# File type configurations
FILE_TYPE_CONFIGS = {
    "csv": {
        "name": "CSV Files",
        "extensions": [".csv"],
        "mime_types": ["text/csv", "application/csv"],
        "max_size_mb": 100,
        "preview_rows_default": 100,
        "supports_preview": True,
        "supports_analysis": True
    },
    "xlsx": {
        "name": "Excel Files (XLSX)",
        "extensions": [".xlsx"],
        "mime_types": ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
        "max_size_mb": 100,
        "preview_rows_default": 100,
        "supports_preview": True,
        "supports_analysis": True
    },
    "xls": {
        "name": "Excel Files (XLS)",
        "extensions": [".xls"],
        "mime_types": ["application/vnd.ms-excel"],
        "max_size_mb": 50,
        "preview_rows_default": 100,
        "supports_preview": True,
        "supports_analysis": True
    },
    "json": {
        "name": "JSON Files",
        "extensions": [".json"],
        "mime_types": ["application/json", "text/json"],
        "max_size_mb": 50,
        "preview_rows_default": 50,
        "supports_preview": True,
        "supports_analysis": True
    },
    "txt": {
        "name": "Text Files",
        "extensions": [".txt", ".tsv"],
        "mime_types": ["text/plain", "text/tab-separated-values"],
        "max_size_mb": 25,
        "preview_rows_default": 100,
        "supports_preview": True,
        "supports_analysis": True
    }
}


@router.get("/upload")
async def get_upload_config(
    current_user: User = Depends(get_current_user)
):
    """Get upload configuration settings."""
    try:
        settings = get_settings()
        
        return {
            "success": True,
            "config": {
                "max_file_size": settings.MAX_UPLOAD_SIZE,
                "accepted_file_types": list(FILE_TYPE_CONFIGS.keys()),
                "file_type_configs": FILE_TYPE_CONFIGS,
                "default_preview_rows": 100,
                "max_preview_rows": 10000,
                "auto_analyze": True,
                "cleanup_hours": 24
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to get upload config: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve upload configuration"
        )


@router.get("/transformations")
async def get_transformation_options(
    current_user: User = Depends(get_current_user),
    file_type: Optional[str] = None
):
    """Get available transformation options."""
    try:
        # Filter transformations based on file type if specified
        transformations = DEFAULT_TRANSFORMATIONS.copy()
        
        if file_type:
            # Some transformations might not be available for certain file types
            if file_type == "json":
                # JSON might have different transformation capabilities
                pass
            elif file_type == "txt":
                # Text files might have limited aggregation options
                pass
        
        return {
            "success": True,
            "transformations": transformations,
            "total_count": len(transformations),
            "supported_file_types": list(FILE_TYPE_CONFIGS.keys())
        }
        
    except Exception as e:
        logger.error(f"Failed to get transformation options: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve transformation options"
        )


@router.get("/user-preferences")
async def get_user_preferences(
    current_user: User = Depends(get_current_user)
):
    """Get user preferences for data upload and analysis."""
    try:
        # In a real implementation, this would fetch from a user preferences table
        # For now, return default preferences with user-specific overrides
        
        default_preferences = {
            "upload_preferences": {
                "auto_analyze": True,
                "default_preview_rows": 100,
                "remember_last_settings": True,
                "max_file_size": get_settings().MAX_UPLOAD_SIZE
            },
            "visualization_preferences": {
                "default_chart_type": "bar",
                "show_data_quality": True,
                "enable_interactive_charts": True,
                "color_scheme": "default"
            },
            "preview_preferences": {
                "default_page_size": 25,
                "show_column_types": True,
                "highlight_missing_values": True,
                "enable_column_sorting": True
            },
            "transformation_preferences": {
                "show_preview_before_apply": True,
                "auto_save_configurations": True,
                "default_duplicate_handling": "first"
            }
        }
        
        return {
            "success": True,
            "preferences": default_preferences,
            "user_id": str(current_user.id),
            "last_updated": None  # Would be actual timestamp in real implementation
        }
        
    except Exception as e:
        logger.error(f"Failed to get user preferences: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user preferences"
        )


@router.put("/user-preferences")
async def update_user_preferences(
    preferences: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """Update user preferences for data upload and analysis."""
    try:
        # In a real implementation, this would save to a user preferences table
        # For now, we'll just validate the structure and return success
        
        required_sections = ["upload_preferences", "visualization_preferences", 
                           "preview_preferences", "transformation_preferences"]
        
        for section in required_sections:
            if section not in preferences:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Missing required preference section: {section}"
                )
        
        # Validate specific preference values
        upload_prefs = preferences.get("upload_preferences", {})
        if "default_preview_rows" in upload_prefs:
            rows = upload_prefs["default_preview_rows"]
            if not isinstance(rows, int) or rows < 1 or rows > 10000:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="default_preview_rows must be between 1 and 10000"
                )
        
        preview_prefs = preferences.get("preview_preferences", {})
        if "default_page_size" in preview_prefs:
            page_size = preview_prefs["default_page_size"]
            if page_size not in [10, 20, 25, 50, 100]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="default_page_size must be one of: 10, 20, 25, 50, 100"
                )
        
        return {
            "success": True,
            "message": "User preferences updated successfully",
            "preferences": preferences,
            "updated_at": "2024-01-15T10:30:00Z"  # Would be actual timestamp
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update user preferences: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user preferences"
        )


@router.get("/quality-thresholds")
async def get_quality_thresholds(
    current_user: User = Depends(get_current_user)
):
    """Get data quality assessment thresholds."""
    try:
        return {
            "success": True,
            "thresholds": {
                "completeness": {
                    "good": 95,
                    "fair": 80,
                    "poor": 60
                },
                "uniqueness": {
                    "good": 95,
                    "fair": 85,
                    "poor": 70
                },
                "validity": {
                    "good": 98,
                    "fair": 90,
                    "poor": 75
                },
                "consistency": {
                    "good": 95,
                    "fair": 85,
                    "poor": 70
                },
                "overall_score": {
                    "good": 80,
                    "fair": 60
                }
            },
            "metrics": ["completeness", "uniqueness", "validity", "consistency"]
        }
        
    except Exception as e:
        logger.error(f"Failed to get quality thresholds: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve quality thresholds"
        )


@router.get("/dashboard")
async def get_dashboard_config(
    current_user: User = Depends(get_current_user)
):
    """Get dashboard configuration settings."""
    try:
        settings = get_settings()
        
        # Default dashboard configuration
        dashboard_config = {
            "layout": {
                "sidebar_width": 280,
                "collapsed_sidebar_width": 64,
                "header_height": 64,
                "footer_height": 48,
                "enable_responsive": True,
                "breakpoints": {
                    "mobile": 768,
                    "tablet": 1024,
                    "desktop": 1280
                }
            },
            "theme": {
                "primary_color": "#3b82f6",
                "secondary_color": "#10b981",
                "accent_color": "#f59e0b",
                "danger_color": "#ef4444",
                "dark_mode_enabled": True,
                "default_theme": "light"
            },
            "features": {
                "real_time_updates": True,
                "notifications": True,
                "export_functionality": True,
                "advanced_filters": True,
                "collaboration": True,
                "auto_save": True
            },
            "preferences": {
                "default_view": "overview",
                "items_per_page": 25,
                "refresh_interval": 30000,
                "enable_tooltips": True,
                "show_help_hints": True,
                "auto_collapse_sidebar": False
            },
            "widgets": {
                "available_widgets": [
                    "stats_cards",
                    "line_chart",
                    "bar_chart",
                    "pie_chart",
                    "data_table",
                    "activity_feed",
                    "system_health"
                ],
                "default_dashboard_layout": [
                    {"id": "stats_overview", "type": "stats_cards", "priority": 1},
                    {"id": "pipeline_activity", "type": "line_chart", "priority": 2},
                    {"id": "system_health", "type": "system_health", "priority": 3},
                    {"id": "recent_activity", "type": "activity_feed", "priority": 4}
                ]
            },
            "navigation": {
                "items": [
                    {"id": "overview", "name": "Overview", "icon": "Home", "enabled": True},
                    {"id": "pipelines", "name": "Pipelines", "icon": "Zap", "enabled": True},
                    {"id": "connectors", "name": "Connectors", "icon": "Database", "enabled": True},
                    {"id": "data-analysis", "name": "Data Analysis", "icon": "BarChart", "enabled": True},
                    {"id": "tasks", "name": "Tasks", "icon": "CheckSquare", "enabled": True},
                    {"id": "ai-insights", "name": "AI Insights", "icon": "Brain", "enabled": True},
                    {"id": "reports", "name": "Reports", "icon": "FileText", "enabled": True}
                ],
                "show_icons": True,
                "collapsible": True
            },
            "data_refresh": {
                "auto_refresh_enabled": True,
                "refresh_intervals": [10, 30, 60, 300, 900],
                "default_interval": 30
            },
            "organization": {
                "id": str(current_user.organization_id) if current_user.organization_id else None,
                "name": "Organization",  # Would be fetched from organization table in real implementation
                "timezone": "UTC",
                "date_format": "YYYY-MM-DD",
                "time_format": "24h"
            }
        }
        
        return {
            "success": True,
            "config": dashboard_config,
            "user_id": str(current_user.id),
            "timestamp": "2024-01-15T10:30:00Z"  # Would be actual timestamp
        }
        
    except Exception as e:
        logger.error(f"Failed to get dashboard config: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve dashboard configuration"
        )


@router.get("/chart-options")
async def get_chart_options(
    current_user: User = Depends(get_current_user)
):
    """Get available chart types and visualization options."""
    try:
        return {
            "success": True,
            "chart_types": [
                {
                    "type": "bar",
                    "name": "Bar Chart",
                    "description": "Compare values across categories",
                    "suitable_for": ["categorical", "numerical"],
                    "max_categories": 50
                },
                {
                    "type": "pie",
                    "name": "Pie Chart",
                    "description": "Show proportions of a whole",
                    "suitable_for": ["categorical"],
                    "max_categories": 10
                },
                {
                    "type": "line",
                    "name": "Line Chart",
                    "description": "Show trends over time",
                    "suitable_for": ["time_series", "numerical"],
                    "max_data_points": 1000
                },
                {
                    "type": "histogram",
                    "name": "Histogram",
                    "description": "Show distribution of numerical data",
                    "suitable_for": ["numerical"],
                    "max_bins": 50
                },
                {
                    "type": "scatter",
                    "name": "Scatter Plot",
                    "description": "Show relationship between two variables",
                    "suitable_for": ["numerical"],
                    "max_data_points": 1000
                }
            ],
            "color_palettes": [
                {
                    "name": "default",
                    "colors": [
                        "rgba(59, 130, 246, 0.8)",
                        "rgba(16, 185, 129, 0.8)",
                        "rgba(245, 158, 11, 0.8)",
                        "rgba(239, 68, 68, 0.8)",
                        "rgba(139, 92, 246, 0.8)",
                        "rgba(236, 72, 153, 0.8)"
                    ]
                },
                {
                    "name": "professional",
                    "colors": [
                        "rgba(75, 85, 99, 0.8)",
                        "rgba(107, 114, 128, 0.8)",
                        "rgba(156, 163, 175, 0.8)",
                        "rgba(209, 213, 219, 0.8)"
                    ]
                }
            ]
        }
        
    except Exception as e:
        logger.error(f"Failed to get chart options: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve chart options"
        )
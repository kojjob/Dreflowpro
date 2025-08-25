"""
Export Templates for DReflowPro ETL Platform
Predefined templates for various export scenarios
"""

from typing import Dict, Any, List
from datetime import datetime, timedelta

class ExportTemplates:
    """Collection of predefined export templates."""
    
    @staticmethod
    def get_all_templates() -> Dict[str, Dict[str, Any]]:
        """Get all available export templates."""
        return {
            "pipeline_performance_report": ExportTemplates.pipeline_performance_report(),
            "user_activity_summary": ExportTemplates.user_activity_summary(),
            "connector_inventory": ExportTemplates.connector_inventory(),
            "system_health_report": ExportTemplates.system_health_report(),
            "data_quality_report": ExportTemplates.data_quality_report(),
            "executive_dashboard": ExportTemplates.executive_dashboard(),
            "audit_compliance": ExportTemplates.audit_compliance(),
            "multi_format_archive": ExportTemplates.multi_format_archive(),
            "custom_analytics": ExportTemplates.custom_analytics(),
            "tenant_usage_report": ExportTemplates.tenant_usage_report()
        }
    
    @staticmethod
    def pipeline_performance_report() -> Dict[str, Any]:
        """Pipeline performance analysis template."""
        return {
            "name": "Pipeline Performance Report",
            "description": "Comprehensive pipeline performance analysis with execution metrics and trends",
            "format": "pdf",
            "data_source": "pipeline_executions",
            "category": "performance",
            "config": {
                "title": "Pipeline Performance Analysis Report",
                "include_summary": True,
                "include_charts": True,
                "include_data_table": True,
                "max_records": 500,
                "date_range_days": 30,
                "chart_types": ["success_rate_trend", "execution_time_distribution", "failure_analysis"],
                "summary_metrics": [
                    "total_executions", "success_rate", "avg_execution_time", 
                    "total_data_processed", "failure_count", "most_active_pipelines"
                ]
            },
            "filters": {
                "executed_after": (datetime.utcnow() - timedelta(days=30)).isoformat(),
                "status": None  # All statuses
            },
            "custom_fields": [
                "pipeline_name", "status", "started_at", "completed_at", 
                "duration_seconds", "records_processed", "error_message"
            ]
        }
    
    @staticmethod
    def user_activity_summary() -> Dict[str, Any]:
        """User activity and engagement template."""
        return {
            "name": "User Activity Summary",
            "description": "User engagement metrics and activity patterns",
            "format": "excel",
            "data_source": "analytics",
            "category": "user_analytics",
            "config": {
                "analytics_type": "user_activity",
                "include_summary": True,
                "include_charts": False,
                "include_activity_timeline": True,
                "include_user_ranking": True
            },
            "filters": {
                "date_from": (datetime.utcnow() - timedelta(days=30)).isoformat(),
                "date_to": datetime.utcnow().isoformat()
            },
            "custom_fields": [
                "email", "first_name", "last_name", "pipeline_executions", 
                "pipelines_created", "last_login", "total_data_processed"
            ]
        }
    
    @staticmethod
    def connector_inventory() -> Dict[str, Any]:
        """Connector inventory and configuration template."""
        return {
            "name": "Connector Inventory",
            "description": "Complete inventory of data connectors with configurations and status",
            "format": "excel",
            "data_source": "connectors",
            "category": "inventory",
            "config": {
                "include_config_details": True,
                "include_usage_statistics": True,
                "include_security_info": False,
                "group_by_type": True
            },
            "filters": {
                "is_active": None  # All connectors
            },
            "custom_fields": [
                "name", "connector_type", "is_active", "created_at", 
                "last_used", "total_executions", "success_rate"
            ]
        }
    
    @staticmethod
    def system_health_report() -> Dict[str, Any]:
        """System health and monitoring template."""
        return {
            "name": "System Health Report",
            "description": "System performance, health metrics, and monitoring data",
            "format": "pdf",
            "data_source": "system_metrics",
            "category": "monitoring",
            "config": {
                "title": "DReflowPro System Health Report",
                "include_performance_charts": True,
                "include_resource_usage": True,
                "include_error_analysis": True,
                "monitoring_period_hours": 24,
                "alert_thresholds": {
                    "cpu_usage": 80,
                    "memory_usage": 85,
                    "disk_usage": 90,
                    "error_rate": 5
                }
            },
            "filters": {
                "time_range": "24h",
                "include_alerts": True
            }
        }
    
    @staticmethod
    def data_quality_report() -> Dict[str, Any]:
        """Data quality assessment template."""
        return {
            "name": "Data Quality Report",
            "description": "Data quality metrics, validation results, and improvement recommendations",
            "format": "pdf",
            "data_source": "analytics",
            "category": "quality",
            "config": {
                "analytics_type": "data_quality",
                "title": "Data Quality Assessment Report",
                "include_quality_score": True,
                "include_validation_details": True,
                "include_recommendations": True,
                "quality_dimensions": [
                    "completeness", "accuracy", "consistency", 
                    "validity", "timeliness", "uniqueness"
                ]
            },
            "filters": {
                "date_from": (datetime.utcnow() - timedelta(days=7)).isoformat(),
                "quality_threshold": 80
            }
        }
    
    @staticmethod
    def executive_dashboard() -> Dict[str, Any]:
        """Executive summary dashboard template."""
        return {
            "name": "Executive Dashboard",
            "description": "High-level business metrics and KPI summary for executives",
            "format": "pdf",
            "data_source": "analytics",
            "category": "executive",
            "config": {
                "analytics_type": "business_summary",
                "title": "Executive Dashboard - Business Intelligence Summary",
                "include_kpi_summary": True,
                "include_trend_analysis": True,
                "include_cost_analysis": True,
                "kpis": [
                    "total_data_processed", "pipeline_success_rate", "system_uptime",
                    "user_engagement", "cost_per_transaction", "time_to_insight"
                ],
                "chart_style": "executive"
            },
            "filters": {
                "period": "monthly",
                "include_forecasts": True
            }
        }
    
    @staticmethod
    def audit_compliance() -> Dict[str, Any]:
        """Audit and compliance reporting template."""
        return {
            "name": "Audit & Compliance Report",
            "description": "Security audit logs, compliance metrics, and governance data",
            "format": "excel",
            "data_source": "audit_logs",
            "category": "compliance",
            "config": {
                "include_security_events": True,
                "include_data_access_logs": True,
                "include_compliance_scores": True,
                "compliance_standards": ["GDPR", "SOC2", "HIPAA"],
                "risk_assessment": True
            },
            "filters": {
                "date_from": (datetime.utcnow() - timedelta(days=90)).isoformat(),
                "security_level": "all"
            },
            "custom_fields": [
                "timestamp", "user_email", "action", "resource", 
                "ip_address", "status", "compliance_flag"
            ]
        }
    
    @staticmethod
    def multi_format_archive() -> Dict[str, Any]:
        """Multi-format export archive template."""
        return {
            "name": "Multi-Format Archive",
            "description": "Complete data export in multiple formats packaged as ZIP archive",
            "format": "custom",
            "data_source": "pipelines",
            "category": "archive",
            "config": {
                "format": "zip_multi",
                "formats": ["json", "csv", "excel", "xml"],
                "include_metadata": True,
                "include_schemas": True,
                "compression_level": 6
            },
            "filters": {
                "is_active": True,
                "created_after": (datetime.utcnow() - timedelta(days=180)).isoformat()
            }
        }
    
    @staticmethod
    def custom_analytics() -> Dict[str, Any]:
        """Custom analytics template for advanced users."""
        return {
            "name": "Custom Analytics Export",
            "description": "Flexible analytics export with custom metrics and dimensions",
            "format": "excel",
            "data_source": "analytics",
            "category": "analytics",
            "config": {
                "analytics_type": "custom",
                "include_raw_data": True,
                "include_calculated_metrics": True,
                "include_pivot_tables": True,
                "custom_metrics": [],  # To be defined by user
                "custom_dimensions": []  # To be defined by user
            },
            "filters": {
                "flexible": True  # Allows user-defined filters
            }
        }
    
    @staticmethod
    def tenant_usage_report() -> Dict[str, Any]:
        """Multi-tenant usage and billing template."""
        return {
            "name": "Tenant Usage Report",
            "description": "Multi-tenant usage metrics, resource consumption, and billing data",
            "format": "excel",
            "data_source": "analytics",
            "category": "billing",
            "config": {
                "analytics_type": "tenant_usage",
                "include_usage_breakdown": True,
                "include_cost_allocation": True,
                "include_quota_analysis": True,
                "billing_period": "monthly",
                "usage_metrics": [
                    "pipeline_executions", "data_processed_gb", "storage_used_gb",
                    "api_calls", "user_count", "compute_hours"
                ]
            },
            "filters": {
                "billing_month": datetime.utcnow().strftime("%Y-%m"),
                "include_all_tenants": True
            }
        }
    
    @staticmethod
    def get_template_by_category(category: str) -> List[Dict[str, Any]]:
        """Get templates by category."""
        all_templates = ExportTemplates.get_all_templates()
        return [
            template for template in all_templates.values()
            if template.get("category") == category
        ]
    
    @staticmethod
    def get_template_by_format(format_type: str) -> List[Dict[str, Any]]:
        """Get templates by format type."""
        all_templates = ExportTemplates.get_all_templates()
        return [
            template for template in all_templates.values()
            if template.get("format") == format_type
        ]
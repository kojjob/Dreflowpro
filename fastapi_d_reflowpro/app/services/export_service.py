"""
Advanced Data Export Service for DReflowPro ETL Platform
Supports PDF, Excel, CSV, JSON, XML, and custom format exports
"""

import io
import json
import xml.etree.ElementTree as ET
from typing import Dict, List, Any, Optional, Union, BinaryIO
from datetime import datetime, date
import pandas as pd
import asyncio
from pathlib import Path
import tempfile
import zipfile

# PDF generation
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.graphics.shapes import Drawing
from reportlab.graphics.charts.linecharts import HorizontalLineChart
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.charts.piecharts import Pie

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

from app.models.pipeline import ETLPipeline, PipelineExecution
from app.models.connector import DataConnector
from app.models.user import User
from app.models.tenant import Tenant
from app.core.deps import get_current_user, get_db
from app.core.tenant_deps import get_current_tenant

class DataExportService:
    """Advanced data export service supporting multiple formats and custom templates."""
    
    def __init__(self, db: AsyncSession, current_user: User, current_tenant: Optional[Tenant] = None):
        self.db = db
        self.current_user = current_user
        self.current_tenant = current_tenant
        
    async def export_data(
        self, 
        data_source: str, 
        format_type: str, 
        filters: Dict[str, Any] = None,
        template_config: Dict[str, Any] = None,
        custom_fields: List[str] = None
    ) -> Dict[str, Any]:
        """
        Main export method supporting various data sources and formats.
        
        Args:
            data_source: Type of data to export (pipelines, executions, connectors, users, analytics)
            format_type: Export format (pdf, excel, csv, json, xml, custom)
            filters: Filtering criteria for data selection
            template_config: Custom template configuration
            custom_fields: Specific fields to include in export
            
        Returns:
            Dictionary containing export result with file path or binary data
        """
        # Validate and fetch data based on source
        raw_data = await self._fetch_data(data_source, filters or {})
        
        # Process and transform data based on requirements
        processed_data = await self._process_data(raw_data, custom_fields)
        
        # Generate export based on format
        export_result = await self._generate_export(
            processed_data, 
            format_type, 
            data_source,
            template_config or {}
        )
        
        return {
            "success": True,
            "format": format_type,
            "data_source": data_source,
            "record_count": len(processed_data),
            "file_info": export_result,
            "generated_at": datetime.utcnow().isoformat(),
            "generated_by": self.current_user.email,
            "tenant_id": self.current_tenant.id if self.current_tenant else None
        }
    
    async def _fetch_data(self, data_source: str, filters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Fetch data from specified source with applied filters."""
        
        if data_source == "pipelines":
            return await self._fetch_pipeline_data(filters)
        elif data_source == "pipeline_executions":
            return await self._fetch_execution_data(filters)
        elif data_source == "connectors":
            return await self._fetch_connector_data(filters)
        elif data_source == "users":
            return await self._fetch_user_data(filters)
        elif data_source == "analytics":
            return await self._fetch_analytics_data(filters)
        elif data_source == "audit_logs":
            return await self._fetch_audit_data(filters)
        elif data_source == "system_metrics":
            return await self._fetch_metrics_data(filters)
        else:
            raise ValueError(f"Unsupported data source: {data_source}")
    
    async def _fetch_pipeline_data(self, filters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Fetch pipeline data with filters."""
        query = select(ETLPipeline)
        
        if self.current_tenant:
            query = query.where(ETLPipeline.tenant_id == self.current_tenant.id)
        
        # Apply filters
        if filters.get("status"):
            query = query.where(ETLPipeline.status == filters["status"])
        if filters.get("created_after"):
            query = query.where(ETLPipeline.created_at >= filters["created_after"])
        if filters.get("created_before"):
            query = query.where(ETLPipeline.created_at <= filters["created_before"])
        if filters.get("name_contains"):
            query = query.where(ETLPipeline.name.ilike(f"%{filters['name_contains']}%"))
        
        result = await self.db.execute(query)
        pipelines = result.scalars().all()
        
        return [
            {
                "id": str(pipeline.id),
                "name": pipeline.name,
                "description": pipeline.description,
                "status": pipeline.status,
                "created_at": pipeline.created_at.isoformat(),
                "updated_at": pipeline.updated_at.isoformat(),
                "created_by": pipeline.created_by,
                "is_active": pipeline.is_active,
                "config": pipeline.config,
                "tags": pipeline.tags,
                "tenant_id": str(pipeline.tenant_id) if pipeline.tenant_id else None
            }
            for pipeline in pipelines
        ]
    
    async def _fetch_execution_data(self, filters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Fetch pipeline execution data with filters."""
        query = select(PipelineExecution).join(ETLPipeline)
        
        if self.current_tenant:
            query = query.where(ETLPipeline.tenant_id == self.current_tenant.id)
        
        # Apply filters
        if filters.get("status"):
            query = query.where(PipelineExecution.status == filters["status"])
        if filters.get("pipeline_id"):
            query = query.where(PipelineExecution.pipeline_id == filters["pipeline_id"])
        if filters.get("executed_after"):
            query = query.where(PipelineExecution.started_at >= filters["executed_after"])
        if filters.get("executed_before"):
            query = query.where(PipelineExecution.started_at <= filters["executed_before"])
        
        result = await self.db.execute(query)
        executions = result.scalars().all()
        
        return [
            {
                "id": str(execution.id),
                "pipeline_id": str(execution.pipeline_id),
                "pipeline_name": execution.pipeline.name,
                "status": execution.status,
                "started_at": execution.started_at.isoformat() if execution.started_at else None,
                "completed_at": execution.completed_at.isoformat() if execution.completed_at else None,
                "duration_seconds": (execution.completed_at - execution.started_at).total_seconds() if execution.completed_at and execution.started_at else None,
                "records_processed": execution.records_processed,
                "error_message": execution.error_message,
                "logs": execution.logs,
                "metrics": execution.metrics
            }
            for execution in executions
        ]
    
    async def _fetch_connector_data(self, filters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Fetch connector data with filters."""
        query = select(DataConnector)
        
        if self.current_tenant:
            query = query.where(DataConnector.tenant_id == self.current_tenant.id)
        
        # Apply filters
        if filters.get("connector_type"):
            query = query.where(DataConnector.connector_type == filters["connector_type"])
        if filters.get("is_active") is not None:
            query = query.where(DataConnector.is_active == filters["is_active"])
        
        result = await self.db.execute(query)
        connectors = result.scalars().all()
        
        return [
            {
                "id": str(connector.id),
                "name": connector.name,
                "connector_type": connector.connector_type,
                "config": connector.config,
                "is_active": connector.is_active,
                "created_at": connector.created_at.isoformat(),
                "updated_at": connector.updated_at.isoformat(),
                "last_used": connector.last_used.isoformat() if connector.last_used else None,
                "tenant_id": str(connector.tenant_id) if connector.tenant_id else None
            }
            for connector in connectors
        ]
    
    async def _fetch_user_data(self, filters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Fetch user data with filters (admin only)."""
        if not self.current_user.is_admin:
            raise PermissionError("Only administrators can export user data")
        
        query = select(User)
        
        if self.current_tenant:
            query = query.where(User.tenant_id == self.current_tenant.id)
        
        # Apply filters
        if filters.get("is_active") is not None:
            query = query.where(User.is_active == filters["is_active"])
        if filters.get("role"):
            query = query.where(User.role == filters["role"])
        
        result = await self.db.execute(query)
        users = result.scalars().all()
        
        return [
            {
                "id": str(user.id),
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": user.role,
                "is_active": user.is_active,
                "is_verified": user.is_verified,
                "created_at": user.created_at.isoformat(),
                "last_login": user.last_login.isoformat() if user.last_login else None,
                "tenant_id": str(user.tenant_id) if user.tenant_id else None
            }
            for user in users
        ]
    
    async def _fetch_analytics_data(self, filters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Fetch analytics data with custom queries."""
        analytics_type = filters.get("analytics_type", "pipeline_performance")
        
        if analytics_type == "pipeline_performance":
            # Pipeline performance analytics
            query = text("""
                SELECT 
                    p.name as pipeline_name,
                    COUNT(pe.id) as total_executions,
                    COUNT(CASE WHEN pe.status = 'completed' THEN 1 END) as successful_executions,
                    COUNT(CASE WHEN pe.status = 'failed' THEN 1 END) as failed_executions,
                    ROUND(
                        (COUNT(CASE WHEN pe.status = 'completed' THEN 1 END)::decimal / 
                         NULLIF(COUNT(pe.id), 0)) * 100, 2
                    ) as success_rate,
                    AVG(EXTRACT(epoch FROM (pe.completed_at - pe.started_at))) as avg_duration_seconds,
                    SUM(pe.records_processed) as total_records_processed
                FROM pipelines p
                LEFT JOIN pipeline_executions pe ON p.id = pe.pipeline_id
                WHERE pe.created_at >= :date_from AND pe.created_at <= :date_to
                GROUP BY p.id, p.name
                ORDER BY total_executions DESC
            """)
            
            date_from = filters.get("date_from", datetime.utcnow().replace(day=1))  # Start of month
            date_to = filters.get("date_to", datetime.utcnow())
            
            result = await self.db.execute(query, {"date_from": date_from, "date_to": date_to})
            
            return [
                {
                    "pipeline_name": row.pipeline_name,
                    "total_executions": row.total_executions,
                    "successful_executions": row.successful_executions,
                    "failed_executions": row.failed_executions,
                    "success_rate": float(row.success_rate) if row.success_rate else 0.0,
                    "avg_duration_seconds": float(row.avg_duration_seconds) if row.avg_duration_seconds else 0.0,
                    "total_records_processed": row.total_records_processed or 0
                }
                for row in result
            ]
        
        elif analytics_type == "user_activity":
            # User activity analytics
            query = text("""
                SELECT 
                    u.email,
                    u.first_name,
                    u.last_name,
                    COUNT(DISTINCT pe.id) as pipeline_executions,
                    COUNT(DISTINCT p.id) as pipelines_created,
                    u.last_login
                FROM users u
                LEFT JOIN pipelines p ON p.created_by = u.id
                LEFT JOIN pipeline_executions pe ON pe.triggered_by = u.id
                WHERE u.created_at >= :date_from
                GROUP BY u.id, u.email, u.first_name, u.last_name, u.last_login
                ORDER BY pipeline_executions DESC
            """)
            
            date_from = filters.get("date_from", datetime.utcnow().replace(day=1))
            result = await self.db.execute(query, {"date_from": date_from})
            
            return [
                {
                    "email": row.email,
                    "first_name": row.first_name,
                    "last_name": row.last_name,
                    "pipeline_executions": row.pipeline_executions,
                    "pipelines_created": row.pipelines_created,
                    "last_login": row.last_login.isoformat() if row.last_login else None
                }
                for row in result
            ]
        
        return []
    
    async def _fetch_audit_data(self, filters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Fetch audit log data (admin only)."""
        if not self.current_user.is_admin:
            raise PermissionError("Only administrators can export audit data")
        
        # This would require an audit_logs table - placeholder for now
        return []
    
    async def _fetch_metrics_data(self, filters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Fetch system metrics data."""
        # This would integrate with monitoring system - placeholder for now
        return []
    
    async def _process_data(self, raw_data: List[Dict[str, Any]], custom_fields: List[str] = None) -> List[Dict[str, Any]]:
        """Process and transform raw data based on requirements."""
        if not raw_data:
            return []
        
        # If custom fields specified, filter the data
        if custom_fields:
            processed_data = []
            for record in raw_data:
                filtered_record = {field: record.get(field) for field in custom_fields if field in record}
                processed_data.append(filtered_record)
            return processed_data
        
        return raw_data
    
    async def _generate_export(
        self, 
        data: List[Dict[str, Any]], 
        format_type: str, 
        data_source: str,
        template_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate export file based on format type."""
        
        if format_type.lower() == "pdf":
            return await self._generate_pdf_export(data, data_source, template_config)
        elif format_type.lower() == "excel":
            return await self._generate_excel_export(data, data_source, template_config)
        elif format_type.lower() == "csv":
            return await self._generate_csv_export(data, data_source)
        elif format_type.lower() == "json":
            return await self._generate_json_export(data, data_source)
        elif format_type.lower() == "xml":
            return await self._generate_xml_export(data, data_source)
        elif format_type.lower() == "custom":
            return await self._generate_custom_export(data, data_source, template_config)
        else:
            raise ValueError(f"Unsupported export format: {format_type}")
    
    async def _generate_pdf_export(
        self, 
        data: List[Dict[str, Any]], 
        data_source: str, 
        template_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate PDF export with charts and formatting."""
        
        # Create temporary file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
        temp_path = temp_file.name
        temp_file.close()
        
        # Create PDF document
        doc = SimpleDocTemplate(temp_path, pagesize=A4)
        styles = getSampleStyleSheet()
        story = []
        
        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            spaceAfter=30,
            alignment=1  # Center alignment
        )
        
        title = template_config.get("title", f"DReflowPro {data_source.replace('_', ' ').title()} Report")
        story.append(Paragraph(title, title_style))
        story.append(Spacer(1, 12))
        
        # Metadata
        metadata_style = styles['Normal']
        story.append(Paragraph(f"<b>Generated:</b> {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}", metadata_style))
        story.append(Paragraph(f"<b>Generated by:</b> {self.current_user.email}", metadata_style))
        if self.current_tenant:
            story.append(Paragraph(f"<b>Organization:</b> {self.current_tenant.name}", metadata_style))
        story.append(Paragraph(f"<b>Record count:</b> {len(data)}", metadata_style))
        story.append(Spacer(1, 20))
        
        if data:
            # Summary section
            if template_config.get("include_summary", True):
                story.append(Paragraph("Summary", styles['Heading2']))
                
                # Generate summary based on data source
                if data_source == "pipeline_executions":
                    summary_stats = self._calculate_execution_summary(data)
                    story.append(Paragraph(f"Total Executions: {summary_stats['total']}", metadata_style))
                    story.append(Paragraph(f"Successful: {summary_stats['successful']}", metadata_style))
                    story.append(Paragraph(f"Failed: {summary_stats['failed']}", metadata_style))
                    story.append(Paragraph(f"Success Rate: {summary_stats['success_rate']:.1f}%", metadata_style))
                
                story.append(Spacer(1, 20))
            
            # Data table
            if template_config.get("include_data_table", True):
                story.append(Paragraph("Data", styles['Heading2']))
                
                # Prepare table data
                if data:
                    headers = list(data[0].keys())
                    table_data = [headers]
                    
                    for record in data[:template_config.get("max_records", 100)]:  # Limit records for PDF
                        row = []
                        for header in headers:
                            value = record.get(header, "")
                            # Handle different data types
                            if isinstance(value, (dict, list)):
                                value = str(value)[:50] + "..." if len(str(value)) > 50 else str(value)
                            elif value is None:
                                value = ""
                            else:
                                value = str(value)[:50] + "..." if len(str(value)) > 50 else str(value)
                            row.append(value)
                        table_data.append(row)
                    
                    # Create table
                    table = Table(table_data)
                    table.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('FONTSIZE', (0, 0), (-1, 0), 8),
                        ('FONTSIZE', (0, 1), (-1, -1), 7),
                        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                        ('GRID', (0, 0), (-1, -1), 1, colors.black)
                    ]))
                    
                    story.append(table)
        else:
            story.append(Paragraph("No data found matching the specified criteria.", styles['Normal']))
        
        # Build PDF
        doc.build(story)
        
        # Get file size
        file_size = Path(temp_path).stat().st_size
        
        return {
            "file_path": temp_path,
            "filename": f"{data_source}_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.pdf",
            "content_type": "application/pdf",
            "file_size": file_size
        }
    
    async def _generate_excel_export(
        self, 
        data: List[Dict[str, Any]], 
        data_source: str, 
        template_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate Excel export with multiple sheets and formatting."""
        
        # Create temporary file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx')
        temp_path = temp_file.name
        temp_file.close()
        
        with pd.ExcelWriter(temp_path, engine='openpyxl') as writer:
            if data:
                # Main data sheet
                df = pd.DataFrame(data)
                df.to_excel(writer, sheet_name='Data', index=False)
                
                # Format the worksheet
                worksheet = writer.sheets['Data']
                
                # Auto-adjust column widths
                for column in worksheet.columns:
                    max_length = 0
                    column_letter = column[0].column_letter
                    for cell in column:
                        try:
                            if len(str(cell.value)) > max_length:
                                max_length = len(str(cell.value))
                        except:
                            pass
                    adjusted_width = min(max_length + 2, 50)  # Cap at 50 characters
                    worksheet.column_dimensions[column_letter].width = adjusted_width
                
                # Apply header formatting
                from openpyxl.styles import Font, PatternFill
                header_font = Font(bold=True, color="FFFFFF")
                header_fill = PatternFill(start_color="366092", end_color="366092", fill_type="solid")
                
                for cell in worksheet[1]:  # First row
                    cell.font = header_font
                    cell.fill = header_fill
                
                # Summary sheet
                if template_config.get("include_summary", True):
                    summary_data = []
                    summary_data.append(["Export Summary", ""])
                    summary_data.append(["Generated At", datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')])
                    summary_data.append(["Generated By", self.current_user.email])
                    if self.current_tenant:
                        summary_data.append(["Organization", self.current_tenant.name])
                    summary_data.append(["Data Source", data_source])
                    summary_data.append(["Total Records", len(data)])
                    summary_data.append(["", ""])  # Empty row
                    
                    # Add data-specific summary
                    if data_source == "pipeline_executions":
                        exec_summary = self._calculate_execution_summary(data)
                        summary_data.extend([
                            ["Execution Summary", ""],
                            ["Total Executions", exec_summary['total']],
                            ["Successful", exec_summary['successful']],
                            ["Failed", exec_summary['failed']],
                            ["Success Rate", f"{exec_summary['success_rate']:.1f}%"]
                        ])
                    
                    summary_df = pd.DataFrame(summary_data, columns=['Metric', 'Value'])
                    summary_df.to_excel(writer, sheet_name='Summary', index=False)
                    
                    # Format summary sheet
                    summary_sheet = writer.sheets['Summary']
                    for cell in summary_sheet[1]:  # Header
                        cell.font = header_font
                        cell.fill = header_fill
            
            else:
                # Empty data
                empty_df = pd.DataFrame({"Message": ["No data found matching the specified criteria."]})
                empty_df.to_excel(writer, sheet_name='Data', index=False)
        
        # Get file size
        file_size = Path(temp_path).stat().st_size
        
        return {
            "file_path": temp_path,
            "filename": f"{data_source}_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.xlsx",
            "content_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "file_size": file_size
        }
    
    async def _generate_csv_export(self, data: List[Dict[str, Any]], data_source: str) -> Dict[str, Any]:
        """Generate CSV export."""
        
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.csv', mode='w', encoding='utf-8')
        temp_path = temp_file.name
        
        if data:
            df = pd.DataFrame(data)
            df.to_csv(temp_path, index=False)
        else:
            # Empty CSV with message
            df = pd.DataFrame({"Message": ["No data found matching the specified criteria."]})
            df.to_csv(temp_path, index=False)
        
        temp_file.close()
        file_size = Path(temp_path).stat().st_size
        
        return {
            "file_path": temp_path,
            "filename": f"{data_source}_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv",
            "content_type": "text/csv",
            "file_size": file_size
        }
    
    async def _generate_json_export(self, data: List[Dict[str, Any]], data_source: str) -> Dict[str, Any]:
        """Generate JSON export."""
        
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.json', mode='w', encoding='utf-8')
        temp_path = temp_file.name
        
        export_data = {
            "metadata": {
                "export_type": data_source,
                "generated_at": datetime.utcnow().isoformat(),
                "generated_by": self.current_user.email,
                "tenant_id": str(self.current_tenant.id) if self.current_tenant else None,
                "record_count": len(data)
            },
            "data": data
        }
        
        # Custom JSON encoder for datetime and other objects
        def json_serializer(obj):
            if isinstance(obj, (datetime, date)):
                return obj.isoformat()
            raise TypeError(f"Object of type {type(obj)} is not JSON serializable")
        
        json.dump(export_data, temp_file, indent=2, default=json_serializer, ensure_ascii=False)
        temp_file.close()
        
        file_size = Path(temp_path).stat().st_size
        
        return {
            "file_path": temp_path,
            "filename": f"{data_source}_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json",
            "content_type": "application/json",
            "file_size": file_size
        }
    
    async def _generate_xml_export(self, data: List[Dict[str, Any]], data_source: str) -> Dict[str, Any]:
        """Generate XML export."""
        
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.xml', mode='w', encoding='utf-8')
        temp_path = temp_file.name
        
        # Create XML structure
        root = ET.Element("export")
        
        # Metadata
        metadata = ET.SubElement(root, "metadata")
        ET.SubElement(metadata, "export_type").text = data_source
        ET.SubElement(metadata, "generated_at").text = datetime.utcnow().isoformat()
        ET.SubElement(metadata, "generated_by").text = self.current_user.email
        if self.current_tenant:
            ET.SubElement(metadata, "tenant_id").text = str(self.current_tenant.id)
        ET.SubElement(metadata, "record_count").text = str(len(data))
        
        # Data
        data_element = ET.SubElement(root, "data")
        
        for record in data:
            record_element = ET.SubElement(data_element, "record")
            for key, value in record.items():
                field_element = ET.SubElement(record_element, key.replace(" ", "_").replace("-", "_"))
                if value is not None:
                    field_element.text = str(value)
        
        # Write XML to file
        tree = ET.ElementTree(root)
        tree.write(temp_path, encoding='utf-8', xml_declaration=True)
        temp_file.close()
        
        file_size = Path(temp_path).stat().st_size
        
        return {
            "file_path": temp_path,
            "filename": f"{data_source}_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.xml",
            "content_type": "application/xml",
            "file_size": file_size
        }
    
    async def _generate_custom_export(
        self, 
        data: List[Dict[str, Any]], 
        data_source: str, 
        template_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate custom format export based on template configuration."""
        
        custom_format = template_config.get("format", "json")
        
        if custom_format == "zip_multi":
            return await self._generate_zip_multi_format(data, data_source, template_config)
        else:
            # Default to JSON for custom
            return await self._generate_json_export(data, data_source)
    
    async def _generate_zip_multi_format(
        self, 
        data: List[Dict[str, Any]], 
        data_source: str, 
        template_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate a ZIP file containing multiple format exports."""
        
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.zip')
        temp_path = temp_file.name
        temp_file.close()
        
        formats = template_config.get("formats", ["json", "csv", "excel"])
        
        with zipfile.ZipFile(temp_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for fmt in formats:
                try:
                    # Generate individual format
                    format_result = await self._generate_export(data, fmt, data_source, {})
                    
                    # Add to ZIP
                    zipf.write(format_result["file_path"], format_result["filename"])
                    
                    # Clean up temporary file
                    Path(format_result["file_path"]).unlink(missing_ok=True)
                    
                except Exception as e:
                    # If a format fails, add an error file
                    error_content = f"Error generating {fmt} format: {str(e)}"
                    zipf.writestr(f"ERROR_{fmt}.txt", error_content)
        
        file_size = Path(temp_path).stat().st_size
        
        return {
            "file_path": temp_path,
            "filename": f"{data_source}_multi_format_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.zip",
            "content_type": "application/zip",
            "file_size": file_size
        }
    
    def _calculate_execution_summary(self, executions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate summary statistics for pipeline executions."""
        total = len(executions)
        successful = sum(1 for ex in executions if ex.get("status") == "completed")
        failed = sum(1 for ex in executions if ex.get("status") == "failed")
        success_rate = (successful / total * 100) if total > 0 else 0
        
        return {
            "total": total,
            "successful": successful,
            "failed": failed,
            "success_rate": success_rate
        }
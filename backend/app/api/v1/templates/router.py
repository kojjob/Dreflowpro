"""
Template Builder API Router
Handles template creation, editing, preview, and marketplace operations
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
import uuid

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.user import Organization
from app.services.template_builder_service import TemplateBuilderService
from app.core.exceptions import ValidationException, ResourceNotFoundException, AuthorizationException

router = APIRouter(prefix="/templates", tags=["templates"])


async def get_current_organization(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Optional[Organization]:
    """Get current user's organization."""
    if not current_user.organization_id:
        return None
    
    result = await db.get(Organization, current_user.organization_id)
    return result


class CreateTemplateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    report_type: str = Field(..., pattern="^(executive|analyst|presentation|dashboard_export)$")
    category: Optional[str] = Field("custom", pattern="^(executive|financial|operational|marketing|custom)$")
    template_config: Dict[str, Any] = Field(..., description="Template configuration object")
    sections: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    layout_config: Optional[Dict[str, Any]] = Field(default_factory=dict)
    data_mappings: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    conditional_logic: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    theme_config: Optional[Dict[str, Any]] = Field(default_factory=dict)
    branding_enabled: bool = Field(True)
    branding_options: Optional[Dict[str, Any]] = Field(None)
    is_collaborative: bool = Field(False)
    is_public: bool = Field(False)
    tags: Optional[List[str]] = Field(default_factory=list)


class UpdateTemplateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    category: Optional[str] = Field(None, pattern="^(executive|financial|operational|marketing|custom)$")
    sections: Optional[List[Dict[str, Any]]] = Field(None)
    layout_config: Optional[Dict[str, Any]] = Field(None)
    data_mappings: Optional[List[Dict[str, Any]]] = Field(None)
    conditional_logic: Optional[List[Dict[str, Any]]] = Field(None)
    theme_config: Optional[Dict[str, Any]] = Field(None)
    branding_enabled: Optional[bool] = Field(None)
    branding_options: Optional[Dict[str, Any]] = Field(None)
    is_collaborative: Optional[bool] = Field(None)
    is_public: Optional[bool] = Field(None)
    tags: Optional[List[str]] = Field(None)


class AddSectionRequest(BaseModel):
    type: str = Field(..., pattern="^(header|kpi_grid|chart|table|text|image|separator|page_break)$")
    title: Optional[str] = Field(None, max_length=255)
    config: Dict[str, Any] = Field(..., description="Section configuration")
    order: Optional[int] = Field(None, ge=0)


class DuplicateTemplateRequest(BaseModel):
    new_name: str = Field(..., min_length=1, max_length=255)


@router.get("/", response_model=List[Dict[str, Any]])
async def list_templates(
    report_type: Optional[str] = Query(None, pattern="^(executive|analyst|presentation|dashboard_export)$"),
    category: Optional[str] = Query(None, pattern="^(executive|financial|operational|marketing|custom)$"),
    tags: Optional[List[str]] = Query(None),
    search: Optional[str] = Query(None, max_length=255),
    include_system: bool = Query(True),
    include_public: bool = Query(True),
    sort_by: Optional[str] = Query("usage_count", pattern="^(name|created_at|updated_at|usage_count|rating)$"),
    sort_desc: bool = Query(True),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_org: Optional[Organization] = Depends(get_current_organization)
):
    """List templates with filtering and pagination."""
    
    service = TemplateBuilderService(db, current_user, current_org)
    
    filters = {}
    if report_type:
        filters['report_type'] = report_type
    if category:
        filters['category'] = category
    if tags:
        filters['tags'] = tags
    if search:
        filters['search'] = search
    if sort_by:
        filters['sort_by'] = sort_by
        filters['sort_desc'] = sort_desc
    
    templates = await service.list_templates(
        filters=filters,
        include_system=include_system,
        include_public=include_public
    )
    
    # Apply pagination
    paginated_templates = templates[offset:offset + limit]
    
    # Convert to dict format
    result = []
    for template in paginated_templates:
        template_dict = template.to_dict()
        
        # Add branding info if available
        if template.branding_options:
            branding = template.branding_options[0]
            template_dict['branding'] = {
                'primary_color': branding.primary_color,
                'secondary_color': branding.secondary_color,
                'accent_color': branding.accent_color,
                'logo_url': branding.logo_url,
                'company_name': branding.company_name,
                'font_family': branding.font_family
            }
        
        result.append(template_dict)
    
    return result


@router.post("/", response_model=Dict[str, Any])
async def create_template(
    request: CreateTemplateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_org: Optional[Organization] = Depends(get_current_organization)
):
    """Create a new template."""
    
    service = TemplateBuilderService(db, current_user, current_org)
    
    try:
        template = await service.create_template(request.dict())
        return {
            "success": True,
            "data": template.to_dict(),
            "message": "Template created successfully"
        }
    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create template")


@router.get("/{template_id}", response_model=Dict[str, Any])
async def get_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_org: Optional[Organization] = Depends(get_current_organization)
):
    """Get a specific template by ID."""
    
    service = TemplateBuilderService(db, current_user, current_org)
    
    try:
        template = await service.get_template(template_id)
        if not template:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
        
        template_dict = template.to_dict()
        
        # Add branding info if available
        if template.branding_options:
            branding = template.branding_options[0]
            template_dict['branding'] = {
                'primary_color': branding.primary_color,
                'secondary_color': branding.secondary_color,
                'accent_color': branding.accent_color,
                'logo_url': branding.logo_url,
                'company_name': branding.company_name,
                'font_family': branding.font_family,
                'header_height': branding.header_height,
                'footer_height': branding.footer_height,
                'margin_top': branding.margin_top,
                'margin_bottom': branding.margin_bottom,
                'margin_left': branding.margin_left,
                'margin_right': branding.margin_right,
                'border_radius': branding.border_radius,
                'shadow_style': branding.shadow_style,
                'chart_palette': branding.chart_palette
            }
        
        return {
            "success": True,
            "data": template_dict
        }
        
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve template")


@router.put("/{template_id}", response_model=Dict[str, Any])
async def update_template(
    template_id: str,
    request: UpdateTemplateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_org: Optional[Organization] = Depends(get_current_organization)
):
    """Update a template."""
    
    service = TemplateBuilderService(db, current_user, current_org)
    
    try:
        # Filter out None values
        updates = {k: v for k, v in request.dict().items() if v is not None}
        
        template = await service.update_template(template_id, updates)
        return {
            "success": True,
            "data": template.to_dict(),
            "message": "Template updated successfully"
        }
        
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update template")


@router.delete("/{template_id}")
async def delete_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_org: Optional[Organization] = Depends(get_current_organization)
):
    """Delete a template."""
    
    service = TemplateBuilderService(db, current_user, current_org)
    
    try:
        await service.delete_template(template_id)
        return {
            "success": True,
            "message": "Template deleted successfully"
        }
        
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete template")


@router.post("/{template_id}/duplicate", response_model=Dict[str, Any])
async def duplicate_template(
    template_id: str,
    request: DuplicateTemplateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_org: Optional[Organization] = Depends(get_current_organization)
):
    """Duplicate an existing template."""
    
    service = TemplateBuilderService(db, current_user, current_org)
    
    try:
        template = await service.duplicate_template(template_id, request.new_name)
        return {
            "success": True,
            "data": template.to_dict(),
            "message": "Template duplicated successfully"
        }
        
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to duplicate template")


@router.post("/{template_id}/sections", response_model=Dict[str, Any])
async def add_section(
    template_id: str,
    request: AddSectionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_org: Optional[Organization] = Depends(get_current_organization)
):
    """Add a section to a template."""
    
    service = TemplateBuilderService(db, current_user, current_org)
    
    try:
        section_config = request.dict()
        template = await service.add_section_to_template(template_id, section_config)
        return {
            "success": True,
            "data": template.to_dict(),
            "message": "Section added successfully"
        }
        
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to add section")


@router.delete("/{template_id}/sections/{section_id}")
async def remove_section(
    template_id: str,
    section_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_org: Optional[Organization] = Depends(get_current_organization)
):
    """Remove a section from a template."""
    
    service = TemplateBuilderService(db, current_user, current_org)
    
    try:
        template = await service.remove_section_from_template(template_id, section_id)
        return {
            "success": True,
            "data": template.to_dict(),
            "message": "Section removed successfully"
        }
        
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to remove section")


@router.get("/{template_id}/preview", response_model=Dict[str, Any])
async def get_template_preview(
    template_id: str,
    sample_data: Optional[Dict[str, Any]] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_org: Optional[Organization] = Depends(get_current_organization)
):
    """Get a preview of the template with sample data."""
    
    service = TemplateBuilderService(db, current_user, current_org)
    
    try:
        preview = await service.get_template_preview(template_id, sample_data)
        return {
            "success": True,
            "data": preview
        }
        
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate preview")


@router.get("/categories/list", response_model=List[Dict[str, str]])
async def list_template_categories():
    """Get list of available template categories."""
    
    categories = [
        {"value": "executive", "label": "Executive", "description": "High-level executive summaries"},
        {"value": "financial", "label": "Financial", "description": "Financial reports and analysis"},
        {"value": "operational", "label": "Operational", "description": "Operational metrics and KPIs"},
        {"value": "marketing", "label": "Marketing", "description": "Marketing performance and analytics"},
        {"value": "custom", "label": "Custom", "description": "Custom templates"}
    ]
    
    return categories


@router.get("/sections/types", response_model=List[Dict[str, Any]])
async def list_section_types():
    """Get list of available section types with configuration options."""
    
    section_types = [
        {
            "type": "header",
            "label": "Header",
            "description": "Report title, subtitle, and logo",
            "icon": "FileText",
            "config_schema": {
                "title": {"type": "string", "required": True},
                "subtitle": {"type": "string", "required": False},
                "logo_url": {"type": "string", "required": False}
            }
        },
        {
            "type": "kpi_grid",
            "label": "KPI Grid", 
            "description": "Grid of key performance indicators",
            "icon": "BarChart3",
            "config_schema": {
                "columns": {"type": "integer", "default": 4, "min": 1, "max": 6},
                "metrics": {"type": "array", "required": True}
            }
        },
        {
            "type": "chart",
            "label": "Chart",
            "description": "Data visualization charts",
            "icon": "PieChart",
            "config_schema": {
                "chart_type": {"type": "string", "enum": ["line", "bar", "pie", "doughnut", "scatter"], "required": True},
                "title": {"type": "string", "required": True},
                "height": {"type": "integer", "default": 400}
            }
        },
        {
            "type": "table",
            "label": "Table",
            "description": "Data tables with sorting and filtering",
            "icon": "Grid",
            "config_schema": {
                "title": {"type": "string", "required": True},
                "show_pagination": {"type": "boolean", "default": True},
                "page_size": {"type": "integer", "default": 10}
            }
        },
        {
            "type": "text",
            "label": "Text",
            "description": "Rich text content",
            "icon": "Type",
            "config_schema": {
                "content": {"type": "string", "required": True},
                "style": {"type": "string", "enum": ["normal", "highlight", "callout"], "default": "normal"}
            }
        },
        {
            "type": "image",
            "label": "Image",
            "description": "Image with caption",
            "icon": "Image",
            "config_schema": {
                "image_url": {"type": "string", "required": True},
                "caption": {"type": "string", "required": False},
                "width": {"type": "string", "default": "100%"}
            }
        },
        {
            "type": "separator",
            "label": "Separator",
            "description": "Visual separator line",
            "icon": "Minus",
            "config_schema": {
                "style": {"type": "string", "enum": ["line", "space", "dots"], "default": "line"},
                "thickness": {"type": "integer", "default": 1}
            }
        },
        {
            "type": "page_break",
            "label": "Page Break",
            "description": "Force new page in PDF reports",
            "icon": "FileText",
            "config_schema": {}
        }
    ]
    
    return section_types
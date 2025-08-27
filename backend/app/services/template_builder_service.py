"""
Advanced Template Builder Service for DReflowPro
Supports drag-and-drop template creation, visual editing, and advanced customization
"""

import uuid
import json
import logging
from typing import Dict, List, Any, Optional, Union
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.orm import selectinload

from app.models.report import ReportTemplate, TemplateBrandingOptions, TemplateCategory, ReportType
from app.models.user import User
from app.models.user import Organization
from app.core.exceptions import ValidationException, ResourceNotFoundException, AuthorizationException

logger = logging.getLogger(__name__)


class TemplateSection:
    """Represents a template section with configuration."""
    
    def __init__(self, section_type: str, config: dict):
        self.id = str(uuid.uuid4())
        self.type = section_type
        self.config = config
        self.order = config.get('order', 0)
        
    def to_dict(self):
        return {
            'id': self.id,
            'type': self.type,
            'order': self.order,
            'config': self.config
        }


class TemplateBuilderService:
    """Advanced template builder service with drag-and-drop support."""
    
    def __init__(self, db: AsyncSession, current_user: User, current_org: Optional[Organization] = None):
        self.db = db
        self.current_user = current_user
        self.current_org = current_org
        
    async def create_template(self, template_data: Dict[str, Any]) -> ReportTemplate:
        """Create a new template with validation."""
        
        # Validate required fields
        required_fields = ['name', 'report_type', 'template_config']
        for field in required_fields:
            if not template_data.get(field):
                raise ValidationException(f"Missing required field: {field}")
        
        # Validate template structure
        if template_data.get('sections'):
            validation_errors = self._validate_sections(template_data['sections'])
            if validation_errors:
                raise ValidationException(f"Invalid sections: {', '.join(validation_errors)}")
        
        # Create template
        template = ReportTemplate(
            name=template_data['name'],
            description=template_data.get('description'),
            report_type=ReportType(template_data['report_type']),
            category=TemplateCategory(template_data.get('category', 'custom')),
            template_config=template_data['template_config'],
            sections=template_data.get('sections', []),
            layout_config=template_data.get('layout_config', {}),
            data_mappings=template_data.get('data_mappings', []),
            conditional_logic=template_data.get('conditional_logic', []),
            theme_config=template_data.get('theme_config', {}),
            branding_enabled=template_data.get('branding_enabled', True),
            is_collaborative=template_data.get('is_collaborative', False),
            is_public=template_data.get('is_public', False),
            tags=template_data.get('tags', []),
            user_id=self.current_user.id,
            organization_id=self.current_org.id if self.current_org else None
        )
        
        self.db.add(template)
        await self.db.commit()
        await self.db.refresh(template)
        
        # Create branding options if provided
        if template_data.get('branding_options'):
            await self._create_branding_options(template.id, template_data['branding_options'])
        
        logger.info(f"Created template {template.id} for user {self.current_user.id}")
        return template
    
    async def update_template(self, template_id: str, updates: Dict[str, Any]) -> ReportTemplate:
        """Update an existing template with validation."""
        
        template = await self.get_template(template_id)
        if not template:
            raise ResourceNotFoundException("Template", message="Template not found")
        
        # Check permissions
        if not await self._can_edit_template(template):
            raise AuthorizationException("Insufficient permissions to edit template")
        
        # Track changes for version control
        changes = {}
        
        # Update basic fields
        for field in ['name', 'description', 'category', 'is_public', 'tags']:
            if field in updates and updates[field] != getattr(template, field):
                changes[field] = {
                    'old': getattr(template, field),
                    'new': updates[field]
                }
                setattr(template, field, updates[field])
        
        # Update complex fields
        if 'sections' in updates:
            validation_errors = self._validate_sections(updates['sections'])
            if validation_errors:
                raise ValidationException(f"Invalid sections: {', '.join(validation_errors)}")
            changes['sections'] = {
                'old': template.sections,
                'new': updates['sections']
            }
            template.sections = updates['sections']
        
        for field in ['template_config', 'layout_config', 'data_mappings', 'conditional_logic', 'theme_config']:
            if field in updates:
                changes[field] = {
                    'old': getattr(template, field),
                    'new': updates[field]
                }
                setattr(template, field, updates[field])
        
        # Create version record
        if changes:
            template.create_version(self.current_user.id, changes)
        
        await self.db.commit()
        await self.db.refresh(template)
        
        # Update branding options if provided
        if 'branding_options' in updates:
            await self._update_branding_options(template.id, updates['branding_options'])
        
        logger.info(f"Updated template {template.id} with {len(changes)} changes")
        return template
    
    async def get_template(self, template_id: str) -> Optional[ReportTemplate]:
        """Get template by ID with full configuration."""
        
        result = await self.db.execute(
            select(ReportTemplate)
            .options(
                selectinload(ReportTemplate.branding_options),
                selectinload(ReportTemplate.user),
                selectinload(ReportTemplate.organization)
            )
            .where(ReportTemplate.id == template_id)
        )
        return result.scalar_one_or_none()
    
    async def list_templates(
        self, 
        filters: Optional[Dict[str, Any]] = None,
        include_system: bool = True,
        include_public: bool = True
    ) -> List[ReportTemplate]:
        """List templates with filtering options."""
        
        query = select(ReportTemplate).options(
            selectinload(ReportTemplate.branding_options),
            selectinload(ReportTemplate.user)
        )
        
        conditions = [ReportTemplate.is_active == True]
        
        # User's own templates
        user_templates = ReportTemplate.user_id == self.current_user.id
        
        # Organization templates (if user is in org)
        org_templates = []
        if self.current_org:
            org_templates = and_(
                ReportTemplate.organization_id == self.current_org.id,
                ReportTemplate.is_public == True
            )
        
        # System templates
        system_templates = ReportTemplate.is_system_template == True if include_system else False
        
        # Build access conditions
        access_conditions = [user_templates]
        if org_templates:
            access_conditions.append(org_templates)
        if include_system:
            access_conditions.append(system_templates)
        
        conditions.append(or_(*access_conditions))
        
        # Apply filters
        if filters:
            if filters.get('report_type'):
                conditions.append(ReportTemplate.report_type == ReportType(filters['report_type']))
            
            if filters.get('category'):
                conditions.append(ReportTemplate.category == TemplateCategory(filters['category']))
            
            if filters.get('tags'):
                # Filter by tags (JSON array contains any of the specified tags)
                for tag in filters['tags']:
                    conditions.append(ReportTemplate.tags.contains([tag]))
            
            if filters.get('search'):
                search_term = f"%{filters['search']}%"
                conditions.append(or_(
                    ReportTemplate.name.ilike(search_term),
                    ReportTemplate.description.ilike(search_term)
                ))
        
        query = query.where(and_(*conditions))
        
        # Apply ordering
        if filters and filters.get('sort_by'):
            sort_field = filters['sort_by']
            sort_desc = filters.get('sort_desc', False)
            
            if hasattr(ReportTemplate, sort_field):
                order_field = getattr(ReportTemplate, sort_field)
                query = query.order_by(desc(order_field) if sort_desc else order_field)
        else:
            # Default ordering by usage and rating
            query = query.order_by(desc(ReportTemplate.usage_count), desc(ReportTemplate.rating))
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def duplicate_template(self, template_id: str, new_name: str) -> ReportTemplate:
        """Duplicate an existing template."""
        
        original = await self.get_template(template_id)
        if not original:
            raise ResourceNotFoundException("Template", message="Template not found")
        
        # Check if user can access template
        if not await self._can_access_template(original):
            raise AuthorizationException("Insufficient permissions to access template")
        
        # Create duplicate
        duplicate = ReportTemplate(
            name=new_name,
            description=f"Copy of {original.description}" if original.description else None,
            report_type=original.report_type,
            category=original.category,
            template_config=original.template_config.copy() if original.template_config else {},
            sections=original.sections.copy() if original.sections else [],
            layout_config=original.layout_config.copy() if original.layout_config else {},
            data_mappings=original.data_mappings.copy() if original.data_mappings else [],
            conditional_logic=original.conditional_logic.copy() if original.conditional_logic else [],
            theme_config=original.theme_config.copy() if original.theme_config else {},
            branding_enabled=original.branding_enabled,
            tags=original.tags.copy() if original.tags else [],
            user_id=self.current_user.id,
            organization_id=self.current_org.id if self.current_org else None,
            parent_template_id=original.id  # Track inheritance
        )
        
        self.db.add(duplicate)
        await self.db.commit()
        await self.db.refresh(duplicate)
        
        # Duplicate branding options
        if original.branding_options:
            for branding in original.branding_options:
                new_branding = TemplateBrandingOptions(
                    template_id=duplicate.id,
                    primary_color=branding.primary_color,
                    secondary_color=branding.secondary_color,
                    accent_color=branding.accent_color,
                    logo_url=branding.logo_url,
                    company_name=branding.company_name,
                    font_family=branding.font_family,
                    header_height=branding.header_height,
                    footer_height=branding.footer_height,
                    margin_top=branding.margin_top,
                    margin_bottom=branding.margin_bottom,
                    margin_left=branding.margin_left,
                    margin_right=branding.margin_right,
                    border_radius=branding.border_radius,
                    shadow_style=branding.shadow_style,
                    chart_palette=branding.chart_palette.copy() if branding.chart_palette else None
                )
                self.db.add(new_branding)
        
        await self.db.commit()
        
        logger.info(f"Duplicated template {template_id} as {duplicate.id}")
        return duplicate
    
    async def delete_template(self, template_id: str) -> bool:
        """Delete a template (soft delete)."""
        
        template = await self.get_template(template_id)
        if not template:
            raise ResourceNotFoundException("Template", message="Template not found")
        
        if not await self._can_edit_template(template):
            raise AuthorizationException("Insufficient permissions to delete template")
        
        # Soft delete by setting is_active to False
        template.is_active = False
        await self.db.commit()
        
        logger.info(f"Deleted template {template_id}")
        return True
    
    async def add_section_to_template(self, template_id: str, section_config: Dict[str, Any]) -> ReportTemplate:
        """Add a new section to a template."""
        
        template = await self.get_template(template_id)
        if not template:
            raise ResourceNotFoundException("Template", message="Template not found")
        
        if not await self._can_edit_template(template):
            raise AuthorizationException("Insufficient permissions to edit template")
        
        # Validate section
        validation_errors = self._validate_section(section_config)
        if validation_errors:
            raise ValidationException(f"Invalid section: {', '.join(validation_errors)}")
        
        template.add_section(section_config)
        await self.db.commit()
        
        logger.info(f"Added section to template {template_id}")
        return template
    
    async def remove_section_from_template(self, template_id: str, section_id: str) -> ReportTemplate:
        """Remove a section from a template."""
        
        template = await self.get_template(template_id)
        if not template:
            raise ResourceNotFoundException("Template", message="Template not found")
        
        if not await self._can_edit_template(template):
            raise AuthorizationException("Insufficient permissions to edit template")
        
        success = template.remove_section(section_id)
        if not success:
            raise ResourceNotFoundException("Section", message="Section not found in template")
        
        await self.db.commit()
        
        logger.info(f"Removed section {section_id} from template {template_id}")
        return template
    
    async def get_template_preview(self, template_id: str, sample_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Generate a preview of the template with sample data."""
        
        template = await self.get_template(template_id)
        if not template:
            raise ResourceNotFoundException("Template", message="Template not found")
        
        if not await self._can_access_template(template):
            raise AuthorizationException("Insufficient permissions to access template")
        
        # Generate preview data
        preview_data = {
            'template_id': str(template.id),
            'name': template.name,
            'sections': [],
            'layout': template.layout_config or {},
            'theme': template.theme_config or {},
            'branding': {}
        }
        
        # Add branding options
        if template.branding_options:
            branding = template.branding_options[0]
            preview_data['branding'] = {
                'primary_color': branding.primary_color,
                'secondary_color': branding.secondary_color,
                'accent_color': branding.accent_color,
                'logo_url': branding.logo_url,
                'company_name': branding.company_name,
                'font_family': branding.font_family
            }
        
        # Generate sections with sample data
        if template.sections:
            for section in template.sections:
                section_preview = {
                    'id': section.get('id'),
                    'type': section.get('type'),
                    'title': section.get('title', f"Section {section.get('order', 1)}"),
                    'content': self._generate_section_preview(section, sample_data)
                }
                preview_data['sections'].append(section_preview)
        
        return preview_data
    
    def _validate_sections(self, sections: List[Dict[str, Any]]) -> List[str]:
        """Validate template sections."""
        errors = []
        
        if not isinstance(sections, list):
            errors.append("Sections must be a list")
            return errors
        
        for i, section in enumerate(sections):
            section_errors = self._validate_section(section, f"Section {i+1}")
            errors.extend(section_errors)
        
        return errors
    
    def _validate_section(self, section: Dict[str, Any], section_name: str = "Section") -> List[str]:
        """Validate a single section."""
        errors = []
        
        if not isinstance(section, dict):
            errors.append(f"{section_name} must be an object")
            return errors
        
        required_fields = ['type']
        for field in required_fields:
            if not section.get(field):
                errors.append(f"{section_name} missing required field: {field}")
        
        # Validate section type
        valid_types = ['header', 'kpi_grid', 'chart', 'table', 'text', 'image', 'separator', 'page_break']
        if section.get('type') not in valid_types:
            errors.append(f"{section_name} has invalid type: {section.get('type')}")
        
        return errors
    
    def _generate_section_preview(self, section: Dict[str, Any], sample_data: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate preview content for a section."""
        section_type = section.get('type')
        
        if section_type == 'header':
            return {
                'title': section.get('title', 'Report Title'),
                'subtitle': section.get('subtitle', 'Generated on ' + datetime.now().strftime('%Y-%m-%d')),
                'logo': section.get('logo_url', '/assets/logo.png')
            }
        
        elif section_type == 'kpi_grid':
            return {
                'metrics': [
                    {'title': 'Total Revenue', 'value': '$1,234,567', 'change': '+12.5%', 'trend': 'up'},
                    {'title': 'Active Users', 'value': '45,678', 'change': '+8.2%', 'trend': 'up'},
                    {'title': 'Conversion Rate', 'value': '3.45%', 'change': '-2.1%', 'trend': 'down'},
                    {'title': 'Customer Satisfaction', 'value': '4.8/5', 'change': '+0.3', 'trend': 'up'}
                ]
            }
        
        elif section_type == 'chart':
            return {
                'chart_type': section.get('chart_type', 'line'),
                'title': section.get('title', 'Sample Chart'),
                'data': {
                    'labels': ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    'datasets': [{
                        'label': 'Sample Data',
                        'data': [65, 59, 80, 81, 56, 55],
                        'borderColor': '#3b82f6',
                        'backgroundColor': '#3b82f6'
                    }]
                }
            }
        
        elif section_type == 'table':
            return {
                'title': section.get('title', 'Sample Table'),
                'headers': ['Product', 'Revenue', 'Growth', 'Status'],
                'rows': [
                    ['Product A', '$125,000', '+15.2%', 'Active'],
                    ['Product B', '$98,500', '+8.7%', 'Active'],
                    ['Product C', '$67,200', '-3.1%', 'Review']
                ]
            }
        
        elif section_type == 'text':
            return {
                'content': section.get('content', 'Sample text content for the report section.'),
                'style': section.get('style', 'normal')
            }
        
        return {'type': section_type, 'placeholder': True}
    
    async def _can_access_template(self, template: ReportTemplate) -> bool:
        """Check if user can access the template."""
        # System templates are accessible to everyone
        if template.is_system_template:
            return True
        
        # User's own templates
        if template.user_id == self.current_user.id:
            return True
        
        # Public templates in the same organization
        if (template.is_public and 
            self.current_org and 
            template.organization_id == self.current_org.id):
            return True
        
        return False
    
    async def _can_edit_template(self, template: ReportTemplate) -> bool:
        """Check if user can edit the template."""
        # Can't edit system templates
        if template.is_system_template:
            return False
        
        # User's own templates
        if template.user_id == self.current_user.id:
            return True
        
        # TODO: Add organization admin permissions
        
        return False
    
    async def _create_branding_options(self, template_id: str, branding_data: Dict[str, Any]):
        """Create branding options for a template."""
        branding = TemplateBrandingOptions(
            template_id=template_id,
            primary_color=branding_data.get('primary_color', '#1f2937'),
            secondary_color=branding_data.get('secondary_color', '#3b82f6'),
            accent_color=branding_data.get('accent_color', '#10b981'),
            logo_url=branding_data.get('logo_url'),
            company_name=branding_data.get('company_name'),
            font_family=branding_data.get('font_family', 'Inter'),
            header_height=branding_data.get('header_height', 80),
            footer_height=branding_data.get('footer_height', 60),
            margin_top=branding_data.get('margin_top', 20),
            margin_bottom=branding_data.get('margin_bottom', 20),
            margin_left=branding_data.get('margin_left', 20),
            margin_right=branding_data.get('margin_right', 20),
            border_radius=branding_data.get('border_radius', 8),
            shadow_style=branding_data.get('shadow_style', 'medium'),
            chart_palette=branding_data.get('chart_palette')
        )
        
        self.db.add(branding)
        await self.db.commit()
    
    async def _update_branding_options(self, template_id: str, branding_data: Dict[str, Any]):
        """Update branding options for a template."""
        result = await self.db.execute(
            select(TemplateBrandingOptions)
            .where(TemplateBrandingOptions.template_id == template_id)
        )
        branding = result.scalar_one_or_none()
        
        if not branding:
            await self._create_branding_options(template_id, branding_data)
            return
        
        # Update existing branding options
        for field, value in branding_data.items():
            if hasattr(branding, field):
                setattr(branding, field, value)
        
        await self.db.commit()
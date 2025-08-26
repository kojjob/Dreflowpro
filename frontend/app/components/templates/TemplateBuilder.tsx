'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Edit3, Eye, Move, Settings, Save, Undo, Redo,
  FileText, BarChart3, PieChart, Grid, Type, Image, Minus,
  Palette, Layout, Code, Download, Share2, Copy, Check,
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown, X, 
  DragHandleDots2, Maximize2, Minimize2, RotateCcw, Zap,
  AlertTriangle, Info, CheckCircle, XCircle, HelpCircle
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  DragOverEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

interface SectionConfig {
  [key: string]: string | number | boolean | string[] | null | undefined;
}

interface LayoutConfig {
  columns?: number;
  spacing?: number;
  padding?: number;
  background?: string;
  [key: string]: string | number | boolean | undefined;
}

interface ThemeConfig {
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  font_family?: string;
  font_size?: number;
  [key: string]: string | number | boolean | undefined;
}

interface BrandingOptions {
  company_name?: string;
  logo_url?: string;
  header_height?: number;
  footer_height?: number;
  [key: string]: string | number | boolean | undefined;
}

interface TemplateSection {
  id: string;
  type: string;
  title?: string;
  config: SectionConfig;
  order: number;
}

interface TemplateData {
  id?: string;
  name: string;
  description?: string;
  report_type: string;
  category: string;
  sections: TemplateSection[];
  layout_config: LayoutConfig;
  theme_config: ThemeConfig;
  branding_enabled: boolean;
  branding_options?: BrandingOptions;
  is_public: boolean;
  tags: string[];
}

interface ConfigSchema {
  [key: string]: {
    type: string;
    label: string;
    default?: string | number | boolean;
    options?: string[];
    required?: boolean;
  };
}

interface SectionType {
  type: string;
  label: string;
  description: string;
  icon: string;
  config_schema: ConfigSchema;
}

interface TemplateBuilderProps {
  initialTemplate?: Partial<TemplateData>;
  onSave: (template: TemplateData) => Promise<void>;
  onPreview: (template: TemplateData) => void;
  onClose: () => void;
  isLoading?: boolean;
}

const SECTION_TYPES: SectionType[] = [
  {
    type: 'header',
    label: 'Header',
    description: 'Report title, subtitle, and logo',
    icon: 'FileText',
    config_schema: {
      title: { type: 'string', required: true },
      subtitle: { type: 'string', required: false },
      logo_url: { type: 'string', required: false }
    }
  },
  {
    type: 'kpi_grid',
    label: 'KPI Grid',
    description: 'Grid of key performance indicators',
    icon: 'BarChart3',
    config_schema: {
      columns: { type: 'integer', default: 4, min: 1, max: 6 },
      metrics: { type: 'array', required: true }
    }
  },
  {
    type: 'chart',
    label: 'Chart',
    description: 'Data visualization charts',
    icon: 'PieChart',
    config_schema: {
      chart_type: { type: 'string', enum: ['line', 'bar', 'pie', 'doughnut', 'scatter'], required: true },
      title: { type: 'string', required: true },
      height: { type: 'integer', default: 400 }
    }
  },
  {
    type: 'table',
    label: 'Table',
    description: 'Data tables with sorting and filtering',
    icon: 'Grid',
    config_schema: {
      title: { type: 'string', required: true },
      show_pagination: { type: 'boolean', default: true },
      page_size: { type: 'integer', default: 10 }
    }
  },
  {
    type: 'text',
    label: 'Text',
    description: 'Rich text content',
    icon: 'Type',
    config_schema: {
      content: { type: 'string', required: true },
      style: { type: 'string', enum: ['normal', 'highlight', 'callout'], default: 'normal' }
    }
  },
  {
    type: 'image',
    label: 'Image',
    description: 'Image with caption',
    icon: 'Image',
    config_schema: {
      image_url: { type: 'string', required: true },
      caption: { type: 'string', required: false },
      width: { type: 'string', default: '100%' }
    }
  },
  {
    type: 'separator',
    label: 'Separator',
    description: 'Visual separator line',
    icon: 'Minus',
    config_schema: {
      style: { type: 'string', enum: ['line', 'space', 'dots'], default: 'line' },
      thickness: { type: 'integer', default: 1 }
    }
  }
];

const getIconComponent = (iconName: string) => {
  const icons: Record<string, React.ComponentType<{ className?: string; size?: string | number }>> = {
    FileText, BarChart3, PieChart, Grid, Type, Image, Minus
  };
  return icons[iconName] || FileText;
};

// Sortable section item component
const SortableSection: React.FC<{
  section: TemplateSection;
  onEdit: (section: TemplateSection) => void;
  onDelete: (id: string) => void;
  onDuplicate: (section: TemplateSection) => void;
  isSelected: boolean;
  onClick: () => void;
}> = ({ section, onEdit, onDelete, onDuplicate, isSelected, onClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  const sectionType = SECTION_TYPES.find(t => t.type === section.type);
  const IconComponent = getIconComponent(sectionType?.icon || 'FileText');

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative bg-white border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
      } ${isDragging ? 'shadow-lg scale-105' : ''}`}
      onClick={onClick}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-2 top-1/2 transform -translate-y-1/2 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <DragHandleDots2 className="w-5 h-5 text-gray-400" />
      </div>
      
      {/* Section Content */}
      <div className="flex items-center space-x-3 ml-6">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <IconComponent className="w-5 h-5 text-blue-600" />
        </div>
        
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">
            {section.title || sectionType?.label || 'Untitled Section'}
          </h4>
          <p className="text-sm text-gray-500">{sectionType?.description}</p>
        </div>
        
        {/* Actions */}
        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(section);
            }}
            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
            title="Edit section"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate(section);
            }}
            className="p-1 text-gray-400 hover:text-green-600 transition-colors"
            title="Duplicate section"
          >
            <Copy className="w-4 h-4" />
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(section.id);
            }}
            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
            title="Delete section"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Section editor modal
const SectionEditor: React.FC<{
  section: TemplateSection;
  sectionType: SectionType;
  isOpen: boolean;
  onClose: () => void;
  onSave: (section: TemplateSection) => void;
}> = ({ section, sectionType, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState(section);

  useEffect(() => {
    setFormData(section);
  }, [section]);

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              {React.createElement(getIconComponent(sectionType.icon), {
                className: "w-5 h-5 text-blue-600"
              })}
            </div>
            <div>
              <h3 className="text-lg font-semibold">Edit {sectionType.label}</h3>
              <p className="text-sm text-gray-500">{sectionType.description}</p>
            </div>
          </div>
          
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Form */}
        <div className="p-6">
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Section Title
              </label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={`Enter ${sectionType.label.toLowerCase()} title`}
              />
            </div>
            
            {/* Dynamic configuration based on section type */}
            {sectionType.type === 'chart' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chart Type
                  </label>
                  <select
                    value={formData.config.chart_type || 'line'}
                    onChange={(e) => setFormData({
                      ...formData,
                      config: { ...formData.config, chart_type: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="line">Line Chart</option>
                    <option value="bar">Bar Chart</option>
                    <option value="pie">Pie Chart</option>
                    <option value="doughnut">Doughnut Chart</option>
                    <option value="scatter">Scatter Plot</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Height (pixels)
                  </label>
                  <input
                    type="number"
                    value={formData.config.height || 400}
                    onChange={(e) => setFormData({
                      ...formData,
                      config: { ...formData.config, height: parseInt(e.target.value) || 400 }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="200"
                    max="800"
                  />
                </div>
              </>
            )}
            
            {sectionType.type === 'kpi_grid' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Columns
                </label>
                <select
                  value={formData.config.columns || 4}
                  onChange={(e) => setFormData({
                    ...formData,
                    config: { ...formData.config, columns: parseInt(e.target.value) }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={1}>1 Column</option>
                  <option value={2}>2 Columns</option>
                  <option value={3}>3 Columns</option>
                  <option value={4}>4 Columns</option>
                  <option value={5}>5 Columns</option>
                  <option value={6}>6 Columns</option>
                </select>
              </div>
            )}
            
            {sectionType.type === 'text' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content
                  </label>
                  <textarea
                    value={formData.config.content || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      config: { ...formData.config, content: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={4}
                    placeholder="Enter text content..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Style
                  </label>
                  <select
                    value={formData.config.style || 'normal'}
                    onChange={(e) => setFormData({
                      ...formData,
                      config: { ...formData.config, style: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="normal">Normal</option>
                    <option value="highlight">Highlight</option>
                    <option value="callout">Callout</option>
                  </select>
                </div>
              </>
            )}
            
            {sectionType.type === 'header' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subtitle
                  </label>
                  <input
                    type="text"
                    value={formData.config.subtitle || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      config: { ...formData.config, subtitle: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter subtitle..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Logo URL
                  </label>
                  <input
                    type="url"
                    value={formData.config.logo_url || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      config: { ...formData.config, logo_url: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://..."
                  />
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Save Changes
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const TemplateBuilder: React.FC<TemplateBuilderProps> = ({
  initialTemplate,
  onSave,
  onPreview,
  onClose,
  isLoading = false
}) => {
  const [template, setTemplate] = useState<TemplateData>({
    name: '',
    description: '',
    report_type: 'executive',
    category: 'custom',
    sections: [],
    layout_config: {},
    theme_config: {},
    branding_enabled: true,
    is_public: false,
    tags: [],
    ...initialTemplate
  });

  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<TemplateSection | null>(null);
  const [draggedSection, setDraggedSection] = useState<TemplateSection | null>(null);
  const [undoStack, setUndoStack] = useState<TemplateData[]>([]);
  const [redoStack, setRedoStack] = useState<TemplateData[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showBranding, setShowBranding] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Save current state to undo stack
  const saveToUndoStack = useCallback(() => {
    setUndoStack(prev => [...prev.slice(-19), { ...template }]);
    setRedoStack([]);
    setHasUnsavedChanges(true);
  }, [template]);

  const undo = () => {
    if (undoStack.length === 0) return;
    
    const previousState = undoStack[undoStack.length - 1];
    setRedoStack(prev => [...prev, { ...template }]);
    setUndoStack(prev => prev.slice(0, -1));
    setTemplate(previousState);
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    
    const nextState = redoStack[redoStack.length - 1];
    setUndoStack(prev => [...prev, { ...template }]);
    setRedoStack(prev => prev.slice(0, -1));
    setTemplate(nextState);
  };

  const addSection = (sectionType: string) => {
    saveToUndoStack();
    
    const newSection: TemplateSection = {
      id: `section_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: sectionType,
      title: SECTION_TYPES.find(t => t.type === sectionType)?.label,
      config: {},
      order: template.sections.length
    };

    setTemplate(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }));
  };

  const deleteSection = (sectionId: string) => {
    saveToUndoStack();
    
    setTemplate(prev => ({
      ...prev,
      sections: prev.sections
        .filter(s => s.id !== sectionId)
        .map((s, index) => ({ ...s, order: index }))
    }));
    
    if (selectedSection === sectionId) {
      setSelectedSection(null);
    }
  };

  const duplicateSection = (section: TemplateSection) => {
    saveToUndoStack();
    
    const duplicatedSection: TemplateSection = {
      ...section,
      id: `section_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: `${section.title} (Copy)`,
      order: template.sections.length
    };

    setTemplate(prev => ({
      ...prev,
      sections: [...prev.sections, duplicatedSection]
    }));
  };

  const updateSection = (updatedSection: TemplateSection) => {
    saveToUndoStack();
    
    setTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(s => 
        s.id === updatedSection.id ? updatedSection : s
      )
    }));
  };

  const handleDragStart = (event: DragStartEvent) => {
    const section = template.sections.find(s => s.id === event.active.id);
    setDraggedSection(section || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) {
      setDraggedSection(null);
      return;
    }

    saveToUndoStack();

    const oldIndex = template.sections.findIndex(s => s.id === active.id);
    const newIndex = template.sections.findIndex(s => s.id === over.id);

    const newSections = arrayMove(template.sections, oldIndex, newIndex);
    const reorderedSections = newSections.map((section, index) => ({
      ...section,
      order: index
    }));

    setTemplate(prev => ({
      ...prev,
      sections: reorderedSections
    }));
    
    setDraggedSection(null);
  };

  const validateTemplate = (): string[] => {
    const errors: string[] = [];
    
    if (!template.name.trim()) {
      errors.push('Template name is required');
    }
    
    if (template.sections.length === 0) {
      errors.push('Template must have at least one section');
    }
    
    template.sections.forEach((section, index) => {
      const sectionType = SECTION_TYPES.find(t => t.type === section.type);
      if (!sectionType) {
        errors.push(`Section ${index + 1} has invalid type`);
        return;
      }
      
      // Check required fields based on schema
      Object.entries(sectionType.config_schema).forEach(([field, schema]) => {
        if (schema.required && !section.config[field]) {
          errors.push(`Section ${index + 1} (${sectionType.label}): ${field} is required`);
        }
      });
    });
    
    return errors;
  };

  const handleSave = async () => {
    const errors = validateTemplate();
    setValidationErrors(errors);
    
    if (errors.length > 0) {
      return;
    }
    
    try {
      await onSave(template);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save template:', error);
    }
  };

  const handlePreview = () => {
    onPreview(template);
  };

  return (
    <div className="fixed inset-0 bg-gray-100 z-40">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {initialTemplate?.id ? 'Edit Template' : 'Create Template'}
              </h1>
              <p className="text-sm text-gray-500">
                {template.sections.length} sections • {hasUnsavedChanges ? 'Unsaved changes' : 'Saved'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={undo}
              disabled={undoStack.length === 0}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Undo (Ctrl+Z)"
            >
              <Undo className="w-5 h-5" />
            </button>
            
            <button
              onClick={redo}
              disabled={redoStack.length === 0}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Redo (Ctrl+Y)"
            >
              <Redo className="w-5 h-5" />
            </button>
            
            <div className="w-px h-6 bg-gray-300" />
            
            <button
              onClick={handlePreview}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Eye className="w-4 h-4 mr-2 inline" />
              Preview
            </button>
            
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 inline-block" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2 inline" />
                  Save Template
                </>
              )}
            </button>
          </div>
        </div>
        
        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2 text-red-800 mb-2">
              <XCircle className="w-4 h-4" />
              <span className="font-medium">Validation Errors</span>
            </div>
            <ul className="text-sm text-red-700 space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      <div className="flex h-[calc(100vh-73px)]">
        {/* Left Sidebar - Template Settings */}
        <div className="w-80 bg-white border-r overflow-y-auto">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Template Settings</h3>
            
            <div className="space-y-4">
              {/* Template Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={template.name}
                  onChange={(e) => setTemplate(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter template name..."
                />
              </div>
              
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={template.description || ''}
                  onChange={(e) => setTemplate(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Describe this template..."
                />
              </div>
              
              {/* Report Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Report Type
                </label>
                <select
                  value={template.report_type}
                  onChange={(e) => setTemplate(prev => ({ ...prev, report_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="executive">Executive Summary</option>
                  <option value="analyst">Analyst Report</option>
                  <option value="presentation">Presentation</option>
                  <option value="dashboard_export">Dashboard Export</option>
                </select>
              </div>
              
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={template.category}
                  onChange={(e) => setTemplate(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="executive">Executive</option>
                  <option value="financial">Financial</option>
                  <option value="operational">Operational</option>
                  <option value="marketing">Marketing</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              
              {/* Public Template */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={template.is_public}
                  onChange={(e) => setTemplate(prev => ({ ...prev, is_public: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_public" className="text-sm text-gray-700">
                  Make template available to organization
                </label>
              </div>
              
              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={template.tags.join(', ')}
                  onChange={(e) => setTemplate(prev => ({
                    ...prev,
                    tags: e.target.value.split(',').map(t => t.trim()).filter(t => t)
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="report, analytics, kpi..."
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Center - Template Builder */}
        <div className="flex-1 flex">
          {/* Sections Panel */}
          <div className="w-80 bg-white border-r">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold mb-4">Template Sections</h3>
              
              {/* Add Section Dropdown */}
              <div className="relative">
                <details className="group">
                  <summary className="flex items-center justify-center w-full px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Section
                    <ChevronDown className="w-4 h-4 ml-2 transition-transform group-open:rotate-180" />
                  </summary>
                  
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                    <div className="grid grid-cols-2 gap-2 p-3">
                      {SECTION_TYPES.map((sectionType) => {
                        const IconComponent = getIconComponent(sectionType.icon);
                        return (
                          <button
                            key={sectionType.type}
                            onClick={() => addSection(sectionType.type)}
                            className="p-3 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                          >
                            <div className="flex items-center space-x-2 mb-1">
                              <IconComponent className="w-4 h-4 text-blue-600" />
                              <span className="text-sm font-medium">{sectionType.label}</span>
                            </div>
                            <p className="text-xs text-gray-500">{sectionType.description}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </details>
              </div>
            </div>
            
            {/* Sections List */}
            <div className="p-4 flex-1 overflow-y-auto">
              {template.sections.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Layout className="w-8 h-8 text-gray-400" />
                  </div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">No sections yet</h4>
                  <p className="text-xs text-gray-500">Add sections to start building your template</p>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  modifiers={[restrictToVerticalAxis]}
                >
                  <SortableContext
                    items={template.sections.map(s => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {template.sections.map((section) => (
                        <SortableSection
                          key={section.id}
                          section={section}
                          onEdit={setEditingSection}
                          onDelete={deleteSection}
                          onDuplicate={duplicateSection}
                          isSelected={selectedSection === section.id}
                          onClick={() => setSelectedSection(section.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                  
                  <DragOverlay>
                    {draggedSection ? (
                      <div className="bg-white border-2 border-blue-500 rounded-lg p-4 shadow-lg opacity-90">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            {React.createElement(getIconComponent(
                              SECTION_TYPES.find(t => t.type === draggedSection.type)?.icon || 'FileText'
                            ), {
                              className: "w-5 h-5 text-blue-600"
                            })}
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {draggedSection.title || SECTION_TYPES.find(t => t.type === draggedSection.type)?.label}
                            </h4>
                            <p className="text-sm text-gray-500">
                              {SECTION_TYPES.find(t => t.type === draggedSection.type)?.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              )}
            </div>
          </div>
          
          {/* Preview Panel */}
          <div className="flex-1 bg-gray-50 overflow-y-auto">
            <div className="p-6">
              <div className="bg-white rounded-lg shadow-sm min-h-[800px] max-w-4xl mx-auto">
                {/* Template Preview Header */}
                <div className="p-6 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold">{template.name || 'Untitled Template'}</h2>
                      <p className="text-gray-500 text-sm mt-1">Template Preview</p>
                    </div>
                    <div className="text-sm text-gray-500">
                      {template.sections.length} sections
                    </div>
                  </div>
                </div>
                
                {/* Template Sections Preview */}
                <div className="p-6">
                  {template.sections.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-10 h-10 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Empty Template</h3>
                      <p className="text-gray-500">Add sections to see the template preview</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {template.sections.map((section, index) => {
                        const sectionType = SECTION_TYPES.find(t => t.type === section.type);
                        const IconComponent = getIconComponent(sectionType?.icon || 'FileText');
                        
                        return (
                          <div
                            key={section.id}
                            className={`border-2 border-dashed rounded-lg p-6 transition-all ${
                              selectedSection === section.id 
                                ? 'border-blue-500 bg-blue-50' 
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => setSelectedSection(section.id)}
                          >
                            <div className="flex items-center space-x-3 mb-4">
                              <IconComponent className="w-5 h-5 text-blue-600" />
                              <h4 className="font-medium">
                                {section.title || sectionType?.label || 'Untitled Section'}
                              </h4>
                              <span className="text-sm text-gray-500">#{index + 1}</span>
                            </div>
                            
                            {/* Section Preview Content */}
                            <div className="text-sm text-gray-600">
                              {section.type === 'header' && (
                                <div>
                                  <p><strong>Title:</strong> {section.config.title || section.title || 'Report Title'}</p>
                                  {section.config.subtitle && <p><strong>Subtitle:</strong> {section.config.subtitle}</p>}
                                  {section.config.logo_url && <p><strong>Logo:</strong> {section.config.logo_url}</p>}
                                </div>
                              )}
                              
                              {section.type === 'kpi_grid' && (
                                <div>
                                  <p><strong>Columns:</strong> {section.config.columns || 4}</p>
                                  <p>Will display key performance indicators in a grid layout</p>
                                </div>
                              )}
                              
                              {section.type === 'chart' && (
                                <div>
                                  <p><strong>Chart Type:</strong> {section.config.chart_type || 'line'}</p>
                                  <p><strong>Height:</strong> {section.config.height || 400}px</p>
                                  <div className="mt-2 h-24 bg-gray-100 rounded flex items-center justify-center">
                                    <PieChart className="w-8 h-8 text-gray-400" />
                                  </div>
                                </div>
                              )}
                              
                              {section.type === 'table' && (
                                <div>
                                  <p>Data table with sorting and filtering capabilities</p>
                                  <div className="mt-2 h-16 bg-gray-100 rounded flex items-center justify-center">
                                    <Grid className="w-6 h-6 text-gray-400" />
                                  </div>
                                </div>
                              )}
                              
                              {section.type === 'text' && (
                                <div>
                                  <p><strong>Style:</strong> {section.config.style || 'normal'}</p>
                                  <div className="mt-2 p-3 bg-gray-100 rounded">
                                    {section.config.content || 'Sample text content will appear here.'}
                                  </div>
                                </div>
                              )}
                              
                              {section.type === 'separator' && (
                                <div>
                                  <p><strong>Style:</strong> {section.config.style || 'line'}</p>
                                  <div className="mt-2 h-px bg-gray-300"></div>
                                </div>
                              )}
                              
                              {!['header', 'kpi_grid', 'chart', 'table', 'text', 'separator'].includes(section.type) && (
                                <p>Section content will be displayed here</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Section Editor Modal */}
      <AnimatePresence>
        {editingSection && (
          <SectionEditor
            section={editingSection}
            sectionType={SECTION_TYPES.find(t => t.type === editingSection.type)!}
            isOpen={!!editingSection}
            onClose={() => setEditingSection(null)}
            onSave={updateSection}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default TemplateBuilder;
'use client';

import React, { useState, useEffect } from 'react';
import { Filter, SortAsc, SortDesc, Group, Calculator, Trash2, Plus, Eye, Download, RefreshCw } from 'lucide-react';

interface DataColumn {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  nullable: boolean;
  unique: boolean;
  samples: any[];
}

interface DataTransformation {
  id: string;
  type: 'filter' | 'sort' | 'group' | 'calculate' | 'clean' | 'validate';
  name: string;
  config: any;
  applied: boolean;
}

interface DataManipulationProps {
  data: any[];
  columns: DataColumn[];
  onDataChanged?: (transformedData: any[], transformations: DataTransformation[]) => void;
  onExport?: (data: any[], format: string) => void;
}

const DataManipulation: React.FC<DataManipulationProps> = ({
  data,
  columns,
  onDataChanged,
  onExport
}) => {
  const [transformations, setTransformations] = useState<DataTransformation[]>([]);
  const [transformedData, setTransformedData] = useState(data);
  const [selectedTransformation, setSelectedTransformation] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Apply transformations whenever they change
  useEffect(() => {
    applyTransformations();
  }, [transformations, data]);

  const applyTransformations = () => {
    let result = [...data];
    
    transformations.filter(t => t.applied).forEach(transformation => {
      result = applyTransformation(result, transformation);
    });
    
    setTransformedData(result);
    onDataChanged?.(result, transformations);
  };

  const applyTransformation = (inputData: any[], transformation: DataTransformation): any[] => {
    switch (transformation.type) {
      case 'filter':
        return applyFilter(inputData, transformation.config);
      case 'sort':
        return applySort(inputData, transformation.config);
      case 'group':
        return applyGroup(inputData, transformation.config);
      case 'calculate':
        return applyCalculate(inputData, transformation.config);
      case 'clean':
        return applyClean(inputData, transformation.config);
      case 'validate':
        return applyValidate(inputData, transformation.config);
      default:
        return inputData;
    }
  };

  const applyFilter = (inputData: any[], config: any): any[] => {
    const { column, operator, value } = config;
    
    return inputData.filter(row => {
      const cellValue = row[column];
      
      switch (operator) {
        case 'equals':
          return cellValue == value;
        case 'not_equals':
          return cellValue != value;
        case 'contains':
          return String(cellValue).toLowerCase().includes(String(value).toLowerCase());
        case 'not_contains':
          return !String(cellValue).toLowerCase().includes(String(value).toLowerCase());
        case 'greater_than':
          return Number(cellValue) > Number(value);
        case 'less_than':
          return Number(cellValue) < Number(value);
        case 'greater_equal':
          return Number(cellValue) >= Number(value);
        case 'less_equal':
          return Number(cellValue) <= Number(value);
        case 'is_null':
          return cellValue == null || cellValue === '';
        case 'is_not_null':
          return cellValue != null && cellValue !== '';
        default:
          return true;
      }
    });
  };

  const applySort = (inputData: any[], config: any): any[] => {
    const { column, direction } = config;
    
    return [...inputData].sort((a, b) => {
      const aVal = a[column];
      const bVal = b[column];
      
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return direction === 'asc' ? -1 : 1;
      if (bVal == null) return direction === 'asc' ? 1 : -1;
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      
      if (direction === 'asc') {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });
  };

  const applyGroup = (inputData: any[], config: any): any[] => {
    const { groupBy, aggregations } = config;
    
    const groups = inputData.reduce((acc, row) => {
      const key = row[groupBy];
      if (!acc[key]) acc[key] = [];
      acc[key].push(row);
      return acc;
    }, {} as Record<string, any[]>);
    
    return Object.entries(groups).map(([key, groupRows]) => {
      const result: any = { [groupBy]: key };
      
      aggregations.forEach((agg: any) => {
        const values = groupRows.map(row => row[agg.column]).filter(v => v != null);
        
        switch (agg.function) {
          case 'count':
            result[`${agg.column}_count`] = groupRows.length;
            break;
          case 'sum':
            result[`${agg.column}_sum`] = values.reduce((sum, val) => sum + Number(val), 0);
            break;
          case 'avg':
            result[`${agg.column}_avg`] = values.length > 0 ? 
              values.reduce((sum, val) => sum + Number(val), 0) / values.length : 0;
            break;
          case 'min':
            result[`${agg.column}_min`] = Math.min(...values.map(Number));
            break;
          case 'max':
            result[`${agg.column}_max`] = Math.max(...values.map(Number));
            break;
        }
      });
      
      return result;
    });
  };

  const applyCalculate = (inputData: any[], config: any): any[] => {
    const { newColumn, expression, columns: usedColumns } = config;
    
    return inputData.map(row => {
      let result = expression;
      
      // Simple expression evaluation (in production, use a proper expression parser)
      usedColumns.forEach((col: string) => {
        const value = row[col] || 0;
        result = result.replace(new RegExp(`\\b${col}\\b`, 'g'), value);
      });
      
      try {
        // Basic math evaluation (unsafe - use proper parser in production)
        const calculatedValue = Function(`"use strict"; return (${result})`)();
        return { ...row, [newColumn]: calculatedValue };
      } catch {
        return { ...row, [newColumn]: null };
      }
    });
  };

  const applyClean = (inputData: any[], config: any): any[] => {
    const { operations } = config;
    
    return inputData.map(row => {
      const cleanedRow = { ...row };
      
      operations.forEach((op: any) => {
        switch (op.type) {
          case 'remove_nulls':
            if (cleanedRow[op.column] == null || cleanedRow[op.column] === '') {
              if (op.action === 'remove_row') {
                return null; // Mark for removal
              } else if (op.action === 'fill_default') {
                cleanedRow[op.column] = op.defaultValue || '';
              }
            }
            break;
          case 'trim_whitespace':
            if (typeof cleanedRow[op.column] === 'string') {
              cleanedRow[op.column] = cleanedRow[op.column].trim();
            }
            break;
          case 'standardize_case':
            if (typeof cleanedRow[op.column] === 'string') {
              cleanedRow[op.column] = op.case === 'upper' ? 
                cleanedRow[op.column].toUpperCase() : 
                cleanedRow[op.column].toLowerCase();
            }
            break;
        }
      });
      
      return cleanedRow;
    }).filter(row => row !== null);
  };

  const applyValidate = (inputData: any[], config: any): any[] => {
    const { rules } = config;
    
    return inputData.map(row => {
      const validationErrors: string[] = [];
      
      rules.forEach((rule: any) => {
        const value = row[rule.column];
        
        switch (rule.type) {
          case 'required':
            if (value == null || value === '') {
              validationErrors.push(`${rule.column} is required`);
            }
            break;
          case 'range':
            if (value != null && (Number(value) < rule.min || Number(value) > rule.max)) {
              validationErrors.push(`${rule.column} must be between ${rule.min} and ${rule.max}`);
            }
            break;
          case 'pattern':
            if (value != null && !new RegExp(rule.pattern).test(String(value))) {
              validationErrors.push(`${rule.column} does not match required pattern`);
            }
            break;
        }
      });
      
      return { ...row, _validation_errors: validationErrors };
    });
  };

  const addTransformation = (type: DataTransformation['type']) => {
    const newTransformation: DataTransformation = {
      id: `transform-${Date.now()}`,
      type,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${transformations.length + 1}`,
      config: getDefaultConfig(type),
      applied: false
    };
    
    setTransformations(prev => [...prev, newTransformation]);
    setSelectedTransformation(newTransformation.id);
  };

  const getDefaultConfig = (type: DataTransformation['type']) => {
    switch (type) {
      case 'filter':
        return { column: columns[0]?.name || '', operator: 'equals', value: '' };
      case 'sort':
        return { column: columns[0]?.name || '', direction: 'asc' };
      case 'group':
        return { groupBy: columns[0]?.name || '', aggregations: [] };
      case 'calculate':
        return { newColumn: 'calculated_field', expression: '', columns: [] };
      case 'clean':
        return { operations: [] };
      case 'validate':
        return { rules: [] };
      default:
        return {};
    }
  };

  const updateTransformation = (id: string, config: any) => {
    setTransformations(prev => prev.map(t => 
      t.id === id ? { ...t, config } : t
    ));
  };

  const toggleTransformation = (id: string) => {
    setTransformations(prev => prev.map(t => 
      t.id === id ? { ...t, applied: !t.applied } : t
    ));
  };

  const removeTransformation = (id: string) => {
    setTransformations(prev => prev.filter(t => t.id !== id));
    if (selectedTransformation === id) {
      setSelectedTransformation(null);
    }
  };

  const exportData = (format: string) => {
    onExport?.(transformedData, format);
  };

  return (
    <div className="space-y-6">
      {/* Transformation Controls */}
      <div className="bg-white border rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Data Transformations</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Eye className="w-4 h-4" />
              <span>{showPreview ? 'Hide' : 'Show'} Preview</span>
            </button>
            <button
              onClick={() => exportData('csv')}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Add Transformation Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-6">
          <button
            onClick={() => addTransformation('filter')}
            className="flex items-center space-x-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Filter className="w-4 h-4" />
            <span className="text-sm">Filter</span>
          </button>
          <button
            onClick={() => addTransformation('sort')}
            className="flex items-center space-x-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <SortAsc className="w-4 h-4" />
            <span className="text-sm">Sort</span>
          </button>
          <button
            onClick={() => addTransformation('group')}
            className="flex items-center space-x-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Group className="w-4 h-4" />
            <span className="text-sm">Group</span>
          </button>
          <button
            onClick={() => addTransformation('calculate')}
            className="flex items-center space-x-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Calculator className="w-4 h-4" />
            <span className="text-sm">Calculate</span>
          </button>
          <button
            onClick={() => addTransformation('clean')}
            className="flex items-center space-x-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="text-sm">Clean</span>
          </button>
          <button
            onClick={() => addTransformation('validate')}
            className="flex items-center space-x-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">Validate</span>
          </button>
        </div>

        {/* Transformations List */}
        {transformations.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Applied Transformations</h4>
            {transformations.map((transformation) => (
              <div
                key={transformation.id}
                className={`border rounded-lg p-4 ${
                  transformation.applied ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={transformation.applied}
                      onChange={() => toggleTransformation(transformation.id)}
                      className="rounded border-gray-300"
                    />
                    <span className="font-medium text-gray-900">{transformation.name}</span>
                    <span className="text-sm text-gray-600">({transformation.type})</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedTransformation(
                        selectedTransformation === transformation.id ? null : transformation.id
                      )}
                      className="text-blue-600 hover:text-blue-700 text-sm"
                    >
                      {selectedTransformation === transformation.id ? 'Hide' : 'Configure'}
                    </button>
                    <button
                      onClick={() => removeTransformation(transformation.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Configuration Panel */}
                {selectedTransformation === transformation.id && (
                  <div className="mt-4 p-4 bg-white border rounded">
                    <TransformationConfig
                      transformation={transformation}
                      columns={columns}
                      onConfigChange={(config) => updateTransformation(transformation.id, config)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Data Preview */}
      {showPreview && (
        <div className="bg-white border rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Data Preview</h3>
            <span className="text-sm text-gray-600">
              {transformedData.length} rows × {columns.length} columns
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {columns.slice(0, 10).map((column) => (
                    <th
                      key={column.name}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {column.name}
                      <span className={`ml-2 px-2 py-1 rounded text-xs ${
                        column.type === 'number' ? 'bg-blue-100 text-blue-700' :
                        column.type === 'date' ? 'bg-green-100 text-green-700' :
                        column.type === 'boolean' ? 'bg-purple-100 text-purple-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {column.type}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transformedData.slice(0, 10).map((row, index) => (
                  <tr key={index}>
                    {columns.slice(0, 10).map((column) => (
                      <td key={column.name} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row[column.name] != null ? String(row[column.name]) : '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {transformedData.length > 10 && (
            <div className="mt-4 text-center text-sm text-gray-600">
              Showing first 10 rows of {transformedData.length} total rows
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Transformation Configuration Component
interface TransformationConfigProps {
  transformation: DataTransformation;
  columns: DataColumn[];
  onConfigChange: (config: any) => void;
}

const TransformationConfig: React.FC<TransformationConfigProps> = ({
  transformation,
  columns,
  onConfigChange
}) => {
  const { config } = transformation;

  const updateConfig = (updates: any) => {
    onConfigChange({ ...config, ...updates });
  };

  switch (transformation.type) {
    case 'filter':
      return (
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Column</label>
            <select
              value={config.column}
              onChange={(e) => updateConfig({ column: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              {columns.map(col => (
                <option key={col.name} value={col.name}>{col.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Operator</label>
            <select
              value={config.operator}
              onChange={(e) => updateConfig({ operator: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value="equals">Equals</option>
              <option value="not_equals">Not Equals</option>
              <option value="contains">Contains</option>
              <option value="not_contains">Not Contains</option>
              <option value="greater_than">Greater Than</option>
              <option value="less_than">Less Than</option>
              <option value="greater_equal">Greater or Equal</option>
              <option value="less_equal">Less or Equal</option>
              <option value="is_null">Is Null</option>
              <option value="is_not_null">Is Not Null</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
            <input
              type="text"
              value={config.value}
              onChange={(e) => updateConfig({ value: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2"
              placeholder="Enter value"
            />
          </div>
        </div>
      );

    case 'sort':
      return (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Column</label>
            <select
              value={config.column}
              onChange={(e) => updateConfig({ column: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              {columns.map(col => (
                <option key={col.name} value={col.name}>{col.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Direction</label>
            <select
              value={config.direction}
              onChange={(e) => updateConfig({ direction: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
        </div>
      );

    default:
      return (
        <div className="text-sm text-gray-600">
          Configuration for {transformation.type} transformation
        </div>
      );
  }
};

export default DataManipulation;

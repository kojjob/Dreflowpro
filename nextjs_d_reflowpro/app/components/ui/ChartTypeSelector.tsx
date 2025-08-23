'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, RotateCcw, Info } from 'lucide-react';
import { CHART_TYPES, CHART_COMPATIBILITY } from '../../config/dataConfig';

interface ChartTypeSelectorProps {
  currentType: string;
  visualizationData: any;
  onTypeChange: (newType: string) => void;
  suggestedType?: string;
  className?: string;
}

export default function ChartTypeSelector({
  currentType,
  visualizationData,
  onTypeChange,
  suggestedType,
  className = '',
}: ChartTypeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowTooltip(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get compatible chart types based on data
  const getCompatibleTypes = () => {
    const dataPointsCount = visualizationData?.data?.labels?.length || 0;
    const dataType = 'categorical'; // Default, could be enhanced with actual data type detection
    
    const compatibleTypes = CHART_COMPATIBILITY.getCompatibleChartTypes(dataType, dataPointsCount);
    const allTypes = Object.keys(CHART_TYPES);
    
    return allTypes.map(type => ({
      ...CHART_TYPES[type as keyof typeof CHART_TYPES],
      isCompatible: compatibleTypes.includes(type),
      isCurrent: type === currentType,
      isSuggested: type === suggestedType,
    }));
  };

  const chartTypes = getCompatibleTypes();
  const currentChart = CHART_TYPES[currentType as keyof typeof CHART_TYPES] || CHART_TYPES.bar;

  const handleTypeSelect = (newType: string) => {
    if (CHART_COMPATIBILITY.validateChartTypeForData(newType, visualizationData?.data)) {
      onTypeChange(newType);
      setIsOpen(false);
    }
  };

  const handleResetToSuggested = () => {
    if (suggestedType && suggestedType !== currentType) {
      onTypeChange(suggestedType);
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="flex items-center gap-2">
        {/* Chart Type Selector Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <span className="text-base" role="img" aria-label={currentChart.name}>
            {currentChart.icon}
          </span>
          <span className="hidden sm:inline">{currentChart.name}</span>
          <ChevronDown className="h-4 w-4" />
        </button>

        {/* Reset to Suggested Button */}
        {suggestedType && suggestedType !== currentType && (
          <button
            onClick={handleResetToSuggested}
            className="flex items-center gap-1 px-2 py-2 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="Reset to recommended chart type"
          >
            <RotateCcw className="h-3 w-3" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        )}

        {/* Info Icon with Tooltip */}
        <div
          className="relative"
          onMouseEnter={() => setShowTooltip('info')}
          onMouseLeave={() => setShowTooltip(null)}
        >
          <Info className="h-4 w-4 text-gray-400 cursor-help" />
          {showTooltip === 'info' && (
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-2 text-xs text-white bg-gray-800 rounded-md shadow-lg z-50">
              <p className="font-medium mb-1">Current: {currentChart.name}</p>
              <p>{currentChart.description}</p>
              {suggestedType && suggestedType !== currentType && (
                <p className="mt-1 text-blue-200">
                  Suggested: {CHART_TYPES[suggestedType as keyof typeof CHART_TYPES]?.name}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-gray-300 rounded-md shadow-lg z-50">
          <div className="p-2">
            <div className="text-xs font-medium text-gray-500 mb-2 px-2">
              Select Chart Type
            </div>
            <div className="grid grid-cols-1 gap-1">
              {chartTypes.map((chart) => (
                <button
                  key={chart.id}
                  onClick={() => handleTypeSelect(chart.id)}
                  disabled={!chart.isCompatible}
                  className={`
                    flex items-center gap-3 p-2 text-sm rounded-md text-left transition-colors
                    ${chart.isCurrent 
                      ? 'bg-blue-50 border border-blue-200 text-blue-800' 
                      : chart.isCompatible 
                        ? 'hover:bg-gray-50' 
                        : 'opacity-50 cursor-not-allowed'
                    }
                  `}
                  onMouseEnter={() => setShowTooltip(chart.id)}
                  onMouseLeave={() => setShowTooltip(null)}
                >
                  <span className="text-lg flex-shrink-0" role="img" aria-label={chart.name}>
                    {chart.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{chart.name}</span>
                      {chart.isSuggested && (
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          Suggested
                        </span>
                      )}
                      {chart.isCurrent && (
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{chart.description}</p>
                  </div>
                  
                  {!chart.isCompatible && (
                    <div className="flex-shrink-0">
                      <Info className="h-4 w-4 text-red-400" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Footer with data info */}
          <div className="border-t border-gray-200 px-3 py-2 text-xs text-gray-500">
            <div className="flex items-center justify-between">
              <span>
                Data points: {visualizationData?.data?.labels?.length || 0}
              </span>
              <span>
                Compatible: {chartTypes.filter(c => c.isCompatible).length}/{chartTypes.length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Chart Type Tooltips */}
      {showTooltip && showTooltip !== 'info' && (
        <div className="absolute top-full left-0 mt-1 w-64 p-3 text-xs bg-gray-800 text-white rounded-md shadow-lg z-50">
          {(() => {
            const chart = chartTypes.find(c => c.id === showTooltip);
            if (!chart) return null;
            
            return (
              <div>
                <div className="font-medium mb-1">{chart.name}</div>
                <p className="mb-2">{chart.description}</p>
                <div className="text-gray-300">
                  <div>Min points: {chart.dataRequirements.minDataPoints}</div>
                  <div>Max points: {chart.dataRequirements.maxDataPoints}</div>
                  <div>Multi-series: {chart.dataRequirements.supportsMultiSeries ? 'Yes' : 'No'}</div>
                  {!chart.isCompatible && (
                    <div className="mt-1 text-red-300 font-medium">
                      Not compatible with current data
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { combineClasses } from '../../lib/utils';

interface VirtualScrollProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscan?: number; // Number of items to render outside visible area
  onScrollEnd?: () => void; // Infinite scroll callback
  loading?: boolean;
  loadingComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  itemKey?: (item: T, index: number) => string | number;
}

/**
 * High-performance virtual scrolling component for large datasets
 */
export function VirtualScroll<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className,
  overscan = 5,
  onScrollEnd,
  loading = false,
  loadingComponent,
  emptyComponent,
  itemKey = (_, index) => index,
}: VirtualScrollProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalHeight = items.length * itemHeight;

  // Calculate visible range with overscan
  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const end = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight)
    );
    
    return {
      start: Math.max(0, start - overscan),
      end: Math.min(items.length - 1, end + overscan),
    };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  // Get visible items
  const visibleItems = useMemo(() => {
    const result = [];
    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      if (items[i] !== undefined) {
        result.push({
          item: items[i],
          index: i,
          key: itemKey(items[i], i),
        });
      }
    }
    return result;
  }, [items, visibleRange, itemKey]);

  // Handle scroll events
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    
    // Check if we're near the end for infinite scroll
    if (onScrollEnd && !loading) {
      const scrollHeight = e.currentTarget.scrollHeight;
      const clientHeight = e.currentTarget.clientHeight;
      const scrolledToBottom = newScrollTop + clientHeight >= scrollHeight - 100; // 100px threshold
      
      if (scrolledToBottom) {
        onScrollEnd();
      }
    }
  }, [onScrollEnd, loading]);

  // Smooth scrolling to specific item
  const scrollToItem = useCallback((index: number, behavior: 'auto' | 'smooth' = 'smooth') => {
    if (containerRef.current) {
      const scrollTop = index * itemHeight;
      containerRef.current.scrollTo({
        top: scrollTop,
        behavior,
      });
    }
  }, [itemHeight]);

  // Empty state
  if (items.length === 0 && !loading) {
    return (
      <div className={combineClasses('flex items-center justify-center', className)} style={{ height: containerHeight }}>
        {emptyComponent || (
          <div className="text-gray-500 text-center">
            <div className="text-4xl mb-2">📋</div>
            <p>No items to display</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={combineClasses('overflow-auto', className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index, key }) => (
          <div
            key={key}
            style={{
              position: 'absolute',
              top: index * itemHeight,
              left: 0,
              right: 0,
              height: itemHeight,
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
        
        {/* Loading indicator */}
        {loading && (
          <div
            style={{
              position: 'absolute',
              top: items.length * itemHeight,
              left: 0,
              right: 0,
              height: 60,
            }}
            className="flex items-center justify-center"
          >
            {loadingComponent || (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-gray-600">Loading more...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Export scrollToItem function for external use
VirtualScroll.scrollToItem = (ref: React.RefObject<any>, index: number, itemHeight: number) => {
  if (ref.current) {
    ref.current.scrollTo({
      top: index * itemHeight,
      behavior: 'smooth',
    });
  }
};

interface VirtualTableProps<T> {
  data: T[];
  columns: Array<{
    key: string;
    title: string;
    width: number;
    render?: (value: any, item: T, index: number) => React.ReactNode;
  }>;
  rowHeight?: number;
  headerHeight?: number;
  containerHeight: number;
  className?: string;
  onScrollEnd?: () => void;
  loading?: boolean;
  itemKey?: (item: T, index: number) => string | number;
}

/**
 * Virtual table component for large datasets with fixed headers
 */
export function VirtualTable<T>({
  data,
  columns,
  rowHeight = 50,
  headerHeight = 40,
  containerHeight,
  className,
  onScrollEnd,
  loading = false,
  itemKey = (_, index) => index,
}: VirtualTableProps<T>) {
  const renderRow = useCallback((item: T, index: number) => (
    <div className={combineClasses(
      'flex items-center border-b border-gray-200 hover:bg-gray-50',
      index % 2 === 0 ? 'bg-white' : 'bg-gray-25'
    )}>
      {columns.map((column) => (
        <div
          key={column.key}
          className="px-4 py-2 flex-shrink-0 overflow-hidden text-ellipsis"
          style={{ width: column.width }}
        >
          {column.render 
            ? column.render((item as any)[column.key], item, index)
            : String((item as any)[column.key] || '')
          }
        </div>
      ))}
    </div>
  ), [columns]);

  const tableHeader = (
    <div 
      className="flex bg-gray-100 border-b-2 border-gray-300 font-semibold sticky top-0 z-10"
      style={{ height: headerHeight }}
    >
      {columns.map((column) => (
        <div
          key={column.key}
          className="px-4 py-2 flex-shrink-0 overflow-hidden text-ellipsis"
          style={{ width: column.width }}
        >
          {column.title}
        </div>
      ))}
    </div>
  );

  return (
    <div className={combineClasses('border border-gray-300 rounded-lg overflow-hidden', className)}>
      {tableHeader}
      <VirtualScroll
        items={data}
        itemHeight={rowHeight}
        containerHeight={containerHeight - headerHeight}
        renderItem={renderRow}
        onScrollEnd={onScrollEnd}
        loading={loading}
        itemKey={itemKey}
        className="bg-white"
      />
    </div>
  );
}

interface VirtualGridProps<T> {
  items: T[];
  itemWidth: number;
  itemHeight: number;
  containerWidth: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  gap?: number;
  onScrollEnd?: () => void;
  loading?: boolean;
  itemKey?: (item: T, index: number) => string | number;
}

/**
 * Virtual grid component for large datasets with dynamic columns
 */
export function VirtualGrid<T>({
  items,
  itemWidth,
  itemHeight,
  containerWidth,
  containerHeight,
  renderItem,
  className,
  gap = 16,
  onScrollEnd,
  loading = false,
  itemKey = (_, index) => index,
}: VirtualGridProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate grid dimensions
  const columnsCount = Math.floor((containerWidth + gap) / (itemWidth + gap));
  const rowsCount = Math.ceil(items.length / columnsCount);
  const rowHeightWithGap = itemHeight + gap;
  const totalHeight = rowsCount * rowHeightWithGap;

  // Calculate visible rows
  const visibleRange = useMemo(() => {
    const overscan = 2;
    const startRow = Math.floor(scrollTop / rowHeightWithGap);
    const endRow = Math.ceil((scrollTop + containerHeight) / rowHeightWithGap);
    
    return {
      start: Math.max(0, startRow - overscan),
      end: Math.min(rowsCount - 1, endRow + overscan),
    };
  }, [scrollTop, rowHeightWithGap, containerHeight, rowsCount]);

  // Get visible items
  const visibleItems = useMemo(() => {
    const result = [];
    for (let row = visibleRange.start; row <= visibleRange.end; row++) {
      for (let col = 0; col < columnsCount; col++) {
        const index = row * columnsCount + col;
        if (index < items.length) {
          result.push({
            item: items[index],
            index,
            row,
            col,
            key: itemKey(items[index], index),
          });
        }
      }
    }
    return result;
  }, [items, visibleRange, columnsCount, itemKey]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    
    if (onScrollEnd && !loading) {
      const scrollHeight = e.currentTarget.scrollHeight;
      const clientHeight = e.currentTarget.clientHeight;
      const scrolledToBottom = newScrollTop + clientHeight >= scrollHeight - 100;
      
      if (scrolledToBottom) {
        onScrollEnd();
      }
    }
  }, [onScrollEnd, loading]);

  return (
    <div
      ref={containerRef}
      className={combineClasses('overflow-auto', className)}
      style={{ 
        height: containerHeight,
        width: containerWidth,
      }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index, row, col, key }) => (
          <div
            key={key}
            style={{
              position: 'absolute',
              top: row * rowHeightWithGap,
              left: col * (itemWidth + gap),
              width: itemWidth,
              height: itemHeight,
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
        
        {loading && (
          <div
            style={{
              position: 'absolute',
              top: totalHeight,
              left: 0,
              right: 0,
              height: 60,
            }}
            className="flex items-center justify-center"
          >
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-600">Loading more...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Hook for managing virtual scroll state
 */
export function useVirtualScroll<T>(items: T[], itemHeight: number) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToItem = useCallback((index: number, behavior: 'auto' | 'smooth' = 'smooth') => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: index * itemHeight,
        behavior,
      });
    }
  }, [itemHeight]);

  const scrollToTop = useCallback(() => {
    scrollToItem(0, 'smooth');
  }, [scrollToItem]);

  const scrollToBottom = useCallback(() => {
    scrollToItem(items.length - 1, 'smooth');
  }, [scrollToItem, items.length]);

  return {
    containerRef,
    scrollTop,
    setScrollTop,
    scrollToItem,
    scrollToTop,
    scrollToBottom,
  };
}

export default VirtualScroll;
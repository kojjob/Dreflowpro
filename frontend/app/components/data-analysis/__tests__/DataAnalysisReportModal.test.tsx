/**
 * Test file for DataAnalysisReportModal component
 * Tests the enhanced report functionality, accessibility, and integration
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DataAnalysisReportModal from '../DataAnalysisReportModal';

// Mock data for testing
const mockData = [
  { id: 1, name: 'John Doe', age: 30, department: 'Engineering' },
  { id: 2, name: 'Jane Smith', age: 25, department: 'Marketing' },
  { id: 3, name: 'Bob Johnson', age: 35, department: 'Sales' },
  { id: 4, name: 'Alice Brown', age: 28, department: 'Engineering' },
  { id: 5, name: 'Charlie Wilson', age: 32, department: 'Marketing' }
];

const mockInsights = [
  {
    id: '1',
    type: 'pattern',
    title: 'Age Distribution Pattern',
    description: 'Most employees are between 25-35 years old',
    confidence: 85,
    impact: 'medium'
  },
  {
    id: '2',
    type: 'trend',
    title: 'Department Distribution',
    description: 'Engineering has the highest representation',
    confidence: 92,
    impact: 'high'
  }
];

const mockStatistics = [
  {
    type: 'quality',
    name: 'Data Quality Score',
    value: 87,
    score: 87,
    description: 'Overall data quality assessment',
    details: {
      completeness: '95%',
      accuracy: '89%',
      consistency: '91%'
    }
  },
  {
    type: 'completeness',
    name: 'Data Completeness',
    value: '95%',
    percentage: 95,
    change: 3,
    description: 'Percentage of complete records'
  }
];

const mockCharts = [
  {
    type: 'bar',
    title: 'Department Distribution',
    data: {
      labels: ['Engineering', 'Marketing', 'Sales'],
      datasets: [{
        label: 'Count',
        data: [2, 2, 1],
        backgroundColor: 'rgba(20, 184, 166, 0.8)',
        borderColor: 'rgba(20, 184, 166, 1)',
        borderWidth: 2
      }]
    },
    description: 'Distribution of employees by department'
  },
  {
    type: 'line',
    title: 'Age Trend',
    data: {
      labels: ['20-25', '26-30', '31-35', '36-40'],
      datasets: [{
        label: 'Count',
        data: [1, 2, 2, 0],
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2
      }]
    },
    description: 'Age distribution across age groups'
  }
];

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  data: mockData,
  insights: mockInsights,
  statistics: mockStatistics,
  charts: mockCharts,
  fileName: 'Employee Data',
  onExport: jest.fn(),
  onShare: jest.fn()
};

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock Chart.js components
jest.mock('react-chartjs-2', () => ({
  Bar: ({ data, options }: any) => <div data-testid="bar-chart">Bar Chart: {data.datasets[0].label}</div>,
  Line: ({ data, options }: any) => <div data-testid="line-chart">Line Chart: {data.datasets[0].label}</div>,
  Pie: ({ data, options }: any) => <div data-testid="pie-chart">Pie Chart: {data.datasets[0].label}</div>,
  Doughnut: ({ data, options }: any) => <div data-testid="doughnut-chart">Doughnut Chart: {data.datasets[0].label}</div>,
  Scatter: ({ data, options }: any) => <div data-testid="scatter-chart">Scatter Chart: {data.datasets[0].label}</div>,
  Radar: ({ data, options }: any) => <div data-testid="radar-chart">Radar Chart: {data.datasets[0].label}</div>,
}));

describe('DataAnalysisReportModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders modal with correct title and content', () => {
    render(<DataAnalysisReportModal {...defaultProps} />);
    
    expect(screen.getByText('Data Analysis Report')).toBeInTheDocument();
    expect(screen.getByText(/Employee Data/)).toBeInTheDocument();
  });

  test('displays navigation tabs correctly', () => {
    render(<DataAnalysisReportModal {...defaultProps} />);
    
    expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /insights/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /charts/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /statistics/i })).toBeInTheDocument();
  });

  test('switches between tabs correctly', async () => {
    render(<DataAnalysisReportModal {...defaultProps} />);
    
    // Initially on overview tab
    expect(screen.getByRole('tab', { name: /overview/i })).toHaveAttribute('aria-selected', 'true');
    
    // Click on insights tab
    fireEvent.click(screen.getByRole('tab', { name: /insights/i }));
    
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /insights/i })).toHaveAttribute('aria-selected', 'true');
    });
  });

  test('displays KPI metrics in overview section', () => {
    render(<DataAnalysisReportModal {...defaultProps} />);
    
    expect(screen.getByText('Total Records')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument(); // mockData.length
    expect(screen.getByText('Data Quality Score')).toBeInTheDocument();
    expect(screen.getByText('Insights Generated')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // mockInsights.length
  });

  test('displays insights correctly', async () => {
    render(<DataAnalysisReportModal {...defaultProps} />);
    
    // Switch to insights tab
    fireEvent.click(screen.getByRole('tab', { name: /insights/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Age Distribution Pattern')).toBeInTheDocument();
      expect(screen.getByText('Department Distribution')).toBeInTheDocument();
      expect(screen.getByText('Most employees are between 25-35 years old')).toBeInTheDocument();
    });
  });

  test('displays charts correctly', async () => {
    render(<DataAnalysisReportModal {...defaultProps} />);
    
    // Switch to visualizations tab
    fireEvent.click(screen.getByRole('tab', { name: /charts/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Department Distribution')).toBeInTheDocument();
      expect(screen.getByText('Age Trend')).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });

  test('displays statistics correctly', async () => {
    render(<DataAnalysisReportModal {...defaultProps} />);
    
    // Switch to statistics tab
    fireEvent.click(screen.getByRole('tab', { name: /statistics/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Data Quality Score')).toBeInTheDocument();
      expect(screen.getByText('87')).toBeInTheDocument();
      expect(screen.getByText('Data Completeness')).toBeInTheDocument();
      expect(screen.getByText('95%')).toBeInTheDocument();
    });
  });

  test('calls onExport when export button is clicked', () => {
    render(<DataAnalysisReportModal {...defaultProps} />);
    
    const exportButton = screen.getByText('Export');
    fireEvent.click(exportButton);
    
    expect(defaultProps.onExport).toHaveBeenCalledWith('pdf');
  });

  test('calls onShare when share button is clicked', () => {
    render(<DataAnalysisReportModal {...defaultProps} />);
    
    const shareButton = screen.getByText('Share');
    fireEvent.click(shareButton);
    
    expect(defaultProps.onShare).toHaveBeenCalled();
  });

  test('calls onClose when close button is clicked', () => {
    render(<DataAnalysisReportModal {...defaultProps} />);
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  test('handles empty data gracefully', () => {
    const emptyProps = {
      ...defaultProps,
      data: [],
      insights: [],
      statistics: [],
      charts: []
    };
    
    render(<DataAnalysisReportModal {...emptyProps} />);
    
    expect(screen.getByText('Total Records')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  test('has proper accessibility attributes', () => {
    render(<DataAnalysisReportModal {...defaultProps} />);
    
    // Check for proper ARIA attributes
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getByRole('tabpanel')).toBeInTheDocument();
    
    // Check that tabs have proper ARIA attributes
    const overviewTab = screen.getByRole('tab', { name: /overview/i });
    expect(overviewTab).toHaveAttribute('aria-selected', 'true');
    expect(overviewTab).toHaveAttribute('aria-controls');
  });

  test('supports keyboard navigation', () => {
    render(<DataAnalysisReportModal {...defaultProps} />);
    
    const insightsTab = screen.getByRole('tab', { name: /insights/i });
    
    // Focus and activate with keyboard
    insightsTab.focus();
    fireEvent.keyDown(insightsTab, { key: 'Enter' });
    
    expect(insightsTab).toHaveAttribute('aria-selected', 'true');
  });

  test('is responsive and handles different screen sizes', () => {
    render(<DataAnalysisReportModal {...defaultProps} />);
    
    // Check for responsive classes
    const kpiGrid = screen.getByText('Total Records').closest('.grid');
    expect(kpiGrid).toHaveClass('grid-cols-1', 'sm:grid-cols-2');
  });
});

export default {};

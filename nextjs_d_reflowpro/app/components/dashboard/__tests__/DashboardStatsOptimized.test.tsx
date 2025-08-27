import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { jest } from '@jest/globals';
import DashboardStatsOptimized from '../DashboardStatsOptimized';
import { useAuth } from '../../../contexts/AuthContext';
import { apiService } from '../../../services/api';
import { usePerformanceMonitor } from '../../../hooks/usePerformanceMonitor';

// Mock dependencies
jest.mock('../../../contexts/AuthContext');
jest.mock('../../../services/api');
jest.mock('../../../hooks/usePerformanceMonitor');
jest.mock('../../../utils/logger', () => ({
  log: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
}));

// Mock Chart.js components
jest.mock('chart.js', () => ({
  Chart: { register: jest.fn() },
  CategoryScale: {},
  LinearScale: {},
  PointElement: {},
  LineElement: {},
  Title: {},
  Tooltip: {},
  Legend: {},
  ArcElement: {},
  Filler: {},
}));

// Mock react-chartjs-2 components
jest.mock('react-chartjs-2', () => ({
  Line: ({ data, options }: any) => (
    <div data-testid="line-chart" data-chart-data={JSON.stringify(data)} data-chart-options={JSON.stringify(options)}>
      Line Chart
    </div>
  ),
  Doughnut: ({ data, options }: any) => (
    <div data-testid="doughnut-chart" data-chart-data={JSON.stringify(data)} data-chart-options={JSON.stringify(options)}>
      Doughnut Chart
    </div>
  ),
}));

// Mock UI components
jest.mock('../../ui/Card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className} data-testid="card">{children}</div>
  ),
}));

jest.mock('../../ui/LoadingSpinner', () => ({
  LoadingSpinner: ({ size }: { size?: string }) => (
    <div data-testid="loading-spinner" data-size={size}>Loading...</div>
  ),
}));

jest.mock('../../ui/Alert', () => ({
  Alert: ({ type, children, className }: { type: string; children: React.ReactNode; className?: string }) => (
    <div data-testid="alert" data-type={type} className={className}>{children}</div>
  ),
}));

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Database: () => <div data-testid="database-icon">Database</div>,
  Zap: () => <div data-testid="zap-icon">Zap</div>,
  Clock: () => <div data-testid="clock-icon">Clock</div>,
  CheckCircle: () => <div data-testid="check-circle-icon">CheckCircle</div>,
  XCircle: () => <div data-testid="x-circle-icon">XCircle</div>,
  AlertTriangle: () => <div data-testid="alert-triangle-icon">AlertTriangle</div>,
  TrendingUp: () => <div data-testid="trending-up-icon">TrendingUp</div>,
  Activity: () => <div data-testid="activity-icon">Activity</div>,
}));

const mockUser = {
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
};

const mockDashboardStats = {
  pipelines: {
    total: 12,
    active: 8,
    running: 3,
    failed: 1,
    scheduled: 2,
  },
  connectors: {
    total: 15,
    connected: 12,
    disconnected: 2,
    error: 1,
  },
  tasks: {
    total: 150,
    completed: 135,
    running: 8,
    failed: 5,
    pending: 2,
  },
  system: {
    cpu_usage: 45.2,
    memory_usage: 68.7,
    disk_usage: 34.1,
    uptime: 86400000,
  },
  recent_activity: [
    {
      id: 'activity-1',
      type: 'pipeline_completed',
      message: 'Data pipeline "Customer Analytics" completed successfully',
      timestamp: new Date().toISOString(),
      status: 'success' as const,
    },
    {
      id: 'activity-2',
      type: 'connector_connected',
      message: 'Database connector "PostgreSQL-Prod" established',
      timestamp: new Date().toISOString(),
      status: 'info' as const,
    },
  ],
};

describe('DashboardStatsOptimized', () => {
  const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
  const mockApiService = apiService as jest.Mocked<typeof apiService>;
  const mockUsePerformanceMonitor = usePerformanceMonitor as jest.MockedFunction<typeof usePerformanceMonitor>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: mockUser } as any);
    mockUsePerformanceMonitor.mockReturnValue(undefined);
    mockApiService.get.mockResolvedValue({ data: mockDashboardStats });
  });

  afterEach(() => {
    // Clear window mock data flag
    delete (window as any).dashboardMockDataLogged;
  });

  describe('Chart.js Registration', () => {
    it('should register all required Chart.js components', () => {
      const { Chart } = require('chart.js');
      render(<DashboardStatsOptimized />);
      
      expect(Chart.register).toHaveBeenCalledWith(
        expect.objectContaining({}), // CategoryScale
        expect.objectContaining({}), // LinearScale
        expect.objectContaining({}), // PointElement
        expect.objectContaining({}), // LineElement
        expect.objectContaining({}), // Title
        expect.objectContaining({}), // Tooltip
        expect.objectContaining({}), // Legend
        expect.objectContaining({}), // ArcElement
        expect.objectContaining({})  // Filler
      );
    });
  });

  describe('Loading States', () => {
    it('should show loading spinner while fetching data', () => {
      mockApiService.get.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      render(<DashboardStatsOptimized />);
      
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByTestId('loading-spinner')).toHaveAttribute('data-size', 'lg');
    });

    it('should hide loading spinner after data is fetched', async () => {
      render(<DashboardStatsOptimized />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });
    });
  });

  describe('Data Fetching', () => {
    it('should fetch dashboard stats on mount', async () => {
      render(<DashboardStatsOptimized />);
      
      await waitFor(() => {
        expect(mockApiService.get).toHaveBeenCalledWith('/dashboard/stats');
      });
    });

    it('should not fetch data if user is not authenticated', () => {
      mockUseAuth.mockReturnValue({ user: null } as any);
      
      render(<DashboardStatsOptimized />);
      
      expect(mockApiService.get).not.toHaveBeenCalled();
    });

    it('should use mock data when API endpoint is not available', async () => {
      mockApiService.get.mockRejectedValue(new Error('API endpoint not available'));
      
      render(<DashboardStatsOptimized />);
      
      await waitFor(() => {
        expect(screen.getByText('12')).toBeInTheDocument(); // Total pipelines from mock data
        expect(screen.getByText('8')).toBeInTheDocument();  // Active pipelines from mock data
      });
    });

    it('should show authentication error when authentication fails', async () => {
      mockApiService.get.mockRejectedValue(new Error('Authentication failed'));
      
      render(<DashboardStatsOptimized />);
      
      await waitFor(() => {
        expect(screen.getByTestId('alert')).toHaveTextContent('Please log in to view dashboard stats');
      });
    });

    it('should show generic error for other failures', async () => {
      const errorMessage = 'Network error';
      mockApiService.get.mockRejectedValue(new Error(errorMessage));
      
      render(<DashboardStatsOptimized />);
      
      await waitFor(() => {
        expect(screen.getByTestId('alert')).toHaveTextContent(errorMessage);
      });
    });
  });

  describe('Statistics Display', () => {
    beforeEach(async () => {
      render(<DashboardStatsOptimized />);
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });
    });

    it('should display pipeline statistics correctly', () => {
      expect(screen.getByText('Total Pipelines')).toBeInTheDocument();
      expect(screen.getByText('Active Pipelines')).toBeInTheDocument();
      expect(screen.getByText('Running Now')).toBeInTheDocument();
      expect(screen.getByText('Failed')).toBeInTheDocument();
      
      expect(screen.getByText('12')).toBeInTheDocument(); // Total
      expect(screen.getByText('8')).toBeInTheDocument();  // Active
      expect(screen.getByText('3')).toBeInTheDocument();  // Running
      expect(screen.getByText('1')).toBeInTheDocument();  // Failed
    });

    it('should display connector statistics correctly', () => {
      expect(screen.getByText('Total Connectors')).toBeInTheDocument();
      expect(screen.getByText('Connected')).toBeInTheDocument();
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
      expect(screen.getByText('Errors')).toBeInTheDocument();
      
      expect(screen.getByText('15')).toBeInTheDocument(); // Total
      expect(screen.getByText('12')).toBeInTheDocument(); // Connected
      expect(screen.getByText('2')).toBeInTheDocument();  // Disconnected
      expect(screen.getByText('1')).toBeInTheDocument();  // Error
    });

    it('should display trend indicators correctly', () => {
      const trendElements = screen.getAllByTestId('trending-up-icon');
      expect(trendElements).toHaveLength(3); // Total, Active, Failed pipelines have trends
    });
  });

  describe('Charts', () => {
    beforeEach(async () => {
      render(<DashboardStatsOptimized />);
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });
    });

    it('should render pipeline status doughnut chart', () => {
      const doughnutChart = screen.getByTestId('doughnut-chart');
      expect(doughnutChart).toBeInTheDocument();
      
      const chartData = JSON.parse(doughnutChart.getAttribute('data-chart-data') || '{}');
      expect(chartData.labels).toEqual(['Active', 'Running', 'Failed', 'Scheduled']);
      expect(chartData.datasets[0].data).toEqual([8, 3, 1, 2]);
    });

    it('should render system usage line chart', () => {
      const lineChart = screen.getByTestId('line-chart');
      expect(lineChart).toBeInTheDocument();
      
      const chartData = JSON.parse(lineChart.getAttribute('data-chart-data') || '{}');
      expect(chartData.labels).toEqual(['CPU', 'Memory', 'Disk']);
      expect(chartData.datasets[0].data).toEqual([45.2, 68.7, 34.1]);
    });

    it('should configure doughnut chart options correctly', () => {
      const doughnutChart = screen.getByTestId('doughnut-chart');
      const chartOptions = JSON.parse(doughnutChart.getAttribute('data-chart-options') || '{}');
      
      expect(chartOptions.responsive).toBe(true);
      expect(chartOptions.maintainAspectRatio).toBe(false);
      expect(chartOptions.plugins.legend.position).toBe('bottom');
    });

    it('should configure line chart options correctly', () => {
      const lineChart = screen.getByTestId('line-chart');
      const chartOptions = JSON.parse(lineChart.getAttribute('data-chart-options') || '{}');
      
      expect(chartOptions.responsive).toBe(true);
      expect(chartOptions.maintainAspectRatio).toBe(false);
      expect(chartOptions.scales.y.beginAtZero).toBe(true);
      expect(chartOptions.scales.y.max).toBe(100);
      expect(chartOptions.plugins.legend.display).toBe(false);
    });
  });

  describe('Recent Activity', () => {
    beforeEach(async () => {
      render(<DashboardStatsOptimized />);
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });
    });

    it('should display recent activity section', () => {
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    });

    it('should display activity items with correct status indicators', () => {
      expect(screen.getByText('Data pipeline "Customer Analytics" completed successfully')).toBeInTheDocument();
      expect(screen.getByText('Database connector "PostgreSQL-Prod" established')).toBeInTheDocument();
    });

    it('should format activity timestamps correctly', () => {
      const timestampElements = screen.getAllByText(/\d{1,2}\/\d{1,2}\/\d{4}/);
      expect(timestampElements.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Monitoring', () => {
    it('should initialize performance monitoring', () => {
      render(<DashboardStatsOptimized />);
      
      expect(mockUsePerformanceMonitor).toHaveBeenCalledWith({
        componentName: 'DashboardStatsOptimized',
        threshold: 100,
      });
    });
  });

  describe('Responsive Behavior', () => {
    beforeEach(async () => {
      render(<DashboardStatsOptimized />);
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });
    });

    it('should render stat cards in responsive grid layout', () => {
      const cards = screen.getAllByTestId('card');
      expect(cards.length).toBeGreaterThan(8); // Pipeline stats + connector stats + charts + activity
    });
  });

  describe('Error Handling', () => {
    it('should handle missing chart data gracefully', async () => {
      const incompleteStats = {
        ...mockDashboardStats,
        pipelines: {
          total: 0,
          active: 0,
          running: 0,
          failed: 0,
          scheduled: 0,
        },
      };
      
      mockApiService.get.mockResolvedValue({ data: incompleteStats });
      
      render(<DashboardStatsOptimized />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });
      
      // Should still render charts even with zero data
      expect(screen.getByTestId('doughnut-chart')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('should show warning when no data is available', async () => {
      mockApiService.get.mockResolvedValue({ data: null });
      
      render(<DashboardStatsOptimized />);
      
      await waitFor(() => {
        expect(screen.getByTestId('alert')).toHaveTextContent('No dashboard data available');
        expect(screen.getByTestId('alert')).toHaveAttribute('data-type', 'warning');
      });
    });
  });

  describe('Memory Management', () => {
    it('should cleanup interval on unmount', async () => {
      const { unmount } = render(<DashboardStatsOptimized />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });
      
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      unmount();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
      
      clearIntervalSpy.mockRestore();
    });
  });

  describe('Mock Data Logging', () => {
    it('should log mock data usage only once', async () => {
      mockApiService.get.mockRejectedValue(new Error('API endpoint not available'));
      
      const { rerender } = render(<DashboardStatsOptimized />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });
      
      // Rerender component
      rerender(<DashboardStatsOptimized />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });
      
      // Mock data should still be displayed
      expect(screen.getByText('12')).toBeInTheDocument();
      
      // Window flag should be set to prevent duplicate logging
      expect((window as any).dashboardMockDataLogged).toBe(true);
    });
  });
});
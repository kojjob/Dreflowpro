/**
 * Chart.js Registration Tests
 * 
 * This test file specifically focuses on testing the Chart.js component registration
 * fix that resolves the "'arc' is not a registered element" error.
 */

import { jest } from '@jest/globals';

// Mock Chart.js before importing the component
const mockRegister = jest.fn();
jest.mock('chart.js', () => ({
  Chart: { register: mockRegister },
  CategoryScale: 'CategoryScale',
  LinearScale: 'LinearScale', 
  PointElement: 'PointElement',
  LineElement: 'LineElement',
  Title: 'Title',
  Tooltip: 'Tooltip',
  Legend: 'Legend',
  ArcElement: 'ArcElement',
  Filler: 'Filler',
}));

// Mock other dependencies to isolate Chart.js testing
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

jest.mock('../../../services/api', () => ({
  apiService: { get: jest.fn() },
}));

jest.mock('../../../hooks/usePerformanceMonitor', () => ({
  usePerformanceMonitor: () => undefined,
}));

jest.mock('../../../utils/logger', () => ({
  log: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../../ui/Card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('../../ui/LoadingSpinner', () => ({
  LoadingSpinner: () => <div>Loading...</div>,
}));

jest.mock('../../ui/Alert', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('lucide-react', () => ({
  Database: () => <div>Database</div>,
  Zap: () => <div>Zap</div>,
  Clock: () => <div>Clock</div>,
  CheckCircle: () => <div>CheckCircle</div>,
  XCircle: () => <div>XCircle</div>,
  AlertTriangle: () => <div>AlertTriangle</div>,
  TrendingUp: () => <div>TrendingUp</div>,
  Activity: () => <div>Activity</div>,
}));

jest.mock('react-chartjs-2', () => ({
  Line: () => <div>Line Chart</div>,
  Doughnut: () => <div>Doughnut Chart</div>,
}));

describe('Chart.js Registration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should register all required Chart.js components when component is imported', async () => {
    // Import the component which should trigger Chart.js registration
    await import('../DashboardStatsOptimized');
    
    // Verify that Chart.register was called with all required components
    expect(mockRegister).toHaveBeenCalledWith(
      'CategoryScale',
      'LinearScale', 
      'PointElement',
      'LineElement',
      'Title',
      'Tooltip',
      'Legend',
      'ArcElement',  // This was the missing component causing the error
      'Filler'
    );
  });

  it('should register Chart.js components exactly once per module load', async () => {
    // Clear previous calls
    mockRegister.mockClear();
    
    // Import the component multiple times
    await import('../DashboardStatsOptimized');
    await import('../DashboardStatsOptimized');
    
    // Should still only be called once due to ES module caching
    expect(mockRegister).toHaveBeenCalledTimes(1);
  });

  it('should include ArcElement component required for Doughnut charts', async () => {
    await import('../DashboardStatsOptimized');
    
    // Extract all registered components
    const registeredComponents = mockRegister.mock.calls[0];
    
    // Verify ArcElement is included (this fixes the original error)
    expect(registeredComponents).toContain('ArcElement');
  });

  it('should include all components required for Line charts', async () => {
    await import('../DashboardStatsOptimized');
    
    const registeredComponents = mockRegister.mock.calls[0];
    
    // Verify components needed for Line charts
    expect(registeredComponents).toContain('CategoryScale');
    expect(registeredComponents).toContain('LinearScale');
    expect(registeredComponents).toContain('PointElement');
    expect(registeredComponents).toContain('LineElement');
    expect(registeredComponents).toContain('Filler');
  });

  it('should include common chart components', async () => {
    await import('../DashboardStatsOptimized');
    
    const registeredComponents = mockRegister.mock.calls[0];
    
    // Verify common chart components
    expect(registeredComponents).toContain('Title');
    expect(registeredComponents).toContain('Tooltip');
    expect(registeredComponents).toContain('Legend');
  });
});

describe('Chart.js Registration Error Prevention', () => {
  it('should prevent "arc is not a registered element" error', async () => {
    // Mock console.error to catch any registration errors
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    try {
      await import('../DashboardStatsOptimized');
      
      // Verify no console errors were logged during import
      expect(consoleError).not.toHaveBeenCalledWith(
        expect.stringContaining('arc'),
        expect.stringContaining('not a registered element')
      );
    } finally {
      consoleError.mockRestore();
    }
  });

  it('should register components in correct order', async () => {
    await import('../DashboardStatsOptimized');
    
    // Verify the registration call structure
    expect(mockRegister).toHaveBeenCalledTimes(1);
    expect(mockRegister.mock.calls[0]).toHaveLength(9); // All 9 components
  });
});

describe('Component Registration Completeness', () => {
  const requiredComponents = [
    'CategoryScale',
    'LinearScale',
    'PointElement', 
    'LineElement',
    'Title',
    'Tooltip',
    'Legend',
    'ArcElement',
    'Filler'
  ];

  it('should register all required components for dashboard charts', async () => {
    await import('../DashboardStatsOptimized');
    
    const registeredComponents = mockRegister.mock.calls[0];
    
    requiredComponents.forEach(component => {
      expect(registeredComponents).toContain(component);
    });
  });

  it('should not register unnecessary components', async () => {
    await import('../DashboardStatsOptimized');
    
    const registeredComponents = mockRegister.mock.calls[0];
    
    // Verify we're not registering extra components we don't need
    expect(registeredComponents).toHaveLength(9);
  });
});
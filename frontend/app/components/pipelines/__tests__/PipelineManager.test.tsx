/**
 * PipelineManager Component Tests
 * Tests for the Create Pipeline button functionality and form modal
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PipelineManager from '../PipelineManager';

// Mock the API service
jest.mock('../../../services/api', () => ({
  apiService: {
    getPipelines: jest.fn(),
    createPipeline: jest.fn(),
    deletePipeline: jest.fn(),
    executePipeline: jest.fn(),
    getPipelineExecutions: jest.fn(),
    cancelExecution: jest.fn(),
    getConnectors: jest.fn(),
  }
}));

// Mock the auth service
jest.mock('../../../services/auth', () => ({
  authService: {
    hasValidAuthentication: jest.fn(),
  }
}));

// Mock the UI components
jest.mock('../../ui/Card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>
}));

jest.mock('../../ui/LoadingSpinner', () => ({
  LoadingSpinner: ({ size }: any) => <div data-testid="loading-spinner">Loading...</div>
}));

jest.mock('../../ui/Alert', () => ({
  Alert: ({ children, title }: any) => <div data-testid="alert">{title}: {children}</div>
}));

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Play: () => <div data-testid="play-icon">Play</div>,
  Pause: () => <div data-testid="pause-icon">Pause</div>,
  StopCircle: () => <div data-testid="stop-icon">Stop</div>,
  Edit: () => <div data-testid="edit-icon">Edit</div>,
  Trash2: () => <div data-testid="trash-icon">Trash</div>,
  Plus: () => <div data-testid="plus-icon">Plus</div>,
  Clock: () => <div data-testid="clock-icon">Clock</div>,
  CheckCircle: () => <div data-testid="check-icon">Check</div>,
  XCircle: () => <div data-testid="x-icon">X</div>,
  AlertCircle: () => <div data-testid="alert-icon">Alert</div>,
  Database: () => <div data-testid="database-icon">Database</div>,
  ArrowRight: () => <div data-testid="arrow-icon">Arrow</div>,
}));

describe('PipelineManager', () => {
  const mockApiService = require('../../../services/api').apiService;
  const mockAuthService = require('../../../services/auth').authService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthService.hasValidAuthentication.mockReturnValue(true);
    mockApiService.getPipelines.mockResolvedValue({ pipelines: [] });
    mockApiService.getConnectors.mockResolvedValue({ 
      connectors: [
        { id: '1', name: 'Test Source', type: 'database' },
        { id: '2', name: 'Test Destination', type: 'database' }
      ] 
    });
  });

  describe('Create Pipeline Button', () => {
    it('should render the Create Pipeline button', async () => {
      render(<PipelineManager />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /create pipeline/i });
      expect(createButton).toBeInTheDocument();
      expect(createButton).toHaveClass('bg-blue-600');
    });

    it('should open the create form modal when Create Pipeline button is clicked', async () => {
      render(<PipelineManager />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /create pipeline/i });
      fireEvent.click(createButton);

      // Check if modal is opened
      expect(screen.getByText('Create New Pipeline')).toBeInTheDocument();
      expect(screen.getByLabelText(/pipeline name/i)).toBeInTheDocument();
    });

    it('should load connectors when modal is opened', async () => {
      render(<PipelineManager />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /create pipeline/i });
      fireEvent.click(createButton);

      // Verify connectors API was called
      expect(mockApiService.getConnectors).toHaveBeenCalled();
    });

    it('should display connector options in dropdowns', async () => {
      render(<PipelineManager />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /create pipeline/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Test Source (database)')).toBeInTheDocument();
        expect(screen.getByText('Test Destination (database)')).toBeInTheDocument();
      });
    });

    it('should close the modal when close button is clicked', async () => {
      render(<PipelineManager />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /create pipeline/i });
      fireEvent.click(createButton);

      // Modal should be open
      expect(screen.getByText('Create New Pipeline')).toBeInTheDocument();

      // Click close button
      const closeButton = screen.getByText('×');
      fireEvent.click(closeButton);

      // Modal should be closed
      expect(screen.queryByText('Create New Pipeline')).not.toBeInTheDocument();
    });

    it('should handle form submission correctly', async () => {
      mockApiService.createPipeline.mockResolvedValue({ id: '123', name: 'Test Pipeline' });
      
      render(<PipelineManager />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /create pipeline/i });
      fireEvent.click(createButton);

      // Fill out the form
      const nameInput = screen.getByLabelText(/pipeline name/i);
      fireEvent.change(nameInput, { target: { value: 'Test ETL Pipeline' } });

      const descriptionInput = screen.getByLabelText(/description/i);
      fireEvent.change(descriptionInput, { target: { value: 'Test pipeline description' } });

      // Wait for connectors to load and select them
      await waitFor(() => {
        expect(screen.getByText('Test Source (database)')).toBeInTheDocument();
      });

      const sourceSelect = screen.getByLabelText(/source connector/i);
      fireEvent.change(sourceSelect, { target: { value: '1' } });

      const destinationSelect = screen.getByLabelText(/destination connector/i);
      fireEvent.change(destinationSelect, { target: { value: '2' } });

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /create pipeline/i });
      fireEvent.click(submitButton);

      // Verify API call
      await waitFor(() => {
        expect(mockApiService.createPipeline).toHaveBeenCalledWith({
          name: 'Test ETL Pipeline',
          description: 'Test pipeline description',
          steps: [
            {
              step_order: 1,
              step_type: 'source',
              step_name: 'Data Source',
              step_config: {},
              source_connector_id: '1'
            },
            {
              step_order: 2,
              step_type: 'destination',
              step_name: 'Data Destination',
              step_config: {},
              source_connector_id: '2'
            }
          ],
          schedule_cron: null,
          is_scheduled: false,
          tags: []
        });
      });
    });

    it('should handle scheduling options correctly', async () => {
      render(<PipelineManager />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /create pipeline/i });
      fireEvent.click(createButton);

      // Enable scheduling
      const scheduleCheckbox = screen.getByLabelText(/enable scheduling/i);
      fireEvent.click(scheduleCheckbox);

      // Check if cron input appears
      expect(screen.getByLabelText(/cron schedule/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/0 0 \* \* \*/)).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state with Create Pipeline button when no pipelines exist', async () => {
      render(<PipelineManager />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });

      expect(screen.getByText('No Pipelines Found')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create your first pipeline/i })).toBeInTheDocument();
    });

    it('should open modal when clicking Create Your First Pipeline button', async () => {
      render(<PipelineManager />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });

      const createFirstButton = screen.getByRole('button', { name: /create your first pipeline/i });
      fireEvent.click(createFirstButton);

      expect(screen.getByText('Create New Pipeline')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when pipeline creation fails', async () => {
      mockApiService.createPipeline.mockRejectedValue(new Error('Creation failed'));
      
      render(<PipelineManager />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /create pipeline/i });
      fireEvent.click(createButton);

      // Fill required fields
      const nameInput = screen.getByLabelText(/pipeline name/i);
      fireEvent.change(nameInput, { target: { value: 'Test Pipeline' } });

      await waitFor(() => {
        expect(screen.getByText('Test Source (database)')).toBeInTheDocument();
      });

      const sourceSelect = screen.getByLabelText(/source connector/i);
      fireEvent.change(sourceSelect, { target: { value: '1' } });

      const destinationSelect = screen.getByLabelText(/destination connector/i);
      fireEvent.change(destinationSelect, { target: { value: '2' } });

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create pipeline/i });
      fireEvent.click(submitButton);

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByTestId('alert')).toBeInTheDocument();
      });
    });

    it('should show authentication error when user is not authenticated', async () => {
      mockAuthService.hasValidAuthentication.mockReturnValue(false);
      
      render(<PipelineManager />);
      
      await waitFor(() => {
        expect(screen.getByText('Please log in to view pipelines.')).toBeInTheDocument();
      });
    });
  });
});

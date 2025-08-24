/**
 * ConnectorManager Component Tests
 * Tests for the Add Connector button functionality and form modal
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConnectorManager from '../ConnectorManager';

// Mock the API service
jest.mock('../../../services/api', () => ({
  apiService: {
    getConnectors: jest.fn(),
    createConnector: jest.fn(),
    deleteConnector: jest.fn(),
    testConnector: jest.fn(),
    previewConnectorData: jest.fn(),
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
  Database: () => <div data-testid="database-icon">Database</div>,
  Cloud: () => <div data-testid="cloud-icon">Cloud</div>,
  Server: () => <div data-testid="server-icon">Server</div>,
  Globe: () => <div data-testid="globe-icon">Globe</div>,
  Settings: () => <div data-testid="settings-icon">Settings</div>,
  Plus: () => <div data-testid="plus-icon">Plus</div>,
  Edit: () => <div data-testid="edit-icon">Edit</div>,
  Trash2: () => <div data-testid="trash-icon">Trash</div>,
  TestTube: () => <div data-testid="test-icon">Test</div>,
  CheckCircle: () => <div data-testid="check-icon">Check</div>,
  XCircle: () => <div data-testid="x-icon">X</div>,
  AlertCircle: () => <div data-testid="alert-icon">Alert</div>,
  Eye: () => <div data-testid="eye-icon">Eye</div>,
}));

describe('ConnectorManager', () => {
  const mockApiService = require('../../../services/api').apiService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockApiService.getConnectors.mockResolvedValue({ connectors: [] });
  });

  describe('Add Connector Button', () => {
    it('should render the Add Connector button', async () => {
      render(<ConnectorManager />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /add connector/i });
      expect(addButton).toBeInTheDocument();
      expect(addButton).toHaveClass('bg-blue-600');
    });

    it('should open the create form modal when Add Connector button is clicked', async () => {
      render(<ConnectorManager />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /add connector/i });
      fireEvent.click(addButton);

      // Check if modal is opened
      expect(screen.getByText('Create New Connector')).toBeInTheDocument();
      expect(screen.getByText('Choose a Connector Type')).toBeInTheDocument();
    });

    it('should display connector templates in the modal', async () => {
      render(<ConnectorManager />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /add connector/i });
      fireEvent.click(addButton);

      // Check if connector templates are displayed
      expect(screen.getByText('PostgreSQL')).toBeInTheDocument();
      expect(screen.getByText('MySQL')).toBeInTheDocument();
      expect(screen.getByText('REST API')).toBeInTheDocument();
    });

    it('should close the modal when close button is clicked', async () => {
      render(<ConnectorManager />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /add connector/i });
      fireEvent.click(addButton);

      // Modal should be open
      expect(screen.getByText('Create New Connector')).toBeInTheDocument();

      // Click close button
      const closeButton = screen.getByText('×');
      fireEvent.click(closeButton);

      // Modal should be closed
      expect(screen.queryByText('Create New Connector')).not.toBeInTheDocument();
    });

    it('should show template-specific form when a template is selected', async () => {
      render(<ConnectorManager />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /add connector/i });
      fireEvent.click(addButton);

      // Click on PostgreSQL template
      const postgresTemplate = screen.getByText('PostgreSQL');
      fireEvent.click(postgresTemplate);

      // Check if form is displayed
      expect(screen.getByText('Create PostgreSQL Connector')).toBeInTheDocument();
      expect(screen.getByLabelText(/connector name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/host/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/port/i)).toBeInTheDocument();
    });

    it('should handle form submission correctly', async () => {
      mockApiService.createConnector.mockResolvedValue({ id: '123', name: 'Test Connector' });
      
      render(<ConnectorManager />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /add connector/i });
      fireEvent.click(addButton);

      // Select PostgreSQL template
      const postgresTemplate = screen.getByText('PostgreSQL');
      fireEvent.click(postgresTemplate);

      // Fill out the form
      const nameInput = screen.getByLabelText(/connector name/i);
      fireEvent.change(nameInput, { target: { value: 'Test PostgreSQL Connector' } });

      const hostInput = screen.getByLabelText(/host/i);
      fireEvent.change(hostInput, { target: { value: 'localhost' } });

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /create connector/i });
      fireEvent.click(submitButton);

      // Verify API call
      await waitFor(() => {
        expect(mockApiService.createConnector).toHaveBeenCalledWith({
          name: 'Test PostgreSQL Connector',
          description: '',
          type: 'database',
          connection_config: {
            host: 'localhost'
          }
        });
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty state with Add Connector button when no connectors exist', async () => {
      render(<ConnectorManager />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });

      expect(screen.getByText('No Connectors Found')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add your first connector/i })).toBeInTheDocument();
    });

    it('should open modal when clicking Add Your First Connector button', async () => {
      render(<ConnectorManager />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });

      const addFirstButton = screen.getByRole('button', { name: /add your first connector/i });
      fireEvent.click(addFirstButton);

      expect(screen.getByText('Create New Connector')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when connector creation fails', async () => {
      mockApiService.createConnector.mockRejectedValue(new Error('Creation failed'));
      
      render(<ConnectorManager />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /add connector/i });
      fireEvent.click(addButton);

      // Select template and fill form
      const postgresTemplate = screen.getByText('PostgreSQL');
      fireEvent.click(postgresTemplate);

      const nameInput = screen.getByLabelText(/connector name/i);
      fireEvent.change(nameInput, { target: { value: 'Test Connector' } });

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create connector/i });
      fireEvent.click(submitButton);

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByTestId('alert')).toBeInTheDocument();
      });
    });
  });
});

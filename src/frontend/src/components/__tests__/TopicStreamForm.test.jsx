import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TopicStreamForm from '../TopicStreamForm';

describe('TopicStreamForm', () => {
  const mockOnSubmit = jest.fn();
  
  beforeEach(() => {
    mockOnSubmit.mockClear();
  });
  
  const renderForm = () => {
    return render(<TopicStreamForm onSubmit={mockOnSubmit} />);
  };
  
  const fillForm = async (user, query = 'Test query') => {
    await user.type(screen.getByTestId('topic-query-input'), query);
    await user.selectOptions(screen.getByTestId('update-frequency-select'), 'daily');
    await user.selectOptions(screen.getByTestId('detail-level-select'), 'detailed');
    await user.selectOptions(screen.getByTestId('model-type-select'), 'sonar-reasoning');
    await user.selectOptions(screen.getByTestId('recency-filter-select'), '1d');
  };
  
  test('renders form with all fields', () => {
    renderForm();
    
    expect(screen.getByTestId('topic-query-input')).toBeInTheDocument();
    expect(screen.getByTestId('update-frequency-select')).toBeInTheDocument();
    expect(screen.getByTestId('detail-level-select')).toBeInTheDocument();
    expect(screen.getByTestId('model-type-select')).toBeInTheDocument();
    expect(screen.getByTestId('recency-filter-select')).toBeInTheDocument();
    expect(screen.getByTestId('create-stream-button')).toBeInTheDocument();
  });
  
  test('shows error for empty query', async () => {
    const user = userEvent.setup();
    renderForm();
    
    await user.click(screen.getByTestId('create-stream-button'));
    
    expect(screen.getByText('Query is required')).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });
  
  test('shows error for short query', async () => {
    const user = userEvent.setup();
    renderForm();
    
    await user.type(screen.getByTestId('topic-query-input'), 'ab');
    await user.click(screen.getByTestId('create-stream-button'));
    
    expect(screen.getByText('Query must be at least 3 characters')).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });
  
  test('shows error for long query', async () => {
    const user = userEvent.setup();
    renderForm();
    
    const longQuery = 'a'.repeat(101);
    await user.type(screen.getByTestId('topic-query-input'), longQuery);
    await user.click(screen.getByTestId('create-stream-button'));
    
    expect(screen.getByText('Query must be less than 100 characters')).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });
  
  test('submits form with valid data', async () => {
    const user = userEvent.setup();
    renderForm();
    
    await fillForm(user);
    await user.click(screen.getByTestId('create-stream-button'));
    
    expect(mockOnSubmit).toHaveBeenCalledWith({
      query: 'Test query',
      update_frequency: 'daily',
      detail_level: 'detailed',
      model_type: 'sonar-reasoning',
      recency_filter: '1d'
    });
  });
  
  test('handles submission error', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Failed to create topic stream';
    mockOnSubmit.mockRejectedValueOnce({ response: { data: { detail: errorMessage } } });
    
    renderForm();
    
    await fillForm(user);
    await user.click(screen.getByTestId('create-stream-button'));
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });
  
  test('shows loading state during submission', async () => {
    const user = userEvent.setup();
    mockOnSubmit.mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    renderForm();
    
    await fillForm(user);
    await user.click(screen.getByTestId('create-stream-button'));
    
    expect(screen.getByText('Creating...')).toBeInTheDocument();
    expect(screen.getByTestId('create-stream-button')).toBeDisabled();
  });
  
  test('resets form after successful submission', async () => {
    const user = userEvent.setup();
    renderForm();
    
    await fillForm(user);
    await user.click(screen.getByTestId('create-stream-button'));
    
    await waitFor(() => {
      expect(screen.getByTestId('topic-query-input')).toHaveValue('');
    });
  });
}); 
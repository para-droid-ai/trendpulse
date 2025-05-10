import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TopicStreamWidget from '../TopicStreamWidget';

describe('TopicStreamWidget', () => {
  const mockTopicStream = {
    id: 1,
    query: 'Test Topic',
    update_frequency: 'daily',
    detail_level: 'detailed',
    model_type: 'sonar-reasoning',
    recency_filter: '1d',
    created_at: '2024-03-20T10:00:00Z',
    last_updated: '2024-03-20T10:00:00Z'
  };
  
  const mockOnDelete = jest.fn();
  const mockOnSelect = jest.fn();
  
  beforeEach(() => {
    mockOnDelete.mockClear();
    mockOnSelect.mockClear();
  });
  
  const renderWidget = (isSelected = false) => {
    return render(
      <TopicStreamWidget
        topicStream={mockTopicStream}
        isSelected={isSelected}
        onDelete={mockOnDelete}
        onSelect={mockOnSelect}
      />
    );
  };
  
  test('renders topic stream information', () => {
    renderWidget();
    
    expect(screen.getByText('Test Topic')).toBeInTheDocument();
    expect(screen.getByText('Daily')).toBeInTheDocument();
    expect(screen.getByText('Detailed')).toBeInTheDocument();
    expect(screen.getByText('Sonar Reasoning')).toBeInTheDocument();
    expect(screen.getByText('Last 24 hours')).toBeInTheDocument();
  });
  
  test('applies selected styles when isSelected is true', () => {
    renderWidget(true);
    
    const widget = screen.getByTestId('topic-stream-widget');
    expect(widget).toHaveClass('bg-blue-50', 'border-blue-500');
  });
  
  test('calls onSelect when clicked', async () => {
    const user = userEvent.setup();
    renderWidget();
    
    await user.click(screen.getByTestId('topic-stream-widget'));
    
    expect(mockOnSelect).toHaveBeenCalledWith(mockTopicStream.id);
  });
  
  test('shows delete confirmation dialog', async () => {
    const user = userEvent.setup();
    renderWidget();
    
    await user.click(screen.getByTestId('delete-button'));
    
    expect(screen.getByText('Delete Topic Stream')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete this topic stream?')).toBeInTheDocument();
  });
  
  test('cancels deletion when cancel button is clicked', async () => {
    const user = userEvent.setup();
    renderWidget();
    
    await user.click(screen.getByTestId('delete-button'));
    await user.click(screen.getByText('Cancel'));
    
    expect(mockOnDelete).not.toHaveBeenCalled();
    expect(screen.queryByText('Delete Topic Stream')).not.toBeInTheDocument();
  });
  
  test('confirms deletion when delete button is clicked', async () => {
    const user = userEvent.setup();
    renderWidget();
    
    await user.click(screen.getByTestId('delete-button'));
    await user.click(screen.getByText('Delete'));
    
    expect(mockOnDelete).toHaveBeenCalledWith(mockTopicStream.id);
  });
  
  test('shows loading state during deletion', async () => {
    const user = userEvent.setup();
    mockOnDelete.mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    renderWidget();
    
    await user.click(screen.getByTestId('delete-button'));
    await user.click(screen.getByText('Delete'));
    
    expect(screen.getByText('Deleting...')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeDisabled();
  });
  
  test('handles deletion error', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Failed to delete topic stream';
    mockOnDelete.mockRejectedValueOnce({ response: { data: { detail: errorMessage } } });
    
    renderWidget();
    
    await user.click(screen.getByTestId('delete-button'));
    await user.click(screen.getByText('Delete'));
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });
  
  test('formats dates correctly', () => {
    renderWidget();
    
    expect(screen.getByText('Created: Mar 20, 2024')).toBeInTheDocument();
    expect(screen.getByText('Last updated: Mar 20, 2024')).toBeInTheDocument();
  });
}); 
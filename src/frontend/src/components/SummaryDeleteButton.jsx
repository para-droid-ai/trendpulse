import React, { useState } from 'react';
import { topicStreamAPI } from '../services/api';

const SummaryDeleteButton = ({ summaryId, streamId, onSummaryDeleted, onError }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    setShowConfirm(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    setShowConfirm(false);
    
    try {
      console.log(`SummaryDeleteButton: Deleting summary ${summaryId} from stream ${streamId}`);
      await topicStreamAPI.deleteSummary(streamId, summaryId);
      console.log(`SummaryDeleteButton: Successfully deleted summary ${summaryId}`);
      
      // Notify parent component of successful deletion
      onSummaryDeleted(summaryId);
    } catch (err) {
      console.error(`SummaryDeleteButton: Error deleting summary ${summaryId}:`, err);
      
      let errorMessage = 'Failed to delete summary. Please try again.';
      
      if (err.response) {
        console.error('Server error response:', err.response.data);
        console.error('Status code:', err.response.status);
        errorMessage = err.response.data?.detail || errorMessage;
      }
      
      // Notify parent component of error
      onError(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setShowConfirm(false);
  };

  return (
    <>
      <button
        onClick={handleDeleteClick}
        disabled={isDeleting}
        className={`text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 text-sm ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isDeleting ? 'Deleting...' : 'Delete'}
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={cancelDelete}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Confirm Delete</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">Are you sure you want to delete this summary?</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SummaryDeleteButton; 
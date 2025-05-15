import React, { useState } from 'react';
import { topicStreamAPI } from '../services/api';

const SummaryDeleteButton = ({ summaryId, streamId, onSummaryDeleted, onError, isIconOnly = false }) => {
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
        title={isIconOnly ? "Delete Summary" : undefined}
        className={`p-1 rounded-md text-white bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 transition-colors ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isDeleting ? (
          isIconOnly ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v2m0 12v2m8-10h-2M4 12H2m15.364-5.364l-1.414-1.414M6.05 17.95l-1.414-1.414m11.314 0l-1.414 1.414M6.05 6.05l-1.414 1.414" />
            </svg>
          ) : 'Deleting...'
        ) : isIconOnly ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        ) : 'Delete'}
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
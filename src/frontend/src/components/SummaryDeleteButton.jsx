import React, { useState } from 'react';
import { topicStreamAPI } from '../services/api';
import Portal from './Portal';

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
        title={isIconOnly ? "🗑️ Delete This Summary Only (Stream will remain)" : undefined}
        className={`p-1 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isDeleting ? (
          isIconOnly ? (
            <svg 
              className="h-4 w-4 animate-spin" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
              <path d="M21 3v5h-5"/>
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
              <path d="M3 21v-5h5"/>
            </svg>
          ) : 'Deleting...'
        ) : isIconOnly ? (
          <svg 
            className="h-6 w-6" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M3 6h18"/>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
            <path d="M8 6V4c0-1 1-2 2-2h4c0-1 1-2 2-2v2"/>
          </svg>
        ) : 'Delete'}
      </button>

      {showConfirm && (
        <Portal>
          <div 
            className="fixed bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" 
            style={{ 
              position: 'fixed',
              top: '0',
              left: '0',
              width: '100vw',
              height: '100vh',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem'
            }}
            onClick={cancelDelete}
          >
            <div 
              className="bg-card rounded-xl shadow-xl border border-border animate-in slide-in-from-top-2 duration-300" 
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: '28rem',
                maxHeight: '90vh',
                margin: '0',
                overflow: 'auto'
              }}
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6">
                <h3 className="text-lg font-medium text-foreground mb-4">Confirm Delete</h3>
                <p className="text-muted-foreground mb-6">Are you sure you want to delete this summary?</p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={cancelDelete}
                    className="px-4 py-2 text-sm font-medium text-foreground bg-muted rounded-md hover:bg-muted/80"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="px-4 py-2 text-sm font-medium bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
};

export default SummaryDeleteButton; 
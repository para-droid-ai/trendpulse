import React, { useState, useEffect } from 'react';
import { topicStreamAPI } from '../services/api';
import { format } from 'date-fns';
import DeepDiveChat from './DeepDiveChat';
import MarkdownRenderer from './MarkdownRenderer';
import SummaryDeleteButton from '../src/components/SummaryDeleteButton';
import TopicStreamForm from './TopicStreamForm';

const TopicStreamWidget = ({ stream, onDelete, onUpdate, isGridView }) => {
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedSummaryId, setExpandedSummaryId] = useState(null);
  const [showDeepDive, setShowDeepDive] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);

  // State for deleting the WHOLE stream (keep existing)
  const [showDeleteStreamConfirm, setShowDeleteStreamConfirm] = useState(false);

  useEffect(() => {
    fetchSummaries();
  }, [stream.id]);

  const fetchSummaries = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await topicStreamAPI.getSummaries(stream.id);
      setSummaries(data);
    } catch (err) {
      console.error('Failed to load summaries:', err);
      setError('Failed to load summaries. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateNow = async () => {
    try {
      setUpdating(true);
      setError('');
      
      const newSummary = await topicStreamAPI.updateNow(stream.id);
      
      if (newSummary.content && newSummary.content.includes("No new information is available")) {
        setError('No new information is available since the last update.');
      } else {
        setSummaries([newSummary, ...summaries]);
      }
    } catch (err) {
      console.error('Failed to update stream:', err);
      setError(err.message || 'Failed to update stream. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteStream = () => {
    setShowDeleteStreamConfirm(true);
  };

  const confirmDeleteStream = () => {
    onDelete(stream.id);
    setShowDeleteStreamConfirm(false);
  };

  const cancelDeleteStream = () => {
    setShowDeleteStreamConfirm(false);
  };

  const handleSummarySuccessfullyDeleted = (deletedSummaryId) => {
    setSummaries(prevSummaries => prevSummaries.filter(s => s.id !== deletedSummaryId));
    setError('');
  };
  
  const handleSummaryDeletionError = (errorMessage) => {
    setError(errorMessage);
  };

  const handleAppendSummary = (newSummary) => {
    setSummaries([newSummary, ...summaries]);
  };

  const handleDeepDive = (summary) => {
    setSelectedSummary(summary);
    setShowDeepDive(true);
  };

  const toggleExpandSummary = (id) => {
    if (expandedSummaryId === id) {
      setExpandedSummaryId(null);
    } else {
      setExpandedSummaryId(id);
    }
  };

  const handleEdit = () => {
    setShowEditForm(true);
  };

  const handleEditSubmit = async (formData) => {
    try {
      await onUpdate(stream.id, formData);
      setShowEditForm(false);
      setError('');
    } catch (err) {
      console.error('Failed to update stream:', err);
      setError(err.message || 'Failed to update stream. Please try again.');
    }
  };

  if (!stream) {
    return null;
  }

  if (showEditForm) {
    return (
      <div className={`${isGridView ? 'lg:col-span-1' : 'w-full'} bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 overflow-hidden shadow-sm`}>
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Edit Topic Stream</h3>
          <TopicStreamForm 
            onSubmit={handleEditSubmit}
            initialData={stream}
            isEditing={true}
          />
          <button
            onClick={() => setShowEditForm(false)}
            className="mt-4 w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${isGridView ? 'lg:col-span-1' : 'w-full'} bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200`}>
      <div className="p-4 border-b dark:border-gray-700 flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
            {stream.query}
          </h3>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              {stream.update_frequency}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              {stream.detail_level}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
              {stream.model_type}
            </span>
          </div>
        </div>
        
        <div className="flex space-x-1">
          <button
            onClick={handleEdit}
            className="text-xs py-1 px-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={handleUpdateNow}
            disabled={updating}
            className={`text-xs py-1 px-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors ${
              updating ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {updating ? 'Updating...' : 'Update Now'}
          </button>
          <button
            onClick={handleDeleteStream}
            className="text-xs py-1 px-2 rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            Delete Topic Stream
          </button>
        </div>
      </div>

      {error && !showDeleteStreamConfirm && (
        <div className="p-4 bg-red-100 border-l-4 border-red-500 text-red-700">
          <p>{error}</p>
          <button onClick={() => setError('')} className="text-sm underline mt-1">Dismiss</button>
        </div>
      )}

      <div className="divide-y dark:divide-gray-700">
        {loading ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">Loading summaries...</div>
        ) : summaries.length === 0 && !error ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            No summaries yet. Click "Update Now" to generate one.
          </div>
        ) : (
          summaries.map((summary) => (
            <div key={summary.id} className="p-4">
              <div className="mb-2 flex justify-between items-center">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {format(new Date(summary.created_at), 'MMM d, yyyy h:mm a')}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleDeepDive(summary)}
                    className="text-xs bg-indigo-50 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 px-2 py-1 rounded-full"
                  >
                    Deep Dive
                  </button>
                  <SummaryDeleteButton 
                    streamId={stream.id} 
                    summaryId={summary.id}
                    onSummaryDeleted={handleSummarySuccessfullyDeleted}
                    onError={handleSummaryDeletionError} 
                  />
                </div>
              </div>
              
              <div 
                className={`prose prose-sm max-w-none dark:prose-invert overflow-hidden ${
                  expandedSummaryId !== summary.id && 'line-clamp-4'
                }`}
              >
                <MarkdownRenderer content={summary.content} />
              </div>
              
              {summary.content && summary.content.length > 300 && (
                <button
                  onClick={() => toggleExpandSummary(summary.id)}
                  className="mt-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {expandedSummaryId === summary.id ? 'Show less' : 'Read more'}
                </button>
              )}
              
              {summary.sources && summary.sources.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Sources:</div>
                  <div className="flex flex-wrap gap-1">
                    {summary.sources.map((source, index) => (
                      <a
                        key={index}
                        href={source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-indigo-600 hover:text-indigo-900 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900 px-2 py-1 rounded-full truncate max-w-[200px]"
                      >
                        {source}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {showDeepDive && selectedSummary && (
        <div className="fixed inset-0 z-50 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900 dark:text-blue-300">
                Deep Dive: {stream.query}
              </h3>
              <button
                onClick={() => setShowDeepDive(false)}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4 border-b dark:border-gray-700 overflow-y-auto">
              <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">Summary</h4>
              <MarkdownRenderer content={selectedSummary.content} />
            </div>
            
            <div className="flex-1 overflow-hidden">
              <DeepDiveChat 
                topicStreamId={stream.id} 
                summaryId={selectedSummary.id}
                topic={stream.query}
                onAppend={handleAppendSummary}
              />
            </div>
          </div>
        </div>
      )}

      {showDeleteStreamConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Delete Topic Stream?
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete the entire topic stream "{stream.query}"? This action cannot be undone, and all associated summaries will be permanently deleted.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDeleteStream}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteStream}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Delete Stream
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopicStreamWidget;

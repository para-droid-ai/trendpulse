import React, { useState, useEffect, useCallback, useRef } from 'react';
import { topicStreamAPI } from '../services/api';
import { format, addHours, addDays, addWeeks, differenceInSeconds, subHours } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import DeepDiveChat from './DeepDiveChat';
import MarkdownRenderer from './MarkdownRenderer';
import SummaryDeleteButton from './SummaryDeleteButton';
import TopicStreamForm from './TopicStreamForm';
import { formatModelType } from '../utils/formatters';

const TopicStreamWidget = ({ stream, onDelete, onUpdate, isGridView, onSwipeLeft, onSwipeRight }) => {
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [expandedSummaryId, setExpandedSummaryId] = useState(null);
  const [showDeepDive, setShowDeepDive] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  

  const [showDeleteStreamConfirm, setShowDeleteStreamConfirm] = useState(false);
  const [nextUpdateCountdown, setNextUpdateCountdown] = useState('');
  
  // Touch handling for swipe gestures
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);
  const MIN_SWIPE_DISTANCE = 50;

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    
    const distance = touchStartX.current - touchEndX.current;
    
    if (Math.abs(distance) > MIN_SWIPE_DISTANCE) {
      // Negative distance means swipe right, positive means swipe left
      if (distance > 0 && onSwipeLeft) {
        onSwipeLeft();
      } else if (distance < 0 && onSwipeRight) {
        onSwipeRight();
      }
    }
    
    // Reset values
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const fetchSummaries = useCallback(async () => {
    if (!stream || typeof stream.id === 'undefined') {
      setLoading(false);
      return;
    }
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
  }, [stream]);

  useEffect(() => {
    if (stream && typeof stream.id !== 'undefined') {
      fetchSummaries();
    }
  }, [fetchSummaries, stream]);

  // Effect for countdown timer
  useEffect(() => {
    if (!stream.last_updated || !stream.update_frequency) {
      setNextUpdateCountdown('');
      return;
    }

    const calculateNextUpdate = () => {
      try {
        const lastUpdatedDate = new Date(stream.last_updated);
        if (isNaN(lastUpdatedDate.getTime())) {
          // console.error('Invalid last_updated date:', stream.last_updated);
          setNextUpdateCountdown('Invalid date');
          return null;
        }

        let nextUpdateDate;
        switch (stream.update_frequency) {
          case 'hourly':
            nextUpdateDate = addHours(lastUpdatedDate, 1);
            break;
          case 'daily':
            nextUpdateDate = addDays(lastUpdatedDate, 1);
            break;
          case 'weekly':
            nextUpdateDate = addWeeks(lastUpdatedDate, 1);
            break;
          default:
            // console.error('Unknown update frequency:', stream.update_frequency);
            setNextUpdateCountdown('Unknown frequency');
            return null;
        }
        return nextUpdateDate;
      } catch (e) {
        // console.error('Error calculating next update date:', e);
        setNextUpdateCountdown('Date calc error');
        return null;
      }
    };

    const updateCountdown = () => {
      const nextUpdateDate = calculateNextUpdate();
      if (!nextUpdateDate) return;

      const now = new Date();
      const diffSeconds = differenceInSeconds(nextUpdateDate, now);

      if (diffSeconds <= 0) {
        setNextUpdateCountdown('Updating soon / Overdue');
        return;
      }

      const hours = Math.floor(diffSeconds / 3600);
      const minutes = Math.floor((diffSeconds % 3600) / 60);
      const seconds = diffSeconds % 60;

      setNextUpdateCountdown(
        `Next update in: ${hours > 0 ? hours + 'h ' : ''}${minutes > 0 ? minutes + 'm ' : ''}${seconds}s`
      );
    };

    updateCountdown(); // Initial call
    const intervalId = setInterval(updateCountdown, 1000); // Update every second

    return () => clearInterval(intervalId); // Cleanup interval on unmount
  }, [stream.last_updated, stream.update_frequency]);

  const handleUpdateNow = async () => {
    if (!stream || typeof stream.id === 'undefined') return;
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
    if (stream && typeof stream.id !== 'undefined') {
      onDelete(stream.id);
    }
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
    setExpandedSummaryId(prevId => (prevId === id ? null : id));
    if (expandedSummaryId !== id) {
      setTimeout(() => {
        const element = document.getElementById(`summary-${id}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    }
  };

  const handleEdit = () => {
    setShowEditForm(true);
  };

  const handleEditSubmit = async (formData) => {
    if (!stream || typeof stream.id === 'undefined' || !onUpdate) {
      setError('Cannot update stream at this time.');
      return;
    }
    try {
      await onUpdate(stream.id, formData);
      setShowEditForm(false);
      setError('');
      fetchSummaries();
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
      <div className={`${isGridView ? 'lg:col-span-1' : 'w-full'} bg-white dark:bg-[#2a2a2e] rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm`}>
        <div className="p-4">
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-4">Edit Topic Stream</h3>
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
    <div 
      className={`${isGridView ? 'flex flex-col h-full min-h-[400px]' : 'w-full'} bg-white dark:bg-[#2a2a2e] border border-slate-200 dark:border-slate-700 shadow-sm rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200 flex flex-col`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className={`p-4 border-b border-slate-200 dark:border-slate-700 flex ${isGridView ? 'flex-col items-start' : 'justify-between items-start'}`}>
        <div className={isGridView ? 'mb-2' : ''}>
          <h3 
            className={`${isGridView ? 'text-xl font-semibold mb-1 h-[3.5rem] flex items-center' : 'text-lg font-semibold h-[3.5rem] flex items-center'} text-slate-700 dark:text-slate-300`}
            title={stream.query}  
          >
            <span className={`${isGridView ? 'line-clamp-2' : 'line-clamp-2'}`}>{stream.query}</span>
          </h3>
          {/* Show badges for model, frequency, and detail in grid view */}
          {isGridView && (
            <div className="flex flex-wrap gap-2 mt-1 mb-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {stream.update_frequency}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                {stream.detail_level}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                {stream.model_type}
              </span>
              {stream.system_prompt && (
                <div className="mt-1 ml-2"> 
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center overflow-hidden">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span className="mr-1 flex-shrink-0">Custom Prompt:</span>
                    <span className="italic truncate" title={stream.system_prompt}>{stream.system_prompt}</span>
                  </p>
                </div>
              )}
            </div>
          )}
          {/* Always show EST regardless of browser timezone */}
          <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-600 dark:text-gray-300" aria-label="Stream timestamps">
            {stream.created_at && (
              <span>
                Created: {formatInTimeZone(subHours(new Date(stream.created_at), 3), 'America/New_York', 'MMM d, yyyy h:mm aaaa')} EST
              </span>
            )}
            {stream.last_updated && (
              <span>
                Last updated: {formatInTimeZone(subHours(new Date(stream.last_updated), 3), 'America/New_York', 'MMM d, yyyy h:mm aaaa')} EST
              </span>
            )}
          </div>
          {!isGridView && (
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
              {stream.system_prompt && (
                <div className="mt-1 ml-2"> 
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center overflow-hidden">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span className="mr-1 flex-shrink-0">Custom Prompt:</span>
                    <span className="italic truncate" title={stream.system_prompt}>{stream.system_prompt}</span>
                  </p>
                </div>
              )}
              {/* Display Countdown Timer */}
              {nextUpdateCountdown && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                  {nextUpdateCountdown}
                </span>
              )}
            </div>
          )}
        </div>
        
        <div className={`flex ${isGridView ? 'space-x-1 mt-auto w-full justify-end' : 'space-x-1 flex-shrink-0'}`}>
          {isGridView ? (
            <>
              <button
                onClick={handleUpdateNow}
                disabled={updating}
                title="Update Now"
                className={`p-1.5 rounded text-white transition-colors ${
                  updating ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m-15.357-2a8.001 8.001 0 0015.357 2M15 15h-5.418" />
                </svg>
              </button>
              <button
                onClick={handleDeleteStream}
                title="Delete Topic Stream"
                className="p-1.5 rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleEdit}
                className="text-xs py-1 px-2 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 dark:border-slate-600 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={handleUpdateNow}
                disabled={updating}
                className={`text-xs py-1 px-2 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 dark:border-slate-600 transition-colors ${updating ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {updating ? 'Updating...' : 'Update Now'}
              </button>
              <button
                onClick={handleDeleteStream}
                className="text-xs py-1 px-2 rounded bg-red-500 hover:bg-red-600 text-white dark:bg-red-600 dark:hover:bg-red-700 transition-colors"
              >
                Delete Topic Stream
              </button>
            </>
          )}
        </div>
      </div>

      {error && !showDeleteStreamConfirm && (
        <div className="p-4 bg-red-100 border-l-4 border-red-500 text-red-700">
          <p>{error}</p>
          <button onClick={() => setError('')} className="text-sm underline mt-1">Dismiss</button>
        </div>
      )}

      <div className="divide-y divide-slate-200 dark:divide-slate-700 flex-grow overflow-y-auto max-h-full">
        {loading ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">Loading summaries...</div>
        ) : summaries.length === 0 && !error ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            No summaries yet. Click "Update Now" to generate one.
          </div>
        ) : (
          summaries.map((summary) => (
            <div key={summary.id} className="p-4 group relative" id={`summary-${summary.id}`}>
              <div className="mb-2 flex justify-between items-center">
                <div className="text-sm text-slate-500 dark:text-slate-400 font-sans">
                  {summary.created_at ? formatInTimeZone(subHours(new Date(summary.created_at), 3), 'America/New_York', 'MMM d, yyyy h:mm aaaa') + ' EST' : 'Date unavailable'}
                  {summary.model && (
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                      {summary.model}
                    </span>
                  )}
                  {!summary.model && stream.model_type && (
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                      {stream.model_type}
                    </span>
                  )}
                </div>
                {isGridView && (
                  <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      onClick={() => handleDeepDive(summary)}
                      title="Deep Dive"
                      className="p-1 rounded bg-blue-500 hover:bg-blue-600 text-white text-xs"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v11.494m0 0A23.056 23.056 0 013.75 12C3.75 9.204 5.284 6.703 7.5 5.253m4.5 12.494A23.055 23.055 0 0020.25 12c0-2.796-1.534-5.297-3.75-6.747M12 17.747A6.726 6.726 0 0016.5 12a6.726 6.726 0 00-4.5-5.747M12 17.747A6.726 6.726 0 017.5 12a6.726 6.726 0 014.5-5.747" />
                      </svg>
                    </button>
                    <SummaryDeleteButton 
                      streamId={stream.id} 
                      summaryId={summary.id}
                      onSummaryDeleted={handleSummarySuccessfullyDeleted}
                      onError={handleSummaryDeletionError} 
                      isIconOnly={true}
                      buttonClassName="p-1 rounded bg-red-500 hover:bg-red-600 text-white"
                    />
                  </div>
                )}
                {!isGridView && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleDeepDive(summary)}
                      className="text-xs px-2 py-1 rounded-full bg-indigo-50 dark:bg-slate-700 text-indigo-600 dark:text-slate-200 hover:bg-indigo-100 dark:hover:bg-slate-600"
                    >
                      Deep Dive
                    </button>
                    <SummaryDeleteButton 
                      streamId={stream.id} 
                      summaryId={summary.id}
                      onSummaryDeleted={handleSummarySuccessfullyDeleted}
                      onError={handleSummaryDeletionError} 
                      isIconOnly={false}
                    />
                  </div>
                )}
              </div>
              
              <div 
                className={`prose prose-sm dark:prose-invert max-w-none overflow-hidden font-sans ${
                  isGridView
                    ? 'prose-xs prose-h2:font-bold prose-h2:text-gray-800 dark:prose-h2:text-gray-100 prose-h2:leading-snug prose-h3:font-bold prose-h3:text-gray-800 dark:prose-h3:text-gray-100 prose-h3:leading-snug prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed'
                    : 'prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed'
                } ${
                  expandedSummaryId !== summary.id ? (isGridView ? 'max-h-[800px]' : 'max-h-[600px] overflow-y-auto') : ''
                }`}
                style={{
                  transition: 'max-height 0.5s ease-in-out',
                  maxHeight: expandedSummaryId === summary.id ? '10000px' : undefined,
                }}
              >
                <MarkdownRenderer content={summary.content || ''} />
              </div>
              
              {summary.content && summary.content.length > (isGridView ? 400 : 600) && (
                <button
                  onClick={() => toggleExpandSummary(summary.id)}
                  className="mt-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                >
                  {expandedSummaryId === summary.id ? 'Show less ↑' : 'Show full text ↓'}
                </button>
              )}
              
              {summary.sources && summary.sources.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Sources:</div>
                  <div className="flex flex-wrap gap-1">
                    {summary.sources.map((source, index) => (
                      <a
                        key={index}
                        href={source.url || source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 dark:text-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 px-2 py-1 rounded-full truncate max-w-[200px]"
                        title={source.url || source}>
                        {source.name || source.url || source}
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
          <div className="bg-white dark:bg-[#2a2a2e] rounded-lg shadow-xl w-[95vw] h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-[#2a2a2e]">
              <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300">
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
            
            <div className="flex flex-1 overflow-hidden">
              <div className="w-1/2 h-full flex flex-col border-r border-slate-200 dark:border-slate-700">
                <h4 className="p-4 border-b border-slate-200 text-md font-medium text-slate-700 dark:text-slate-300 sticky top-0 bg-white dark:bg-[#2a2a2e] z-10">Original Summary</h4>
                <div className="flex-1 overflow-y-scroll p-4 bg-white dark:bg-[#2a2a2e]">
                  <MarkdownRenderer content={selectedSummary.content || ''} />
                  {selectedSummary.sources && selectedSummary.sources.length > 0 && (
                    <div className="mt-4">
                      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Sources:</div>
                      <div className="flex flex-wrap gap-1">
                        {selectedSummary.sources.map((source, index) => (
                          <a 
                            key={index} 
                            href={typeof source === 'string' ? source : source.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-xs text-indigo-600 hover:text-indigo-900 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900 px-2 py-1 rounded-full truncate max-w-[200px]" 
                            title={typeof source === 'string' ? source : source.url}
                          >
                            {typeof source === 'string' ? source : (source.name || source.url)}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="w-1/2 h-full overflow-hidden">
                <DeepDiveChat 
                  topicStreamId={stream.id} 
                  summaryId={selectedSummary.id}
                  topic={stream.query}
                  onAppend={handleAppendSummary}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteStreamConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-[#2a2a2e] rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-4">
              Delete Topic Stream?
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
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
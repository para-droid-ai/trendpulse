import React, { useState, useEffect, useContext, useCallback } from 'react';
import AuthContext from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { topicStreamAPI } from '../services/api';
import TopicStreamForm from '../components/TopicStreamForm';
import TopicStreamWidget from '../components/TopicStreamWidget'; // Correct relative path
import { format } from 'date-fns';
import MarkdownRenderer from '../components/MarkdownRenderer';
import DeepDiveChat from '../components/DeepDiveChat';

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const { theme, toggleTheme } = useTheme();
  const [topicStreams, setTopicStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedStream, setSelectedStream] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list', 'grid', or 'mobile'
  const [draggedStreamId, setDraggedStreamId] = useState(null);
  const [dragOverStreamId, setDragOverStreamId] = useState(null);
  const [currentMobileIndex, setCurrentMobileIndex] = useState(0);
  const [allSummaries, setAllSummaries] = useState([]);
  const [loadingSummaries, setLoadingSummaries] = useState(false);
  const [showDeepDive, setShowDeepDive] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  
  // Function to toggle between view modes
  const toggleViewMode = () => {
    const newMode = viewMode === 'list' ? 'grid' : 
                   viewMode === 'grid' ? 'mobile' : 'list';
    
    setViewMode(newMode);
    
    // If switching to mobile view, fetch all summaries
    if (newMode === 'mobile' && allSummaries.length === 0) {
      fetchAllSummaries();
    }
  };

  // Get the view mode icon and text based on current mode
  const getViewModeUI = () => {
    switch(viewMode) {
      case 'list':
        return { icon: '📋', text: 'List View' };
      case 'grid':
        return { icon: '📊', text: 'Grid View' };
      case 'mobile':
        return { icon: '📱', text: 'Feed' };
      default:
        return { icon: '📋', text: 'List View' };
    }
  };

  // Fetch summaries from all streams and combine them
  const fetchAllSummaries = useCallback(async () => {
    if (topicStreams.length === 0) return;
    
    setLoadingSummaries(true);
    
    try {
      // Fetch summaries for each stream
      const summariesPromises = topicStreams.map(stream => 
        // Add a check here to ensure the stream object is valid and has an id
        stream && stream.id ? 
        topicStreamAPI.getSummaries(stream.id)
          .then(summaries => summaries.map(summary => ({
            ...summary,
            streamQuery: stream.query,
            streamId: stream.id,
            // Ensure we have a valid date for sorting
            created_at: summary.created_at || new Date().toISOString()
          })))
        .catch(err => {
          console.error(`Failed to fetch summaries for stream ${stream.id}:`, err);
          // Return an empty array for this stream if fetching fails
          return [];
        })
        : Promise.resolve([]) // If stream is invalid, resolve with an empty array
      );
      
      const results = await Promise.all(summariesPromises);
      
      // Flatten the array of arrays and sort by created_at (newest first)
      const combinedSummaries = results
        .flat()
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      setAllSummaries(combinedSummaries);
    } catch (err) {
      console.error('Failed to fetch all summaries:', err);
      setError('Failed to load feed. Please try again.');
    } finally {
      setLoadingSummaries(false);
    }
  }, [topicStreams]);

  // Save the stream order to localStorage
  const saveStreamOrder = (streams) => {
    try {
      const orderMap = streams.reduce((acc, stream, index) => {
        acc[stream.id] = index;
        return acc;
      }, {});
      localStorage.setItem('streamOrder', JSON.stringify(orderMap));
    } catch (err) {
      console.error('Failed to save stream order:', err);
    }
  };

  // Load ordered streams based on saved order
  const getOrderedStreams = (streams) => {
    try {
      const savedOrder = localStorage.getItem('streamOrder');
      if (!savedOrder) return streams;
      
      const orderMap = JSON.parse(savedOrder);
      // Create a copy of streams to sort
      return [...streams].sort((a, b) => {
        // Use the saved order if available, otherwise keep original order
        const orderA = orderMap[a.id] !== undefined ? orderMap[a.id] : Infinity;
        const orderB = orderMap[b.id] !== undefined ? orderMap[b.id] : Infinity;
        return orderA - orderB;
      });
    } catch (err) {
      console.error('Failed to load stream order:', err);
      return streams;
    }
  };

  const fetchTopicStreams = useCallback(async () => {
    setLoading(true);
    setError('');
    console.log("Fetching topic streams...");
    try {
      const data = await topicStreamAPI.getAll();
      console.log("Received data from API:", data);
      if (!Array.isArray(data)) {
          console.error("API did not return an array for topic streams:", data);
          throw new Error("Invalid data format received from API.");
      }
      console.log(`Setting ${data.length} topic streams.`);
      // Apply saved order to the streams
      const orderedStreams = getOrderedStreams(data);
      setTopicStreams(orderedStreams);
      if (orderedStreams.length > 0 && !selectedStream) {
        console.log("Attempting to select first stream:", orderedStreams[0]);
        setSelectedStream(orderedStreams[0]);
        console.log("First stream selected.");
      } else {
          console.log("No streams to select or stream already selected.");
      }
      console.log("fetchTopicStreams completed successfully.");
    } catch (err) {
      console.error("Error during fetchTopicStreams try block:", err);
      setError('Failed to load topic streams. Please try again.'); 
    } finally {
      setLoading(false);
      console.log("fetchTopicStreams finished.");
    }
  }, [selectedStream]);

  // Refresh summaries when a new stream is created, updated, or deleted
  const refreshSummaries = () => {
    if (viewMode === 'mobile') {
      fetchAllSummaries();
    }
  };

  useEffect(() => {
    fetchTopicStreams();
  }, [fetchTopicStreams]);

  // Ensure currentMobileIndex is valid when topicStreams changes
  useEffect(() => {
    if (topicStreams.length > 0 && currentMobileIndex >= topicStreams.length) {
      setCurrentMobileIndex(0);
    }
    
    // If switching to mobile view and we have streams, fetch summaries
    if (viewMode === 'mobile' && topicStreams.length > 0) {
      fetchAllSummaries();
    }
  }, [topicStreams, currentMobileIndex, viewMode, fetchAllSummaries]);

  const handleCreateStream = async (newStream) => {
    try {
      const createdStream = await topicStreamAPI.create(newStream);
      setTopicStreams([...topicStreams, createdStream]);
      setSelectedStream(createdStream);
      setShowForm(false);
      refreshSummaries();
    } catch (err) {
      setError('Failed to create topic stream. Please try again.');
      console.error(err);
      // Re-throw the error to be handled by the form component
      throw err;
    }
  };

  const handleDeleteStream = async (id) => {
    setIsDeleting(true);
    setError('');
    try {
      await topicStreamAPI.delete(id);
      const updatedStreams = topicStreams.filter(stream => stream.id !== id);
      setTopicStreams(updatedStreams);
      
      if (selectedStream?.id === id) {
        setSelectedStream(updatedStreams.length > 0 ? updatedStreams[0] : null);
      }
      
      // Update summaries by removing ones from the deleted stream
      setAllSummaries(prev => prev.filter(summary => summary.streamId !== id));
    } catch (err) {
      setError(`Failed to delete topic stream: ${err.response?.data?.detail || 'Unknown error'}`);
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateStream = async (id, updatedData) => {
    try {
      const updatedApiStream = await topicStreamAPI.update(id, updatedData);
      setTopicStreams(prevStreams => 
        prevStreams.map(stream => 
          stream.id === id ? updatedApiStream : stream
        )
      );
      if (selectedStream?.id === id) {
        setSelectedStream(updatedApiStream);
      }
      refreshSummaries();
      return updatedApiStream; 
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to update topic stream.';
      console.error('Update stream error in Dashboard:', err);
      setError(errorMsg);
      throw err; 
    }
  };

  const handleUpdateNow = async (streamId) => {
    try {
      setError('');
      const newSummary = await topicStreamAPI.updateNow(streamId);
      
      // Find the stream to get its query
      const stream = topicStreams.find(s => s.id === streamId);
      
      if (newSummary.content && newSummary.content.includes("No new information is available")) {
        setError('No new information is available since the last update.');
      } else {
        // Add the new summary to the combined list
        setAllSummaries(prev => [
          {
            ...newSummary,
            streamQuery: stream?.query || '',
            streamId: streamId,
          },
          ...prev
        ]);
      }
      
      return newSummary;
    } catch (err) {
      console.error('Failed to update stream:', err);
      setError(err.message || 'Failed to update stream. Please try again.');
      throw err;
    }
  };

  const handleAppendSummary = async (newSummary) => {
    try {
      // This function is called from DeepDiveChat when a summary is saved from chat
      // We need to update the allSummaries state
      setAllSummaries(prev => [
        {
          ...newSummary,
          streamQuery: selectedStream?.query || '', // Use the selected stream's query
          streamId: selectedStream?.id || null, // Use the selected stream's ID
        },
        ...prev
      ]);
      setError(''); // Clear any previous errors
    } catch (err) {
       console.error('Failed to append summary to state:', err);
       // Optionally set an error state if needed
       // setError('Failed to add summary to feed.');
    }
  };

  const handleDragStart = (e, streamId) => {
    setDraggedStreamId(streamId);
    e.dataTransfer.effectAllowed = 'move';
    // Add a visual helper - opacity
    e.target.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    setDraggedStreamId(null);
    setDragOverStreamId(null);
    // Reset opacity
    e.target.style.opacity = '1';
  };

  const handleDragOver = (e, streamId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (streamId !== draggedStreamId) {
      setDragOverStreamId(streamId);
    }
  };

  const handleDrop = (e, targetStreamId) => {
    e.preventDefault();
    if (draggedStreamId !== targetStreamId) {
      // Reorder the streams
      const newTopicStreams = [...topicStreams];
      const draggedStreamIndex = newTopicStreams.findIndex(stream => stream.id === draggedStreamId);
      const targetStreamIndex = newTopicStreams.findIndex(stream => stream.id === targetStreamId);
      
      const [draggedStream] = newTopicStreams.splice(draggedStreamIndex, 1);
      newTopicStreams.splice(targetStreamIndex, 0, draggedStream);
      
      setTopicStreams(newTopicStreams);
      // Save the new order to localStorage
      saveStreamOrder(newTopicStreams);
    }
    setDraggedStreamId(null);
    setDragOverStreamId(null);
  };

  const clearError = () => {
    setError('');
  };

  const viewModeUI = getViewModeUI();

  // Render a single summary item for the mobile feed
  const renderSummaryItem = (summary) => (
    <div key={summary.id} className="bg-white dark:bg-[#2a2a2e] rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 mb-4">
      {/* Summary Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 line-clamp-1 max-w-[75%]" title={summary.streamQuery}>{summary.streamQuery}</h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {summary.created_at ? format(new Date(summary.created_at), 'MMM d, yyyy h:mm a') : ''}
          </span>
        </div>
        
        {/* Stream Actions */}
        <div className="flex space-x-2">
          <button 
            onClick={() => {
              const stream = topicStreams.find(s => s.id === summary.streamId);
              if (stream) handleUpdateNow(stream.id);
            }}
            className="text-xs py-1 px-2 bg-blue-50 text-blue-600 dark:bg-blue-900 dark:text-blue-200 rounded-full"
          >
            Update
          </button>
          <button
            onClick={() => {
              const streamIndex = topicStreams.findIndex(s => s.id === summary.streamId);
              if (streamIndex >= 0) {
                setViewMode('list');
                setSelectedStream(topicStreams[streamIndex]);
              }
            }}
            className="text-xs py-1 px-2 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-full"
          >
            View All
          </button>
        </div>
      </div>
      
      {/* Summary Content */}
      <div className="p-4">
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <MarkdownRenderer content={summary.content || ''} />
        </div>
      </div>
      
      {/* Summary Sources */}
      {summary.sources && summary.sources.length > 0 && (
        <div className="px-4 pb-4">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Sources:</div>
          <div className="flex flex-wrap gap-1">
            {summary.sources.map((source, index) => (
              <a
                key={index}
                href={typeof source === 'string' ? source : source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 dark:text-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 px-2 py-1 rounded-full truncate max-w-[200px]"
                title={typeof source === 'string' ? source : (source.url || source)}
              >
                {typeof source === 'string' 
                  ? source 
                  : (source.name || source.url || source)}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#1c1c1e]' : 'bg-[#f7f7f8]'}`}>
      {/* Header */}
      <header className={`shadow-sm border-b dark:border-slate-700 sticky top-0 z-50 ${theme === 'dark' ? 'bg-[#2a2a2e]' : 'bg-[#f7f7f8]'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 
            className="text-3xl font-bold text-slate-700 dark:text-slate-300 cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
            onClick={() => window.location.href = '/'}
          >
            TrendPulse Dashboard
          </h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleViewMode}
              className="mr-4 text-sm px-3 py-1 rounded bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 flex items-center"
            >
              <span className="mr-1">{viewModeUI.icon}</span> {viewModeUI.text}
            </button>
            <button
              onClick={toggleTheme}
              className="mr-4 text-sm px-3 py-1 rounded bg-gray-200 text-gray-700 border border-gray-300 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
            </button>
            <span className="text-xs text-gray-600 dark:text-gray-400">{user?.email}</span>
            <button 
              onClick={logout}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-700 dark:hover:text-gray-200"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main content wrapper for width control */}
      <main className="py-6">
        <div className={`${viewMode === 'grid' ? 'container-fluid mx-auto' : 'max-w-7xl mx-auto'} px-4 sm:px-6 lg:px-8`}>
          {error && (
            <div className="mb-4 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded" data-testid="error-message">
              {error}
              <button 
                className="float-right font-bold"
                onClick={clearError}
                aria-label="Close error message"
              >
                ×
              </button>
            </div>
          )}

          {viewMode === 'mobile' ? (
            <div className="flex flex-col">
              {/* Mobile View Header - moved inside the container */}
              {!showForm && topicStreams.length > 0 && !loading && !loadingSummaries && allSummaries.length > 0 ? (
                <div className="mobile-feed pb-16 max-w-3xl mx-auto">
                  <div className="flex justify-between items-center sticky top-[69px] pt-2 pb-4 bg-[#f7f7f8] dark:bg-[#1c1c1e] z-40">
                    <h2 className="text-xl font-medium text-slate-700 dark:text-slate-300">Latest Updates</h2>
                    <button
                      onClick={() => setShowForm(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                    >
                      New Stream
                    </button>
                  </div>
                  
                  {/* Chronological feed of all summaries */}
                  {allSummaries.map(summary => renderSummaryItem(summary))}
                </div>
              ) : (
                <>
                  {/* Mobile View Header - for empty states and form */}
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-medium text-slate-700 dark:text-slate-300">Latest Updates</h2>
                    <button
                      onClick={() => setShowForm(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                    >
                      New Stream
                    </button>
                  </div>

                  {/* Mobile View Content */}
                  {loading || loadingSummaries ? (
                    <div className="p-4 text-center text-gray-500">
                      <div className="animate-pulse flex justify-center items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                        <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                        <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                      </div>
                      <p className="mt-2">Loading your feed...</p>
                    </div>
                  ) : topicStreams.length === 0 ? (
                    <div className="p-8 text-center bg-white dark:bg-[#2a2a2e] rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                      <p className="text-slate-500 dark:text-slate-400 mb-4">No topic streams yet. Create your first one!</p>
                      <button
                        onClick={() => setShowForm(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                      >
                        New Stream
                      </button>
                    </div>
                  ) : showForm ? (
                    <div className="bg-white dark:bg-[#2a2a2e] rounded-lg shadow-sm p-6 border border-slate-200 dark:border-slate-700">
                      <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-medium text-slate-700 dark:text-slate-300">Create New Topic Stream</h2>
                        <button
                          onClick={() => setShowForm(false)}
                          className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        >
                          Cancel
                        </button>
                      </div>
                      <TopicStreamForm onSubmit={handleCreateStream} />
                    </div>
                  ) : allSummaries.length === 0 ? (
                    <div className="p-8 text-center bg-white dark:bg-[#2a2a2e] rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                      <p className="text-slate-500 dark:text-slate-400 mb-4">No updates in your feed yet.</p>
                      <p className="text-slate-500 dark:text-slate-400 mb-4">Try updating one of your streams to see content here.</p>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-12 gap-6">
              {/* Sidebar: Conditionally render in DOM based on viewMode to simplify layout management */}
              {viewMode === 'list' && (
                <div className="col-span-12 md:col-span-3 bg-[#f0f0f1] dark:bg-[#2a2a2e] rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                  <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h2 className="text-lg font-medium text-slate-700 dark:text-slate-300">Topic Streams</h2>
                    <div className="flex space-x-2">
                      {!loading && topicStreams.length > 0 && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 italic flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                          </svg>
                          Drag to reorder
                        </div>
                      )}
                      <button
                        onClick={() => setShowForm(true)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 px-3 py-1 rounded text-sm border border-slate-300 dark:border-slate-600"
                        data-testid="new-stream-button"
                      >
                        New Stream
                      </button>
                    </div>
                  </div>
                  
                  {loading ? (
                    <div className="p-4 text-center text-gray-500" data-testid="loading-indicator">
                      <p>Loading streams...</p>
                    </div>
                  ) : topicStreams.length === 0 ? (
                    <div className="p-4 text-center text-gray-500" data-testid="empty-streams-message">
                      <p>No topic streams yet. Create your first one!</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-200 dark:divide-slate-700" data-testid="stream-list">
                      {topicStreams.map(stream => (
                        <li 
                          key={stream.id} 
                          data-testid={`stream-item-${stream.id}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, stream.id)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => handleDragOver(e, stream.id)}
                          onDrop={(e) => handleDrop(e, stream.id)}
                          className={`${dragOverStreamId === stream.id ? 'border-2 border-blue-400 dark:border-blue-600' : ''} ${draggedStreamId === stream.id ? 'opacity-50' : 'opacity-100'}`}
                        >
                          <button
                            className={`w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center ${selectedStream?.id === stream.id ? 'bg-slate-200 dark:bg-slate-600 border-l-4 border-slate-500 dark:border-slate-400' : ''}`}
                            onClick={() => setSelectedStream(stream)}
                          >
                            <div className="mr-2 cursor-move text-slate-400 dark:text-slate-500">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-slate-700 dark:text-slate-300 h-[3.25rem] line-clamp-2 overflow-hidden" title={stream.query}>
                                {stream.query}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                {stream.update_frequency} • {stream.detail_level}
                              </div>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Main content area */}
              <div className={`${viewMode === 'list' ? 'col-span-12 md:col-span-9' : 'col-span-12'}`}>
                {showForm ? (
                  <div className="bg-white dark:bg-[#2a2a2e] rounded-lg shadow-sm p-6 border border-slate-200 dark:border-slate-700" data-testid="stream-form-container">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-medium text-slate-700 dark:text-slate-300">Create New Topic Stream</h2>
                      <button
                        onClick={() => setShowForm(false)}
                        className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      >
                        Cancel
                      </button>
                    </div>
                    <TopicStreamForm onSubmit={handleCreateStream} />
                  </div>
                ) : viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 auto-rows-auto">
                    {/* We're going to render the top streams first, with consistent heights */}
                    <div className="col-span-full pb-4 mb-4 flex flex-wrap gap-8">
                      {topicStreams.slice(0, 5).map(stream => (
                        <div key={stream.id} className="flex-1 min-w-[300px]" style={{ maxWidth: 'calc(25% - 24px)' }}>
                          <TopicStreamWidget
                            stream={stream}
                            onDelete={() => handleDeleteStream(stream.id)}
                            onUpdate={handleUpdateStream}
                            isGridView={true} 
                          />
                        </div>
                      ))}
                    </div>
                    
                    {/* Render remaining streams if there are more than 5 */}
                    {topicStreams.length > 5 && (
                      <>
                        <div className="col-span-full border-t border-gray-200 dark:border-gray-700 py-4 mb-4">
                          <h3 className="text-md font-medium text-gray-700 dark:text-gray-300">More Streams</h3>
                        </div>
                        {topicStreams.slice(5).map(stream => (
                          <TopicStreamWidget
                            key={stream.id}
                            stream={stream}
                            onDelete={() => handleDeleteStream(stream.id)}
                            onUpdate={handleUpdateStream}
                            isGridView={true} 
                          />
                        ))}
                      </>
                    )}
                    
                    {topicStreams.length === 0 && !loading && (
                      <div className="col-span-full bg-white dark:bg-[#2a2a2e] rounded-lg shadow-sm p-6 text-center border border-slate-200 dark:border-slate-700">
                        <p className="text-slate-500 dark:text-slate-400">No topic streams available to display in grid view.</p>
                      </div>
                    )}
                  </div>
                ) : viewMode === 'list' && selectedStream ? (
                  <TopicStreamWidget 
                    stream={selectedStream} 
                    onDelete={() => handleDeleteStream(selectedStream.id)} 
                    onUpdate={handleUpdateStream}
                    isGridView={false} 
                  />
                ) : viewMode === 'list' ? (
                  <div className="bg-white dark:bg-[#2a2a2e] rounded-lg shadow-sm p-6 text-center border border-slate-200 dark:border-slate-700" data-testid="no-selection-message">
                    <p className="text-slate-500 dark:text-slate-400">
                      Select a topic stream or create a new one to get started
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Loading overlay for delete operation */}
      {isDeleting && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50" data-testid="deleting-overlay">
          <div className="bg-white dark:bg-[#2a2a2e] rounded-lg p-4 shadow-xl">
            <p className="text-slate-700 dark:text-slate-200">Deleting topic stream...</p>
          </div>
        </div>
      )}

      {showDeepDive && selectedSummary && (
        <div className="fixed inset-0 z-50 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
              {/* Truncated Stream Title */}
              <div className="flex-1 overflow-hidden min-w-0 mr-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-blue-300 truncate">
                  Deep Dive: {selectedStream.query}
                </h3>
              </div>
              <button
                onClick={() => setShowDeepDive(false)}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Main content area with two columns */}
            <div className="flex flex-1 overflow-hidden flex-row">

              {/* Original Summary Section - Left Column */}
              <div className="w-1/2 p-4 border-r dark:border-gray-700 overflow-y-auto">
                <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">Original Summary</h4>
                {/* Render summary with potential truncation and Read More - Keep as is for now */}
                <div className={`prose prose-sm max-w-none dark:prose-invert ${!isSummaryExpanded ? '' : ''}`}> {/* Removed line-clamp, summary should be fully visible */}
                    <MarkdownRenderer content={selectedSummary.content} />
                </div>
                 {/* Removed Read More button - summary is fully visible */}
                 
                {/* Summary Sources - Moved below summary content - Keep as is for now */}
                {selectedSummary.sources && selectedSummary.sources.length > 0 && (
                    <div className="mt-4">
                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Sources:</div>
                        <div className="flex flex-wrap gap-1">
                            {selectedSummary.sources.map((source, index) => (
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

              {/* Deep Dive Chat Section - Right Column */}
              <div className="flex-1 overflow-hidden">
                <DeepDiveChat 
                  topicStreamId={selectedStream.id}
                  summaryId={selectedSummary.id}
                  topic={selectedStream.query}
                  onAppend={handleAppendSummary}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard; 
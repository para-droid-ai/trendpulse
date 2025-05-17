import React, { useState, useEffect, useContext, useCallback } from 'react';
import AuthContext from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { topicStreamAPI } from '../services/api';
import TopicStreamForm from '../components/TopicStreamForm';
import TopicStreamWidget from '../components/TopicStreamWidget'; // Correct relative path
import { format } from 'date-fns';
import MarkdownRenderer from '../components/MarkdownRenderer';
import DeepDiveChat from '../components/DeepDiveChat';
import { formatDistanceToNowStrict, parseISO } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

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
  const [lastViewed, setLastViewed] = useState({}); // State to hold last viewed timestamps { streamId: timestamp }
  const [sortBy, setSortBy] = useState('last_updated'); // 'last_updated'
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' or 'desc'
  
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
            detail_level: stream.detail_level,
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

  // Load ordered streams based on saved order (now used as secondary sort)
  const getOrderedStreams = (streams, primarySortBy, primarySortDirection) => {
    try {
      const savedOrder = localStorage.getItem('streamOrder');
      const orderMap = savedOrder ? JSON.parse(savedOrder) : {};

      // Create a copy of streams to sort
      return [...streams].sort((a, b) => {
        // Primary sort by last_updated
        const dateA = a.last_updated ? new Date(a.last_updated) : new Date(0);
        const dateB = b.last_updated ? new Date(b.last_updated) : new Date(0);

        let primarySortResult = 0;
        if (primarySortBy === 'last_updated') {
            if (primarySortDirection === 'desc') {
                primarySortResult = dateB.getTime() - dateA.getTime();
            } else {
                primarySortResult = dateA.getTime() - dateB.getTime();
            }
        }

        // If primary sort results are the same, use localStorage order as secondary sort
        if (primarySortResult === 0) {
            const orderA = orderMap[a.id] !== undefined ? orderMap[a.id] : Infinity;
            const orderB = orderMap[b.id] !== undefined ? orderMap[b.id] : Infinity;
            return orderA - orderB; // Always sort manual order ascending
        }

        return primarySortResult;
      });
    } catch (err) {
      console.error('Failed to load stream order for sorting:', err);
      // Fallback to sorting only by last_updated if localStorage fails
      return [...streams].sort((a, b) => {
         const dateA = a.last_updated ? new Date(a.last_updated) : new Date(0);
         const dateB = b.last_updated ? new Date(b.last_updated) : new Date(0);
         if (primarySortDirection === 'desc') {
            return dateB.getTime() - dateA.getTime();
         } else {
            return dateA.getTime() - dateB.getTime();
         }
      });
    }
  };

  // Save last viewed timestamps to localStorage
  const saveLastViewed = (viewedMap) => {
    try {
      localStorage.setItem('lastViewed', JSON.stringify(viewedMap));
    } catch (err) {
      console.error('Failed to save last viewed timestamps:', err);
    }
  };

  // Load last viewed timestamps from localStorage
  const loadLastViewed = () => {
    try {
      const saved = localStorage.getItem('lastViewed');
      return saved ? JSON.parse(saved) : {};
    } catch (err) {
      console.error('Failed to load last viewed timestamps:', err);
      return {};
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
      // Apply primary sort (last_updated) and secondary sort (localStorage order) to the streams
      const orderedStreams = getOrderedStreams(data, sortBy, sortDirection);
      // Filter out any potentially invalid stream objects before setting state
      const validStreams = orderedStreams.filter(stream => stream && stream.id !== undefined && stream.id !== null);

      // Get the IDs of the valid streams received from the backend
      const validStreamIds = new Set(validStreams.map(stream => stream.id));
      // Get the IDs from the current localStorage order
      const savedOrder = localStorage.getItem('streamOrder');
      if (savedOrder) {
        try {
          const orderMap = JSON.parse(savedOrder);
          const savedOrderIds = Object.keys(orderMap).map(id => parseInt(id, 10));
          // Check if any ID in localStorage order is NOT in the valid streams list
          const hasStaleIds = savedOrderIds.some(id => !validStreamIds.has(id));

          if (hasStaleIds) {
            console.log("Detected stale stream IDs in localStorage order. Clearing streamOrder.");
            localStorage.removeItem('streamOrder');
            // Re-fetch and re-order based on the now-cleared localStorage (will just use backend order)
            const reOrderedStreams = getOrderedStreams(data, sortBy, sortDirection);
            // Add an explicit filter to remove known problematic stream IDs (1, 2, 11)
            const finalStreams = reOrderedStreams.filter(stream => ![1, 2, 11].includes(stream.id));
            setTopicStreams(finalStreams);
             if (finalStreams.length > 0 && !selectedStream) {
              console.log("Attempting to select first stream after clearing localStorage:", finalStreams[0]);
              setSelectedStream(finalStreams[0]);
              console.log("First stream selected after clearing localStorage.");
            }
            return; // Exit the function after clearing and setting
          }
        } catch (e) {
          console.error("Failed to parse streamOrder from localStorage:", e);
          // If parsing fails, treat it as stale and clear
          localStorage.removeItem('streamOrder');
        }
      }

      // If no stale IDs or no saved order, just set the valid streams
      // Add an explicit filter to remove known problematic stream IDs (1, 2, 11)
      const finalStreams = validStreams.filter(stream => ![1, 2, 11].includes(stream.id));
      setTopicStreams(finalStreams);
      if (finalStreams.length > 0 && !selectedStream) {
        console.log("Attempting to select first stream:", finalStreams[0]);
        setSelectedStream(finalStreams[0]);
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
  }, [selectedStream, sortBy, sortDirection]); // Added sortBy and sortDirection to dependency array

  // Load last viewed timestamps on component mount
  useEffect(() => {
    setLastViewed(loadLastViewed());
  }, []); // Empty dependency array ensures this runs only once on mount

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
      // Add the new stream to the beginning of the list
      const updatedStreams = [createdStream, ...topicStreams];
      setTopicStreams(updatedStreams);
      setSelectedStream(createdStream);
      setShowForm(false);
      refreshSummaries();
      // Save the new order immediately including the newly created stream at the top
      saveStreamOrder(updatedStreams);
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

  const clearError = () => {
    setError('');
  };

  const viewModeUI = getViewModeUI();

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

  // Render a single summary item for the mobile feed
  const renderSummaryItem = (summary) => {
    return (
      <div key={summary.id} className="bg-card rounded-lg shadow-sm border border-border mb-4 p-3">
        {/* Summary Header */}
        <div className="border-b border-border sticky top-[69px] bg-card z-10 pb-3">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-semibold text-foreground line-clamp-2 max-w-[80%] Camino text-ellipsis overflow-hidden" title={summary.streamQuery}>{summary.streamQuery}</h3>
            {/* Combine Timestamp and Deep Dive button in a right-aligned container */}
            <div className="flex flex-col items-end flex-shrink-0">
              {/* Time Since Last Update tag */}
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-muted text-black dark:text-white font-medium">
                {summary.created_at ? formatInTimeZone(toZonedTime(parseISO(summary.created_at + 'Z'), Intl.DateTimeFormat().resolvedOptions().timeZone), Intl.DateTimeFormat().resolvedOptions().timeZone, 'MMM d, yyyy h:mm a') : ''}
              </span>
              {/* Deep Dive Chat button */}
              <button
                onClick={() => {
                  setShowDeepDive(true);
                  setSelectedSummary(summary);
                }}
                className="text-xs text-white px-2 py-1 rounded-full mt-1 bg-[#2ccebb] hover:opacity-90"
              >
                Deep Dive Chat
              </button>
            </div>
          </div>
          
          {/* Stream Actions and additional info badges - Now on the same line */}
          <div className="flex flex-wrap gap-2 items-center">
             {/* Model Badge */}
             {summary.model && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-gray-100 bg-[#4f46e5]">
                {summary.model}
              </span>
            )}
             {/* Detail Level Badge - use stream's detail level */}
             {summary.detail_level && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-gray-100 bg-[#6366f1]">
                {summary.detail_level}
              </span>
            )}

            {/* Update and View All buttons - Moved here */}
            {/* Update button */}
            <button
              onClick={() => {
                const stream = topicStreams.find(s => s.id === summary.streamId);
                if (stream) handleUpdateNow(stream.id);
              }}
              className="text-xs py-1 px-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90"
            >
              Update
            </button>

            {/* View All button */}
            <button
              onClick={() => {
                const streamIndex = topicStreams.findIndex(s => s.id === summary.streamId);
                if (streamIndex >= 0) {
                  setViewMode('list');
                  setSelectedStream(topicStreams[streamIndex]);
                }
              }}
              className="text-xs py-1 px-2 bg-muted text-muted-foreground rounded-full hover:bg-muted/80"
            >
              View All
            </button>
          </div>
        </div>
        
        {/* Summary Content */}
        <div className="p-4 pt-2">
          {/* Thoughts (experimental) section */}
          {summary.thoughts && (
            <div className="mb-4 p-3 rounded-md bg-muted dark:bg-[#4b4a49]">
              <div className="text-sm font-medium text-muted-foreground mb-2">
                Thoughts (experimental)
              </div>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <MarkdownRenderer content={summary.thoughts} />
              </div>
            </div>
          )}
          <div className={`prose prose-sm max-w-none dark:prose-invert ${!isSummaryExpanded ? '' : ''}`}>
            <MarkdownRenderer content={summary.content || ''} />
          </div>
        </div>
        
        {/* Summary Sources */}
        {summary.sources && summary.sources.length > 0 && (
          <div className="px-4 pb-4">
            <div className="text-xs font-medium text-muted-foreground mb-1">Sources:</div>
            <div className="flex flex-wrap gap-1">
              {summary.sources.map((source, index) => (
                <a
                  key={index}
                  href={typeof source === 'string' ? source : source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground bg-muted hover:bg-muted/80 px-2 py-1 rounded-full truncate max-w-[200px]"
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
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="shadow-sm border-b bg-background border-border sticky top-0 z-20 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 
            className="text-3xl font-bold text-foreground cursor-pointer hover:text-primary transition-colors"
            onClick={() => window.location.href = '/'}
          >
            <img src="/trendpulse_logo_1.svg" alt="TrendPulse Logo" className="inline-block h-9 w-9 mr-2 align-text-bottom" />
            TrendPulse Dashboard
          </h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleViewMode}
              className="mr-4 text-sm px-3 py-1 rounded bg-primary text-primary-foreground border border-primary/50 hover:bg-primary/90 flex items-center"
            >
              <span className="mr-1">{viewModeUI.icon}</span> {viewModeUI.text}
            </button>
            <button
              onClick={toggleTheme}
              className="mr-4 text-sm px-3 py-1 rounded bg-muted text-muted-foreground border border-border hover:bg-muted/80"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
            </button>
            <span className="text-xs text-muted-foreground">{user?.email}</span>
            <button 
              onClick={logout}
              className="text-xs text-muted-foreground hover:text-primary"
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
            <div className="mb-4 bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded" data-testid="error-message">
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
                  <div className="flex justify-between items-center pt-2 pb-4 bg-background z-40">
                    <h2 className="text-xl font-medium text-foreground">Latest Updates</h2>
                    <button
                      onClick={() => setShowForm(true)}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded"
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
                    <h2 className="text-xl font-medium text-foreground">Latest Updates</h2>
                    <button
                      onClick={() => setShowForm(true)}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded"
                    >
                      New Stream
                    </button>
                  </div>

                  {/* Mobile View Content */}
                  {loading || loadingSummaries ? (
                    <div className="p-4 text-center text-muted-foreground">
                      <div className="animate-pulse flex justify-center items-center space-x-2">
                        <div className="w-3 h-3 bg-primary/50 rounded-full"></div>
                        <div className="w-3 h-3 bg-primary/50 rounded-full"></div>
                        <div className="w-3 h-3 bg-primary/50 rounded-full"></div>
                      </div>
                      <p className="mt-2">Loading your feed...</p>
                    </div>
                  ) : topicStreams.length === 0 ? (
                    <div className="p-8 text-center bg-card rounded-lg shadow-sm border border-border">
                      <p className="text-muted-foreground mb-4">No topic streams yet. Create your first one!</p>
                      <button
                        onClick={() => setShowForm(true)}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded"
                      >
                        New Stream
                      </button>
                    </div>
                  ) : showForm ? (
                    <div className="bg-card rounded-lg shadow-sm p-6 border border-border">
                      <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-medium text-foreground">Create New Topic Stream</h2>
                        <button
                          onClick={() => setShowForm(false)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          Cancel
                        </button>
                      </div>
                      <TopicStreamForm onSubmit={handleCreateStream} />
                    </div>
                  ) : allSummaries.length === 0 ? (
                    <div className="p-8 text-center bg-card rounded-lg shadow-sm border border-border">
                      <p className="text-muted-foreground mb-4">No updates in your feed yet.</p>
                      <p className="text-muted-foreground mb-4">Try updating one of your streams to see content here.</p>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-12 gap-6">
              {/* Sidebar: Conditionally render in DOM based on viewMode to simplify layout management */}
              {viewMode === 'list' && (
                <div className="col-span-12 md:col-span-3 rounded-lg shadow-sm bg-card border border-border sticky top-[69px] max-h-[calc(100vh-69px)] overflow-x-hidden">
                  <div className="p-4 border-b border-border">
                    {/* Header Row */}
                    <div className="flex justify-between items-center mb-2">
                      <h2 className="text-lg font-medium text-foreground">Topic Streams</h2>
                      <button
                        onClick={() => setShowForm(true)}
                        className="bg-muted hover:bg-muted/80 text-foreground px-3 py-1 rounded text-sm border border-border"
                        data-testid="new-stream-button"
                      >
                        New Stream
                      </button>
                    </div>
                    
                    {/* Drag to reorder text below header row */}
                    {!loading && topicStreams.length > 0 && (
                      <div className="text-xs text-muted-foreground italic flex items-center mt-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                        Drag to reorder
                      </div>
                    )}

                    {/* Sort Toggle Button */}
                    {!loading && topicStreams.length > 0 && (
                      <button
                        onClick={() => setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc')}
                        className="mt-2 text-xs px-2 py-1 bg-muted text-muted-foreground rounded-full hover:bg-muted/80"
                      >
                        Sort by: Last Updated ({sortDirection === 'desc' ? 'Newest First' : 'Oldest First'})
                      </button>
                    )}
                  </div>
                  
                  {/* Scrollable content area for streams */}
                  <div className="overflow-y-auto overflow-x-hidden flex-1">
                    {loading ? (
                      <div className="p-4 text-center text-muted-foreground" data-testid="loading-indicator">
                        <p>Loading streams...</p>
                      </div>
                    ) : topicStreams.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground" data-testid="empty-streams-message">
                        <p>No topic streams yet. Create your first one!</p>
                      </div>
                    ) : (
                      <ul className="divide-y divide-border" data-testid="stream-list">
                        {topicStreams.map(stream => (
                          <li 
                            key={stream.id} 
                            data-testid={`stream-item-${stream.id}`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, stream.id)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => handleDragOver(e, stream.id)}
                            onDrop={(e) => handleDrop(e, stream.id)}
                            className={`${dragOverStreamId === stream.id ? 'border-2 border-primary' : ''} ${draggedStreamId === stream.id ? 'opacity-50' : 'opacity-100'}`}
                          >
                            <button
                              className={`w-full text-left p-4 hover:bg-muted/50 flex items-center ${selectedStream?.id === stream.id ? 'bg-muted dark:bg-primary/20' : ''}`}
                              onClick={() => {
                                setSelectedStream(stream);
                                const updatedLastViewed = { ...lastViewed, [stream.id]: new Date().toISOString() };
                                setLastViewed(updatedLastViewed);
                                saveLastViewed(updatedLastViewed);
                              }}
                            >
                              <div className="mr-2 cursor-move text-muted-foreground">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                </svg>
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-foreground h-[3.25rem] line-clamp-2 overflow-hidden" title={stream.query}>
                                  {stream.query}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {stream.update_frequency} • {stream.detail_level}
                                </div>
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {/* Main content area */}
              <div className={`${viewMode === 'list' ? 'col-span-12 md:col-span-9' : 'col-span-12'}`}>
                {showForm ? (
                  <div className="rounded-lg shadow-sm p-6 bg-card border border-border">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-medium text-foreground">Create New Topic Stream</h2>
                      <button
                        onClick={() => setShowForm(false)}
                        className="text-muted-foreground hover:text-foreground"
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
                        <div className="col-span-full border-t border-border py-4 mb-4">
                          <h3 className="text-md font-medium text-foreground">More Streams</h3>
                        </div>
                        {topicStreams.slice(5).map(stream => (
                          <div key={stream.id}>
                            <TopicStreamWidget
                              key={stream.id}
                              stream={stream}
                              onDelete={() => handleDeleteStream(stream.id)}
                              onUpdate={handleUpdateStream}
                              isGridView={true} 
                            />
                          </div>
                        ))}
                      </>
                    )}
                    
                    {topicStreams.length === 0 && !loading && (
                      <div className="col-span-full rounded-lg shadow-sm p-6 text-center bg-card border border-border">
                        <p className="text-muted-foreground">
                          No topic streams available to display in grid view.
                        </p>
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
                  <div className="rounded-lg shadow-sm p-6 text-center bg-card border border-border">
                    <p className="text-muted-foreground">
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
        <div className="fixed inset-0 bg-background/75 flex items-center justify-center z-50" data-testid="deleting-overlay">
          <div className="bg-card rounded-lg p-4 shadow-xl">
            <p className="text-foreground">Deleting topic stream...</p>
          </div>
        </div>
      )}

      {showDeepDive && selectedSummary && (
        <div className="fixed inset-0 z-50 bg-background/75 flex items-center justify-center">
          <div className="bg-card rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col" style={{ maxWidth: '1400px' }}>
            <div className="p-4 border-b border-border flex justify-between items-center">
              {/* Truncated Stream Title */}
              <div className="flex-1 overflow-hidden min-w-0 mr-4">
                <h3 className="text-lg font-medium text-foreground truncate">
                  Deep Dive: {selectedStream.query}
                </h3>
              </div>
              <button
                onClick={() => setShowDeepDive(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Main content area with two columns */}
            <div className="flex overflow-hidden flex-row w-full">

              {/* Original Summary Section - Left Column */}
              <div className="p-4 border-r border-border overflow-y-auto flex-1">
                <h4 className="text-md font-medium text-foreground mb-2">Original Summary</h4>
                {/* Render summary with potential truncation and Read More - Keep as is for now */}
                <div className={`prose prose-sm max-w-none dark:prose-invert ${!isSummaryExpanded ? 'line-clamp-10' : ''}`}>
                    <MarkdownRenderer content={selectedSummary.content} />
                </div>
              </div>

              {/* Deep Dive Chat Section - Right Column */}
              <div className="p-4 border-l border-border overflow-y-auto flex-1">
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
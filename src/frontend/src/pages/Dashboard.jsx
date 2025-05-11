import React, { useState, useEffect, useContext, useCallback } from 'react';
import AuthContext from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { topicStreamAPI } from '../services/api';
import TopicStreamForm from '../components/TopicStreamForm';
import TopicStreamWidget from '../components/TopicStreamWidget';

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const { theme, toggleTheme } = useTheme();
  const [topicStreams, setTopicStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedStream, setSelectedStream] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGridView, setIsGridView] = useState(false);

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
      setTopicStreams(data);
      if (data.length > 0 && !selectedStream) {
        console.log("Attempting to select first stream:", data[0]);
        setSelectedStream(data[0]);
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

  useEffect(() => {
    fetchTopicStreams();
  }, [fetchTopicStreams]);

  const handleCreateStream = async (newStream) => {
    try {
      const createdStream = await topicStreamAPI.create(newStream);
      setTopicStreams([...topicStreams, createdStream]);
      setSelectedStream(createdStream);
      setShowForm(false);
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
      return updatedApiStream; 
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to update topic stream.';
      console.error('Update stream error in Dashboard:', err);
      setError(errorMsg);
      throw err; 
    }
  };

  const clearError = () => {
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#f7f7f8] dark:bg-[#1c1c1e]">
      {/* Header */}
      <header className="bg-[#f7f7f8] dark:bg-[#2a2a2e] shadow-sm border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 
            className="text-3xl font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
            onClick={() => window.location.href = '/'}
          >
            TrendPulse Dashboard
          </h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsGridView(!isGridView)}
              className="mr-4 text-sm px-3 py-1 rounded bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
            >
              {isGridView ? 'List View' : 'Grid View'}
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
        <div className={`${isGridView ? 'w-[95vw] mx-auto' : 'max-w-7xl mx-auto'} px-4 sm:px-6 lg:px-8`}>
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

          <div className="grid grid-cols-12 gap-6">
            {/* Sidebar: Conditionally render in DOM based on isGridView to simplify layout management */}
            {!isGridView && (
              <div className="col-span-12 md:col-span-3 bg-[#f0f0f1] dark:bg-[#2a2a2e] rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                  <h2 className="text-lg font-medium text-slate-700 dark:text-slate-300">Topic Streams</h2>
                  <button
                    onClick={() => setShowForm(true)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 px-3 py-1 rounded text-sm border border-slate-300 dark:border-slate-600"
                    data-testid="new-stream-button"
                  >
                    New Stream
                  </button>
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
                      <li key={stream.id} data-testid={`stream-item-${stream.id}`}>
                        <button
                          className={`w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-700 ${selectedStream?.id === stream.id ? 'bg-slate-200 dark:bg-slate-600 border-l-4 border-slate-500 dark:border-slate-400' : ''}`}
                          onClick={() => setSelectedStream(stream)}
                        >
                          <div className="font-medium text-slate-700 dark:text-slate-300 h-[3.25rem] line-clamp-2 overflow-hidden" title={stream.query}>
                            {stream.query}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {stream.update_frequency} • {stream.detail_level}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Main content area */}
            <div className={`col-span-12 ${!isGridView ? 'md:col-span-9' : 'md:col-span-12'}`}>
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
              ) : isGridView ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {topicStreams.map(stream => (
                    <TopicStreamWidget
                      key={stream.id}
                      stream={stream}
                      onDelete={() => handleDeleteStream(stream.id)}
                      onUpdate={handleUpdateStream}
                      isGridView={true} 
                    />
                  ))}
                  {topicStreams.length === 0 && !loading && (
                    <div className="col-span-full bg-white dark:bg-[#2a2a2e] rounded-lg shadow-sm p-6 text-center border border-slate-200 dark:border-slate-700">
                      <p className="text-slate-500 dark:text-slate-400">No topic streams available to display in grid view.</p>
                    </div>
                  )}
                </div>
              ) : selectedStream ? (
                <TopicStreamWidget 
                  stream={selectedStream} 
                  onDelete={() => handleDeleteStream(selectedStream.id)} 
                  onUpdate={handleUpdateStream}
                  isGridView={false} 
                />
              ) : (
                <div className="bg-white dark:bg-[#2a2a2e] rounded-lg shadow-sm p-6 text-center border border-slate-200 dark:border-slate-700" data-testid="no-selection-message">
                  <p className="text-slate-500 dark:text-slate-400">
                    Select a topic stream or create a new one to get started
                  </p>
                </div>
              )}
            </div>
          </div>
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
    </div>
  );
};

export default Dashboard; 
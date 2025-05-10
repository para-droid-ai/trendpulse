import React, { useState, useEffect, useContext, useCallback } from 'react';
import AuthContext from '../context/AuthContext';
import { topicStreamAPI } from '../services/api';
import TopicStreamForm from '../components/TopicStreamForm';
import TopicStreamWidget from '../components/TopicStreamWidget';

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const [topicStreams, setTopicStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedStream, setSelectedStream] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 
            className="text-2xl font-bold text-gray-900 dark:text-blue-300 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors" 
            onClick={() => window.location.href = '/'}
          >
            TrendPulse Dashboard
          </h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">{user?.email}</span>
            <button 
              onClick={logout}
              className="text-sm text-indigo-600 hover:text-indigo-900"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
          {/* Sidebar */}
          <div className="col-span-12 md:col-span-3 bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900 dark:text-blue-300">Topic Streams</h2>
              <button
                onClick={() => setShowForm(true)}
                className="bg-indigo-600 hover:bg-indigo-700 dark:hover:bg-indigo-500 text-white px-3 py-1 rounded text-sm"
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
              <ul className="divide-y divide-gray-200 dark:divide-gray-700" data-testid="stream-list">
                {topicStreams.map(stream => (
                  <li key={stream.id} data-testid={`stream-item-${stream.id}`}>
                    <button
                      className={`w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 ${selectedStream?.id === stream.id ? 'bg-indigo-50 dark:bg-indigo-900 border-l-4 border-indigo-600' : ''}`}
                      onClick={() => setSelectedStream(stream)}
                    >
                      <div className="font-medium truncate">{stream.query}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {stream.update_frequency} • {stream.detail_level}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Main content area */}
          <div className="col-span-12 md:col-span-9">
            {showForm ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6" data-testid="stream-form-container">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-medium">Create New Topic Stream</h2>
                  <button
                    onClick={() => setShowForm(false)}
                    className="text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100"
                  >
                    Cancel
                  </button>
                </div>
                <TopicStreamForm onSubmit={handleCreateStream} />
              </div>
            ) : selectedStream ? (
              <TopicStreamWidget 
                stream={selectedStream} 
                onDelete={() => handleDeleteStream(selectedStream.id)} 
                onUpdate={handleUpdateStream}
              />
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center" data-testid="no-selection-message">
                <p className="text-gray-500 dark:text-gray-300">
                  Select a topic stream or create a new one to get started
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Loading overlay for delete operation */}
      {isDeleting && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50" data-testid="deleting-overlay">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-xl">
            <p className="text-gray-700">Deleting topic stream...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard; 
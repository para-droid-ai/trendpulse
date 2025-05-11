import React, { useState, useEffect, useContext, useRef } from 'react';
import { Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { topicStreamAPI } from '../services/api';
import TopicStreamForm from '../components/TopicStreamForm';
import TopicStreamWidget from '../components/TopicStreamWidget';
import { format } from 'date-fns';

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const [topicStreams, setTopicStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedStream, setSelectedStream] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const streamItemRefs = useRef({});

  // Fetch topic streams on component mount
  useEffect(() => {
    fetchTopicStreams();
  }, []);

  const fetchTopicStreams = async () => {
    setLoading(true);
    try {
      const data = await topicStreamAPI.getAll();
      setTopicStreams(data);
      if (data.length > 0 && !selectedStream) {
        setSelectedStream(data[0]);
      }
    } catch (err) {
      setError('Failed to load topic streams. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStream = async (newStream) => {
    try {
      const createdStream = await topicStreamAPI.create(newStream);
      setTopicStreams([...topicStreams, createdStream]);
      setSelectedStream(createdStream);
      setShowForm(false);
    } catch (err) {
      setError('Failed to create topic stream. Please try again.');
      console.error(err);
    }
  };

  const handleUpdateStream = async (id, updatedData) => {
    try {
      const updatedStream = await topicStreamAPI.update(id, updatedData);
      setTopicStreams(prevStreams => 
        prevStreams.map(stream => 
          stream.id === id ? updatedStream : stream
        )
      );
      if (selectedStream?.id === id) {
        setSelectedStream(updatedStream);
      }
      return updatedStream;
    } catch (err) {
      console.error('Update stream error:', err);
      throw err;
    }
  };

  const openDeleteConfirm = (id) => {
    setDeletingId(id);
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setDeletingId(null);
  };

  const handleDeleteStream = async () => {
    const id = deletingId;
    if (!id) return;
    
    setShowDeleteConfirm(false);
    setDeletingId(null);
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
      console.error('Delete stream error:', err);
      setError(err.message || 'Failed to delete topic stream. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow dark:shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">TrendPulse Dashboard</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => {
                setSelectedStream(null); // Clear selected stream before showing form
                setShowForm(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              New Stream
            </button>
            <span className="text-gray-600 dark:text-gray-300">{user?.email}</span>
            <button 
              onClick={logout}
              className="text-sm text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Delete confirmation modal for ENTIRE STREAM - remains unchanged */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Delete Topic Stream?
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete this topic stream? This action cannot be undone, and all associated summaries will be permanently deleted.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={closeDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteStream}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center"
              >
                {isDeleting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Error message display - remains unchanged */}
        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative dark:bg-red-900 dark:text-red-200 dark:border-red-700">
            <span className="block sm:inline">{error}</span>
            <button 
              className="absolute top-0 bottom-0 right-0 px-4 py-3"
              onClick={() => setError('')}
            >
              <svg className="h-6 w-6 text-red-500 dark:text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {showForm ? (
          // Display New Stream Form
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-medium text-gray-900 dark:text-white">Create New Topic Stream</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Cancel
              </button>
            </div>
            <TopicStreamForm onSubmit={handleCreateStream} />
          </div>
        ) : selectedStream ? (
          // Display Selected Stream Details
          <>
            <button 
                onClick={() => setSelectedStream(null)} 
                className="mb-4 text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
                &larr; Back to Newspaper
            </button>
            <TopicStreamWidget 
              stream={selectedStream} 
              onDelete={() => openDeleteConfirm(selectedStream.id)}
              onUpdate={handleUpdateStream}
            />
          </>
        ) : (
          // Display Newspaper Grid of Topic Streams
          loading ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">Loading streams...</div>
          ) : topicStreams.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              No topic streams yet. Click "New Stream" to create your first one!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topicStreams.map(stream => (
                <div 
                  key={stream.id} 
                  className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-md overflow-hidden cursor-pointer hover:shadow-lg dark:hover:shadow-xl transition-shadow duration-200 flex flex-col h-full"
                  onClick={() => setSelectedStream(stream)}
                >
                  <div className="p-5 flex-grow">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 truncate" title={stream.query}>{stream.query}</h3>
                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                      <p><span className="font-medium">Frequency:</span> {stream.update_frequency}</p>
                      <p><span className="font-medium">Detail:</span> {stream.detail_level}</p>
                      <p><span className="font-medium">Model:</span> {stream.model_type}</p>
                      <p><span className="font-medium">Recency:</span> {stream.recency_filter}</p>
                    </div>
                  </div>
                  <div className="p-5 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Last updated: {stream.last_updated ? format(new Date(stream.last_updated), 'MMM d, yyyy h:mm a') : 'Never'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </main>
    </div>
  );
};

export default Dashboard; 
import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 2700000, // Increased to 45 minutes (2,700,000 ms)
});

// Add request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for handling common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    
    // Handle session timeout/token expiration
    if (error.response && error.response.status === 401) {
      console.log('Authentication error detected, logging out user');
      
      // Clear auth tokens and redirect to login if unauthorized
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Only redirect if we're not already on the login page
      if (!window.location.pathname.includes('/login')) {
        console.log('Redirecting to login page');
        window.location.href = '/login';
      }
    }
    
    // Add more logging for other error types
    if (error.response) {
      // The request was made and the server responded with a non-2xx status
      console.error('Server responded with error:', error.response.status, error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from server', error.request);
    } else {
      // Something else caused the error
      console.error('Error setting up request:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// Retry logic for API calls
const retryRequest = async (apiCall, maxRetries = 3) => {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      return await apiCall();
    } catch (error) {
      // Only retry on network errors or 5xx server errors
      if (error.response && error.response.status < 500 && error.code !== 'ECONNABORTED') {
        throw error; // Don't retry client errors (4xx)
      }
      
      retries++;
      if (retries >= maxRetries) {
        throw error; // Max retries reached
      }
      
      // Exponential backoff
      const delay = Math.pow(2, retries) * 300;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Authentication API calls
export const authAPI = {
  login: async (email, password) => {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);
    
    try {
      // Send request with FormData. Axios should set Content-Type automatically.
      // We pass specific config to override the default 'application/json' for this call.
      const response = await api.post('/token', formData, {
        headers: {
          // Let Axios handle the Content-Type for FormData
          'Content-Type': undefined 
        }
      });
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  
  register: async (email, password) => {
    try {
      const response = await api.post('/users/', { email, password });
      return response.data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },
};

// Topic Stream API calls
export const topicStreamAPI = {
  getAll: async () => {
    return retryRequest(async () => {
      const response = await api.get('/topic-streams/');
      return response.data;
    });
  },
  
  create: async (topicStream) => {
    try {
      const response = await api.post('/topic-streams/', topicStream);
      return response.data;
    } catch (error) {
      console.error('Create stream error:', error);
      throw error;
    }
  },
  
  update: async (id, topicStream) => {
    try {
      const response = await api.put(`/topic-streams/${id}`, topicStream);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to update topic stream';
      console.error('Update stream error:', error, { id, topicStream });
      throw new Error(errorMessage);
    }
  },
  
  delete: async (id) => {
    try {
      const response = await api.delete(`/topic-streams/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Delete stream error for ID ${id}:`, error);
      throw error;
    }
  },
  
  getSummaries: async (id) => {
    return retryRequest(async () => {
      const response = await api.get(`/topic-streams/${id}/summaries/`);
      return response.data;
    });
  },
  
  updateNow: async (id) => {
    try {
      console.log(`Calling update-now API for stream ${id}`);
      const response = await api.post(`/topic-streams/${id}/update-now`);
      console.log(`Update-now API successful for stream ${id}`);
      return response.data;
    } catch (error) {
      console.error(`Update now error for ID ${id}:`, error);
      if (error.response) {
        // The request was made and the server responded with a status code outside of 2xx
        console.error(`Server error response:`, error.response.data);
        console.error(`Status code: ${error.response.status}`);
      } else if (error.request) {
        // The request was made but no response was received
        console.error(`No response received:`, error.request);
      }
      throw error;
    }
  },
  
  appendSummary: async (id, content) => {
    try {
      const response = await api.post(`/topic-streams/${id}/summaries/`, { content });
      return response.data;
    } catch (error) {
      console.error(`Append summary error for stream ${id}:`, error);
      throw error;
    }
  },
  
  deleteSummary: async (streamId, summaryId) => {
    try {
      console.log(`Deleting summary ${summaryId} from stream ${streamId} - About to make API call`);
      // Use explicit URL construction to ensure correct format
      const url = `/topic-streams/${streamId}/summaries/${summaryId}`;
      console.log(`DELETE request URL: ${url}`);
      
      const response = await api.delete(url);
      console.log(`Delete summary response:`, response);
      console.log(`Delete summary successful for ${summaryId}`);
      return response.data;
    } catch (error) {
      console.error(`Delete summary error for stream ${streamId}, summary ${summaryId}:`, error);
      if (error.response) {
        console.error(`Server error response code:`, error.response.status);
        console.error(`Server error response data:`, error.response.data);
        console.error(`Server error response headers:`, error.response.headers);
      } else if (error.request) {
        console.error(`No response received:`, error.request);
      } else {
        console.error(`Error setting up request:`, error.message);
      }
      throw error;
    }
  }
};

// Deep Dive API calls
export const deepDiveAPI = {
  askQuestion: async (topicStreamId, summaryId, question, model) => {
    try {
      console.log(`Sending deep dive question for topic ${topicStreamId}, summary ${summaryId}: "${question}", Model: ${model}`);
      const response = await api.post('/deep-dive/', {
        topic_stream_id: topicStreamId,
        summary_id: summaryId,
        question: question,
        model: model
      });
      console.log('Deep dive response received');
      return {
        answer: response.data.answer,
        sources: response.data.sources,
        model: response.data.model // Return the model information
      };
    } catch (error) {
      console.error('Deep dive API error:', error);
      
      // Get a more detailed error message if available
      const errorMessage = error.response?.data?.detail || error.message || 'An error occurred while processing your question';
      throw new Error(`Deep dive failed: ${errorMessage}`);
    }
  }
};

export default api; 
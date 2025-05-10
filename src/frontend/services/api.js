import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
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

// Authentication API calls
export const authAPI = {
  login: async (username, password) => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    
    const response = await api.post('/token', formData);
    return response.data;
  },
  register: async (email, password) => {
    return api.post('/users/', { email, password });
  },
};

// Topic Stream API calls
export const topicStreamAPI = {
  getAll: async () => {
    const response = await api.get('/topic-streams/');
    return response.data;
  },
  
  create: async (topicStream) => {
    const response = await api.post('/topic-streams/', topicStream);
    return response.data;
  },
  
  update: async (id, topicStream) => {
    try {
      const response = await api.put(`/topic-streams/${id}`, topicStream);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to update topic stream';
      throw new Error(errorMessage);
    }
  },
  
  delete: async (id) => {
    try {
      const response = await api.delete(`/topic-streams/${id}`);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete topic stream';
      throw new Error(errorMessage);
    }
  },
  
  getSummaries: async (id) => {
    const response = await api.get(`/topic-streams/${id}/summaries/`);
    return response.data;
  },
  
  updateNow: async (id) => {
    const response = await api.post(`/topic-streams/${id}/update-now`);
    return response.data;
  },
  
  appendSummary: async (id, content) => {
    const response = await api.post(`/topic-streams/${id}/append/`, { content });
    return response.data;
  },
  
  deleteSummary: async (streamId, summaryId) => {
    try {
      const response = await api.delete(`/topic-streams/${streamId}/summaries/${summaryId}`);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete summary';
      throw new Error(errorMessage);
    }
  },
};

// Deep Dive API calls
export const deepDiveAPI = {
  askQuestion: async (topicStreamId, summaryId, question) => {
    const response = await api.post('/deep-dive/', {
      topic_stream_id: topicStreamId,
      summary_id: summaryId,
      question: question
    });
    return response.data;
  }
};

export default api; 
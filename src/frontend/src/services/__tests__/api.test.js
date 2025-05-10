import axios from 'axios';
import api, { topicStreamAPI, authAPI } from '../api';

jest.mock('axios');

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });
  
  describe('Topic Stream API', () => {
    const mockTopicStream = {
      id: 1,
      query: 'Test Topic',
      update_frequency: 'daily',
      detail_level: 'detailed',
      model_type: 'sonar-reasoning',
      recency_filter: '1d'
    };
    
    test('gets all topic streams successfully', async () => {
      const mockResponse = { data: [mockTopicStream] };
      axios.get.mockResolvedValueOnce(mockResponse);
      
      const result = await topicStreamAPI.getAll();
      
      expect(axios.get).toHaveBeenCalledWith('/topic-streams/');
      expect(result).toEqual([mockTopicStream]);
    });
    
    test('retries on network error', async () => {
      const mockResponse = { data: [mockTopicStream] };
      axios.get
        .mockRejectedValueOnce({ code: 'ECONNABORTED' })
        .mockRejectedValueOnce({ code: 'ECONNABORTED' })
        .mockResolvedValueOnce(mockResponse);
      
      const result = await topicStreamAPI.getAll();
      
      expect(axios.get).toHaveBeenCalledTimes(3);
      expect(result).toEqual([mockTopicStream]);
    });
    
    test('fails after max retries', async () => {
      const error = { code: 'ECONNABORTED' };
      axios.get
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error);
      
      await expect(topicStreamAPI.getAll()).rejects.toEqual(error);
      expect(axios.get).toHaveBeenCalledTimes(3);
    });
    
    test('creates topic stream successfully', async () => {
      const mockResponse = { data: mockTopicStream };
      axios.post.mockResolvedValueOnce(mockResponse);
      
      const result = await topicStreamAPI.create(mockTopicStream);
      
      expect(axios.post).toHaveBeenCalledWith('/topic-streams/', mockTopicStream);
      expect(result).toEqual(mockTopicStream);
    });
    
    test('deletes topic stream successfully', async () => {
      const mockResponse = { data: { message: 'Topic stream deleted' } };
      axios.delete.mockResolvedValueOnce(mockResponse);
      
      const result = await topicStreamAPI.delete(1);
      
      expect(axios.delete).toHaveBeenCalledWith('/topic-streams/1');
      expect(result).toEqual({ message: 'Topic stream deleted' });
    });
    
    test('gets summaries successfully', async () => {
      const mockSummaries = [{ id: 1, content: 'Summary 1' }];
      const mockResponse = { data: mockSummaries };
      axios.get.mockResolvedValueOnce(mockResponse);
      
      const result = await topicStreamAPI.getSummaries(1);
      
      expect(axios.get).toHaveBeenCalledWith('/topic-streams/1/summaries/');
      expect(result).toEqual(mockSummaries);
    });
  });
  
  describe('Auth API', () => {
    test('login successfully', async () => {
      const mockToken = { access_token: 'test-token' };
      const mockResponse = { data: mockToken };
      axios.post.mockResolvedValueOnce(mockResponse);
      
      const result = await authAPI.login('test@example.com', 'password');
      
      expect(axios.post).toHaveBeenCalledWith('/token', expect.any(FormData));
      expect(result).toEqual(mockToken);
    });
    
    test('register successfully', async () => {
      const mockUser = { id: 1, email: 'test@example.com' };
      const mockResponse = { data: mockUser };
      axios.post.mockResolvedValueOnce(mockResponse);
      
      const result = await authAPI.register('test@example.com', 'password');
      
      expect(axios.post).toHaveBeenCalledWith('/users/', {
        email: 'test@example.com',
        password: 'password'
      });
      expect(result).toEqual(mockUser);
    });
  });
  
  describe('API Interceptors', () => {
    test('adds auth token to requests', async () => {
      localStorage.setItem('token', 'test-token');
      const mockResponse = { data: {} };
      axios.get.mockResolvedValueOnce(mockResponse);
      
      await api.get('/test');
      
      expect(axios.get).toHaveBeenCalledWith('/test', {
        headers: {
          Authorization: 'Bearer test-token'
        }
      });
    });
    
    test('handles 401 unauthorized response', async () => {
      const mockError = {
        response: {
          status: 401
        }
      };
      axios.get.mockRejectedValueOnce(mockError);
      
      await expect(api.get('/test')).rejects.toEqual(mockError);
      expect(localStorage.getItem('token')).toBeNull();
    });
    
    test('handles request timeout', async () => {
      const mockError = {
        code: 'ECONNABORTED'
      };
      axios.get.mockRejectedValueOnce(mockError);
      
      await expect(api.get('/test')).rejects.toEqual(mockError);
    });
  });
}); 
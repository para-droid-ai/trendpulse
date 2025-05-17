import React, { useState, useEffect, useRef } from 'react';
import { deepDiveAPI, topicStreamAPI } from '../services/api';
import MarkdownRenderer from './MarkdownRenderer';

const DeepDiveChat = ({ topicStreamId, summaryId, topic, onAppend }) => {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [appendingId, setAppendingId] = useState(null);
  const messagesEndRef = useRef(null);

  // Load saved messages from localStorage when component mounts
  useEffect(() => {
    const chatKey = `deepdive-chat-${topicStreamId}`;
    const savedMessages = localStorage.getItem(chatKey);
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (err) {
        console.error('Error parsing saved messages:', err);
        localStorage.removeItem(chatKey);
      }
    }
  }, [topicStreamId]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    const chatKey = `deepdive-chat-${topicStreamId}`;
    if (messages.length > 0) {
      localStorage.setItem(chatKey, JSON.stringify(messages));
    } else {
      localStorage.removeItem(chatKey);
    }
  }, [messages, topicStreamId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!question.trim()) {
      return;
    }
    
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: question
    };
    
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    setError('');
    
    try {
      const response = await deepDiveAPI.askQuestion(
        topicStreamId,
        summaryId,
        question
      );
      
      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: response.answer,
        sources: response.sources || [],
        model: response.model
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
    } catch (err) {
      console.error('Failed to get answer:', err);
      setError('Failed to get an answer. Please try again.');
    } finally {
      setLoading(false);
      setQuestion('');
    }
  };

  const handleUseAsUpdate = async (message) => {
    setAppendingId(message.id);
    try {
      const newSummary = await topicStreamAPI.appendSummary(topicStreamId, message.content);
      onAppend(newSummary);
    } catch (err) {
      console.error('Failed to append follow-up:', err);
      setError('Failed to add follow-up to stream.');
    } finally {
      setAppendingId(null);
    }
  };

  const clearConversation = () => {
    if (window.confirm('Are you sure you want to clear the conversation?')) {
      setMessages([]);
      localStorage.removeItem(`deepdive-chat-${topicStreamId}`);
    }
  };

  return (
    <div className="border rounded-lg shadow-sm dark:border-gray-700 max-w-3xl">
      <div className="p-4 border-b dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-blue-300">Follow-up Questions</h3>
          <p className="text-sm text-gray-500 dark:text-gray-200 mt-1">
            Ask questions to explore this topic further
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearConversation}
            className="text-xs text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
          >
            Clear conversation
          </button>
        )}
      </div>
      
      <div className="p-4 bg-gray-50 dark:bg-gray-700 overflow-y-auto space-y-4" style={{height: '400px'}}>
        {messages.length === 0 && !loading && !error && (
          <div className="text-center text-gray-500 dark:text-gray-400 my-8 flex flex-col items-center">
            <svg className="w-12 h-12 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
            </svg>
            <p>Ask a question to learn more about this topic</p>
          </div>
        )}
        
        {messages.map((message) => (
          <div
            key={message.id}
            className={`p-4 rounded-lg ${
              message.type === 'user'
                ? 'bg-indigo-50 dark:bg-indigo-900 ml-6'
                : 'bg-gray-200 dark:bg-gray-600 mr-6'
            }`}
          >
            <div className="text-sm font-medium mb-1 flex justify-between">
              <div className="capitalize text-gray-700 dark:text-gray-200">{message.type === 'user' ? 'You' : message.model || 'AI'}</div>
              {message.type === 'ai' && message.model && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Model: {message.model}
                </div>
              )}
            </div>
            
            {message.type === 'user' ? (
              <div className="whitespace-pre-wrap text-gray-900 dark:text-gray-100">{message.content}</div>
            ) : (
              <MarkdownRenderer content={message.content} />
            )}
            
            {message.type === 'ai' && message.sources && message.sources.length > 0 && (
              <div className="mt-2">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Sources:</div>
                <div className="flex flex-wrap gap-1">
                  {message.sources.map((source, index) => (
                    <a
                      key={index}
                      href={source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-600 hover:text-indigo-900 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-700 px-2 py-1 rounded-full truncate max-w-[200px]"
                    >
                      {source}
                    </a>
                  ))}
                </div>
              </div>
            )}
            
            {message.type === 'ai' && (
              <div className="mt-2 flex justify-end">
                <button
                  onClick={() => handleUseAsUpdate(message)}
                  disabled={appendingId === message.id}
                  className={`px-3 py-1 rounded text-sm font-medium text-white bg-green-600 hover:bg-green-700 ${
                    appendingId === message.id ? 'opacity-75 cursor-not-allowed' : ''
                  }`}
                >
                  {appendingId === message.id ? 'Adding...' : 'Save to Stream'}
                </button>
              </div>
            )}
          </div>
        ))}
        
        {loading && (
          <div className="flex items-center justify-center my-4">
            <div className="animate-pulse flex space-x-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="text-center text-red-500 dark:text-red-400 my-4 p-3 bg-red-50 dark:bg-red-900 rounded-md">
            {error}
            <button 
              className="ml-2 text-sm underline"
              onClick={() => setError('')}
            >
              Dismiss
            </button>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-4 border-t dark:border-gray-700">
        <form onSubmit={handleSubmit} className="flex">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a follow-up question..."
            className="flex-1 border rounded-l-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
            disabled={loading}
          />
          <button
            type="submit"
            className={`bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-r-md ${
              loading ? 'opacity-75 cursor-not-allowed' : ''
            }`}
            disabled={loading}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default DeepDiveChat;

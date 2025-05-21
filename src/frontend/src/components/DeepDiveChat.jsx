import React, { useState, useEffect, useRef } from 'react';
import { deepDiveAPI, topicStreamAPI } from '../services/api';
import MarkdownRenderer from './MarkdownRenderer';

// Helper function to format R1-1776 model responses for better readability
const formatR1Response = (text) => {
  if (!text) return '';
  
  // Add proper line breaks for paragraphs
  let formatted = text
    // Split on sentences to create more readable paragraphs
    .replace(/\. /g, '.\n\n')
    // Fix any excessive line breaks
    .replace(/\n{3,}/g, '\n\n')
    // Add markdown headers for better structure
    .replace(/([A-Z][A-Za-z\s]{10,}:)/g, '\n## $1');
  
  // Add a markdown header at the beginning if none exists
  if (!formatted.startsWith('#')) {
    formatted = '## Summary\n\n' + formatted;
  }
  
  return formatted;
};

const DeepDiveChat = ({ topicStreamId, summaryId, topic, onAppend }) => {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [appendingId, setAppendingId] = useState(null);
  const [selectedModel, setSelectedModel] = useState('sonar-reasoning'); // Default model
  const [withContext, setWithContext] = useState(true);
  const [temperature, setTemperature] = useState(0.4); // Add state for temperature, default 0.4
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [animateIn, setAnimateIn] = useState(false);

  // Load saved messages from localStorage
  useEffect(() => {
    const key = `deepdive-chat-${topicStreamId}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try { setMessages(JSON.parse(saved)); } catch { localStorage.removeItem(key); }
    }
  }, [topicStreamId]);

  // Persist messages to localStorage
  useEffect(() => {
    const key = `deepdive-chat-${topicStreamId}`;
    if (messages.length) localStorage.setItem(key, JSON.stringify(messages));
    else localStorage.removeItem(key);
  }, [messages, topicStreamId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Trigger animation on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimateIn(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent default form submission initially
    // The actual submit logic will be triggered by onKeyDown for Enter key
    // Ctrl+Enter will handle new lines
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) { // Regular Enter without Shift or Ctrl
      e.preventDefault(); // Prevent default behavior (which might be inserting a newline in some contexts)
      handleSubmitLogic(); // Call the actual submission logic
    } else if (e.key === 'Enter' && e.shiftKey) { // Shift+Enter for newline
      // Allow default behavior (insert newline)
    }
  };
  
  const handleSubmitLogic = async () => {
    if (!question.trim()) return;
    const userMessage = { id: Date.now(), type: 'user', content: question };
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    setError('');
    try {
      // Only send previous messages if withContext is true
      let contextMessages = withContext ? messages : [];
      
      // Add a marker to emphasize the user's question
      const emphasizedQuestion = `#### USER QUESTION: ${question}`;

      const response = await deepDiveAPI.askQuestion(
        topicStreamId,
        summaryId,
        emphasizedQuestion, // Send the emphasized question
        selectedModel,
        { withContext, contextMessages, temperature } // Include temperature in options
      );
      
      // Format the response content based on the model type
      let formattedContent = response.answer;
      
      // Special handling for R1-1776 model responses
      if (selectedModel === 'r1-1776') {
        // Split long paragraphs into proper markdown paragraphs
        formattedContent = formatR1Response(response.answer);
      }
      
      const aiMsg = { 
        id: Date.now()+1, 
        type: 'ai', 
        content: formattedContent, 
        sources: response.sources || [], 
        model: response.model 
      };
      
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error('Failed to get answer:', err);
      setError('Failed to get an answer. Please try again.');
    } finally {
      setLoading(false);
      setQuestion('');
    }
  };

  const handleSaveToStream = async (message) => {
    setAppendingId(message.id);
    try {
      const newSummary = await topicStreamAPI.appendSummary(topicStreamId, message.content);
      if (onAppend) {
        onAppend(newSummary);
        setError('');
      }
    } catch (err) {
      console.error('Failed to append to stream:', err);
      setError('Failed to save to stream. Please try again.');
    } finally {
      setAppendingId(null);
    }
  };
  
  const clearChat = () => {
    if (window.confirm('Are you sure you want to clear the chat history?')) {
      setMessages([]);
      localStorage.removeItem(`deepdive-chat-${topicStreamId}`);
    }
  };

  return (
    <div className={`flex flex-col h-full transition-opacity duration-300 ease-in-out ${animateIn ? 'opacity-100' : 'opacity-0'}`}>
      <h4 className="text-md font-medium text-foreground mb-4">Deep Dive Chat</h4>
      <p className="text-sm text-muted-foreground mb-4">
        Ask follow-up questions about the summary or request more information.
      </p>
      
      {/* Chat messages container with animations */}
      <div className="flex-1 overflow-y-auto mb-4 pr-2">
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`mb-4 ${
              message.type === 'user' ? 'ml-4' : ''
            } transition-all duration-300 ease-in-out`}
            style={{
              opacity: animateIn ? 1 : 0,
              transform: animateIn ? 'translateY(0)' : 'translateY(10px)',
              transitionDelay: `${Math.min(index * 100, 500)}ms`
            }}
          >
            <div
              className={`p-3 rounded-lg ${
                message.type === 'user'
                  ? 'bg-primary text-primary-foreground ml-auto'
                  : 'bg-muted text-foreground'
              } ${message.type === 'user' ? 'max-w-[80%] ml-auto' : 'max-w-[80%]'} transition-all duration-300 ease-in-out transform hover:scale-[1.01]`}
            >
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <MarkdownRenderer content={message.content} />
              </div>
                </div>
            </div>
          ))}
          {loading && (
          <div className="flex items-center justify-center p-4 transition-opacity duration-300 ease-in-out animate-bounce-in">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <svg className="animate-spin h-4 w-4 text-primary" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            </div>
          )}
          <div ref={messagesEndRef} />
      </div>

      {/* Chat input with animations */}
      <div className="relative transition-all duration-300 ease-in-out transform">
        <textarea
          ref={chatContainerRef}
          className="w-full p-3 border border-border bg-card text-foreground rounded-lg resize-none transition-all duration-300 ease-in-out focus:ring-2 focus:ring-primary focus:border-primary"
          placeholder="Ask a follow-up question..."
              value={question} 
          onChange={e => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
          rows={5}
              disabled={loading} 
        ></textarea>
            <button 
          className="absolute right-3 bottom-3 p-2 rounded-full bg-primary text-primary-foreground disabled:bg-primary/50 disabled:cursor-not-allowed transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95"
          onClick={handleSubmitLogic}
          disabled={loading || !question.trim()}
            >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
          </svg>
            </button>
          </div>
      
      {/* Save summary button with animations */}
      {!appendingId && messages.length > 1 && (
        <button
          onClick={() => handleSaveToStream(messages[messages.length - 1])}
          className="mt-4 py-2 px-4 bg-muted hover:bg-muted/80 text-foreground rounded-lg flex items-center justify-center transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" />
          </svg>
          Save as Summary
        </button>
      )}
      
      {appendingId && (
        <div className="mt-4 py-2 px-4 bg-muted text-foreground rounded-lg flex items-center justify-center transition-all duration-300 ease-in-out animate-pulse">
          <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Saving...
          </div>
      )}
      
      {/* Error message with animations */}
      {error && (
        <div className="mt-4 p-3 bg-destructive/10 text-destructive border border-destructive rounded-lg transition-all duration-300 ease-in-out animate-bounce-in">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p>{error}</p>
          </div>
          <button
            onClick={() => setError('')}
            className="mt-2 text-sm text-destructive hover:text-destructive/90 transition-colors duration-300"
          >
            Dismiss
          </button>
          </div>
      )}
    </div>
  );
};

export default DeepDiveChat; 
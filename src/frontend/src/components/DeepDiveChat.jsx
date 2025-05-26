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
    <div className="flex flex-col h-full border border-border rounded-lg overflow-hidden">
      <div className="p-3 border-b border-border bg-card flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Follow-up Questions</h3>
          <p className="text-xs text-muted-foreground">Ask questions to explore this topic further</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="text-xs text-muted-foreground hover:text-destructive px-2 py-1 rounded"
          >
            Clear Chat
          </button>
        )}
      </div>

      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-scroll bg-background p-3"
      >
        {messages.length === 0 && !loading && !error && (
          <div className="text-center text-muted-foreground my-6">
            <p>Ask a question to learn more about this topic</p>
          </div>
        )}
        
        <div className="space-y-3">
          {messages.map(message => (
            <div key={message.id} className={`p-3 rounded-lg ${message.type==='user'?'bg-muted ml-6':'bg-card mr-6'} shadow-sm`}>
              <div className="text-sm font-medium mb-1 flex justify-between">
                <div className="capitalize text-foreground">{message.type==='user'?'You':message.model||'AI'}</div>
                {message.type==='ai' && message.model && <div className="text-xs text-muted-foreground">Model: {message.model}</div>}
              </div>
              
              {message.type==='user'
                ? <div className="whitespace-pre-wrap text-foreground text-sm">{message.content}</div>
                : (
                  <div className="text-sm">
                    {/* Summary Content with Read More */}
                    <div className={`dark:prose-invert overflow-hidden ${!message.isExpanded ? 'line-clamp-10' : ''}`}>
                      <MarkdownRenderer content={message.content} sources={message.sources} />
                    </div>
                    {message.content && message.content.length > 500 && (
                      <button
                        onClick={() => setMessages(prev => prev.map(msg => msg.id === message.id ? { ...msg, isExpanded: !msg.isExpanded } : msg))}
                        className="mt-2 text-primary hover:underline"
                      >
                        {message.isExpanded ? 'Read less' : 'Read more'}
                      </button>
                    )}

                    {/* Summary Sources - Moved below summary content */}
                    {message.sources && message.sources.length > 0 && message.model !== 'r1-1776' && (
                      <div className="mt-4">
                        <div className="text-xs font-medium text-muted-foreground mb-1">Sources:</div>
                        <div className="flex flex-wrap gap-1">
                          {message.sources.map((src,i)=>(
                            <a 
                              key={i} 
                              href={src} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-xs bg-accent text-accent-foreground px-2 py-1 rounded-full truncate max-w-[200px] hover:bg-accent/80"
                            >
                              {src}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              }
              
              {message.type === 'ai' && (
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={() => handleSaveToStream(message)}
                    disabled={appendingId === message.id}
                    className={`px-2 py-1 rounded text-xs bg-primary text-primary-foreground hover:bg-primary/90 ${
                      appendingId === message.id ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {appendingId === message.id ? 'Adding...' : 'Save to Stream'}
                  </button>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center justify-center my-3">
              <div className="animate-pulse flex space-x-2">
                <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
                <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
                <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
              </div>
            </div>
          )}
          
          {error && (
            <div className="text-center text-destructive my-3 p-2 bg-destructive/10 rounded">
              {error}
              <button onClick={() => setError('')} className="ml-2 text-xs underline text-destructive-foreground hover:text-destructive/80">Dismiss</button>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="p-3 border-t border-border bg-card">
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="flex">
            <input 
              type="text" 
              value={question} 
              onChange={e=>setQuestion(e.target.value)} 
              onKeyDown={handleKeyDown}
              placeholder="Ask a follow-up question..." 
              className="flex-1 border border-border rounded-l-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground placeholder-muted-foreground" 
              disabled={loading} 
            />
            <button 
              type="submit" 
              className={`bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-r-md ${loading?'opacity-75 cursor-not-allowed':''}`}
              disabled={loading}
            >
              Send
            </button>
          </div>
          <div className="flex items-center justify-end space-x-2">
            <label htmlFor="model-select" className="text-xs text-muted-foreground">Model:</label>
            <select 
              id="model-select"
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              disabled={loading}
              className="text-xs border-border bg-background text-foreground rounded-md shadow-sm focus:border-border focus:ring focus:ring-ring py-1 pl-2 pr-7"
            >
              <option value="sonar-reasoning">Sonar Reasoning (Default)</option>
              <option value="sonar">Sonar</option>
              <option value="sonar-pro">Sonar Pro</option>
              <option value="sonar-reasoning-pro">Sonar Reasoning Pro</option>
              <option value="sonar-deep-research">Sonar Deep Research</option>
              <option value="r1-1776">R1-1776 (Offline)</option>
            </select>
          </div>
          {/* Temperature Slider */}
          <div className="flex items-center justify-end space-x-2">
            <label htmlFor="temperature-slider" className="text-xs text-muted-foreground">Temperature:</label>
            <input
              id="temperature-slider"
              type="range"
              min="0" // Minimum temperature
              max="1" // Maximum temperature
              step="0.01" // Step value for finer control
              value={temperature}
              onChange={e => setTemperature(parseFloat(e.target.value))}
              disabled={loading}
              className="w-32"
            />
            <span className="text-xs text-muted-foreground w-8 text-right">{temperature.toFixed(2)}</span> {/* Display current temperature */}
          </div>
          <div className="flex items-center mt-2">
            <input
              id="with-context-checkbox"
              type="checkbox"
              checked={withContext}
              onChange={e => setWithContext(e.target.checked)}
              className="mr-2 accent-primary"
              disabled={loading}
            />
            <label htmlFor="with-context-checkbox" className="text-xs text-muted-foreground select-none">
              Send previous chat context
              <span className="ml-1 text-muted-foreground" title="If unchecked, only your current question will be sent to the model. Previous chat history will be omitted.">(?)</span>
            </label>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeepDiveChat; 
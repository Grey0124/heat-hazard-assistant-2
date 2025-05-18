// src/components/chatbot/ChatbotComponent.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { getFallbackResponse } from '../../services/chatbotService';
import './Chatbot.css';

// Predefined messages for faster responses
const PREDEFINED_QUESTIONS = [
  "What is heat stroke?",
  "How can I stay safe in extreme heat?",
  "What are cooling centers?",
  "What should I do if I see someone suffering from heat exhaustion?",
  "How do I report a heat hazard?"
];

const ChatbotComponent = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I\'m your HeatSafe assistant. How can I help you with heat safety today?'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const messagesEndRef = useRef(null);
  const chatWindowRef = useRef(null);

  // Toggle chatbot open/closed
  const toggleChat = useCallback(() => {
    setIsOpen(prevIsOpen => !prevIsOpen);
    // Show suggestions after toggling open
    setShowSuggestions(true);
  }, []);

  // Clear chat history
  const clearChatHistory = useCallback(() => {
    setMessages([
      {
        role: 'assistant',
        content: 'Chat history cleared. How can I help you with heat safety today?'
      }
    ]);
    localStorage.removeItem('chatbotHistory');
  }, []);

  // Send message to chatbot
  const sendMessage = useCallback(async (message) => {
    if (!message.trim()) return;

    // Add user message to chat
    setMessages(prevMessages => [...prevMessages, { role: 'user', content: message }]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Get backend API URL from environment variables
      const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:5000';
      
      let response;
      
      try {
        // Try to call backend API
        response = await axios.post(`${BACKEND_API_URL}/api/openai/chat`, {
          messages: [
            { role: 'system', content: 'You are a helpful assistant focused on heat safety. Provide concise, accurate information about heat-related dangers, safety tips, and recommendations. Your primary goal is to help people stay safe during extreme heat conditions.' },
            ...messages.filter(m => m.role !== 'system'), // Remove any existing system messages
            { role: 'user', content: message }
          ]
        });
        
        // Add bot response to chat
        setMessages(prevMessages => [
          ...prevMessages, 
          { role: 'assistant', content: response.data.content }
        ]);
      } catch (error) {
        console.log('Using fallback responses as backend API call failed', error);
        
        // Use our fallback response generator
        const fallbackResponse = getFallbackResponse(message);
        
        // Add fallback response to chat
        setMessages(prevMessages => [
          ...prevMessages, 
          { role: 'assistant', content: fallbackResponse }
        ]);
      }
      
    } catch (error) {
      console.error('Error getting chatbot response:', error);
      setMessages(prevMessages => [
        ...prevMessages,
        { 
          role: 'assistant', 
          content: 'Sorry, I encountered an error. Please try again later.' 
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  // Handle clicking a predefined question
  const handlePredefinedQuestion = useCallback((question) => {
    sendMessage(question);
    setShowSuggestions(false); // Hide suggestions after clicking one
  }, [sendMessage]);

  // Handle input change
  const handleInputChange = useCallback((e) => {
    setInputValue(e.target.value);
  }, []);

  // Handle form submission
  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    sendMessage(inputValue);
  }, [inputValue, sendMessage]);

  // Function to scroll to bottom of chat
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Update announcement when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant') {
        setAnnouncement(`Assistant: ${lastMessage.content}`);
      }
    }
  }, [messages]);

  // Initialize dark mode from localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('chatbotDarkMode');
    if (savedDarkMode !== null) {
      setDarkMode(JSON.parse(savedDarkMode));
    } else {
      // Default to dark mode if user's system is in dark mode
      const prefersDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(prefersDarkMode);
    }
  }, []);
  
  // Save dark mode preference to localStorage
  useEffect(() => {
    localStorage.setItem('chatbotDarkMode', JSON.stringify(darkMode));
  }, [darkMode]);
  
  // Save chat history to localStorage
  useEffect(() => {
    if (messages.length > 1) { // Only save if there are user messages
      localStorage.setItem('chatbotHistory', JSON.stringify(messages));
    }
  }, [messages]);

  // Load chat history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('chatbotHistory');
    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory);
        if (Array.isArray(parsedHistory) && parsedHistory.length > 1) {
          setMessages(parsedHistory);
        }
      } catch (error) {
        console.error('Error parsing saved chat history:', error);
      }
    }
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Escape key closes the chat
      if (e.key === 'Escape' && isOpen) {
        toggleChat();
      }
      
      // Alt+C to open/close chat
      if (e.altKey && e.key === 'c') {
        toggleChat();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, toggleChat]);

  // Handle outside click to close chatbot
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (chatWindowRef.current && !chatWindowRef.current.contains(event.target) 
          && !event.target.closest('[aria-label="Open chat assistant"]')) {
        setIsOpen(false);
      }
    };

    // Only add the event listener if the chatbot is open
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="fixed bottom-8 right-8 z-50">
      {/* Accessibility announcement for screen readers */}
      <div 
        role="status" 
        aria-live="polite" 
        className="sr-only"
      >
        {announcement}
      </div>
      
      {/* Chat button */}
      <button
        onClick={toggleChat}
        className={`bg-amber-600 hover:bg-amber-700 text-white p-4 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 transform hover:scale-110 ${messages.length > 1 ? 'chatbot-button' : ''}`}
        aria-label="Open chat assistant"
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </button>

      {/* Chat window */}
      {isOpen && (
        <div 
          ref={chatWindowRef} 
          className={`absolute bottom-16 right-0 w-96 h-[470px] ${darkMode ? 'bg-gray-900' : 'bg-white'} rounded-lg shadow-xl overflow-hidden flex flex-col animate-slideUp`}
          style={{ boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)' }}
        >
          {/* Chat header */}
          <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-amber-600 text-white'} p-4 flex items-center`}>
            <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <h3 className="font-semibold">HeatSafe Assistant</h3>
            </div>
            <div className="flex items-center ml-auto">
                {/* Clear History Button - only show if there are messages */}
                {messages.length > 1 && (
                  <button 
                    onClick={clearChatHistory} 
                    className="ml-auto mr-2 text-white hover:text-gray-200"
                    aria-label="Clear chat history"
                    title="Clear chat history"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}

                {/* Theme toggle button */}
                <button 
                  onClick={() => setDarkMode(!darkMode)} 
                  className="mr-2 text-white hover:text-gray-200 right-0"
                  aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                >
                  {darkMode ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  )}
                </button>
              
                <button
                  onClick={toggleChat}
                  className="text-white hover:text-gray-200 right-0"
                  aria-label="Close chat"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
            </div>
          </div>

          {/* Chat messages */}
          <div className={`flex-1 p-4 overflow-y-auto ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
            {messages.map((message, index) => (
              <div
                key={index}
                className={`mb-4 flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className={`${darkMode ? 'bg-gray-800 text-gray-200' : 'bg-amber-100 text-amber-900'} rounded-lg px-4 py-2 max-w-[80%]`}>
                    {message.content}
                  </div>
                )}
                {message.role === 'user' && (
                  <div className="bg-amber-600 text-white rounded-lg px-4 py-2 max-w-[80%]">
                    {message.content}
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start mb-4">
                <div className={`${darkMode ? 'bg-gray-800 text-gray-200' : 'bg-amber-100 text-amber-900'} rounded-lg px-4 py-2 max-w-[80%]`}>
                  <div className="typing-animation">
                    <span className="typing-dot">•</span>
                    <span className="typing-dot">•</span>
                    <span className="typing-dot">•</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Predefined questions */}
          {showSuggestions && (
            <div className={`px-4 py-2 ${darkMode ? 'bg-gray-800' : 'bg-amber-50'} overflow-x-auto`}>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-amber-800'} mb-2`}>Suggested questions:</p>
              <div className="flex space-x-2 pb-1">
                {PREDEFINED_QUESTIONS.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handlePredefinedQuestion(question)}
                    className={`${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 border-gray-600' : 'bg-white hover:bg-amber-100 text-amber-800 border-amber-200'} text-sm px-3 py-1 rounded-full border whitespace-nowrap`}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat input */}
          <form onSubmit={handleSubmit} className={`p-4 border-t ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200'} flex`}>
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              placeholder="Type your message..."
              className={`flex-1 ${darkMode ? 'bg-gray-700 text-white border-gray-600 focus:ring-blue-500' : 'border-gray-300 focus:ring-amber-600'} border rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2`}
              disabled={isLoading}
            />
            <button
              type="submit"
              className={`${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-amber-700'} bg-amber-600 text-white rounded-r-lg px-4 py-2`}
              disabled={isLoading || !inputValue.trim()}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChatbotComponent;
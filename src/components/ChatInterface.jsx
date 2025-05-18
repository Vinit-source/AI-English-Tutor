import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ObjectivesPanel from './ObjectivesPanel';
import ChatMessage from './ChatMessage';
import { getScenarioById } from '../data/scenarioLoader';
import '../styles/ChatInterface.css';

const ChatInterface = () => {
  const { scenario } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [showObjectives, setShowObjectives] = useState(false);
  const [objectivesPanelClosing, setObjectivesPanelClosing] = useState(false);
  const [llmModel, setLlmModel] = useState('gemini');
  const [isLoading, setIsLoading] = useState(false);
  const [rateLimitedModels, setRateLimitedModels] = useState({
    gemini: false,
    mistral: false,
    gemma: false,
    deepseek: false
  });
  const [objectives, setObjectives] = useState([]);
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [lastCorrection, setLastCorrection] = useState('');
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  const messagesEndRef = useRef(null);
  const chatMessagesRef = useRef(null);
  const canvasRef = useRef(null);
  const conversationHistory = useRef([]);
  const objectivesPanelRef = useRef(null);

  // Get the stored language preference
  const userLanguage = localStorage.getItem('userLanguage') || 'hindi';

  // Initialize the chat with a welcome message
  useEffect(() => {
    setMessages([{ 
      type: 'ai', 
      content: `Welcome to the "${scenario.replace(/-/g, ' ')}" scenario! How can I help you practice your English today? (${getTranslation('Welcome', userLanguage)})`
    }]);
    
    // Reset conversation history and rate limits when scenario changes
    conversationHistory.current = [];
    setRateLimitedModels({
      gemini: false,
      mistral: false,
      gemma: false,
      deepseek: false
    });
  }, [scenario, userLanguage]);

  // Load objectives from scenario data
  useEffect(() => {
    const scenarioData = getScenarioById(scenario);
    if (scenarioData) {
      setObjectives(scenarioData.objectives.map(obj => ({ ...obj, completed: false })));
    }
  }, [scenario]);

  const handleCloseObjectives = () => {
    setObjectivesPanelClosing(true);
    setTimeout(() => {
      setObjectivesPanelClosing(false);
      setShowObjectives(false);
    }, 300); // Match this with the animation duration
  };

  // Add click outside handler to close objectives panel
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close panel if it's open and the click is outside both the panel and the toggle button
      if (showObjectives && 
          objectivesPanelRef.current && 
          !objectivesPanelRef.current.contains(event.target) &&
          !event.target.closest('.objectives-btn')) {
        setShowObjectives(false);
      }
    };

    // Add event listener when component mounts or showObjectives changes
    document.addEventListener('mousedown', handleClickOutside);
    
    // Clean up event listener when component unmounts
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showObjectives]);

  // Simple translation function for common responses
  const getTranslation = (text, language) => {
    const translations = {
      hindi: {
        'Welcome': `${scenario.replace(/-/g, ' ')} परिदृश्य में आपका स्वागत है! मैं आज आपको अंग्रेजी का अभ्यास करने में कैसे मदद कर सकता हूं?`,
        'Perfect': 'बिल्कुल सही! यह एकदम सटीक है। चलिए अपनी बातचीत जारी रखें।'
      },
      marathi: {
        'Welcome': `${scenario.replace(/-/g, ' ')} परिस्थितीमध्ये आपले स्वागत आहे! मी आज आपल्याला इंग्रजी सराव करण्यात कशी मदत करू शकतो?`,
        'Perfect': 'अगदी बरोबर! हे अगदी योग्य आहे. चला आपली संभाषण पुढे सुरू ठेवूया.'
      },
      gujarati: {
        'Welcome': `${scenario.replace(/-/g, ' ')} પરિસ્થિતિમાં આપનું સ્વાગત છે! હું આજે તમને અંગ્રેજી પ્રેક્ટિસ કરવામાં કેવી રીતે મદદ કરી શકું?`,
        'Perfect': 'એકદમ સાચું! એ બિલકુલ સાચું છે. ચાલો આપણી વાતચીત ચાલુ રાખીએ.'
      },
      bengali: {
        'Welcome': `${scenario.replace(/-/g, ' ')} পরিস্থিতিতে আপনাকে স্বাগতম! আমি আজ আপনাকে ইংরেজি অনুশীলন করতে কীভাবে সাহায্য করতে পারি?`,
        'Perfect': 'একদম ঠিক! এটা একেবারে সঠিক। চলুন আমাদের কথোপকথন চালিয়ে যাই।'
      },
      tamil: {
        'Welcome': `${scenario.replace(/-/g, ' ')} சூழ்நிலைக்கு வரவேற்கிறோம்! நான் இன்று உங்களுக்கு ஆங்கிலம் பயிற்சி செய்ய எப்படி உதவ முடியும்?`,
        'Perfect': 'மிகச் சரியாக இருக்கிறது! அது சரியாக இருக்கிறது. நமது உரையாடலைத் தொடர்வோம்.'
      },
      telugu: {
        'Welcome': `${scenario.replace(/-/g, ' ')} పరిస్థితికి స్వాగతం! నేను ఈరోజు మీకు ఇంగ్లిష్ ప్రాక్టీస్ చేయడంలో ఎలా సహాయపడగలను?`,
        'Perfect': 'చాలా బాగుంది! అది ఖచ్చితంగా సరైనది. మన సంభాషణను కొనసాగిద్దాం.'
      },
      kannada: {
        'Welcome': `${scenario.replace(/-/g, ' ')} ಸನ್ನಿವೇಶಕ್ಕೆ ಸ್ವಾಗತ! ನಾನು ಇಂದು ನಿಮಗೆ ಇಂಗ್ಲಿಷ್ ಅಭ್ಯಾಸ ಮಾಡಲು ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?`,
        'Perfect': 'ಬಹಳ ಒಳ್ಳೆಯದು! ಅದು ಸರಿಯಾಗಿದೆ. ನಮ್ಮ ಸಂಭಾಷಣೆಯನ್ನು ಮುಂದುವರೆಸೋಣ.'
      },
      malayalam: {
        'Welcome': `${scenario.replace(/-/g, ' ')} സാഹചര്യത്തിലേക്ക് സ്വാഗതം! ഇന്ന് നിങ്ങൾക്ക് ഇംഗ്ലീഷ് പരിശീലിക്കാൻ എങ്ങനെ സഹായിക്കാൻ കഴിയും?`,
        'Perfect': 'തികച്ചും ശരി! അത് കൃത്യമായി ശരിയാണ്. നമുക്ക് സംഭാഷണം തുടരാം.'
      }
    };

    return translations[language]?.[text] || text;
  };

  useEffect(() => {
    // Setup canvas if needed
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      canvasRef.current.width = chatMessagesRef.current.offsetWidth;
      canvasRef.current.height = chatMessagesRef.current.offsetHeight;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }

    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const findAvailableModel = () => {
    // Try to use the currently selected model if it's not rate limited
    if (!rateLimitedModels[llmModel]) {
      return llmModel;
    }
    
    // Otherwise, find the first available model
    const availableModels = ['gemini', 'mistral', 'gemma', 'deepseek'].filter(
      model => !rateLimitedModels[model]
    );
    
    if (availableModels.length > 0) {
      return availableModels[0];
    }
    
    // If all models are rate-limited, use the server API as fallback
    return 'server';
  };

  const enterPracticeMode = (correctionText) => {
    setInputValue(correctionText);
    setIsPracticeMode(true);
    setLastCorrection(correctionText);
    // Focus the input after a short delay to ensure the DOM has updated
    setTimeout(() => {
      const inputEl = document.querySelector('.chat-input-container input');
      if (inputEl) inputEl.focus();
    }, 100);
  };

  const handleSendMessage = async () => {
    if (inputValue.trim() === '' || isLoading) return;

    setError(null); // Clear any existing errors

    // Create a flag to track if this is a correction practice
    const isCorrectingPractice = isPracticeMode && inputValue.trim().toLowerCase() === lastCorrection.toLowerCase();
    
    // Add user message to chat
    const newMessages = [...messages, { 
      type: 'user', 
      content: inputValue,
      isPractice: isPracticeMode
    }];
    
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);
    
    // Exit practice mode after sending
    if (isPracticeMode) {
      setIsPracticeMode(false);
      setLastCorrection('');
    }

    try {
      // Find an available model
      const modelToUse = findAvailableModel();
      
      // Add thinking indicator
      setMessages([...newMessages, { type: 'thinking' }]);
      
      // Send to API with context about correction practice
      let response;
      if (isCorrectingPractice) {
        // If this is a correction practice, use a simpler response pattern
        response = `Perfect! That's exactly right. Let's continue our conversation. (${getTranslation('Perfect', userLanguage)})`;
        // Short delay to simulate API call time for better UX
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        // Normal API call for regular conversation
        response = await getAIResponse(inputValue, userLanguage, modelToUse, scenario);
      }
      
      // Check if response contains objective markers and update objectives
      const updatedObjectives = [...objectives];
      const regex = /\s?\[\d+\]/g;
      const matches = response.match(regex) || [];
      
      matches.forEach(match => {
        const matchNumber = match.match(/\d+/)[0];
        const objectiveIndex = parseInt(matchNumber) - 1;
        if (objectiveIndex >= 0 && objectiveIndex < updatedObjectives.length) {
          updatedObjectives[objectiveIndex].completed = true;
        }
      });
      
      // Update objectives state
      setObjectives(updatedObjectives);
      
      // Remove thinking indicator and add AI response without objective markers
      const cleanResponse = response.replace(regex, "");
      setMessages([...newMessages, { type: 'ai', content: cleanResponse }]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      // Remove thinking indicator and add error message
      setMessages([...newMessages, { 
        type: 'ai', 
        content: 'Sorry, I had trouble responding. Please try again or select a different AI model.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const getAIResponse = async (message, language, model, scenario) => {
    try {
      // Add the user's message to conversation history before making the API call
      conversationHistory.current.push({
        role: 'user',
        content: message
      });

      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3000/api/chat'
        : '/api/chat';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          language,
          model,
          scenario,
          conversationHistory: conversationHistory.current
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || `API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Handle fallback model information
      if (data.usedFallback) {
        setLlmModel(data.fallbackModel);
        setError({
          message: `Using ${data.fallbackModel} as fallback model due to issues with ${model}`,
          timestamp: Date.now(),
          type: 'info'
        });
      }
      
      // Reset retry count on successful response
      setRetryCount(0);
      // Add the AI response to conversation history
      conversationHistory.current.push({
        role: 'assistant',
        content: data.reply
      });
      
      return data.reply;
    } catch (error) {
      console.error('Error in AI response:', error);
      
      // Implement retry logic for network errors
      if (error.message.includes('network') && retryCount < MAX_RETRIES) {
        // Corrected retry count update
        setRetryCount(prev => prev + 1); 
        console.log(`Network error detected. Retrying... Attempt ${retryCount + 1}`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Use updated retryCount for delay
        return getAIResponse(message, language, model, scenario); // Recursive call
      }
      
      handleAPIError(error);
      throw error; // Re-throw the error if not retrying or retries exhausted
    }
  };

  // Error handling utility
  const handleAPIError = (error) => {
    let errorMessage = 'Something went wrong. Please try again.';
    
    if (error.message.includes('rate limit')) {
      errorMessage = 'You have made too many requests. Please wait a moment before trying again.';
      // Mark current model as rate limited
      setRateLimitedModels(prev => ({ ...prev, [llmModel]: true }));
      // Reset after 1 minute
      setTimeout(() => {
        setRateLimitedModels(prev => ({ ...prev, [llmModel]: false }));
      }, 60000);
    } else if (error.message.includes('API key')) {
      errorMessage = 'Server configuration error. Please try a different AI model.';
    } else if (error.message.includes('network')) {
      errorMessage = 'Network error. Please check your internet connection.';
    }

    setError({ message: errorMessage, timestamp: Date.now() });
    // Clear error after 5 seconds
    setTimeout(() => setError(null), 5000);
  };

  // Expose the practice mode function to the window so ChatMessage can access it
  useEffect(() => {
    window.enterPracticeMode = enterPracticeMode;
    
    return () => {
      delete window.enterPracticeMode;
    };
  }, []);

  return (
    <div className="chat-container">
      {error && (
        <div className={`error-banner ${error.type || ''}`}>
          <span>{error.message}</span>
          <button onClick={() => setError(null)} className="close-error">✕</button>
        </div>
      )}
      <div className="chat-header">
        <div className="header-content">
          <button 
            className="back-button" 
            onClick={() => navigate('/')}
            aria-label="Go back to home"
            title="Back to home page"
          ></button>
          <span className="chat-title">
            {scenario.replace(/-/g, ' ')}
            <span className="language-indicator">{userLanguage}</span>
          </span>
        </div>
        <div className="chat-controls">
          <select
            value={llmModel}
            onChange={(e) => setLlmModel(e.target.value)}
            className="llm-model"
            aria-label="Select AI model"
          >
            <option value="gemini">Gemini</option>
            <option value="mistral">Mistral</option>
            <option value="gemma">Gemma 3</option>
            <option value="deepseek">DeepSeek</option>
          </select>
          <button
            className="objectives-btn"
            onClick={() => showObjectives ? handleCloseObjectives() : setShowObjectives(true)}
            aria-label="Toggle objectives panel"
          >
            ☰
          </button>
        </div>
      </div>
      
      <div className={`chat-messages ${scenario}`} ref={chatMessagesRef}>
        <canvas ref={canvasRef} id="chatCanvas"></canvas>
        {messages.map((message, index) => (
          <ChatMessage 
            key={index} 
            type={message.type} 
            content={message.content}
            isPractice={message.isPractice || false}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="chat-input-container">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSendMessage();
            if (e.key === 'Escape') {
              if (isPracticeMode) {
                setIsPracticeMode(false);
                setInputValue('');
              } else {
                navigate('/');
              }
            }
          }}
          placeholder={isPracticeMode ? "Practice the corrected phrase..." : "Type a message..."}
          disabled={isLoading}
          className={isPracticeMode ? 'practice-mode' : ''}
        />
        <button 
          onClick={handleSendMessage}
          disabled={isLoading || inputValue.trim() === ''}
          className={`${isLoading ? 'sending' : ''} ${isPracticeMode ? 'practice-mode' : ''}`}
        >
          {isLoading ? 'Sending...' : isPracticeMode ? 'Practice' : 'Send'}
        </button>
      </div>

      {showObjectives && (
        <div ref={objectivesPanelRef}>
          <ObjectivesPanel 
            scenario={scenario.replace(/-/g, ' ')}
            objectives={objectives}
            onClose={() => setShowObjectives(false)}
            onObjectiveChange={(id, checked) => {
              const updatedObjectives = objectives.map(obj => 
                obj.id === id ? { ...obj, completed: checked } : obj
              );
              setObjectives(updatedObjectives);
            }}
          />
        </div>
      )}
    </div>
  );
};

export default ChatInterface;

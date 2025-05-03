import { useState, useEffect, useRef, useCallback } from 'react'; // Import useCallback
import { useParams, useNavigate } from 'react-router-dom';
import ObjectivesPanel from './ObjectivesPanel';
import ChatMessage from './ChatMessage';
import { getScenarioById } from '../data/scenarioLoader';
import '../styles/ChatInterface.css';

// Helper function to extract only the main English text from AI response
const extractEnglishText = (content) => {
  // Remove translation part (text within parentheses)
  let englishText = content.replace(/\(.*?\)/g, "").trim();
  
  // Remove correction suggestions if present
  const correctionPatterns = [
    "you should say:", "the correct way:", "try saying:", 
    "we usually say:", "it's better to say:", "more natural to say:",
    "you can say:", "correct sentence is:"
  ];
  
  correctionPatterns.forEach(pattern => {
    const index = englishText.toLowerCase().indexOf(pattern.toLowerCase());
    if (index !== -1) {
      // Try to keep only the text before the pattern
      englishText = englishText.substring(0, index).trim();
    }
  });
  
  // Remove objective markers like [1], [2] etc.
  englishText = englishText.replace(/\s?\[\d+\]/g, "").trim();

  return englishText;
};


const ChatInterface = () => {
  const { scenario } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [showObjectives, setShowObjectives] = useState(true);
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
  const [isListening, setIsListening] = useState(false);
  const [isTTSEnabled, setIsTTSEnabled] = useState(true); // TTS enabled by default
  const [isSpeaking, setIsSpeaking] = useState(false); // Track if TTS is active
  const recognitionRef = useRef(null);
  const utteranceRef = useRef(null); // Ref to keep track of the current utterance


  // Get the stored language preference
  const userLanguage = localStorage.getItem('userLanguage') || 'hindi';

  // Initialize the chat with a welcome message
  useEffect(() => {
    const welcomeMessage = `Welcome to the "${scenario.replace(/-/g, ' ')}" scenario! How can I help you practice your English today? (${getTranslation('Welcome', userLanguage)})`;
    setMessages([{ 
      type: 'ai', 
      content: welcomeMessage
    }]);
    speakText(welcomeMessage); // Speak the initial welcome message
    
    // Reset conversation history and rate limits when scenario changes
    conversationHistory.current = [];
    setRateLimitedModels({
      gemini: false,
      mistral: false,
      gemma: false,
      deepseek: false
    });
  }, [scenario, userLanguage]); // Removed speakText from dependencies

  // Load objectives from scenario data
  useEffect(() => {
    const scenarioData = getScenarioById(scenario);
    if (scenarioData) {
      setObjectives(scenarioData.objectives.map(obj => ({ ...obj, completed: false })));
    }
  }, [scenario]);

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

  // --- STT (Speech Recognition) Setup ---
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech Recognition API not supported in this browser.");
      // Optionally disable STT button or show a message
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false; // Process speech after user stops talking
    recognition.interimResults = false; // Get final results only
    recognition.lang = 'en-US'; // Set language to English

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInputValue(transcript); // Update input field with transcript
      // Optionally auto-send the message after transcription
      // handleSendMessage(transcript); 
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setError({ message: `Speech recognition error: ${event.error}`, timestamp: Date.now() });
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    // Cleanup function
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []); // Run only once on mount

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        // Cancel TTS if it's speaking
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
          setIsSpeaking(false);
        }
        recognitionRef.current.start();
        setIsListening(true);
        setInputValue(''); // Clear input field when starting listening
      } catch (e) {
        // Handle potential errors like starting recognition too soon after stopping
        console.error("Could not start recognition:", e);
        setError({ message: "Could not start voice input. Please try again.", timestamp: Date.now() });
        setIsListening(false);
      }
    }
  };

  // --- TTS (Speech Synthesis) Setup ---
  const speakText = useCallback((text) => {
    if (!isTTSEnabled || !text || typeof window.speechSynthesis === 'undefined') {
      return;
    }

    // Cancel any ongoing speech first
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }

    const englishTextToSpeak = extractEnglishText(text);
    if (!englishTextToSpeak) return; // Don't speak if no English text found

    const utterance = new SpeechSynthesisUtterance(englishTextToSpeak);
    utterance.lang = 'en-US'; // Set language
    utterance.rate = 1.0; // Adjust speed as needed
    utterance.pitch = 1.0; // Adjust pitch as needed

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event.error);
      setError({ message: `Speech synthesis error: ${event.error}`, timestamp: Date.now() });
      setIsSpeaking(false);
    };
    
    utteranceRef.current = utterance; // Store reference
    window.speechSynthesis.speak(utterance);

  }, [isTTSEnabled]); // Dependency on isTTSEnabled

  const toggleTTS = () => {
    const newState = !isTTSEnabled;
    setIsTTSEnabled(newState);
    if (!newState && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel(); // Stop speaking if TTS is disabled
      setIsSpeaking(false);
    }
  };
  
  // Cleanup TTS on component unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);


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

  const enterPracticeMode = useCallback((correctionText) => { // Wrap in useCallback
    setInputValue(correctionText);
    setIsPracticeMode(true);
    setLastCorrection(correctionText);
    // Focus the input after a short delay to ensure the DOM has updated
    setTimeout(() => {
      const inputEl = document.querySelector('.chat-input-container input');
      if (inputEl) inputEl.focus();
    }, 100);
  }, []); // No dependencies needed if it only uses setters

  const handleSendMessage = async (messageToSend = inputValue) => { // Allow passing message directly
    const currentMessage = messageToSend.trim(); // Use passed message or state
    if (currentMessage === '' || isLoading) return;

    setError(null); // Clear any existing errors

    // Stop TTS if it's speaking when user sends a message
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    // Stop STT if it's listening
    if (isListening) {
       recognitionRef.current?.stop();
       setIsListening(false);
    }


    const isCorrectingPractice = isPracticeMode && currentMessage.toLowerCase() === lastCorrection.toLowerCase();
    
    const newMessages = [...messages, { 
      type: 'user', 
      content: currentMessage, // Use currentMessage
      isPractice: isPracticeMode
    }];
    
    setMessages(newMessages);
    setInputValue(''); // Clear input field
    setIsLoading(true);
    
    if (isPracticeMode) {
      setIsPracticeMode(false);
      setLastCorrection('');
    }

    try {
      const modelToUse = findAvailableModel();
      setMessages([...newMessages, { type: 'thinking' }]);
      
      let responseText;
      if (isCorrectingPractice) {
        responseText = `Perfect! That's exactly right. Let's continue our conversation. (${getTranslation('Perfect', userLanguage)})`;
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        responseText = await getAIResponse(currentMessage, userLanguage, modelToUse, scenario); // Use currentMessage
      }
      
      const updatedObjectives = [...objectives];
      const regex = /\s?\[\d+\]/g;
      const matches = responseText.match(regex) || [];
      
      matches.forEach(match => {
        const matchNumber = match.match(/\d+/)[0];
        const objectiveIndex = parseInt(matchNumber) - 1;
        if (objectiveIndex >= 0 && objectiveIndex < updatedObjectives.length) {
          updatedObjectives[objectiveIndex].completed = true;
        }
      });
      
      setObjectives(updatedObjectives);
      
      const cleanResponse = responseText.replace(regex, "");
      // Remove thinking indicator before adding AI response
      setMessages(prevMessages => [...prevMessages.filter(m => m.type !== 'thinking'), { type: 'ai', content: cleanResponse }]);
      
      // Speak the AI response
      speakText(cleanResponse); 

    } catch (error) {
      console.error('Error getting AI response:', error);
       // Remove thinking indicator before adding error message
      setMessages(prevMessages => [...prevMessages.filter(m => m.type !== 'thinking'), { 
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
  }, [enterPracticeMode]); // Add enterPracticeMode to dependency array

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
           {/* TTS Toggle Button */}
          <button
            className={`tts-toggle-btn ${isTTSEnabled ? 'enabled' : ''}`}
            onClick={toggleTTS}
            aria-label={isTTSEnabled ? "Disable Text-to-Speech" : "Enable Text-to-Speech"}
            title={isTTSEnabled ? "Disable TTS" : "Enable TTS"}
          >
            {/* Simple Speaker Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 0 24 24" width="20px" fill="currentColor"><path d="M0 0h24v24H0z" fill="none"/><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
             {!isTTSEnabled && <span className="tts-disabled-line"></span>}
          </button>
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
            onClick={() => setShowObjectives(!showObjectives)}
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
         {/* STT Button */}
         <button 
            className={`stt-toggle-btn ${isListening ? 'listening' : ''}`}
            onClick={toggleListening}
            disabled={!recognitionRef.current || isLoading} // Disable if API not supported or loading response
            aria-label={isListening ? "Stop listening" : "Start voice input"}
            title={isListening ? "Stop listening" : "Start voice input"}
         >
            {/* Simple Mic Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0z" fill="none"/><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z"/></svg>
         </button>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSendMessage(); // Use modified handleSendMessage
            if (e.key === 'Escape') {
              if (isPracticeMode) {
                setIsPracticeMode(false);
                setInputValue('');
              } else {
                // Stop listening or speaking if navigating away
                if (isListening) recognitionRef.current?.stop();
                if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
                navigate('/');
              }
            }
          }}
          placeholder={isPracticeMode ? "Practice the corrected phrase..." : (isListening ? "Listening..." : "Type or use mic...")}
          disabled={isLoading || isListening} // Disable input while listening too
          className={isPracticeMode ? 'practice-mode' : ''}
        />
        <button 
          onClick={() => handleSendMessage()} // Use modified handleSendMessage
          disabled={isLoading || inputValue.trim() === '' || isListening} // Disable send while listening
          className={`${isLoading ? 'sending' : ''} ${isPracticeMode ? 'practice-mode' : ''}`}
        >
          {isLoading ? '...' : isPracticeMode ? 'Practice' : 'Send'} {/* Simpler loading text */}
        </button>
      </div>

      {showObjectives && (
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
      )}
    </div>
  );
};

export default ChatInterface;

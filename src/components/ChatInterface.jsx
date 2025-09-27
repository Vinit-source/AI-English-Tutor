import { useState, useEffect, useRef, useCallback } from 'react'; // Import useCallback
import { useParams, useNavigate } from 'react-router-dom';
import ObjectivesPanel from './ObjectivesPanel';
import ChatMessage from './ChatMessage';
import { getScenarioById, loadScenarioPrompt } from '../data/scenarioLoader';
import { userMemory } from '../utils/userMemory';
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
  const [scenarioData, setScenarioData] = useState(null);
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [lastCorrection, setLastCorrection] = useState('');
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const chatMessagesRef = useRef(null);
  const canvasRef = useRef(null);
  const conversationHistory = useRef([]);
  const [isListening, setIsListening] = useState(false);
  const [isTTSEnabled, setIsTTSEnabled] = useState(true); // TTS enabled by default
  const [isSpeaking, setIsSpeaking] = useState(false); // Track if TTS is active
  const recognitionRef = useRef(null);
  const utteranceRef = useRef(null); // Ref to keep track of the current utterance
  const objectivesPanelRef = useRef(null);

  // Get the stored language preference
  const userLanguage = localStorage.getItem('userLanguage') || 'hindi';

  // Focus the input field when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Initialize the chat (without welcome message)
  useEffect(() => {
    const welcomeMessage = `Welcome to the "${scenario.replace(/-/g, ' ')}" scenario! How can I help you practice your English today? (${getTranslation('Welcome', userLanguage)})`;
    setMessages([{ 
      type: 'ai', 
      content: welcomeMessage
    }]);
    // Don't auto-speak the welcome message - wait for user interaction

    // Reset conversation history and rate limits when scenario changes
    conversationHistory.current = [];
    setRateLimitedModels({
      gemini: false,
      mistral: false,
      gemma: false,
      deepseek: false
    });
    
    // Refocus input when scenario changes
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [scenario, userLanguage]);

  // Load objectives from scenario data
  useEffect(() => {
    const data = getScenarioById(scenario);
    setScenarioData(data);
    
    // First try to get objectives from scenario data
    if (data && data.objectives) {
      setObjectives(data.objectives.map(obj => ({ ...obj, completed: false })));
    } else {
      // Fallback: try to load objectives from localStorage (set by HomePage)
      const storedObjectives = localStorage.getItem('currentScenarioObjectives');
      if (storedObjectives) {
        try {
          const parsedObjectives = JSON.parse(storedObjectives);
          setObjectives(parsedObjectives);
        } catch (error) {
          console.error('Error parsing stored objectives:', error);
          setObjectives([]);
        }
      } else {
        setObjectives([]);
      }
    }
  }, [scenario]);

  // Record when user completes the chat (navigates away or closes)
  useEffect(() => {
    const handleBeforeUnload = () => {
      recordScenarioCompletion();
    };
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        recordScenarioCompletion();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      recordScenarioCompletion();
    };
  }, [objectives]);

  const recordScenarioCompletion = () => {
    const completedCount = objectives.filter(obj => obj.completed).length;
    const totalCount = objectives.length;
    
    if (totalCount > 0) {
      userMemory.recordScenarioCompletion(scenario, completedCount, totalCount);
    }
  };

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

  // Generate meaningful scenario title
  const getScenarioTitle = () => {
    if (scenarioData?.title) {
      // For adaptive scenarios, extract the topic and format it properly
      if (scenarioData.title.includes('- Adaptive')) {
        const topic = scenarioData.title.replace(' - Adaptive', '');
        return `Adaptive ${topic} Session`;
      }
      return scenarioData.title;
    }
    
    // Try to get scenario title from user memory if scenarioData is not available
    const memory = userMemory.getMemory();
    if (memory && memory.scenarioPreferences && memory.scenarioPreferences.favoriteScenarios) {
      const scenarioInfo = memory.scenarioPreferences.favoriteScenarios[scenario];
      if (scenarioInfo && scenarioInfo.title) {
        // For adaptive scenarios from memory, extract the topic and format it properly
        if (scenarioInfo.title.includes('- Adaptive')) {
          const topic = scenarioInfo.title.replace(' - Adaptive', '');
          return `Adaptive ${topic} Session`;
        }
        return scenarioInfo.title;
      }
    }
    
    // Handle different scenario types with meaningful names
    const scenarioId = scenario;
    
    if (scenarioId.startsWith('dynamic-') || scenarioId.startsWith('agentic-')) {
      // Extract topic from dynamic scenario ID
      const parts = scenarioId.split('-');
      if (parts.length >= 2) {
        const topic = parts.slice(1, -1).join(' '); // Remove 'dynamic'/'agentic' and timestamp
        return `Personalized ${topic.charAt(0).toUpperCase() + topic.slice(1)} Conversation`;
      }
    }
    
    if (scenarioId.startsWith('practice-')) {
      return `Practice Session: ${scenarioId.replace('practice-', '').replace(/-/g, ' ')}`;
    }
    
    if (scenarioId.startsWith('adaptive-')) {
      return `Adaptive Learning Session`;
    }
    
    // Default formatting for regular scenarios
    return scenarioId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };
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
      if (event.results.length > 0) {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript); // Update input field with transcript
        setError({ 
          message: `Heard: "${transcript}". You can edit it or press Send.`, 
          timestamp: Date.now(),
          type: 'success'
        });
        setTimeout(() => setError(null), 3000);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      
      let errorMessage = 'Voice input failed. ';
      switch(event.error) {
        case 'not-allowed':
          errorMessage += 'Please allow microphone access and try again.';
          break;
        case 'no-speech':
          errorMessage += 'No speech detected. Please try speaking again.';
          break;
        case 'audio-capture':
          errorMessage += 'No microphone found. Please check your microphone.';
          break;
        case 'network':
          errorMessage += 'Network error. Please check your connection.';
          break;
        default:
          errorMessage += `Error: ${event.error}`;
      }
      
      setError({ 
        message: errorMessage, 
        timestamp: Date.now(),
        type: 'warning'
      });
      setTimeout(() => setError(null), 5000);
    };

    recognition.onstart = () => {
      setIsListening(true);
      setError({ 
        message: 'Listening... Speak now!', 
        timestamp: Date.now(),
        type: 'info'
      });
      setTimeout(() => {
        if (isListening) setError(null);
      }, 2000);
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
    if (!recognitionRef.current) {
      setError({ 
        message: 'Voice input not available in this browser. Please type your message instead.', 
        timestamp: Date.now(),
        type: 'info'
      });
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setError(null); // Clear any listening messages
    } else {
      try {
        // Cancel TTS if it's speaking
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
          setIsSpeaking(false);
        }
        
        // Clear the input field when starting to listen
        setInputValue('');
        
        // Clear any existing errors
        setError(null);
        
        recognitionRef.current.start();
        
      } catch (e) {
        // Handle potential errors like starting recognition too soon after stopping
        console.error("Could not start recognition:", e);
        setError({ 
          message: "Could not start voice input. Please ensure microphone permissions are granted and try again.", 
          timestamp: Date.now(),
          type: 'warning'
        });
        setTimeout(() => setError(null), 5000);
        setIsListening(false);
      }
    }
  };

  // --- TTS (Speech Synthesis) Setup ---
  const speakText = useCallback((text) => {
    if (!isTTSEnabled || !text || typeof window.speechSynthesis === 'undefined') {
      return;
    }

    // Check if speech synthesis is supported
    if (!window.speechSynthesis) {
      console.warn('Speech synthesis not supported in this browser');
      return;
    }

    try {
      // Cancel any ongoing speech first
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }

      const englishTextToSpeak = extractEnglishText(text);
      if (!englishTextToSpeak || englishTextToSpeak.length === 0) return; // Don't speak if no English text found

      const utterance = new SpeechSynthesisUtterance(englishTextToSpeak);
      utterance.lang = 'en-US'; // Set language
      utterance.rate = 0.9; // Slightly slower for better comprehension
      utterance.pitch = 1.0; // Adjust pitch as needed
      utterance.volume = 0.8; // Slightly lower volume

      utterance.onstart = () => {
        setIsSpeaking(true);
        setError(null); // Clear any existing errors when speech starts successfully
      };
      
      utterance.onend = () => setIsSpeaking(false);
      
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event.error);
        setIsSpeaking(false);
        
        // Only show error if it's not a user-initiated cancellation
        if (event.error !== 'canceled' && event.error !== 'interrupted') {
          setError({ 
            message: `Text-to-speech error: ${event.error}. Click the speaker icon to try again.`, 
            timestamp: Date.now(),
            type: 'warning'
          });
          // Auto-clear TTS errors after 3 seconds
          setTimeout(() => setError(null), 3000);
        }
      };
      
      utteranceRef.current = utterance; // Store reference
      
      // Add a small delay to ensure proper initialization
      setTimeout(() => {
        if (utteranceRef.current === utterance) { // Make sure we're still trying to speak this utterance
          window.speechSynthesis.speak(utterance);
        }
      }, 100);

    } catch (error) {
      console.error('TTS initialization error:', error);
      setIsSpeaking(false);
      setError({ 
        message: 'Text-to-speech is not available. Your browser may not support this feature.', 
        timestamp: Date.now(),
        type: 'info'
      });
      setTimeout(() => setError(null), 3000);
    }
  }, [isTTSEnabled]); // Dependency on isTTSEnabled

  const toggleTTS = () => {
    const newState = !isTTSEnabled;
    setIsTTSEnabled(newState);
    
    if (!newState && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel(); // Stop speaking if TTS is disabled
      setIsSpeaking(false);
    } else if (newState && messages.length > 0) {
      // When enabling TTS, speak the last AI message if available
      const lastAIMessage = messages.slice().reverse().find(msg => msg.type === 'ai');
      if (lastAIMessage) {
        speakText(lastAIMessage.content);
      }
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
      if (inputRef.current) inputRef.current.focus();
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
      
      // Send to API with context about correction practice
      let response;
      let responseText;
      let aiResponseData = null;
      
      if (isCorrectingPractice) {
        responseText = `Perfect! That's exactly right. Let's continue our conversation. (${getTranslation('Perfect', userLanguage)})`;
        response = responseText;
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        // Normal API call for regular conversation
        aiResponseData = await getAIResponse(currentMessage, userLanguage, modelToUse, scenario);
        response = aiResponseData.reply || aiResponseData;
        responseText = response;
        
        // Handle learned words if available
        if (aiResponseData.learnedWords && aiResponseData.learnedWords.length > 0) {
          // Record learned words in user memory will be handled in recordConversation
        }
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
      
      // Record the conversation in user memory
      const cleanResponse = response.replace(regex, "");
      
      // Remove thinking indicator before adding AI response
      setMessages(prevMessages => [...prevMessages.filter(m => m.type !== 'thinking'), { type: 'ai', content: cleanResponse }]);
      
      // Speak the AI response
      speakText(cleanResponse); 
      
      const learnedWords = (typeof aiResponseData === 'object' && aiResponseData.learnedWords) ? aiResponseData.learnedWords : [];
      const learnedPhrases = (typeof aiResponseData === 'object' && aiResponseData.learnedPhrases) ? aiResponseData.learnedPhrases : [];
      
      // Save the conversation in user memory with learned words and phrases
      userMemory.recordConversation(currentMessage, cleanResponse, scenario, learnedWords, learnedPhrases);

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
      
      return data; // Return full data object instead of just reply
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
    window.speakText = speakText; // Also expose speakText function
    
    return () => {
      delete window.enterPracticeMode;
      delete window.speakText;
    };
  }, [enterPracticeMode, speakText]); // Add speakText to dependency array

  // Add a handler for when user starts typing
  const handleInputChange = (e) => {
    // Close objectives panel when user starts typing
    if (showObjectives && e.target.value.trim() !== '') {
      handleCloseObjectives();
    }
    setInputValue(e.target.value);
  };

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
            {getScenarioTitle()}
            <span className="language-indicator">{userLanguage}</span>
          </span>
        </div>
        <div className="chat-controls">
          {/* TTS Toggle Button */}
          <button
            className={`tts-toggle-btn ${isTTSEnabled ? 'enabled' : ''} ${isSpeaking ? 'speaking' : ''}`}
            onClick={toggleTTS}
            aria-label={
              isSpeaking ? "Stop speech" : 
              isTTSEnabled ? "Disable Text-to-Speech" : "Enable Text-to-Speech"
            }
            title={
              isSpeaking ? "Stop speaking" :
              isTTSEnabled ? "Disable TTS" : "Enable TTS"
            }
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
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
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
          autoFocus
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
        <div ref={objectivesPanelRef}>
          <ObjectivesPanel 
            scenario={scenarioData?.title || scenario.replace(/-/g, ' ')}
            scenarioData={scenarioData}
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

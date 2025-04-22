import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ObjectivesPanel from './ObjectivesPanel';
import ChatMessage from './ChatMessage';
import '../styles/ChatInterface.css';

const ChatInterface = () => {
  const { scenario } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [showObjectives, setShowObjectives] = useState(false);
  const [llmModel, setLlmModel] = useState('gemini');
  const [isLoading, setIsLoading] = useState(false);
  const [rateLimitedModels, setRateLimitedModels] = useState({
    gemini: false,
    mistral: false,
    deepseek: false,
    nemotron: false
  });
  const [objectives, setObjectives] = useState([
    { id: 'item1', text: 'Ask how is your friend doing', completed: false },
    { id: 'item2', text: 'Ask how is everyone at his home', completed: false },
    { id: 'item3', text: 'Ask how is his work pressure', completed: false },
    { id: 'item4', text: 'Ask about his holiday plans for the weekend', completed: false }
  ]);
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [lastCorrection, setLastCorrection] = useState('');
  const messagesEndRef = useRef(null);
  const chatMessagesRef = useRef(null);
  const canvasRef = useRef(null);
  const conversationHistory = useRef([]);

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
      deepseek: false,
      nemotron: false
    });
  }, [scenario, userLanguage]);

  // Simple translation function for the welcome message
  const getTranslation = (text, language) => {
    const translations = {
      hindi: 'आपका स्वागत है',
      marathi: 'आपले स्वागत आहे',
      gujarati: 'આપનું સ્વાગત છે',
      bengali: 'আপনাকে স্বাগতম',
      tamil: 'வரவேற்கிறோம்',
      telugu: 'మీకు స్వాగతం',
      kannada: 'ಸ್ವಾಗತ',
      malayalam: 'സ്വാഗതം'
    };
    return translations[language] || text;
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
    const availableModels = ['gemini', 'mistral', 'deepseek', 'nemotron'].filter(
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
      // Retrieve API keys from environment variables
      const apiKeys = {
        gemini: import.meta.env.VITE_GEMINI_API_KEY,
        mistral: import.meta.env.VITE_MISTRAL_API_KEY,
        openrouter: import.meta.env.VITE_OPENROUTER_API_KEY, // For deepseek and nemotron
        deepseek: import.meta.env.VITE_DEEPSEEK_API_KEY
      };

      // Create the system message with the scenario context
      const systemPrompt = `
        You are a friendly English tutor engaging in a "${scenario.replace(/-/g, ' ')}" conversation with an Indian student (${language} speaker). 
        
        CONVERSATION OBJECTIVES: Guide the student to naturally explore English by steering the conversation to cover these objectives: 
        1. Ask how you are. 
        2. Ask how everyone at your home is. 
        3. Ask how your work pressure is. 
        4. Ask about your holiday plans for the weekend. 

        FEEDBACK PROTOCOL:
        1. When the student CORRECTLY fulfills an objective using proper English, add the corresponding objective number in square brackets (e.g., [1]) at the beginning of your response, then continue the natural conversation.
        
        2. When the student makes grammatical or sentence formation mistakes:
           a. First clearly acknowledge what they're trying to communicate
           b. Then say "You should say:" followed by the corrected English phrase in quotes
           c. Briefly explain the grammar rule if necessary
           d. End your message by asking them to try repeating the corrected phrase
        
        3. When the student correctly repeats a phrase you've corrected:
           a. Give positive reinforcement ("Excellent!" or "Perfect!")
           b. Continue the conversation naturally
        
        FORMAT: For every response, provide your answer in English first, followed by its literal translation into ${language} enclosed in parentheses.
        
        EXAMPLE CORRECTION:
        Student: "I am go to market yesterday."
        You: "I understand you went shopping yesterday. You should say: "I went to the market yesterday." In English, we use past tense (went) for actions completed in the past. Could you try saying that correct sentence? (मैं समझता हूँ कि आप कल शॉपिंग के लिए गए थे। आपको कहना चाहिए: "I went to the market yesterday." अंग्रेज़ी में, हम भूतकाल में पूर्ण कार्यों के लिए past tense (went) का उपयोग करते हैं। क्या आप उस सही वाक्य को कहने की कोशिश कर सकते हैं?)"
      `;

      // Add the message to conversation history
      conversationHistory.current.push({
        role: 'user',
        content: message
      });

      try {
        // Call the appropriate model API based on selection
        let response;
        switch (model) {
          case 'gemini': {
            if (!apiKeys.gemini) {
              throw new Error('Gemini API key not found');
            }
            response = await callGeminiAPI(apiKeys.gemini, conversationHistory.current, systemPrompt, language);
            break;
          }
          case 'mistral': {
            if (!apiKeys.mistral) {
              throw new Error('Mistral API key not found');
            }
            response = await callMistralAPI(apiKeys.mistral, conversationHistory.current, systemPrompt, language);
            break;
          }
          case 'deepseek': {
            if (!apiKeys.openrouter) {
              throw new Error('OpenRouter API key not found for Deepseek');
            }
            response = await callOpenRouterAPI(
              apiKeys.openrouter, 
              'deepseek/deepseek-r1:free', 
              conversationHistory.current, 
              systemPrompt, 
              language
            );
            break;
          }
          case 'nemotron': {
            if (!apiKeys.openrouter) {
              throw new Error('OpenRouter API key not found for Nemotron');
            }
            response = await callOpenRouterAPI(
              apiKeys.openrouter, 
              'nvidia/llama-3.1-nemotron-nano-8b-v1:free', 
              conversationHistory.current, 
              systemPrompt, 
              language
            );
            break;
          }
          default: {
            // Fallback to server API
            response = await callServerAPI(message, language, model, scenario);
            break;
          }
        }
        return response;
      } catch (error) {
        // Handle rate limiting and other errors
        if (error.message.includes('429') || error.message.includes('rate limit')) {
          // Mark the model as rate limited
          setRateLimitedModels(prev => ({ ...prev, [model]: true }));
          
          // Try with another model if available
          const newModel = findAvailableModel();
          if (newModel !== model && newModel !== 'server') {
            console.log(`Trying with ${newModel} after ${model} was rate limited`);
            return await getAIResponse(message, language, newModel, scenario);
          } else {
            // Fall back to server API as last resort
            return await callServerAPI(message, language, 'fallback', scenario);
          }
        }
        throw error;
      }
    } catch (error) {
      console.error('Error in AI response:', error);
      return 'Sorry, I had trouble connecting to the AI service. Please try again with a different model.';
    }
  };

  // Helper function to call the server API
  const callServerAPI = async (message, language, model, scenario) => {
    const baseUrl = import.meta.env.VITE_SERVER_URL || 'https://ai-english-tutor-opal.vercel.app';
    const response = await fetch(`${baseUrl}/api/scenario/${scenario}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, language, model }),
    });

    if (!response.ok) {
      throw new Error(`Server API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Store the AI response in conversation history
    conversationHistory.current.push({
      role: 'assistant',
      content: data.reply
    });
    
    return data.reply;
  };

  // Helper function to call Gemini API
  const callGeminiAPI = async (apiKey, messages, systemPrompt, language) => {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    
    // Get all previous messages for context
    const contextMessages = messages.slice(-5); // Limit to the 5 most recent messages
    const userMessage = contextMessages[contextMessages.length - 1].content;
    
    // Structure the payload for Gemini with more context
    const payload = {
      contents: [
        {
          parts: [{ text: systemPrompt }]
        },
        ...contextMessages.slice(0, -1).map(msg => ({
          parts: [{ text: msg.content }],
          role: msg.role === 'user' ? 'user' : 'model'
        })),
        {
          parts: [{ text: userMessage }],
          role: 'user'
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024
      }
    };
    
    try {
      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const aiResponse = data.candidates[0].content.parts[0].text;
        
        // Store the AI response in conversation history
        conversationHistory.current.push({
          role: 'assistant',
          content: aiResponse
        });
        
        return aiResponse;
      }
      
      throw new Error('Invalid response format from Gemini API');
    } catch (error) {
      // If rate limited, mark the model as unavailable
      if (error.message.includes('429')) {
        setRateLimitedModels(prev => ({ ...prev, gemini: true }));
      }
      throw error;
    }
  };

  // Helper function to call Mistral API
  const callMistralAPI = async (apiKey, messages, systemPrompt, language) => {
    const mistralUrl = 'https://api.mistral.ai/v1/chat/completions';
    
    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(msg => ({ role: msg.role, content: msg.content }))
    ];
    
    const payload = {
      model: 'open-mistral-nemo',
      messages: formattedMessages,
      temperature: 0.7,
      max_tokens: 1024
    };
    
    try {
      const response = await fetch(mistralUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error(`Mistral API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        const aiResponse = data.choices[0].message.content;
        
        // Store the AI response in conversation history
        conversationHistory.current.push({
          role: 'assistant',
          content: aiResponse
        });
        
        return aiResponse;
      }
      
      throw new Error('Invalid response format from Mistral API');
    } catch (error) {
      // If rate limited, mark the model as unavailable
      if (error.message.includes('429')) {
        setRateLimitedModels(prev => ({ ...prev, mistral: true }));
      }
      throw error;
    }
  };

  // Helper function to call OpenRouter API (for Deepseek and Nemotron)
  const callOpenRouterAPI = async (apiKey, modelId, messages, systemPrompt, language) => {
    const openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
    
    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(msg => ({ role: msg.role, content: msg.content }))
    ];
    
    const payload = {
      model: modelId,
      messages: formattedMessages,
      temperature: 0.7,
      max_tokens: 1024
    };
    
    try {
      const response = await fetch(openRouterUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'AI English Tutor'
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        const aiResponse = data.choices[0].message.content;
        
        // Store the AI response in conversation history
        conversationHistory.current.push({
          role: 'assistant',
          content: aiResponse
        });
        
        return aiResponse;
      }
      
      throw new Error('Invalid response format from OpenRouter API');
    } catch (error) {
      // If rate limited, mark the model as unavailable
      if (error.message.includes('429')) {
        if (modelId.includes('deepseek')) {
          setRateLimitedModels(prev => ({ ...prev, deepseek: true }));
        } else if (modelId.includes('nemotron')) {
          setRateLimitedModels(prev => ({ ...prev, nemotron: true }));
        }
      }
      throw error;
    }
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
      <div className="chat-header">
        <span className="chat-title">{scenario.replace(/-/g, ' ')}</span>
        <select
          value={llmModel}
          onChange={(e) => setLlmModel(e.target.value)}
          className="llm-model"
        >
          <option value="mistral">Mistral</option>
          <option value="gemini">Gemini</option>
          <option value="deepseek">Deepseek</option>
          <option value="nemotron">NVIDIA Nemotron</option>
        </select>
        <button
          className="objectives-btn"
          onClick={() => setShowObjectives(!showObjectives)}
        >
          ☰
        </button>
      </div>
      
      <div className="chat-messages" ref={chatMessagesRef}>
        <canvas ref={canvasRef} id="chatCanvas"></canvas>
        {messages.map((message, index) => (
          <ChatMessage 
            key={index} 
            type={message.type} 
            content={message.content} 
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

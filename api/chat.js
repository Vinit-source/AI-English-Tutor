import fetch from 'node-fetch';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import fs from 'fs/promises';

// Get the directory path for the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure dotenv to look for .env in the project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Load system prompt from file
async function loadSystemPrompt(scenario, language = 'hindi') {
  try {
    let promptContent;
    
    // Check if it's a dynamic scenario
    if (scenario.startsWith('dynamic-') || scenario.startsWith('agentic-') || 
        scenario.startsWith('practice-') || scenario.startsWith('adaptive-')) {
      // Generate dynamic prompt
      promptContent = generateDynamicPrompt(scenario, language);
    } else {
      // Load static prompt
      const promptPath = path.join(__dirname, '..', 'src', 'prompts', `${scenario}.txt`);
      promptContent = await fs.readFile(promptPath, 'utf8');
    }
    
    // Add language information and structured response format
    promptContent += `
    
IMPORTANT INSTRUCTIONS:

LANGUAGE: Please provide translations in ${language.toUpperCase()}. The user's preferred language is ${language}.

LEARNED WORDS DETECTION:
Only mark a word as "learned" if you are truly convinced the user has mastered it based on:
- Correct usage in context (multiple times)
- Proper grammar and natural phrasing
- Confident usage without hesitation
- Understanding of nuances and appropriate situations for use

Mark words as learned ONLY when confidence level is >= 0.8 (very confident).
Examples of when to mark as learned:
- User uses advanced vocabulary correctly and naturally
- User demonstrates understanding of word meanings through context
- User uses words appropriately in different sentence structures
- User shows they understand subtle differences between similar words

Do NOT mark as learned if:
- User makes basic mistakes with the word
- Usage seems forced or unnatural
- User appears to be guessing the meaning
- Word is used only once or in a simple context

LEARNED PHRASES DETECTION:
Similarly to words, mark phrases as "learned" only when you are convinced the user has mastered them:
- Natural use of idiomatic expressions
- Correct usage of phrasal verbs
- Proper sentence structures and patterns
- Complex grammatical constructions used correctly

Mark phrases as learned ONLY when confidence level is >= 0.8 (very confident).

RESPONSE FORMAT:
You MUST respond with valid JSON in the following structure:
{
  "englishResponse": "Your main English response here",
  "localTranslation": "Translation in ${language} here", 
  "learnedWords": [
    {
      "english": "word",
      "translation": "translation in ${language}",
      "confidence": 0.85
    }
  ],
  "learnedPhrases": [
    {
      "english": "phrase or idiom",
      "translation": "translation in ${language}",
      "confidence": 0.85,
      "type": "idiom" // or "phrasal_verb", "expression", "pattern"
    }
  ]
}

CORRECTION FORMAT:
When correcting the user's English, use the exact phrase "You could say: <<CORRECTION>>" where <<CORRECTION>> is your suggested correction in double quotes.

Example JSON response:
{
  "englishResponse": "Great job using that vocabulary! You could say: \\"I would like to explore this topic further.\\" This sounds more natural.",
  "localTranslation": "${language.toUpperCase()}: बहुत बढ़िया! आप कह सकते हैं...",
  "learnedWords": [
    {
      "english": "explore",
      "translation": "अन्वेषण करना",
      "confidence": 0.9
    }
  ],
  "learnedPhrases": [
    {
      "english": "explore this topic further",
      "translation": "इस विषय को और गहराई से जानना",
      "confidence": 0.85,
      "type": "expression"
    }
  ]
}

AGENTIC ADAPTATION:
- Pay attention to the user's vocabulary level and adjust your responses accordingly
- If the user seems to struggle, provide more support and simpler alternatives
- If the user is doing well, gradually introduce more complex vocabulary and structures
- Remember context from the conversation to provide relevant, personalized responses`;
    
    
    return promptContent;
  } catch (error) {
    console.error(`Error loading prompt for scenario ${scenario}:`, error);
    return generateFallbackPrompt(scenario, language);
  }
}

function generateDynamicPrompt(scenario, language) {
  const scenarioType = scenario.split('-')[0]; // dynamic, agentic, practice, adaptive
  const scenarioDetails = scenario.split('-').slice(1).join(' ');
  
  let basePrompt = `You are a friendly English tutor conducting a personalized learning scenario with an Indian student who is practicing English conversation. Your role is to guide them through this interactive experience.

SCENARIO TYPE: ${scenarioType.toUpperCase()}
This is a dynamically generated scenario tailored to the user's learning patterns and interests.

KEY CONVERSATION OBJECTIVES:
1. [1] Engage in conversation appropriate to your skill level
2. [2] Express your thoughts and opinions clearly
3. [3] Ask relevant questions to keep the conversation flowing
4. [4] Practice vocabulary and grammar naturally in context

INTERACTION GUIDELINES:
- Be encouraging and adaptive to the user's level
- Guide the conversation naturally through the learning objectives
- Provide opportunities for the user to practice each objective
- Correct any grammatical mistakes gently
- Use vocabulary appropriate for the student's demonstrated level
- Be patient and supportive
- Drive the conversation to an end when all objectives are accomplished.

FEEDBACK PROTOCOL:
1. When the student correctly fulfills an objective - by correcting completing the objective IN THEIR OWN MESSAGE (role:user), add the corresponding number in brackets (e.g., [1]) at the start of your response
2. For grammar or phrasing mistakes:
   a. Acknowledge their meaning
   b. Use the exact phrase "You could say: <<CORRECTION>>" where <<CORRECTION>> is your suggested correction in double quotes
   c. Explanation if needed

Example of correction:
"I understand you want to talk about that topic. You could say: "I'd like to discuss this further." This is a more natural way to express interest in continuing the conversation."

AGENTIC BEHAVIOR:
- Adapt your teaching style based on the user's responses
- If the user makes frequent mistakes, slow down and provide more support
- If the user is confident, challenge them with more complex topics
- Reference topics the user has shown interest in when appropriate
- Encourage the user to explore new vocabulary related to their interests`;

  if (scenarioType === 'practice') {
    basePrompt += `

PRACTICE FOCUS:
This is a remedial practice session. The user has struggled with similar scenarios before.
- Be extra patient and encouraging
- Break down complex concepts into smaller parts
- Provide multiple examples
- Celebrate small victories`;
  }

  basePrompt += `

FORMAT:
{
  "englishResponse": "Great! Yes, let's explore this topic into detail. Suggest a sub-topic to start with.",
  "localTranslation": "बढ़िया! हाँ, आइए इस विषय पर विस्तार से चर्चा करें। शुरुआत के लिए कोई उप-विषय सुझाएँ।", // Assuming local language was selected as Hindi
  "learnedWords": [ // learned words from the user's previous message
    {
      "english": "explore",
      "translation": "अन्वेषण करना", 
      "confidence": 0.9
    }
  ],
  "learnedPhrases": [ // learned phrases from the user's previous message
    {
      "english": "explore this topic further",
      "translation": "इस विषय को और गहराई से जानना",
      "confidence": 0.85,
      "type": "expression"
    }
  ]
}`;

  return basePrompt;
}

function generateFallbackPrompt(scenario, language) {
  return `You are a friendly English tutor helping a student practice English conversation in scenario: ${scenario}.

KEY CONVERSATION OBJECTIVES:
1. [1] Engage in conversation appropriate to the scenario
2. [2] Express thoughts and opinions clearly
3. [3] Ask relevant questions to keep the conversation flowing
4. [4] Practice vocabulary and grammar naturally in context

INTERACTION GUIDELINES:
- Be encouraging and supportive
- Help them practice natural English conversation
- Correct mistakes gently using the correction format
- Adapt to their skill level
- Ask engaging questions to keep the conversation flowing
- Drive the conversation to an end when all objectives are accomplished.

FEEDBACK PROTOCOL:
1. When the student correctly fulfills an objective - by correcting completing the objective IN THEIR OWN MESSAGE (role:user), add the corresponding number in brackets (e.g., [1]) at the start of your response
2. For grammar or phrasing mistakes:
   a. Acknowledge their meaning
   b. Use the exact phrase "You could say: <<CORRECTION>>" where <<CORRECTION>> is your suggested correction in double quotes
   c. Explanation if needed

FORMAT:
{
  "englishResponse": "Great! Yes, let's explore this topic into detail. Suggest a sub-topic to start with.",
  "localTranslation": "बढ़िया! हाँ, आइए इस विषय पर विस्तार से चर्चा करें। शुरुआत के लिए कोई उप-विषय सुझाएँ।", // Assuming local language was selected as Hindi
  "learnedWords": [ // learned words from the user's previous message
    {
      "english": "explore",
      "translation": "अन्वेषण करना", 
      "confidence": 0.9
    }
  ],
  "learnedPhrases": [ // learned phrases from the user's previous message
    {
      "english": "explore this topic further",
      "translation": "इस विषय को और गहराई से जानना",
      "confidence": 0.85,
      "type": "expression"
    }
  ]
}`;
}

// Validate required environment variables
const requiredEnvVars = ['GEMINI_API_KEY', 'MISTRAL_API_KEY', 'OPENROUTER_API_KEY'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars.join(', '));
//   process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json());

// Rate limiting setup
const rateLimits = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS = 20; // 20 requests per minute

function isRateLimited(ip) {
  const now = Date.now();
  const userLimits = rateLimits.get(ip) || { count: 0, timestamp: now };
  
  if (now - userLimits.timestamp > RATE_LIMIT_WINDOW) {
    userLimits.count = 1;
    userLimits.timestamp = now;
    rateLimits.set(ip, userLimits);
    return false;
  }
  
  if (userLimits.count >= MAX_REQUESTS) {
    return true;
  }
  
  userLimits.count++;
  rateLimits.set(ip, userLimits);
  return false;
}

// Handler function that works for both Express and Vercel
async function chatHandler(req, res) {
  try {
    // Method validation
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed', details: 'Only POST requests are supported' });
    }

    // Rate limiting
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if (isRateLimited(clientIP)) {
      return res.status(429).json({ 
        error: 'Too many requests',
        details: 'Please wait a minute before making more requests'
      });
    }

    // Request body validation
    const { message, language, model, scenario, conversationHistory } = req.body;
    
    if (!message || !language || !model || !scenario) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: 'message, language, model, and scenario are required'
      });
    }

    // Create system prompt
    const systemPrompt = await loadSystemPrompt(scenario, language);
    if (!systemPrompt) {
      return res.status(500).json({ 
        error: 'Server error',
        details: 'Failed to load system prompt'
      });
    }

    // Model selection and API call with error handling
    let response;
    let usedFallback = false;
    try {
      switch (model) {
        case 'gemini': {
          response = await callGeminiAPI(process.env.GEMINI_API_KEY, message, systemPrompt, conversationHistory);
          break;
        }
        case 'mistral': {
          response = await callMistralAPI(process.env.MISTRAL_API_KEY, message, systemPrompt, conversationHistory);
          break;
        }
        case 'gemma':
        case 'deepseek': {
          response = await callOpenRouterAPI(
            process.env.OPENROUTER_API_KEY,
            model, // Just pass the model identifier
            message,
            systemPrompt,
            conversationHistory
          );
          break;
        }
        default: {
          throw new Error('Invalid model specified');
        }
      }
    } catch (modelError) {
      console.error(`Error with ${model} API:`, modelError);
      // Try fallback model if primary fails
      try {
        response = await callGeminiAPI(process.env.GEMINI_API_KEY, message, systemPrompt, conversationHistory);
        usedFallback = true;
      } catch (fallbackError) {
        throw new Error(`Both primary and fallback models failed: ${modelError.message}`);
      }
    }

    // Ensure response has consistent structure
    if (typeof response === 'string') {
      response = {
        reply: response,
        learnedWords: [],
        learnedPhrases: [],
        structured: false
      };
    }

    return res.status(200).json({ 
      reply: response.reply || response, // Handle both structured and plain responses
      learnedWords: response.learnedWords || [],
      learnedPhrases: response.learnedPhrases || [],
      structured: response.structured || false,
      usedFallback: usedFallback,
      fallbackModel: usedFallback ? 'gemini' : null
    });
  } catch (error) {
    console.error('Error in chat handler:', error);
    
    // Determine appropriate status code based on error
    let statusCode = 500;
    if (error.message.includes('API key')) statusCode = 401;
    else if (error.message.includes('rate limit')) statusCode = 429;
    else if (error.message.includes('Invalid model')) statusCode = 400;
    
    return res.status(statusCode).json({ 
      error: 'Server error',
      details: error.message
    });
  }
}

// Express route for local development
app.post('/api/chat', chatHandler);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
  });
});

// Start server if running locally
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  }).on('error', (err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

// Export for Vercel
export default chatHandler;

async function callGeminiAPI(apiKey, message, systemPrompt, conversationHistory) {
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    
    // Format messages according to Gemini's requirements
    const formattedHistory = conversationHistory.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: systemPrompt }]
        },
        ...formattedHistory,
        {
          role: 'user',
          parts: [{ text: message }]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            englishResponse: {
              type: "string",
              description: "The main English response to the user"
            },
            localTranslation: {
              type: "string",
              description: "Translation of the English response in the user's local language"
            },
            learnedWords: {
              type: "array",
              description: "Array of words the user has demonstrated mastery of in this conversation",
              items: {
                type: "object",
                properties: {
                  english: {
                    type: "string",
                    description: "The English word the user has learned"
                  },
                  translation: {
                    type: "string",
                    description: "The translation of the word in the user's local language"
                  },
                  confidence: {
                    type: "number",
                    description: "Confidence level (0.0-1.0) that the user has truly learned this word",
                    minimum: 0.0,
                    maximum: 1.0
                  }
                },
                required: ["english", "translation", "confidence"]
              }
            },
            learnedPhrases: {
              type: "array",
              description: "Array of phrases, idioms, or expressions the user has demonstrated mastery of",
              items: {
                type: "object",
                properties: {
                  english: {
                    type: "string",
                    description: "The English phrase or expression the user has learned"
                  },
                  translation: {
                    type: "string",
                    description: "The translation of the phrase in the user's local language"
                  },
                  confidence: {
                    type: "number",
                    description: "Confidence level (0.0-1.0) that the user has truly learned this phrase",
                    minimum: 0.0,
                    maximum: 1.0
                  },
                  type: {
                    type: "string",
                    description: "Type of phrase: idiom, phrasal_verb, expression, or pattern",
                    enum: ["idiom", "phrasal_verb", "expression", "pattern"]
                  }
                },
                required: ["english", "translation", "confidence", "type"]
              }
            }
          },
          required: ["englishResponse", "localTranslation", "learnedWords", "learnedPhrases"]
        }
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response format from Gemini API');
    }

    const responseText = data.candidates[0].content.parts[0].text;
    
    try {
      // Try to parse JSON response
      const parsedResponse = JSON.parse(responseText);
      
      // Validate required fields
      if (!parsedResponse.englishResponse || !parsedResponse.localTranslation) {
        throw new Error('Missing required fields in structured response');
      }
      
      // Return structured response
      return {
        reply: `${parsedResponse.englishResponse} (${parsedResponse.localTranslation})`,
        learnedWords: parsedResponse.learnedWords || [],
        learnedPhrases: parsedResponse.learnedPhrases || [],
        structured: true
      };
    } catch (parseError) {
      // Fallback to plain text response if JSON parsing fails
      console.warn('Failed to parse structured response, falling back to plain text:', parseError.message);
      return {
        reply: responseText,
        learnedWords: [],
        learnedPhrases: [],
        structured: false
      };
    }
  } catch (error) {
    if (error.message.includes('429')) {
      throw new Error('Gemini API rate limit exceeded');
    }
    throw error;
  }
}

async function callMistralAPI(apiKey, message, systemPrompt, conversationHistory) {
  if (!apiKey) {
    throw new Error('Mistral API key not configured');
  }

  const url = 'https://api.mistral.ai/v1/chat/completions';
  
  const payload = {
    model: 'open-mistral-nemo',
    messages: [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map(msg => ({ role: msg.role, content: msg.content })),
      { role: 'user', content: message }
    ],
    temperature: 0.7,
    max_tokens: 1024
  };

  const response = await fetch(url, {
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
  if (!data.choices?.[0]?.message?.content) {
    throw new Error('Invalid response format from Mistral API');
  }

  return data.choices[0].message.content;
}

async function callOpenRouterAPI(apiKey, modelId, message, systemPrompt, conversationHistory) {
  if (!apiKey) {
    throw new Error('OpenRouter API key not configured');
  }

  try {
    // Updated endpoint
    const url = 'https://openrouter.ai/api/v1/chat/completions';
    
    // Updated model map with the two specific models requested
    const modelMap = {
      'gemma': 'google/gemma-3-27b-it:free',
      'deepseek': 'deepseek/deepseek-chat-v3-0324:free'
    };

    // Get the actual model ID to use
    const modelToUse = modelMap[modelId] || modelId;
    
    console.log(`Using OpenRouter model: ${modelToUse}`);

    const payload = {
      model: modelToUse,
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.map(msg => ({ role: msg.role, content: msg.content })),
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 1024
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.VERCEL_URL || 'http://localhost:3000',
        'X-Title': 'AI English Tutor'
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenRouter API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    if (!data.choices?.[0]?.message?.content) {
      console.error('OpenRouter invalid response:', JSON.stringify(data));
      throw new Error('Invalid response format from OpenRouter API');
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error('OpenRouter API error:', error);
    if (error.message.includes('429')) {
      throw new Error('OpenRouter API rate limit exceeded');
    }
    throw error;
  }
}
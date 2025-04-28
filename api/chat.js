import fetch from 'node-fetch';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

// Get the directory path for the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure dotenv to look for .env in the project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

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
    `;

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
        case 'deepseek':
        case 'nemotron': {
          response = await callOpenRouterAPI(
            process.env.OPENROUTER_API_KEY,
            model === 'deepseek' ? 'deepseek/deepseek-r1:free' : 'nvidia/llama-3.1-nemotron-nano-8b-v1:free',
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

    return res.status(200).json({ 
      reply: response,
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
        maxOutputTokens: 1024
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

    return data.candidates[0].content.parts[0].text;
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
    
    // Map model IDs to their correct values
    const modelMap = {
      'deepseek': 'deepseek/deepseek-R1:free',
      'nemotron': 'nvidia/llama-3.1-nemotron-nano-8b-v1:free',
    };

    const payload = {
      model: modelMap[modelId.split('/')[0]] || modelId,
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.map(msg => ({ role: msg.role, content: msg.content })),
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 1024,
      headers: {
        'HTTP-Referer': process.env.VERCEL_URL || 'http://localhost:3000',
        'X-Title': 'AI English Tutor'
      }
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
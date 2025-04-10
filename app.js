const express = require('express');
require('dotenv').config();
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Global conversation state
let conversation = [];
const messageLimit = 8; // Maximum messages allowed before conversation is ended
let messageCount = 0;
let stop = false;

// Function to call various LLM APIs by routing to the appropriate function.
async function callLLM(provider, messages, options = {}) {
    try {
        switch (provider.toLowerCase()) {
            case 'mistral': {
                const apiKey = process.env.MISTRAL_API_KEY;
                const model = 'open-mistral-nemo'; // Or another Mistral model
                return await callMistralAPI(apiKey, model, messages, options);
            }
            case 'openai': {
                const apiKey = process.env.OPENAI_API_KEY;
                const model = 'gpt-3.5-turbo'; // Or another OpenAI model
                return await callOpenAIAPI(apiKey, model, messages, options);
            }
            case 'gemini': {
                const apiKey = process.env.GEMINI_API_KEY;
                const model = 'gemini-2.0-flash'; // Or another Gemini model
                return await callGeminiAPI(apiKey, model, messages, options);
            }
            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }
    } catch (error) {
        console.error(`Error calling ${provider} API:`, error.response ? error.response.data : error.message);
        throw error;
    }
}

// Mistral API function: Makes the request and extracts the assistant’s reply.
async function callMistralAPI(apiKey, model, messages, options = {}) {
    const response = await axios.post(
        'https://api.mistral.ai/v1/chat/completions',
        { model, messages, ...options },
        { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
    );
    return response.data.choices[0].message.content;
}

// OpenAI API function: Makes the request and extracts the assistant’s reply.
async function callOpenAIAPI(apiKey, model, messages, options = {}) {
    const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        { model, messages, ...options },
        { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
    );
    return response.data.choices[0].message.content;
}

// Gemini API function: Makes the request and extracts the assistant’s reply.
// Here we assume Gemini returns a "candidates" array with each candidate containing a "content" field.
async function callGeminiAPI(apiKey, model, messages, options = {}) {
    const parts = messages.map(msg => {
        return { text: msg.content };
    });

    const payload = {
        contents: {
            parts: parts
        },
        ...options
    };

    console.log(JSON.stringify(payload)); // Log the payload for debugging

    const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        payload,
        { headers: { 'Content-Type': 'application/json' } }
    );

    return (response.data.candidates &&
            response.data.candidates[0] &&
            response.data.candidates[0].content &&
            response.data.candidates[0].content.parts &&
            response.data.candidates[0].content.parts[0])
          ? response.data.candidates[0].content.parts[0].text
          : "No valid response received from Gemini.";
}

app.post('/scenario/over-a-phone-call', async (req, res) => {
    try {
        if (stop) {
            return res.status(400).json({ error: "Conversation ended due to message limit exceeded." });
        }
        const userMessage = req.body.message;
        const userLanguage = req.body.language || 'Hindi';
        const llmModel = req.body.model || 'mistral';

        // Add the system prompt only once at the beginning
        if (conversation.length === 0) {
            const scenarioInstructions = `You are a friendly English tutor engaging in a phone call-style conversation with an Indian student (${userLanguage} speaker). Guide the student to naturally explore English by steering the conversation to cover these objectives: 
1. Ask how you are. 
2. Ask how everyone at your home is. 
3. Ask how your work pressure is. 
4. Ask about your holiday plans for the weekend. 

Instructions: 

When the student correctly fulfills an objective (using the proper English words), simply reply with the corresponding objective number in square brackets (e.g., [1]) and continue the conversation. 

If you receive a "[S]" from the student, immediately conclude and end the conversation. 

If the student makes any grammatical or sentence formation mistakes, politely correct them by exemplifying the correct sentence once and nudge them to repeat it correctly. Continue the conversation regardless of whether they repeat correctly. 

For every output, provide the response in English first, followed by a translation into ${userLanguage} enclosed in parentheses.`;
            conversation.push({ role: 'system', content: scenarioInstructions });
        }

        // Append the new user message to the conversation history.
        conversation.push({ role: 'user', content: userMessage });

        // Use the callLLM function to get the assistant's reply (already extracted per provider).
        const assistantReply = await callLLM(llmModel, conversation);

        // Append the assistant's reply to the conversation history.
        conversation.push({ role: 'assistant', content: assistantReply });

        // Increment the message count (each user message and assistant reply are counted).
        messageCount += 2; // 1 for user message and 1 for assistant reply

        if (messageCount >= messageLimit) {
            stop = true;
        }

        res.json({ reply: assistantReply });
    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).send('Error processing your request');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
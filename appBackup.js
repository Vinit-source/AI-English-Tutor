const express = require('express');
require('dotenv').config();
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Function to call various LLM APIs
async function callLLM(provider, messages, options = {}) {
    try {
        let apiKey, model;

        switch (provider.toLowerCase()) {
            case 'mistral':
                apiKey = process.env.MISTRAL_API_KEY;
                model = 'open-mistral-nemo'; // Or another Mistral model
                return await callMistralAPI(apiKey, model, messages, options);
            case 'openai':
                apiKey = process.env.OPENAI_API_KEY;
                model = 'gpt-3.5-turbo'; // Or another OpenAI model
                return await callOpenAIAPI(apiKey, model, messages, options);
            case 'gemini':
                apiKey = process.env.GEMINI_API_KEY;
                model = 'gemini-1.5-pro'; // Or another Gemini model
                return await callGeminiAPI(apiKey, model, messages, options);
            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }
    } catch (error) {
        console.error(`Error calling ${provider} API:`, error.response ? error.response.data : error.message);
        throw error; // Re-throw for higher-level error handling
    }
}

// Mistral API function
async function callMistralAPI(apiKey, model, messages, options = {}) {
    const response = await axios.post(
        'https://api.mistral.ai/v1/chat/completions',
        { model, messages, ...options },
        { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
    );
    return response.data;
}

// OpenAI API function (replace with your actual implementation)
async function callOpenAIAPI(apiKey, model, messages, options = {}) {
    const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        { model, messages, ...options },
        { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
    );
    return response.data;
}

// Gemini API function (replace with your actual implementation)
async function callGeminiAPI(apiKey, model, messages, options = {}) {
    const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {contents: messages, ...options},
        { headers: { 'Content-Type': 'application/json' }}
    );

    return response.data;
}

let messageCount = 0;
const messageLimit = 8; // Set the limit for messages in the conversation
let stop = false;
let messages = [];

app.post('/scenario/over-a-phone-call', async (req, res) => {
    try {
        if (stop) {
            return res.status(400).json({ error: "Conversation ended due to message limit exceeded." });
        }
        const userMessage = req.body.message;
        const userLanguage = req.body.language; // Default to Hindi if no language is provided
        const llmModel = req.body.model; // Default to Mistral if no model is provide

        const scenarioInstructions = `You are a friendly English tutor engaging in a phone call-style conversation with an Indian student (${userLanguage} speaker). Guide the student to naturally explore English by steering the conversation to cover these objectives: 
        1. Ask how you are. 
        2. Ask how everyone at your home is. 
        3. Ask how your work pressure is. 
        4. Ask about your holiday plans for the weekend. 

Instructions: 

When the student correctly fulfills an objective (using the proper English words), simply reply with the corresponding objective number in square brackets (e.g., [1]) and continue the conversation. 

If you receive a "[S]" from the student, immediately conclude and end the conversation. 

If the student makes any grammatical or sentence formation mistakes, politely correct them by exemplifying the correct sentence once, and nudge them to repeat it correctly. Continue the conversation regardless of whether they repeat correctly. 

For every output, provide the response in English first, followed by a translation into ${userLanguage} enclosed in parentheses.`;
        if(messageCount === 0) {
        messages = [
            { role: 'system', content: scenarioInstructions },
            { role: 'user', content: userMessage },
        ];
    } else {
        messages = [
            { role: 'user', content: userMessage },
        ];
    }

        // Use the callLLM function with provider selection
        const responseData = await callLLM(llmModel, messages); 
        const assistantReply = responseData.choices[0].message.content;


        messageCount += 1;
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
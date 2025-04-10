const express = require('express');
require('dotenv').config();
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Function to call the Mistral API
async function callMistralAPI(apiKey, model, messages) {
    try {
        const response = await axios.post(
            'https://api.mistral.ai/v1/chat/completions',
            {
                model: model,
                messages: messages,
            },
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        return response.data;
    } catch (error) {
        console.error('Error calling Mistral API:', error.response ? error.response.data : error.message);
        throw error; // Re-throw the error for handling in the route
    }
}

let messageCount = 0;
const messageLimit = 12;
let stop = false;

app.post('/scenario/over-a-phone-call', async (req, res) => {
    try {
        if (stop) {
            return res.status(400).json({ error: "Conversation ended due to message limit exceeded." });
        }
        const userMessage = req.body.message;

        const scenarioInstructions = "The current thread is a phone call conversation scenario. You have to let the user explore English through this conversation. You are the user's friend.\n\nThese are the objectives that the user should complete by the end of this short conversation:\n1. Ask how you are\n2. Ask how everyone at your home is\n3. Ask how your work pressure is\n4. Ask about your holiday plans for the weekend\n\nImportant: Drive the conversation to complete the objectives. Once all objectives are complete, take the conversation to an end. If you receive a '[S]' in the user's message, conclude and end the conversation. When the user fulfills any objective, just reply with the number of the objective within [] in your next message and continue with the flow of the conversation. An objective is fulfilled only when the user speaks the right words related to that objective in English.";

        const messages = [
            { role: 'system', content: scenarioInstructions },
            { role: 'user', content: userMessage },
        ];

        // Use the callMistralAPI function
        const responseData = await callMistralAPI(process.env.MISTRAL_API_KEY, 'open-mistral-nemo', messages);
        console.log(responseData.choices[0].message.content);
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
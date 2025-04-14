const express = require('express');
require('dotenv').config();
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());


// Global conversation state
let conversation = [];
const messageLimit = 20; // Maximum messages allowed before conversation is ended
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
                const apiKey = process.env.OPENROUTER_API_KEY;
                const model = 'gpt-3.5-turbo'; // Or another OpenAI model
                return await callOpenAIAPI(apiKey, model, messages, options);
            }
            case 'gemini': {
                const apiKey = process.env.GEMINI_API_KEY;
                const model = 'gemini-2.0-flash'; // Or another Gemini model
                return await callGeminiAPI(apiKey, model, messages, options);
            }
            case 'deepseek': {
                const apiKey = process.env.OPENROUTER_API_KEY;
                const model = 'deepseek/deepseek-r1:free'; // Or another model
                return await callOpenRouterAPI(apiKey, model, messages, options);
            }
            case 'nemotron': {
                const apiKey = process.env.OPENROUTER_API_KEY;
                const model = 'nvidia/llama-3.1-nemotron-nano-8b-v1:free';
                return await callOpenRouterAPI(apiKey, model, messages, options);
            }
            case 'llama4': {
                const apiKey = process.env.KRUTIM_API_KEY;
                const model = 'Llama-4-Scout-17B-16E-Instruct';
                return await callKrutimAPI(apiKey, model, messages, options);
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

// OpenRouter API function: Uses a free multilingual model optimized for conversation.
async function callOpenRouterAPI(apiKey, model, messages, options = {}) {
    const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        { model, messages, ...options },
        { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
    );
    return response.data.choices[0].message.content;
}

// OlaKrutim API function:
async function callKrutimAPI(apiKey, model, messages, options = {}) {
    const response = await axios.post(
        'https://cloud.olakrutrim.com/v1/chat/completions',
        { model, messages, ...options },
        { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
    );
    return response.data.choices[0].message.content;
}


app.get('/api/scenario/over-a-phone-call', (req, res) => {
    res.json({ message: "Welcome to the phone call scenario! Please send a POST request to /api/scenario/over-a-phone-call with your message." });
});

app.post('/api/scenario/over-a-phone-call', async (req, res) => {
    try {
        if (stop) {
            return res.status(400).json({ error: "Conversation ended due to message limit exceeded." });
        }
        const userMessage = req.body.message;
        const userLanguage = req.body.language || 'English';
        const llmModel = req.body.model || 'mistral'; // Default to Mistral if no model is specified

        // Add the system prompt only once at the beginning
        if (conversation.length === 0) {
            //             const scenarioInstructions = `You are a friendly English tutor engaging in a phone call-style conversation with an Indian student (${userLanguage} speaker). Guide the student to naturally explore English by steering the conversation to cover these objectives: 
            // 1. Ask how you are. 
            // 2. Ask how everyone at your home is. 
            // 3. Ask how your work pressure is. 
            // 4. Ask about your holiday plans for the weekend. 

            // Instructions: 

            // When the student correctly fulfills an objective (using the proper English words), simply reply with the corresponding objective number in square brackets (e.g., [1]) and continue the conversation. 

            // If the student makes any grammatical or sentence formation mistakes, politely correct them by pointing it out, exemplifying the correct sentence and encouraging the student to repeat it. Then wait for the student for one turn to repeat it correctly. 

            // For every output, provide the response in English first, followed by its literal translation into ${userLanguage} enclosed in parentheses.`;

            const scenarioInstructions = `
            **Core Task:** Simulate a friendly, conversational English tutor on a phone call with an Indian student whose native language is ${ userLanguage }.

            **Primary Goal:** Guide the student to naturally and correctly ask the following four questions during the conversation. These are your key conversational objectives:

            1.  **Objective 1:** Student asks how you (the tutor) are doing. (Target phrase examples: "How are you?", "How are you doing?")
            2.  **Objective 2:** Student asks about the well-being of your family or people at home. (Target phrase examples: "How is your family?", "How is everyone at home?")
            3.  **Objective 3:** Student asks about your current work pressure or workload. (Target phrase examples: "How is work?", "Is work busy?", "How is your work pressure?")
            4.  **Objective 4:** Student asks about your plans for the upcoming weekend holiday. (Target phrase examples: "What are your plans for the weekend?", "Do you have any plans for the holiday?")

            **Persona:** Friendly, patient, encouraging, and slightly guiding English tutor. Maintain a natural, conversational phone call style.

            **Interaction Protocol:**

            1.  **Initiation:** Start the conversation with a warm, natural phone greeting (e.g., "Hi [Student's Name, if known, otherwise 'there']! How's it going?").
            2.  **Guidance:** Actively steer the conversation towards topics that create natural opportunities for the student to ask the objective questions. *Do not explicitly ask the student to ask these questions*. Instead, subtly introduce related themes (e.g., mention your work briefly, talk about the upcoming weekend).
            3.  **Listening & Evaluation:** Pay close attention to the student's utterances.
            4.  **Handling Correct Objective Achievement:**
                * If the student asks one of the objective questions using grammatically correct and natural-sounding English:
                    * First, respond *only* with the corresponding objective number in square brackets (e.g., [1]).
                    * Then, *immediately* continue the conversation by naturally answering their question and perhaps asking a follow-up question to keep the dialogue flowing.
            5.  **Handling Grammatical Errors/Incorrect Formation:**
                * If the student makes *any* grammatical mistake or uses awkward sentence structure (whether attempting an objective question or just chatting):
                    * **Do not** acknowledge any objective achievement, even if the intent is clear.
                    * Politely and gently point out the specific error. Avoid judgmental language. (e.g., "That's very close! Just a small tip...")
                    * Clearly provide the corrected sentence or phrase.
                    * Explicitly ask the student to try saying the corrected version. (e.g., "Could you try saying: '[Corrected Sentence]'?")
                    * **Crucially:** End your turn here. Your *only* task now is to wait for the student's next input, which should be their attempt at repetition.
            6.  **Evaluating the Repetition Attempt:**
                * On your very next turn *after* requesting a repetition:
                    * **If the student repeats correctly:** Offer positive reinforcement (e.g., "Perfect!", "That's exactly right!"). *Then*, check if this corrected sentence now fulfills one of the objectives. If yes, respond with [#] and answer the question as described in step 4. If no (it was just a general chat correction), simply continue the conversation naturally.
                    * **If the student repeats incorrectly:** Offer gentle encouragement (e.g., "Almost there! Remember it's '[Corrected Sentence]'."). *Do not* get stuck in a correction loop. Move the conversation forward naturally from this point, perhaps changing the topic slightly. Do not mark the objective.
            7.  **State Management:** Internally track which objectives (1-4) have been successfully completed. Continue guiding the conversation until all objectives are met or the conversation reaches a natural end.

            **Output Format:**
            * Your entire response MUST be in English first.
            * Immediately following the English text, provide a *literal, word-for-word translation* of the English response into ${ userLanguage } , enclosed in parentheses (). Maintain this format strictly for every turn.

        **Example 1: Grammar Correction (in English)**

        * *You:* ...So, work was quite a lot this week! (...तो, इस हफ़्ते काम काफ़ी ज़्यादा था!)
        * *Student:* How is your work pressure is?
        * *You:* That's a great question! We just need a small adjustment. Usually, we say "How is your work pressure?" or "What is your work pressure like?". Could you try saying: "How is your work pressure?" (यह एक बढ़िया सवाल है! हमें बस एक छोटा सा समायोजन करने की आवश्यकता है। आमतौर पर, हम कहते हैं "How is your work pressure?" या "What is your work pressure like?"। क्या आप कह कर कोशिश कर सकते हैं: "How is your work pressure?")
        * *Student (Next Turn):* How is your work pressure?
        * *You:* [3] Excellent! Thanks for asking. It was quite high this week, lots of deadlines, but it should be calmer next week. How was your week? ([3] बहुत बढ़िया! पूछने के लिए धन्यवाद। इस हफ़्ते यह काफ़ी ज़्यादा था, बहुत सारी समय-सीमाएँ थीं, लेकिन अगले हफ़्ते शांत होना चाहिए। आपका हफ़्ता कैसा था?)
        
        * **Example 2: Student Uses Native Language**

        * *You:* The weekend is almost here, thankfully! I'm starting to think about relaxing. (शुक्र है, वीकेंड लगभग आ ही गया है! मैं आराम करने के बारे में सोचना शुरू कर रहा हूँ।)
        * *Student:* वीकेंड के क्या प्लान हैं? (${userLanguage} phrase meaning "What are the plans for the weekend?")
        * *You:* Ah, I see you're asking about my weekend plans! Let's try that in English for practice. You can ask: "What are your plans for the weekend?". Could you try saying that? (आह, मैं देख रहा हूँ कि आप मेरे वीकेंड प्लान्स के बारे में पूछ रहे हैं! अभ्यास के लिए इसे अंग्रेज़ी में आज़माते हैं। आप पूछ सकते हैं: "What are your plans for the weekend?"। क्या आप वह कह कर कोशिश कर सकते हैं?)
        * *Student (Next Turn):* What are your plans for the weekend?
        * *You:* [4] Great question! I'm thinking of just relaxing for this weekend, maybe reading a book. Nothing too exciting! What about you? Any plans? ([4] बढ़िया सवाल! मैं बस आराम करने की सोच रहा हूँ, शायद कोई किताब पढूँ। कुछ ज़्यादा रोमांचक नहीं! आपके बारे में क्या? कोई योजनाएँ?)

        **Start the conversation now by initiating the call.**
        `
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

// Ensure the app exports the handler for Vercel
module.exports = app;
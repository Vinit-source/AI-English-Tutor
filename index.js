const express = require('express');
require('dotenv').config();
const { OpenAI } = require("openai");

const app = express();
app.use(express.json());
const cors = require('cors');
app.use(cors());

const openai = new OpenAI({
    apiKey: process.env['OPENAI_API_KEY'],
});

console.log(process.env['ASSISTANT_ID']);

let messageCount = 0;
const messageLimit = 5; // Message limiter - after this count of messages, the conversation should close.
let threadId;
let stop = false;

app.post('/scenario/over-a-phone-call', async (req, res) => {
    try {
        if (stop) {
            throw new MessageLimitExceededException("Conversation ended due to message limit exceeded.");
        }
        const userMessage = req.body.message;

        console.log(process.env['ASSISTANT_ID']);
        // OpenAI interaction logic
        const assistant = await openai.beta.assistants.retrieve(process.env['ASSISTANT_ID']);

        const thread = messageCount === 0 ? await openai.beta.threads.create() : await openai.beta.threads.retrieve(threadId);
        threadId = thread.id;

        scenarioInstructions = "The current thread is a phone call conversation scenario. You have to let the user explore English through this conversation. You are user's friend.\
\
These are the objectives that <strong>the user</strong> should complete by the end of this short conversation:\
1. Ask how you are\
2. Ask how are everyone at your home\
3. Ask how is your work pressure\
4. Ask about your holiday plans for the weekend\
\
Important: Drive the conversation to complete the objectives. Once all objectives are complete, take the conversation to an end. If you receive a '[S]' in user's message, conclude and end the conversation. When user fulfils any objective, just reply the number of the objective within [] in your next message and continue with the flow of the conversation. An objective is fulfilled only when user speaks the right words related to that objective <strong>in English</strong>.";

        await openai.beta.threads.messages.create(
            threadId,
            {
                role: "user",
                content: (messageCount > messageLimit) ? "[S]" + userMessage : userMessage,   // Prompt to conclude when messageLimit is passed
                // content: (messageCount > messageLimit) ? "[S]" + userMessage : userMessage, // Prompt to conclude when messageLimit is passed
            }
        );


        // Run the message
        run = await openai.beta.threads.runs.create(
            threadId,
            {
                assistant_id: assistant.id,
                additional_instructions: scenarioInstructions,
            });

        console.log(run);

        // Polling
        while (run.status !== "completed") {
            setTimeout(() => { }, 500);
            run = await openai.beta.threads.runs.retrieve(
                threadId,
                run.id
            );
            console.log(run.status);
        }

        const messages = await openai.beta.threads.messages.list(
            threadId
        );

        messageCount = messages.data.length;
        console.log(messageCount);

        res.json({ reply: messages }); // Send response back to HTTP client

        // Toggle `stop` to force stop the conversation to save expenses.
        if (messageCount > messageLimit) stop = true;
    } catch (error) {
        console.error("Error calling OpenAI API:", error);
        res.status(500).send('Error processing your request');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

class MessageLimitExceededException extends Error {
    constructor(message) {
        super(message);
        this.name = "MessageLimitExceededException";
        // Maintain proper stack trace (only available on V8 engines like Chrome and Node.js)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, MessageLimitExceededException);
        }
    }
}
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

app.post('/scenario/over-a-phone-call', async (req, res) => {
    try {
        const userMessage = req.body.message;

        // OpenAI API initializations
        const openai = new OpenAI({
            apiKey: process.env['OPENAI_API_KEY'],
        });

        console.log(process.env['ASSISTANT_ID']);
        // OpenAI interaction logic
        const assistant = await openai.beta.assistants.retrieve(process.env['ASSISTANT_ID']);

        console.log("After initialization: " + assistant.id);

        const thread = await openai.beta.threads.create();

        scenarioInstructions = "Instructions: This is a phone call conversation scenario. You have to let me explore English through this conversation. You are my friend.\
\
These are the objectives that I should complete by the end of this short conversation:\
1. Ask how are you\
2. Ask how is everyone at your home\
3. Ask how is work pressure\
4. Ask about your holiday plans for the weekend\
\
Throughout the conversation, you have to direct the conversation through your replies alone towards completion of these goals.\
\
When I fulfil any objective, just reply the number of the objective within [] in your next message and continue with the flow of the conversation. An objective is fulfilled only when I speak the right words related to that objective <strong>in English</strong>.";

        await openai.beta.threads.messages.create(
            thread.id,
            {
                role: "user",
                content: scenarioInstructions
            }
        );

        // // Run the scenarioInstruction
        // console.log("Run the scenarioInstruction: " + assistant.id);
        // let run = await openai.beta.threads.runs.create(
        //     thread.id,
        //     {
        //         assistant_id: assistant.id,
        //     }
        // );

        // console.log(run);

        // while (run.status !== "completed") {
        //     run = await openai.beta.threads.runs.retrieve(
        //         thread.id,
        //         run.id
        //     );
        //     console.log(run.status);
        // }

        await openai.beta.threads.messages.create(
            thread.id,
            {
                role: "user",
                content: userMessage
            }
        );

        // Run the user message
        run = await openai.beta.threads.runs.create(
            thread.id,
            {
                assistant_id: assistant.id,
            }
        );

        console.log(run);

        while (run.status !== "completed") {
            run = await openai.beta.threads.runs.retrieve(
                thread.id,
                run.id
            );
            console.log(run.status);
        }

        const messages = await openai.beta.threads.messages.list(
            thread.id
        );

        res.json({reply: messages}); // Send response back to HTTP client

    } catch (error) {
        console.error("Error calling OpenAI API:", error);
        res.status(500).send('Error processing your request');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
const express = require('express');
require('dotenv').config(); // To use environment variables
const { OpenAI } = require("openai")

const openai = new OpenAI({
    apiKey: process.env['OPENAI_API_KEY'], // This is the default and can be omitted
});

async function main() {
    const myAssistants = await openai.beta.assistants.list({
        order: "desc"
    });

    // console.log(myAssistants.data);

    for (let i = 0; i < myAssistants.data.length; i++) {
        const assistantId = myAssistants.data[i].id;
        console.log(assistantId);
        const deletedAssistant = await openai.beta.assistants.del(assistantId);
        console.log(deletedAssistant);

    }
}

main();
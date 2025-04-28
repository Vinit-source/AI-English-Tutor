# AI English Tutor App

A personalized AI-powered English learning companion designed specifically for Indian learners. Practice natural English conversations in everyday scenarios, with support for multiple Indian languages including Hindi, Marathi, Gujarati, Bengali, Tamil, Telugu, Kannada, and Malayalam.

## Why AI English Tutor?

- **Natural Conversations**: Practice English in real-life scenarios like ordering coffee, shopping, or making phone calls
- **Personalized Feedback**: Get instant, gentle corrections to improve your pronunciation and grammar
- **Mother Tongue Support**: Receive translations and explanations in your preferred Indian language
- **Practical Scenarios**: Learn through interactive role-play in common situations:
  - Making phone calls to friends
  - Ordering at restaurants and coffee shops
  - Shopping at stores
  - Attending classes and meetings
  - Celebrating special occasions

## Features

- **Interactive Role-Play**: Practice with AI that adapts to your learning pace
- **Multi-Language Support**: Choose from 8 Indian languages for translations
- **Progress Tracking**: Monitor your learning objectives in each scenario
- **Instant Corrections**: Learn from mistakes with helpful suggestions
- **Free**: Access to all basic scenarios at no cost

## Getting Started

Choose your preferred language, select a scenario, and start practicing! The AI tutor will guide you through natural conversations while providing helpful translations and corrections.

## Technical Setup

## Setting Up API Keys

The application supports multiple language models. To use them, you need to set up API keys in your environment:

1. Create a `.env` file in the root of the project
2. Add your API keys as follows:

```
GEMINI_API_KEY=your_gemini_api_key
MISTRAL_API_KEY=your_mistral_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
```

## Deployment Configuration

To deploy this application on Vercel, you need to configure the following environment variables in your Vercel project settings:

```
GEMINI_API_KEY=your_gemini_api_key
MISTRAL_API_KEY=your_mistral_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
```

These API keys are stored securely on Vercel and are only accessible by the backend serverless functions. Never expose these keys in your frontend code or version control.

## Supported Models

- **Gemini**: Google's Gemini model
- **Mistral**: Mistral AI's language model  
- **Deepseek**: Accessible via OpenRouter
- **NVIDIA Nemotron**: Accessible via OpenRouter

## Development

Run the development server:

```bash
npm run dev
```

## Build for Production

Create a production build:

```bash
npm run build
```

## Setting Up the Project

If this is your first time setting up:

```bash
# Install dependencies
npm install

# Set up necessary directories and assets
npm run setup
```
````


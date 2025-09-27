# AI English Tutor App

A personalized AI-powered English learning companion designed specifically for Indian learners. Practice natural English conversations in everyday scenarios, with support for multiple Indian languages including Hindi, Marathi, Gujarati, Bengali, Tamil, Telugu, Kannada, and Malayalam.

## 🤖 NEW: Agentic Behavior Features

The AI English Tutor now includes advanced agentic behavior capabilities inspired by AWS Strands agents framework, providing truly personalized learning experiences:

### 🧠 Intelligent User Memory System
- **Conversation Pattern Analysis**: Tracks your vocabulary usage, topic interests, and speaking patterns
- **Performance Monitoring**: Records scenario completion rates and identifies areas where you struggle
- **Adaptive Difficulty**: Automatically adjusts content difficulty based on your progress
- **Learning Insights**: Provides real-time statistics on your learning journey

### 🎯 Dynamic Scenario Generation
- **Interest-Based Scenarios**: Creates new scenarios based on topics you frequently discuss
- **Remedial Practice**: Generates focused practice sessions for challenging areas
- **Adaptive Content**: Adjusts scenario complexity to match your current skill level
- **Personalized Objectives**: Customizes learning goals based on your conversation patterns

### 📊 Smart Recommendations
- **Usage Analytics**: Shows weekly activity and vocabulary growth
- **Targeted Suggestions**: Recommends specific scenarios based on your learning needs
- **Progress Optimization**: Suggests difficulty adjustments when you're ready to advance
- **Topic Exploration**: Encourages practice in areas related to your interests

## Why AI English Tutor?

- **Natural Conversations**: Practice English in real-life scenarios like ordering coffee, shopping, or making phone calls
- **Personalized Feedback**: Get instant, gentle corrections to improve your pronunciation and grammar
- **Mother Tongue Support**: Receive translations and explanations in your preferred Indian language
- **Agentic Learning**: Experience truly adaptive learning that evolves with your progress
- **Practical Scenarios**: Learn through interactive role-play in common situations:
  - Making phone calls to friends
  - Ordering at restaurants and coffee shops
  - Shopping at stores
  - Attending classes and meetings
  - Celebrating special occasions
  - **Plus**: Dynamically generated scenarios based on your interests!

## Features

### Core Features
- **Interactive Role-Play**: Practice with AI that adapts to your learning pace
- **Multi-Language Support**: Choose from 8 Indian languages for translations
- **Progress Tracking**: Monitor your learning objectives in each scenario
- **Instant Corrections**: Learn from mistakes with helpful suggestions
- **Free**: Access to all basic scenarios at no cost

### 🆕 Agentic Features
- **Memory-Driven Learning**: System remembers your preferences, mistakes, and interests
- **Dynamic Scenario Creation**: New scenarios generated based on your conversation history
- **Adaptive Prompts**: AI responses tailored to your skill level and learning patterns
- **Smart Recommendations**: Personalized suggestions for optimal learning progression
- **Visual Learning Insights**: Real-time dashboard showing your learning statistics

## Scenario Types

### 📝 Standard Scenarios
Pre-built scenarios covering common situations like restaurants, shopping, and social interactions.

### ⭐ Personalized Scenarios  
Dynamically generated based on your interests and conversation topics.

### 🎯 Practice Scenarios
Focused sessions for areas where you need additional support.

### 🤖 Adaptive Scenarios
Content that automatically adjusts to your current skill level.

## Getting Started

Choose your preferred language, select a scenario, and start practicing! The AI tutor will guide you through natural conversations while learning from your interactions to provide increasingly personalized experiences.

The system will begin tracking your progress immediately, generating personalized recommendations and adaptive content as you use the application.

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


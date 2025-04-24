# AI English Tutor App

An interactive application to help non-English speakers practice English through role-play scenarios.

## Setting Up API Keys

The application supports multiple language models. To use them, you need to set up API keys in your environment:

1. Create a `.env` file in the root of the project
2. Add your API keys as follows:

```
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_MISTRAL_API_KEY=your_mistral_api_key
VITE_OPENROUTER_API_KEY=your_openrouter_api_key
VITE_DEEPSEEK_API_KEY=your_deepseek_api_key
```

## Supported Models

- **Gemini**: Google's Gemini model (requires Gemini API key)
- **Mistral**: Mistral AI's language model (requires Mistral API key)
- **Deepseek**: Accessible via OpenRouter (requires OpenRouter API key)
- **NVIDIA Nemotron**: Accessible via OpenRouter (requires OpenRouter API key)

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

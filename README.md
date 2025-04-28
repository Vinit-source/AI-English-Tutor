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

## Security Notice

All AI API calls are handled securely through Vercel Serverless Functions, ensuring that API keys are never exposed to the client. The frontend communicates with these functions through a secure API endpoint.

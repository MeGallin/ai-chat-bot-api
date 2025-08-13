# AI Chat Bot Project

This is a full-stack AI chat bot application featuring voice-powered interactions with OpenAI's GPT and text-to-speech capabilities.

## Features

### 🎤 Voice Interface
- **Speech Recognition**: Real-time voice input using Web Speech API
- **Auto-generation**: Automatically processes speech after 3 seconds of silence
- **Voice Commands**: 
  - "clear" / "reset" / "delete" - Clear current transcript
  - "send" / "submit" / "generate" / "over" - Manually trigger response generation
  - "start listening" / "begin" / "start" - Start voice recognition
  - "stop listening" / "stop" / "pause" - Stop voice recognition

### 🤖 AI Capabilities
- **GPT Integration**: Uses OpenAI's gpt-5-mini model for intelligent responses
- **Text-to-Speech**: Converts AI responses to natural speech using OpenAI's TTS API
- **Audio Playback**: Automatic playback with smart listening pause/resume

### 🔧 Technical Features
- **React 19**: Latest React with modern hooks and components
- **Material-UI**: Professional icons and responsive design
- **Security**: Rate limiting, CORS protection, input validation
- **Error Handling**: Graceful fallbacks for unsupported browsers

## Requirements

### Node.js Version
- **Recommended**: Node.js 20.19.0+ or 22.12.0+
- **Current**: Node.js 18.19.1 (works but with warnings)
- **Required for latest Vite/React features**

### Browser Compatibility
- **✅ Recommended**: Google Chrome (full support)
- **✅ Good**: Safari on macOS/iOS
- **⚠️ Limited**: Firefox (basic support)
- **❌ Poor**: Microsoft Edge (known issues)

### Environment Variables
Create `.env` files in both `/api` and `/client` directories:

#### API (.env)
```bash
OPENAI_API_KEY=your_openai_api_key_here
PORT=8000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

## Development Commands

### API Server
```bash
cd api
npm install
npm start        # Start with nodemon
npm run dev      # Alternative dev command
npm audit        # Check for vulnerabilities
```

### Client
```bash
cd client
npm install
npm run dev      # Start Vite dev server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## Project Structure
```
/api/                 # Backend API server
  ├── server.mjs      # Main Express server
  ├── package.json    # Dependencies & scripts
  └── .env            # Environment variables

/client/              # React frontend
  ├── src/
  │   ├── App.jsx     # Main app component
  │   └── components/
  │       └── recorder.jsx  # Voice interface component
  ├── package.json    # Dependencies & scripts
  └── .env            # Client environment variables
```

## How It Works

1. **Voice Input**: User speaks → Speech recognition captures text
2. **Processing**: After 3s silence → Text sent to OpenAI API
3. **AI Response**: GPT generates intelligent response
4. **Speech Output**: Response converted to speech → Auto-plays audio
5. **Ready**: Listening resumes automatically after playbook

## Recent Updates (2024-2025)

- ✅ Updated to latest React 19 and Vite 7.1.2
- ✅ Security vulnerabilities patched
- ✅ Enhanced browser compatibility warnings
- ✅ Improved error handling and user guidance
- ✅ Added comprehensive voice commands
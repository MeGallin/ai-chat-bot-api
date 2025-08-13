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

### 🚀 Realtime API Server (RECOMMENDED)
```bash
cd api
npm install
npm run realtime        # Start realtime WebSocket server
npm run start-realtime  # Alternative realtime command
```

### 📞 Legacy API Server (for comparison)
```bash
cd api
npm start        # Start legacy REST server
npm run dev      # Alternative dev command
npm audit        # Check for vulnerabilities
```

### Client (React + Vite)
```bash
cd client
npm install
npm run dev      # Start Vite dev server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

### 🔄 Quick Start (Dual Mode)
1. **Start Realtime Server**: `cd api && npm run realtime`
2. **Start Client**: `cd client && npm run dev`  
3. **Open Browser**: Navigate to `http://localhost:5173`
4. **Switch Modes**: Toggle between Legacy and Realtime in the UI

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

## 🚀 REVOLUTIONARY REALTIME FEATURES (2024-2025)

### **⚡ OpenAI Realtime API Integration**
- **TRUE VOICE INTERRUPTION**: Stop AI mid-sentence with `client.cancelResponse()`
- **Streaming Audio**: Ultra-low latency real-time audio chunks
- **Voice Activity Detection (VAD)**: Automatic conversation flow with configurable thresholds
- **WebSocket-Based**: Single persistent connection for all audio streaming
- **Conversation State Management**: Built-in conversation history and context
- **Real-time Function Calling**: Tools that execute while AI is speaking
- **Live Analytics**: Track interruptions, turn durations, and conversation metrics

### **🔥 Revolutionary vs Legacy Comparison**

| Feature | 📞 Legacy Mode | ⚡ Realtime Mode |
|---------|---------------|------------------|
| Voice Interruption | ❌ Voice commands only | ✅ True real-time interruption |
| Response Latency | ❌ Multiple API calls | ✅ Single WebSocket stream |
| Voice Activity | ❌ Manual trigger only | ✅ Automatic VAD detection |
| Audio Processing | ❌ Batch generation | ✅ Streaming audio chunks |
| Conversation State | ❌ Client-side only | ✅ Built-in state management |
| Function Calling | ❌ Not integrated | ✅ Real-time tool execution |
| Analytics | ❌ Basic metrics | ✅ Advanced conversation analytics |
| Natural Flow | ❌ Start-stop interactions | ✅ Continuous conversation |

### **🎯 How Realtime Mode Works**

1. **WebSocket Connection**: Direct streaming connection to OpenAI Realtime API
2. **Real-time Audio Processing**: Audio worklet processes microphone input to PCM16 format
3. **Voice Activity Detection**: Server automatically detects speech start/end
4. **Streaming Response**: AI generates and streams audio response in real-time chunks
5. **Interruption Handling**: User can interrupt AI mid-sentence naturally
6. **Conversation Continuity**: Built-in state management maintains conversation context

### **🛠️ Advanced Features**

#### **Real-time Function Calling**
- `get_current_time`: Get current date/time in various formats
- `analyze_conversation_metrics`: Real-time conversation analytics
- `set_reminder`: Schedule reminders with browser notifications

#### **Interruption Analytics**
- Total conversation turns
- Interruption count and rate
- Average response time
- Conversation duration
- Real-time metrics dashboard

#### **Voice Activity Detection Settings**
- Threshold: `0.5` (configurable)
- Prefix padding: `300ms`
- Silence duration: `800ms`
- Automatic turn detection

## Recent Updates (2024-2025)

- 🚀 **REVOLUTIONARY**: Added OpenAI Realtime API with true voice interruption
- ⚡ **GAME-CHANGER**: Streaming audio with ultra-low latency
- 🎤 **ADVANCED**: Voice Activity Detection with automatic conversation flow
- 🧠 **INTELLIGENT**: Built-in conversation state management
- 📊 **ANALYTICS**: Real-time interruption and conversation metrics
- 🛠️ **TOOLS**: Real-time function calling capabilities
- 🎯 **DUAL-MODE**: Compare legacy vs revolutionary side-by-side
- ✅ Updated to latest React 19 and Vite 7.1.2
- ✅ Security vulnerabilities patched
- ✅ Enhanced browser compatibility warnings
- ✅ Improved error handling and user guidance
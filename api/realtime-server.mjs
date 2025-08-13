import express from 'express';
import { RealtimeClient } from '@openai/realtime-api-beta';
import dotenv from 'dotenv';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { WebSocketServer } from 'ws';
import http from 'http';

dotenv.config();

if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY environment variable is required');
  process.exit(1);
}

const app = express();
const server = http.createServer(app);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later' },
});

// Middleware
app.use(limiter);
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:5173',
    ],
    credentials: true,
  }),
);
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res
    .status(200)
    .json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// WebSocket Server for Realtime API Relay
const wss = new WebSocketServer({ 
  server,
  path: '/realtime'
});

// Keep track of active connections and their metrics
const activeConnections = new Map();

wss.on('connection', (ws, request) => {
  const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`🔗 Client connected: ${clientId}`);

  // Initialize connection metrics
  const connectionMetrics = {
    startTime: Date.now(),
    messagesReceived: 0,
    messagesSent: 0,
    interruptions: 0,
    conversationTurns: 0,
    errors: 0
  };

  activeConnections.set(clientId, {
    ws,
    metrics: connectionMetrics,
    realtimeClient: null
  });

  // Create OpenAI Realtime Client for this connection
  const realtimeClient = new RealtimeClient({ 
    apiKey: process.env.OPENAI_API_KEY 
  });

  const connectionData = activeConnections.get(clientId);
  connectionData.realtimeClient = realtimeClient;

  // Configure the realtime session with advanced features
  realtimeClient.updateSession({
    instructions: `You are an advanced AI assistant with real-time conversation capabilities.
      You can be interrupted naturally - this is expected and normal in human conversation.
      Keep your responses engaging, concise, and natural.
      You have access to tools for time and reminders.
      React appropriately to interruptions and continue conversations smoothly.`,
    voice: 'alloy',
    input_audio_format: 'pcm16',
    output_audio_format: 'pcm16',
    input_audio_transcription: { model: 'whisper-1' },
    turn_detection: { 
      type: 'server_vad',
      threshold: 0.5,
      prefix_padding_ms: 300,
      silence_duration_ms: 800
    },
    temperature: 0.8,
    max_response_output_tokens: 1000,
  });

  // Add tools for enhanced functionality
  realtimeClient.addTool(
    {
      name: 'get_current_time',
      description: 'Get the current date and time',
      parameters: {
        type: 'object',
        properties: {
          format: {
            type: 'string',
            description: 'Format for the time display',
            enum: ['full', 'time', 'date']
          }
        }
      }
    },
    async ({ format = 'full' }) => {
      const now = new Date();
      switch (format) {
        case 'time':
          return { result: now.toLocaleTimeString() };
        case 'date':
          return { result: now.toLocaleDateString() };
        default:
          return { result: now.toLocaleString() };
      }
    }
  );

  realtimeClient.addTool(
    {
      name: 'analyze_conversation_metrics',
      description: 'Get current conversation analytics and metrics',
      parameters: {
        type: 'object',
        properties: {}
      }
    },
    async () => {
      const metrics = activeConnections.get(clientId)?.metrics || {};
      const duration = Date.now() - metrics.startTime;
      return {
        conversation_duration_seconds: Math.round(duration / 1000),
        total_messages: metrics.messagesReceived + metrics.messagesSent,
        interruptions: metrics.interruptions,
        conversation_turns: metrics.conversationTurns,
        average_turn_duration: metrics.conversationTurns > 0 ? duration / metrics.conversationTurns : 0
      };
    }
  );

  // Set up comprehensive event handlers
  realtimeClient.on('error', (event) => {
    console.error(`❌ Realtime client error for ${clientId}:`, event);
    connectionData.metrics.errors++;
    ws.send(JSON.stringify({
      type: 'error',
      error: event,
      timestamp: Date.now()
    }));
  });

  realtimeClient.on('conversation.interrupted', () => {
    console.log(`🚨 Conversation interrupted for ${clientId}`);
    connectionData.metrics.interruptions++;
    ws.send(JSON.stringify({
      type: 'conversation_interrupted',
      timestamp: Date.now(),
      metrics: {
        total_interruptions: connectionData.metrics.interruptions
      }
    }));
  });

  realtimeClient.on('conversation.updated', ({ item, delta }) => {
    connectionData.metrics.messagesSent++;
    
    const updateData = {
      type: 'conversation_update',
      item: item,
      delta: delta,
      conversation_items: realtimeClient.conversation.getItems(),
      timestamp: Date.now()
    };

    // Handle different types of updates
    if (delta && delta.audio) {
      updateData.has_audio = true;
      updateData.audio_length = delta.audio.length;
    }

    ws.send(JSON.stringify(updateData));
  });

  realtimeClient.on('conversation.item.completed', ({ item }) => {
    console.log(`✅ Item completed for ${clientId}:`, item.type);
    
    if (item.role === 'assistant') {
      connectionData.metrics.conversationTurns++;
    }

    ws.send(JSON.stringify({
      type: 'conversation_item_completed',
      item: item,
      timestamp: Date.now(),
      metrics: {
        conversation_turns: connectionData.metrics.conversationTurns
      }
    }));
  });

  // Handle all realtime events for debugging and analytics
  realtimeClient.on('realtime.event', ({ time, source, event }) => {
    if (source === 'server') {
      // Log important server events
      if (['response.audio.delta', 'input_audio_buffer.speech_started', 'input_audio_buffer.speech_stopped'].includes(event.type)) {
        console.log(`📡 [${clientId}] ${event.type}`);
      }

      // Forward important events to client
      if (['input_audio_buffer.speech_started', 'input_audio_buffer.speech_stopped', 'response.created', 'response.done'].includes(event.type)) {
        ws.send(JSON.stringify({
          type: 'realtime_event',
          event_type: event.type,
          timestamp: time,
          event_data: event
        }));
      }
    }
  });

  // Connect to OpenAI Realtime API
  realtimeClient.connect().then(() => {
    console.log(`🚀 Realtime client connected for ${clientId}`);
    ws.send(JSON.stringify({
      type: 'connected',
      client_id: clientId,
      timestamp: Date.now(),
      message: 'Connected to OpenAI Realtime API'
    }));
  }).catch((error) => {
    console.error(`❌ Failed to connect realtime client for ${clientId}:`, error);
    ws.send(JSON.stringify({
      type: 'connection_error',
      error: error.message,
      timestamp: Date.now()
    }));
  });

  // Handle incoming WebSocket messages from client
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      connectionData.metrics.messagesReceived++;

      console.log(`📨 [${clientId}] Received:`, message.type);

      switch (message.type) {
        case 'input_audio':
          // Forward audio data to OpenAI Realtime API
          if (message.audio_data) {
            const audioBuffer = new Int16Array(message.audio_data);
            realtimeClient.appendInputAudio(audioBuffer);
          }
          break;

        case 'create_response':
          // Trigger AI response generation
          realtimeClient.createResponse();
          break;

        case 'cancel_response':
          // INTERRUPT THE AI - The killer feature!
          if (message.response_id) {
            realtimeClient.cancelResponse(message.response_id, message.sample_count || 0);
            connectionData.metrics.interruptions++;
          }
          break;

        case 'user_message':
          // Send text message
          if (message.text) {
            realtimeClient.sendUserMessageContent([
              { type: 'input_text', text: message.text }
            ]);
          }
          break;

        case 'update_session':
          // Update session configuration
          if (message.session_config) {
            realtimeClient.updateSession(message.session_config);
          }
          break;

        case 'get_metrics':
          // Return current connection metrics
          const duration = Date.now() - connectionData.metrics.startTime;
          ws.send(JSON.stringify({
            type: 'metrics_response',
            metrics: {
              ...connectionData.metrics,
              duration_seconds: Math.round(duration / 1000),
              connection_active: true
            },
            timestamp: Date.now()
          }));
          break;

        default:
          console.log(`❓ Unknown message type from ${clientId}:`, message.type);
      }
    } catch (error) {
      console.error(`❌ Error processing message from ${clientId}:`, error);
      connectionData.metrics.errors++;
    }
  });

  // Handle WebSocket close
  ws.on('close', () => {
    console.log(`👋 Client disconnected: ${clientId}`);
    
    // Cleanup
    if (connectionData.realtimeClient) {
      connectionData.realtimeClient.disconnect();
    }
    activeConnections.delete(clientId);
  });

  // Handle WebSocket errors
  ws.on('error', (error) => {
    console.error(`❌ WebSocket error for ${clientId}:`, error);
    connectionData.metrics.errors++;
  });
});

// API endpoint to get server statistics
app.get('/stats', (req, res) => {
  const stats = {
    active_connections: activeConnections.size,
    server_uptime: Date.now() - serverStartTime,
    total_connections_served: totalConnectionsServed,
    connections: Array.from(activeConnections.entries()).map(([id, data]) => ({
      client_id: id,
      connected_duration: Date.now() - data.metrics.startTime,
      metrics: data.metrics
    }))
  };
  
  res.json(stats);
});

// Legacy endpoint for backward compatibility
app.post('/', async (req, res) => {
  try {
    console.log('⚠️  Legacy endpoint used. Consider upgrading to Realtime API WebSocket connection.');
    
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required and must be a string' });
    }

    if (text.length > 4000) {
      return res.status(400).json({ error: 'Text must be less than 4000 characters' });
    }

    // Create a temporary realtime client for legacy support
    const tempClient = new RealtimeClient({ apiKey: process.env.OPENAI_API_KEY });
    
    await tempClient.connect();
    
    // Configure for single response
    tempClient.updateSession({
      instructions: 'Provide a helpful response to the user input.',
      voice: 'alloy',
      turn_detection: { type: 'none' }
    });

    // Send message and wait for response
    tempClient.sendUserMessageContent([{ type: 'input_text', text }]);
    tempClient.createResponse();

    // Collect the response
    let responseText = '';
    let audioData = null;

    tempClient.on('conversation.updated', ({ item, delta }) => {
      if (delta && delta.transcript) {
        responseText += delta.transcript;
      }
    });

    // Wait for completion and return audio (for backward compatibility)
    tempClient.on('conversation.item.completed', async ({ item }) => {
      if (item.type === 'message' && item.role === 'assistant') {
        // Generate TTS for backward compatibility
        const { OpenAI } = await import('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        
        const mp3 = await openai.audio.speech.create({
          model: 'tts-1',
          voice: 'alloy',
          input: responseText || 'I heard your message but couldn\'t generate a text response.',
        });

        const buffer = Buffer.from(await mp3.arrayBuffer());
        
        res.set({
          'Content-Type': 'audio/mpeg',
          'Content-Length': buffer.length,
          'Cache-Control': 'no-cache',
        });

        res.send(buffer);
        tempClient.disconnect();
      }
    });

    // Handle errors
    tempClient.on('error', (error) => {
      console.error('❌ Legacy endpoint error:', error);
      res.status(500).json({ error: 'Failed to process request' });
      tempClient.disconnect();
    });

  } catch (error) {
    console.error('❌ Error in legacy endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 8000;
const serverStartTime = Date.now();
let totalConnectionsServed = 0;

// Track total connections
wss.on('connection', () => {
  totalConnectionsServed++;
});

server.listen(PORT, () => {
  console.log(`🚀 Realtime API Server running on port ${PORT}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}/realtime`);
  console.log(`📊 Stats endpoint: http://localhost:${PORT}/stats`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
const shutdown = () => {
  console.log('🛑 Shutting down gracefully...');
  
  // Close all active realtime connections
  activeConnections.forEach((connectionData, clientId) => {
    if (connectionData.realtimeClient) {
      connectionData.realtimeClient.disconnect();
    }
    connectionData.ws.close();
  });

  wss.close(() => {
    server.close(() => {
      console.log('✅ Server shut down completed');
      process.exit(0);
    });
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
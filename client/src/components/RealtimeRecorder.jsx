import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RealtimeClient } from '@openai/realtime-api-beta';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import StopIcon from '@mui/icons-material/Stop';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';

const RealtimeRecorder = () => {
  // Connection and client state
  const [client] = useState(
    () => new RealtimeClient({ 
      apiKey: import.meta.env.VITE_OPENAI_API_KEY || 'your-api-key-here',
      dangerouslyAllowAPIKeyInBrowser: true 
    })
  );
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Conversation state
  const [conversationItems, setConversationItems] = useState([]);
  const [currentResponse, setCurrentResponse] = useState(null);
  const [interruptionCount, setInterruptionCount] = useState(0);

  // Audio management
  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const workletNodeRef = useRef(null);

  // Real-time metrics
  const [metrics, setMetrics] = useState({
    totalTurns: 0,
    interruptions: 0,
    averageResponseTime: 0,
    conversationDuration: 0
  });

  const conversationStartTime = useRef(null);

  // Initialize Realtime Client
  useEffect(() => {
    const initializeClient = async () => {
      try {
        // Configure session with advanced settings
        client.updateSession({
          instructions: `You are a helpful, friendly AI assistant with real-time conversation capabilities. 
                        You can be interrupted at any time - this is natural and expected in conversation. 
                        Keep responses concise and engaging. React naturally to interruptions.`,
          voice: 'alloy',
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          input_audio_transcription: { model: 'whisper-1' },
          turn_detection: { 
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500
          },
          temperature: 0.8,
        });

        // Set up event handlers
        setupEventHandlers();

        // Connect to the API
        await client.connect();
        setIsConnected(true);
        conversationStartTime.current = Date.now();

        console.log('🚀 Connected to OpenAI Realtime API!');
      } catch (error) {
        console.error('❌ Failed to connect to Realtime API:', error);
      }
    };

    initializeClient();

    return () => {
      if (client.isConnected) {
        client.disconnect();
      }
    };
  }, [client]);

  // Setup comprehensive event handlers
  const setupEventHandlers = useCallback(() => {
    // Connection events
    client.on('error', (event) => {
      console.error('🚨 Realtime API Error:', event);
    });

    // Conversation interruption - THE GAME CHANGER!
    client.on('conversation.interrupted', () => {
      console.log('🚨 CONVERSATION INTERRUPTED! Stopping current response...');
      setIsPlaying(false);
      setInterruptionCount(prev => prev + 1);
      setMetrics(prev => ({ ...prev, interruptions: prev.interruptions + 1 }));
      
      // Stop any playing audio immediately
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    });

    // Real-time conversation updates
    client.on('conversation.updated', ({ item, delta }) => {
      const items = client.conversation.getItems();
      setConversationItems(items);

      // Handle different types of updates
      if (delta) {
        if (delta.audio) {
          // Stream audio in real-time!
          handleStreamingAudio(delta.audio);
        }
        if (delta.transcript) {
          console.log('📝 Streaming transcript:', delta.transcript);
        }
        if (delta.arguments) {
          console.log('🛠️ Function arguments streaming:', delta.arguments);
        }
      }

      // Update response state
      if (item.type === 'message' && item.role === 'assistant') {
        setCurrentResponse(item);
      }
    });

    // Item completion events
    client.on('conversation.item.completed', ({ item }) => {
      console.log('✅ Item completed:', item.type);
      if (item.type === 'message' && item.role === 'assistant') {
        setIsPlaying(false);
        setMetrics(prev => ({ 
          ...prev, 
          totalTurns: prev.totalTurns + 1,
          conversationDuration: Date.now() - conversationStartTime.current
        }));
      }
    });

    // Real-time events for debugging and analytics
    client.on('realtime.event', ({ time, source, event }) => {
      if (source === 'server') {
        console.log(`📡 [${time}] Server Event:`, event.type);
        
        // Track specific events for analytics
        if (event.type === 'response.audio.delta') {
          // Audio is streaming in real-time
        } else if (event.type === 'input_audio_buffer.speech_started') {
          console.log('🎤 User started speaking');
        } else if (event.type === 'input_audio_buffer.speech_stopped') {
          console.log('🎤 User stopped speaking');
        }
      }
    });
  }, [client]);

  // Handle real-time streaming audio
  const handleStreamingAudio = useCallback((audioBuffer) => {
    if (!audioContextRef.current) {
      // Initialize Web Audio API for real-time playback
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }

    // Convert Int16Array to AudioBuffer and play immediately
    const context = audioContextRef.current;
    const audioData = new Float32Array(audioBuffer.length);
    
    // Convert Int16 to Float32
    for (let i = 0; i < audioBuffer.length; i++) {
      audioData[i] = audioBuffer[i] / 32768.0;
    }

    const audioBufferToPlay = context.createBuffer(1, audioData.length, 24000);
    audioBufferToPlay.getChannelData(0).set(audioData);

    const source = context.createBufferSource();
    source.buffer = audioBufferToPlay;
    source.connect(context.destination);
    source.start();

    setIsPlaying(true);
  }, []);

  // Start recording with advanced audio processing
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 24000,
          sampleSize: 16,
          channelCount: 1
        } 
      });

      // Set up MediaRecorder with advanced options
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 16000
      });

      // Set up real-time audio processing
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      }

      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      // Add audio worklet for real-time processing
      if (!workletNodeRef.current) {
        await audioContextRef.current.audioWorklet.addModule('/audio-processor.js');
        workletNodeRef.current = new AudioWorkletNode(audioContextRef.current, 'audio-processor');
        
        workletNodeRef.current.port.onmessage = (event) => {
          const { audioData } = event.data;
          // Send real-time audio to Realtime API
          client.appendInputAudio(audioData);
        };
      }

      source.connect(workletNodeRef.current);
      
      setIsRecording(true);
      console.log('🎤 Started real-time recording with advanced processing');
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
    }
  }, [client]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }

    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
    }

    setIsRecording(false);
    console.log('🛑 Stopped recording');
  }, []);

  // INTERRUPT THE AI - THE KILLER FEATURE!
  const interruptAI = useCallback(() => {
    if (currentResponse && isPlaying) {
      // This is the game-changer - real interruption!
      client.cancelResponse(currentResponse.id, 0);
      setIsPlaying(false);
      setInterruptionCount(prev => prev + 1);
      console.log('🚨 INTERRUPTED AI RESPONSE!');
    }
  }, [client, currentResponse, isPlaying]);

  // Manual response generation
  const generateResponse = useCallback(() => {
    client.createResponse();
  }, [client]);

  // Add function calling capability
  useEffect(() => {
    if (isConnected) {
      client.addTool(
        {
          name: 'get_time',
          description: 'Get the current time',
          parameters: { type: 'object', properties: {} }
        },
        async () => {
          return { current_time: new Date().toLocaleString() };
        }
      );

      client.addTool(
        {
          name: 'set_reminder',
          description: 'Set a reminder for the user',
          parameters: {
            type: 'object',
            properties: {
              message: { type: 'string', description: 'Reminder message' },
              minutes: { type: 'number', description: 'Minutes from now' }
            },
            required: ['message', 'minutes']
          }
        },
        async ({ message, minutes }) => {
          console.log(`⏰ Reminder set: "${message}" in ${minutes} minutes`);
          // Could integrate with browser notifications
          return { status: 'reminder_set', message, minutes };
        }
      );
    }
  }, [isConnected, client]);

  return (
    <div style={styles.container}>
      <h1>🚀 AI Realtime Voice Chat</h1>
      
      {/* Connection Status */}
      <div style={styles.statusBar}>
        <div style={{
          ...styles.statusIndicator,
          backgroundColor: isConnected ? '#4CAF50' : '#f44336'
        }}>
          {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </div>
        <div style={styles.metrics}>
          Turns: {metrics.totalTurns} | Interruptions: {metrics.interruptions}
        </div>
      </div>

      {/* Main Controls */}
      <div style={styles.controlsContainer}>
        {/* Record Button */}
        <button
          onClick={isRecording ? stopRecording : startRecording}
          style={{
            ...styles.primaryButton,
            backgroundColor: isRecording ? '#f44336' : '#4CAF50',
          }}
          disabled={!isConnected}
        >
          {isRecording ? <MicIcon /> : <MicOffIcon />}
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>

        {/* INTERRUPT BUTTON - THE GAME CHANGER! */}
        <button
          onClick={interruptAI}
          style={{
            ...styles.interruptButton,
            opacity: isPlaying ? 1 : 0.5
          }}
          disabled={!isPlaying}
        >
          <StopIcon />
          INTERRUPT AI
        </button>

        {/* Generate Response */}
        <button
          onClick={generateResponse}
          style={styles.secondaryButton}
          disabled={!isConnected || isRecording}
        >
          Generate Response
        </button>
      </div>

      {/* Conversation State Visualization */}
      <div style={styles.conversationContainer}>
        <h3>🧠 Live Conversation State</h3>
        <div style={styles.conversationItems}>
          {conversationItems.slice(-5).map((item, index) => (
            <div 
              key={index} 
              style={{
                ...styles.conversationItem,
                backgroundColor: item.role === 'user' ? '#e3f2fd' : '#f3e5f5'
              }}
            >
              <strong>{item.role === 'user' ? '👤 You' : '🤖 AI'}:</strong>
              {item.type === 'message' && (
                <div>
                  {item.content?.[0]?.transcript || item.content?.[0]?.text || 'Audio message'}
                </div>
              )}
              {item.type === 'function_call' && (
                <div>🛠️ Function: {item.name}</div>
              )}
            </div>
          ))}
          
          {currentResponse && isPlaying && (
            <div style={styles.streamingIndicator}>
              🎵 AI is speaking... (Click INTERRUPT to stop)
            </div>
          )}
        </div>
      </div>

      {/* Real-time Analytics */}
      <div style={styles.analyticsContainer}>
        <h3>📊 Real-time Analytics</h3>
        <div style={styles.analyticsGrid}>
          <div style={styles.metricCard}>
            <div style={styles.metricValue}>{metrics.totalTurns}</div>
            <div style={styles.metricLabel}>Conversation Turns</div>
          </div>
          <div style={styles.metricCard}>
            <div style={styles.metricValue}>{metrics.interruptions}</div>
            <div style={styles.metricLabel}>Interruptions</div>
          </div>
          <div style={styles.metricCard}>
            <div style={styles.metricValue}>
              {Math.round(metrics.conversationDuration / 1000)}s
            </div>
            <div style={styles.metricLabel}>Duration</div>
          </div>
          <div style={styles.metricCard}>
            <div style={styles.metricValue}>
              {metrics.totalTurns > 0 ? Math.round((metrics.interruptions / metrics.totalTurns) * 100) : 0}%
            </div>
            <div style={styles.metricLabel}>Interrupt Rate</div>
          </div>
        </div>
      </div>

      {/* Advanced Features Info */}
      <div style={styles.featuresContainer}>
        <h3>⚡ Revolutionary Features Active</h3>
        <ul style={styles.featuresList}>
          <li>🚨 <strong>Real-time Interruption</strong>: Stop AI mid-sentence!</li>
          <li>🎤 <strong>Voice Activity Detection</strong>: Automatic conversation flow</li>
          <li>📡 <strong>Streaming Audio</strong>: Ultra-low latency responses</li>
          <li>🧠 <strong>Conversation State</strong>: Smart context management</li>
          <li>🛠️ <strong>Function Calling</strong>: Real-time tool integration</li>
          <li>📊 <strong>Live Analytics</strong>: Interruption and flow metrics</li>
        </ul>
      </div>
    </div>
  );
};

// Comprehensive styling
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  statusBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: '20px',
    padding: '10px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
  },
  statusIndicator: {
    padding: '8px 16px',
    borderRadius: '20px',
    color: 'white',
    fontWeight: 'bold',
  },
  metrics: {
    fontSize: '14px',
    color: '#666',
  },
  controlsContainer: {
    display: 'flex',
    gap: '15px',
    marginBottom: '30px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  primaryButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '15px 25px',
    fontSize: '16px',
    fontWeight: 'bold',
    color: 'white',
    border: 'none',
    borderRadius: '30px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    minWidth: '160px',
    justifyContent: 'center',
  },
  interruptButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '15px 25px',
    fontSize: '16px',
    fontWeight: 'bold',
    color: 'white',
    backgroundColor: '#ff5722',
    border: '3px solid #d84315',
    borderRadius: '30px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    minWidth: '160px',
    justifyContent: 'center',
    animation: 'pulse 2s infinite',
  },
  secondaryButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    fontSize: '14px',
    color: '#333',
    backgroundColor: '#fff',
    border: '2px solid #ddd',
    borderRadius: '25px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  conversationContainer: {
    width: '100%',
    marginBottom: '30px',
  },
  conversationItems: {
    maxHeight: '300px',
    overflowY: 'auto',
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '10px',
    backgroundColor: '#fafafa',
  },
  conversationItem: {
    margin: '10px 0',
    padding: '10px',
    borderRadius: '8px',
    fontSize: '14px',
  },
  streamingIndicator: {
    padding: '15px',
    backgroundColor: '#fff3e0',
    border: '2px solid #ff9800',
    borderRadius: '8px',
    fontWeight: 'bold',
    color: '#e65100',
    textAlign: 'center',
    animation: 'pulse 1.5s infinite',
  },
  analyticsContainer: {
    width: '100%',
    marginBottom: '30px',
  },
  analyticsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '15px',
    marginTop: '15px',
  },
  metricCard: {
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '12px',
    textAlign: 'center',
    border: '2px solid #e9ecef',
  },
  metricValue: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: '5px',
  },
  metricLabel: {
    fontSize: '12px',
    color: '#6c757d',
    textTransform: 'uppercase',
  },
  featuresContainer: {
    width: '100%',
    backgroundColor: '#e8f5e8',
    padding: '20px',
    borderRadius: '12px',
    border: '2px solid #4caf50',
  },
  featuresList: {
    listStyle: 'none',
    padding: 0,
    margin: '10px 0',
  },
};

export default RealtimeRecorder;
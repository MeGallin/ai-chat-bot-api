import React, { useState, useEffect, useRef, useCallback } from 'react';
import SpeechRecognition, {
  useSpeechRecognition,
} from 'react-speech-recognition';
import MicNoneIcon from '@mui/icons-material/MicNone';
import MicIcon from '@mui/icons-material/Mic';
import axios from 'axios';

const Recorder = () => {
  const [audioUrl, setAudioUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [timeoutActive, setTimeoutActive] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const timeoutRef = useRef(null);
  const lastTranscriptRef = useRef('');
  const audioRef = useRef(null);

  // Auto-generate audio after silence delay (in milliseconds)
  const SILENCE_DELAY = 3000; // 3 seconds

  const clearAutoGenerateTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      setTimeoutActive(false);
    }
  }, []);

  const handleGenerateAudio = useCallback(
    async (textToSend) => {
      if (!textToSend || !textToSend.trim()) {
        console.log('No transcript to process');
        return;
      }

      // Clear any pending timeout
      clearAutoGenerateTimeout();
      setIsProcessing(true);

      // Stop listening while processing to prevent picking up our own audio
      SpeechRecognition.stopListening();

      try {
        console.log('🔄 Sending request to server...');
        const audio = await axios.post(
          'http://localhost:8000',
          { text: textToSend },
          {
            responseType: 'blob',
          },
        );

        console.log('✅ Received audio response:', audio.data);
        console.log('Audio blob size:', audio.data.size, 'bytes');

        const url = window.URL.createObjectURL(
          new Blob([audio.data], { type: 'audio/mpeg' }),
        );
        console.log('🎵 Created audio URL:', url);

        setAudioUrl(url);
        console.log('✅ Audio URL set successfully');
      } catch (error) {
        console.error('❌ Error downloading audio:', error);
      } finally {
        setIsProcessing(false);
      }
    },
    [clearAutoGenerateTimeout],
  );

  // Define commands using functions that are already defined
  const commands = [
    {
      command: ['clear', 'reset', 'delete'],
      callback: ({ resetTranscript }) => {
        clearAutoGenerateTimeout();
        resetTranscript();
        setAudioUrl(null);
        lastTranscriptRef.current = '';
      },
    },
    {
      command: ['send', 'submit', 'generate', 'over'],
      callback: ({ finalTranscript, transcript, resetTranscript }) => {
        clearAutoGenerateTimeout();
        const textToSend = finalTranscript || transcript;
        if (textToSend) {
          handleGenerateAudio(textToSend).then(() => {
            resetTranscript();
            lastTranscriptRef.current = '';
          });
        }
      },
    },
    {
      command: ['start listening', 'begin', 'start'],
      callback: () => SpeechRecognition.startListening({ continuous: true }),
    },
    {
      command: ['stop listening', 'stop', 'pause'],
      callback: () => {
        clearAutoGenerateTimeout();
        SpeechRecognition.stopListening();
      },
    },
  ];

  const {
    transcript,
    finalTranscript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    browserSupportsContinuousListening,
  } = useSpeechRecognition({
    commands,
    clearTranscriptOnListen: false, // Keep transcript across listening sessions
  });

  // Auto-start listening when component mounts (for demo purposes)
  useEffect(() => {
    if (
      browserSupportsSpeechRecognition &&
      browserSupportsContinuousListening
    ) {
      SpeechRecognition.startListening({ continuous: true });
    }
  }, [browserSupportsSpeechRecognition, browserSupportsContinuousListening]);

  // Auto-generate audio after silence - only use finalTranscript to avoid interim results
  useEffect(() => {
    // Only trigger on final transcript (not interim) and when not processing/playing audio
    if (
      finalTranscript &&
      finalTranscript.trim() &&
      finalTranscript !== lastTranscriptRef.current &&
      !isProcessing &&
      !isPlayingAudio &&
      listening
    ) {
      console.log('📝 New final transcript detected:', finalTranscript);
      lastTranscriptRef.current = finalTranscript;

      // Clear any existing timeout
      clearAutoGenerateTimeout();

      // Set new timeout for auto-generation
      timeoutRef.current = setTimeout(() => {
        console.log(
          `⏰ ${SILENCE_DELAY}ms silence detected, auto-generating audio...`,
        );
        setTimeoutActive(false);
        handleGenerateAudio(finalTranscript).then(() => {
          // Clear transcript and reference after processing
          resetTranscript();
          lastTranscriptRef.current = '';
          console.log('🧹 Auto-generation complete, transcript cleared');
        });
      }, SILENCE_DELAY);

      setTimeoutActive(true);
      console.log(`⏱️ Auto-generation timeout set for ${SILENCE_DELAY}ms`);
    }
  }, [
    finalTranscript,
    isProcessing,
    isPlayingAudio,
    listening,
    clearAutoGenerateTimeout,
    handleGenerateAudio,
    resetTranscript,
    SILENCE_DELAY,
  ]);

  // Add audio event handlers to track playback state
  useEffect(() => {
    if (audioUrl && audioRef.current) {
      const audio = audioRef.current;

      const handlePlay = () => {
        console.log('🎵 Audio playback started');
        setIsPlayingAudio(true);
      };

      const handleEnded = () => {
        console.log('🎵 Audio playback ended');
        setIsPlayingAudio(false);

        // Resume listening after a short delay to prevent immediate pickup
        setTimeout(() => {
          if (
            browserSupportsSpeechRecognition &&
            browserSupportsContinuousListening
          ) {
            console.log('🎤 Resuming speech recognition after audio playback');
            SpeechRecognition.startListening({ continuous: true });
          }
        }, 2000); // 2 second delay to ensure audio is fully finished
      };

      const handleError = (e) => {
        console.error('🎵 Audio playback error:', e);
        setIsPlayingAudio(false);
        // Resume listening even on error
        setTimeout(() => {
          if (
            browserSupportsSpeechRecognition &&
            browserSupportsContinuousListening
          ) {
            SpeechRecognition.startListening({ continuous: true });
          }
        }, 1000);
      };

      audio.addEventListener('play', handlePlay);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('error', handleError);

      return () => {
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
      };
    }
  }, [
    audioUrl,
    browserSupportsSpeechRecognition,
    browserSupportsContinuousListening,
  ]);

  const handleMicToggle = () => {
    if (listening) {
      clearAutoGenerateTimeout();
      SpeechRecognition.stopListening();
    } else {
      SpeechRecognition.startListening({ continuous: true });
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!browserSupportsSpeechRecognition) {
    return <span>Browser doesn't support speech recognition.</span>;
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <h1>AI Chat Bot</h1>

      {/* Microphone Button */}
      <button
        onClick={handleMicToggle}
        style={{
          background: listening ? '#ff4444' : '#4CAF50',
          border: 'none',
          borderRadius: '50%',
          width: '80px',
          height: '80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          margin: '20px',
          transition: 'all 0.3s ease',
          transform: listening ? 'scale(1.1)' : 'scale(1)',
          boxShadow: listening
            ? '0 0 20px rgba(255, 68, 68, 0.5)'
            : '0 0 10px rgba(76, 175, 80, 0.3)',
        }}
        disabled={isProcessing}
      >
        {listening ? (
          <MicIcon style={{ color: 'white', fontSize: '32px' }} />
        ) : (
          <MicNoneIcon style={{ color: 'white', fontSize: '32px' }} />
        )}
      </button>

      {/* Status Indicators */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <p>
          Status: {listening ? '🎤 Listening...' : '🔇 Not listening'}
          {isProcessing && ' | 🔄 Processing...'}
          {timeoutActive &&
            ` | ⏱️ Auto-generating in ${SILENCE_DELAY / 1000}s...`}
          {isPlayingAudio && ' | 🎵 Playing audio...'}
        </p>
      </div>

      {/* Transcript Display */}
      <div
        style={{
          minHeight: '100px',
          width: '80%',
          maxWidth: '600px',
          border: '1px solid #ccc',
          borderRadius: '8px',
          padding: '15px',
          backgroundColor: '#f9f9f9',
          marginBottom: '20px',
          overflowY: 'auto',
        }}
      >
        <h3>Transcript:</h3>
        <p style={{ margin: '0', lineHeight: '1.5' }}>
          {transcript || 'Start speaking to see your words here...'}
        </p>
      </div>

      {/* Manual Generate Button */}
      <button
        onClick={() => {
          const textToSend = finalTranscript || transcript;
          if (textToSend) {
            clearAutoGenerateTimeout();
            handleGenerateAudio(textToSend).then(() => {
              resetTranscript();
              lastTranscriptRef.current = '';
            });
          }
        }}
        disabled={isProcessing || !transcript.trim()}
        style={{
          backgroundColor: isProcessing ? '#cccccc' : '#2196F3',
          color: 'white',
          border: 'none',
          borderRadius: '25px',
          padding: '12px 24px',
          fontSize: '16px',
          cursor: isProcessing ? 'not-allowed' : 'pointer',
          marginBottom: '20px',
          transition: 'background-color 0.3s ease',
        }}
      >
        {isProcessing ? '🔄 Generating...' : '🎙️ Generate Audio'}
      </button>

      {/* Audio Player */}
      {audioUrl && (
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <h3>Generated Audio:</h3>
          <audio
            ref={audioRef}
            controls
            src={audioUrl}
            style={{ width: '100%', maxWidth: '400px' }}
            autoPlay
          />
        </div>
      )}

      {/* Voice Commands Help */}
      <div
        style={{
          marginTop: '30px',
          padding: '20px',
          backgroundColor: '#f0f8ff',
          borderRadius: '8px',
          width: '80%',
          maxWidth: '600px',
        }}
      >
        <h3>Voice Commands:</h3>
        <ul style={{ textAlign: 'left', margin: '10px 0' }}>
          <li>
            <strong>"Send"</strong> or <strong>"Generate"</strong> - Generate
            audio from current transcript
          </li>
          <li>
            <strong>"Clear"</strong> or <strong>"Reset"</strong> - Clear
            transcript and audio
          </li>
          <li>
            <strong>"Start"</strong> or <strong>"Begin"</strong> - Start
            listening
          </li>
          <li>
            <strong>"Stop"</strong> or <strong>"Pause"</strong> - Stop listening
          </li>
        </ul>
        <p style={{ fontSize: '14px', color: '#666', margin: '10px 0 0 0' }}>
          💡 Audio will auto-generate after {SILENCE_DELAY / 1000} seconds of
          silence
        </p>
      </div>
    </div>
  );
};

export default Recorder;

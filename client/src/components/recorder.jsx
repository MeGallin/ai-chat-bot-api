import React, { useState, useEffect, useRef } from 'react';
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
      callback: () => {
        clearAutoGenerateTimeout();
        handleGenerateAudio();
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
    interimTranscript,
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
      // Transcript has changed, reset the timeout
      clearAutoGenerateTimeout();

      console.log('📝 New final transcript detected:', finalTranscript);

      // Set a new timeout to auto-generate after silence
      setTimeoutActive(true);
      timeoutRef.current = setTimeout(() => {
        if (
          finalTranscript.trim() &&
          !isProcessing &&
          !isPlayingAudio &&
          listening
        ) {
          console.log('🔄 Auto-generating audio after silence...');
          handleGenerateAudio();
        }
        setTimeoutActive(false);
      }, SILENCE_DELAY);

      lastTranscriptRef.current = finalTranscript;
    }
  }, [finalTranscript, isProcessing, isPlayingAudio, listening]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => clearAutoGenerateTimeout();
  }, []);

  const clearAutoGenerateTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      setTimeoutActive(false);
    }
  };

  const handleGenerateAudio = async () => {
    const currentTranscript = finalTranscript || transcript;
    if (!currentTranscript.trim()) {
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
        { text: currentTranscript },
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

      // Clear transcript after successful processing to prevent loops
      resetTranscript();
      lastTranscriptRef.current = '';
      console.log('🧹 Transcript cleared after processing');
    } catch (error) {
      console.error('❌ Error downloading audio:', error);
      // Resume listening even if there's an error
      setTimeout(() => {
        if (
          browserSupportsSpeechRecognition &&
          browserSupportsContinuousListening
        ) {
          SpeechRecognition.startListening({ continuous: true });
        }
      }, 1000);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!browserSupportsSpeechRecognition) {
    return (
      <div style={styles.container}>
        <span>Browser doesn't support speech recognition.</span>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Microphone Icon with Visual Feedback */}
      <div style={styles.micContainer}>
        {listening ? (
          <MicIcon style={{ ...styles.micIcon, color: '#ff4444' }} />
        ) : (
          <MicNoneIcon style={{ ...styles.micIcon, color: '#999' }} />
        )}
      </div>

      {/* Status and Instructions */}
      <div style={styles.statusContainer}>
        <p style={styles.statusText}>
          <strong>Status:</strong>{' '}
          {isProcessing
            ? '🤖 Processing...'
            : isPlayingAudio
            ? '🔊 Playing AI response...'
            : timeoutActive
            ? '⏱️ Auto-generating in 3s...'
            : listening
            ? '🎤 Listening...'
            : '🔇 Not listening'}
        </p>
        <p style={styles.instructionsText}>
          Speak naturally • Auto-generates after 3s of silence • Say{' '}
          <em>"clear"</em> to reset
        </p>
      </div>

      {/* Transcript Display */}
      {transcript && (
        <div style={styles.transcriptContainer}>
          <h4 style={styles.transcriptLabel}>Transcript:</h4>
          <p style={styles.transcriptText}>{transcript}</p>
        </div>
      )}

      {/* Processing Indicator */}
      {isProcessing && (
        <div style={styles.processingContainer}>
          <p style={styles.processingText}>
            🤖 Generating AI response and audio...
          </p>
        </div>
      )}

      {/* Audio Player */}
      {audioUrl && (
        <div style={styles.audioContainer}>
          <h4 style={styles.audioLabel}>AI Response:</h4>
          <audio
            ref={audioRef}
            src={audioUrl}
            controls
            autoPlay
            style={styles.audioPlayer}
            onPlay={() => {
              setIsPlayingAudio(true);
              SpeechRecognition.stopListening();
              console.log('🎵 Audio started playing - pausing listening');
            }}
            onEnded={() => {
              setIsPlayingAudio(false);
              console.log(
                '🎵 Audio finished playing - waiting before resuming listening',
              );
              // Add a longer delay before resuming listening to ensure audio is completely finished
              setTimeout(() => {
                if (
                  browserSupportsSpeechRecognition &&
                  browserSupportsContinuousListening
                ) {
                  console.log('🎤 Resuming listening after audio finished');
                  SpeechRecognition.startListening({ continuous: true });
                }
              }, 2000); // 2 second delay
            }}
            onPause={() => {
              // Only update state if user manually pauses. Don't resume listening.
              // The 'onEnded' event will handle resuming listening when the audio finishes naturally.
              if (audioRef.current && !audioRef.current.ended) {
                setIsPlayingAudio(false);
                console.log('🎵 Audio paused by user.');
              }
            }}
          />
        </div>
      )}
    </div>
  );
};

// Improved styles
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '30px',
    maxWidth: '600px',
    margin: '0 auto',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  micContainer: {
    padding: '20px',
    borderRadius: '50%',
    backgroundColor: '#f8f9fa',
    marginBottom: '20px',
    transition: 'all 0.3s ease',
  },
  micIcon: {
    fontSize: '100px',
    transition: 'color 0.3s ease',
  },
  statusContainer: {
    textAlign: 'center',
    marginBottom: '20px',
  },
  statusText: {
    fontSize: '18px',
    margin: '0 0 10px 0',
    color: '#333',
  },
  instructionsText: {
    fontSize: '14px',
    color: '#666',
    margin: 0,
    lineHeight: '1.4',
  },
  transcriptContainer: {
    width: '100%',
    margin: '20px 0',
    padding: '20px',
    border: '2px solid #e9ecef',
    borderRadius: '12px',
    backgroundColor: '#f8f9fa',
  },
  transcriptLabel: {
    margin: '0 0 10px 0',
    color: '#495057',
    fontSize: '16px',
  },
  transcriptText: {
    margin: 0,
    fontSize: '16px',
    lineHeight: '1.5',
    color: '#212529',
  },
  processingContainer: {
    margin: '20px 0',
    padding: '15px',
    backgroundColor: '#fff3cd',
    border: '1px solid #ffeaa7',
    borderRadius: '8px',
  },
  processingText: {
    margin: 0,
    color: '#856404',
    fontSize: '14px',
    textAlign: 'center',
  },
  audioContainer: {
    width: '100%',
    margin: '20px 0',
    padding: '20px',
    border: '2px solid #d4edda',
    borderRadius: '12px',
    backgroundColor: '#f8fff9',
  },
  audioLabel: {
    margin: '0 0 15px 0',
    color: '#155724',
    fontSize: '16px',
  },
  audioPlayer: {
    width: '100%',
  },
};

export default Recorder;

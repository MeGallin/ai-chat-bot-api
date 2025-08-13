import React, { useState } from 'react';
import Recorder from './components/recorder.jsx';
import RealtimeRecorder from './components/RealtimeRecorder.jsx';

function App() {
  const [useRealtime, setUseRealtime] = useState(true);

  return (
    <div style={styles.container}>
      {/* Mode Selector */}
      <div style={styles.header}>
        <h1 style={styles.title}>🚀 AI Voice Chat Evolution</h1>
        <div style={styles.modeSelector}>
          <button
            onClick={() => setUseRealtime(false)}
            style={{
              ...styles.modeButton,
              ...(useRealtime ? styles.inactiveMode : styles.activeMode)
            }}
          >
            📞 Legacy Mode
          </button>
          <button
            onClick={() => setUseRealtime(true)}
            style={{
              ...styles.modeButton,
              ...(useRealtime ? styles.activeMode : styles.inactiveMode)
            }}
          >
            ⚡ REALTIME MODE
          </button>
        </div>
        
        {/* Feature Comparison */}
        <div style={styles.comparisonBar}>
          {useRealtime ? (
            <div style={styles.realtimeFeatures}>
              ✅ True Voice Interruption | ✅ Streaming Audio | ✅ Voice Activity Detection | ✅ Ultra-Low Latency
            </div>
          ) : (
            <div style={styles.legacyFeatures}>
              ❌ No Real Interruption | ❌ Batch Processing | ❌ Voice Commands Only | ❌ Higher Latency
            </div>
          )}
        </div>
      </div>

      {/* Mode-specific Content */}
      <div style={styles.content}>
        {useRealtime ? (
          <div style={styles.modeContainer}>
            <div style={styles.revolutionBanner}>
              <h2>🚀 REVOLUTIONARY REALTIME MODE</h2>
              <p>Experience the future of voice AI with real-time interruption, streaming audio, and natural conversation flow!</p>
            </div>
            <RealtimeRecorder />
          </div>
        ) : (
          <div style={styles.modeContainer}>
            <div style={styles.legacyBanner}>
              <h2>📞 Legacy Mode</h2>
              <p>The traditional approach with Web Speech API + GPT Chat API + Text-to-Speech pipeline</p>
            </div>
            <Recorder />
          </div>
        )}
      </div>

      {/* Feature Comparison Table */}
      <div style={styles.comparisonSection}>
        <h3>🔥 Feature Comparison: Legacy vs Revolutionary</h3>
        <div style={styles.comparisonTable}>
          <div style={styles.comparisonHeader}>
            <div style={styles.featureColumn}>Feature</div>
            <div style={styles.legacyColumn}>📞 Legacy Mode</div>
            <div style={styles.realtimeColumn}>⚡ Realtime Mode</div>
          </div>
          
          {comparisonData.map((row, index) => (
            <div key={index} style={styles.comparisonRow}>
              <div style={styles.featureColumn}>{row.feature}</div>
              <div style={{...styles.legacyColumn, color: row.legacy.includes('❌') ? '#d32f2f' : '#1976d2'}}>
                {row.legacy}
              </div>
              <div style={{...styles.realtimeColumn, color: row.realtime.includes('✅') ? '#388e3c' : '#1976d2'}}>
                {row.realtime}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Comparison data
const comparisonData = [
  {
    feature: '🚨 Voice Interruption',
    legacy: '❌ Voice commands only',
    realtime: '✅ True real-time interruption'
  },
  {
    feature: '⚡ Response Latency',
    legacy: '❌ Multiple API calls',
    realtime: '✅ Single WebSocket stream'
  },
  {
    feature: '🎤 Voice Activity',
    legacy: '❌ Manual trigger only',
    realtime: '✅ Automatic VAD detection'
  },
  {
    feature: '🎵 Audio Processing',
    legacy: '❌ Batch generation',
    realtime: '✅ Streaming audio chunks'
  },
  {
    feature: '🧠 Conversation State',
    legacy: '❌ Client-side only',
    realtime: '✅ Built-in state management'
  },
  {
    feature: '🛠️ Function Calling',
    legacy: '❌ Not integrated',
    realtime: '✅ Real-time tool execution'
  },
  {
    feature: '📊 Analytics',
    legacy: '❌ Basic metrics',
    realtime: '✅ Advanced conversation analytics'
  },
  {
    feature: '🔄 Natural Flow',
    legacy: '❌ Start-stop interactions',
    realtime: '✅ Continuous conversation'
  }
];

// Comprehensive styling
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f7fa',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    backgroundColor: 'white',
    padding: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    marginBottom: '20px',
  },
  title: {
    textAlign: 'center',
    margin: '0 0 20px 0',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    fontSize: '32px',
  },
  modeSelector: {
    display: 'flex',
    justifyContent: 'center',
    gap: '20px',
    marginBottom: '20px',
  },
  modeButton: {
    padding: '15px 30px',
    fontSize: '16px',
    fontWeight: 'bold',
    border: '2px solid',
    borderRadius: '25px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    minWidth: '160px',
  },
  activeMode: {
    backgroundColor: '#4caf50',
    borderColor: '#4caf50',
    color: 'white',
    transform: 'scale(1.05)',
    boxShadow: '0 5px 15px rgba(76, 175, 80, 0.3)',
  },
  inactiveMode: {
    backgroundColor: 'white',
    borderColor: '#ddd',
    color: '#666',
  },
  comparisonBar: {
    textAlign: 'center',
    padding: '10px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  realtimeFeatures: {
    backgroundColor: '#e8f5e8',
    color: '#2e7d32',
    border: '2px solid #4caf50',
  },
  legacyFeatures: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    border: '2px solid #f44336',
  },
  content: {
    display: 'flex',
    justifyContent: 'center',
    padding: '0 20px',
  },
  modeContainer: {
    width: '100%',
    maxWidth: '1200px',
  },
  revolutionBanner: {
    backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    background: 'linear-gradient(135deg, #4caf50 0%, #8bc34a 100%)',
    color: 'white',
    padding: '20px',
    borderRadius: '12px',
    textAlign: 'center',
    marginBottom: '20px',
    boxShadow: '0 8px 25px rgba(76, 175, 80, 0.3)',
  },
  legacyBanner: {
    backgroundColor: '#37474f',
    color: 'white',
    padding: '20px',
    borderRadius: '12px',
    textAlign: 'center',
    marginBottom: '20px',
  },
  comparisonSection: {
    maxWidth: '1200px',
    margin: '40px auto',
    padding: '20px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
  },
  comparisonTable: {
    width: '100%',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid #e0e0e0',
  },
  comparisonHeader: {
    display: 'grid',
    gridTemplateColumns: '2fr 2fr 2fr',
    backgroundColor: '#f5f5f5',
    fontWeight: 'bold',
    borderBottom: '2px solid #ddd',
  },
  comparisonRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 2fr 2fr',
    borderBottom: '1px solid #e0e0e0',
  },
  featureColumn: {
    padding: '15px',
    borderRight: '1px solid #e0e0e0',
    fontWeight: 'bold',
  },
  legacyColumn: {
    padding: '15px',
    borderRight: '1px solid #e0e0e0',
    backgroundColor: '#fafafa',
  },
  realtimeColumn: {
    padding: '15px',
    backgroundColor: '#f8fff8',
  },
};

export default App;
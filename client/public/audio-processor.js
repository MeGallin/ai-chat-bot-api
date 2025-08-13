// Real-time Audio Processor Worklet for OpenAI Realtime API
class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.sampleRate = 24000;
    this.bufferSize = 2048;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    
    if (input && input.length > 0) {
      const channelData = input[0];
      
      for (let i = 0; i < channelData.length; i++) {
        this.buffer[this.bufferIndex] = channelData[i];
        this.bufferIndex++;
        
        // When buffer is full, convert to Int16Array and send to main thread
        if (this.bufferIndex >= this.bufferSize) {
          const int16Buffer = new Int16Array(this.bufferSize);
          
          // Convert Float32 to Int16
          for (let j = 0; j < this.bufferSize; j++) {
            const sample = Math.max(-1, Math.min(1, this.buffer[j]));
            int16Buffer[j] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
          }
          
          // Send to main thread for Realtime API
          this.port.postMessage({ 
            audioData: int16Buffer,
            timestamp: Date.now()
          });
          
          // Reset buffer
          this.bufferIndex = 0;
        }
      }
    }
    
    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);
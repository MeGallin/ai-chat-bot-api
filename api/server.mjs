import express from 'express';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

dotenv.config();

if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY environment variable is required');
  process.exit(1);
}

const app = express();

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

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 30000, // 30 second timeout
});

const generateResponse = async (text) => {
  try {
    console.log('🔄 Calling OpenAI API for text generation...');
    const completion = await client.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        {
          role: 'user',
          content: text,
        },
      ],
    });
    console.log('✅ OpenAI API call successful');
    return completion.choices[0].message.content;
  } catch (error) {
    console.error('❌ OpenAI API error:', error.message);
    console.error('Full OpenAI error:', error);
    throw new Error('Failed to generate response');
  }
};

app.get('/health', (req, res) => {
  res
    .status(200)
    .json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.post('/', async (req, res) => {
  try {
    // Input validation
    const { text } = req.body;
    console.log('Received text:', text);
    if (!text || typeof text !== 'string') {
      return res
        .status(400)
        .json({ error: 'Text is required and must be a string' });
    }

    if (text.length > 4000) {
      return res
        .status(400)
        .json({ error: 'Text must be less than 4000 characters' });
    }

    console.log('🤖 Generating AI response...');
    const response = await generateResponse(text);
    console.log(
      '✅ AI response generated:',
      response.substring(0, 100) + '...',
    );

    console.log('🎵 Generating audio...');
    const mp3 = await client.audio.speech.create({
      model: 'tts-1',
      voice: 'fable',
      input: response,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    console.log(
      `🔊 Audio generated successfully. Buffer size: ${buffer.length} bytes`,
    );

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': buffer.length,
      'Cache-Control': 'no-cache',
    });

    console.log('📤 Sending audio response...');
    res.send(buffer);
    console.log('✅ Audio response sent successfully');
  } catch (error) {
    console.error('❌ Error in POST /:', error.message);
    console.error('Full error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 8000;
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

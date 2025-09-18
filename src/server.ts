import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path, { dirname } from 'path';
import mime from 'mime';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

import authRoutes from './routes/auth.js';
import gameRoutes from './routes/game.js';
import { errorHandler } from './middleware/errorHandler.js';
import { fileURLToPath } from 'url';
import type { WebSocketMessage } from '../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for Tailwind
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));
app.use(cors());
app.use(morgan('dev'));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files with proper MIME types
app.use(express.static(path.join(__dirname, '../public'), {
  setHeaders: (res, filePath) => {
    const mimeType = mime.getType(filePath);
    if (mimeType) {
      res.setHeader('Content-Type', mimeType);
    }
  }
}));

// Serve built files from dist
app.use(express.static(path.join(__dirname, '..'), {
  setHeaders: (res, filePath) => {
    const mimeType = mime.getType(filePath);
    if (mimeType) {
      res.setHeader('Content-Type', mimeType);
    }
  }
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve index.html for all other routes (SPA support)
app.get('/*splat', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling middleware
app.use(errorHandler);

// Create HTTP server and WebSocket server
const server = createServer(app);
const wss = new WebSocketServer({ server });

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection from', req.socket.remoteAddress);

  // Send welcome message
  const welcomeMessage: WebSocketMessage = {
    type: 'connect',
    data: 'Connected to Chess Doubles server',
    timestamp: new Date().toISOString()
  };
  ws.send(JSON.stringify(welcomeMessage));

  // Handle incoming messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString()) as WebSocketMessage;
      console.log('Received WebSocket message:', message);

      // Echo the message back to the client for now
      const response: WebSocketMessage = {
        type: 'game_update',
        data: `Server received: ${typeof message.data === 'string' ? message.data : JSON.stringify(message.data)}`,
        timestamp: new Date().toISOString()
      };
      ws.send(JSON.stringify(response));

      // Broadcast to all other connected clients (excluding sender)
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === client.OPEN) {
          client.send(JSON.stringify({
            type: 'game_update',
            data: `Player action: ${typeof message.data === 'string' ? message.data : JSON.stringify(message.data)}`,
            timestamp: new Date().toISOString()
          }));
        }
      });
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  });

  // Handle connection close
  ws.on('close', (code, reason) => {
    console.log(`WebSocket connection closed: ${code} ${reason}`);
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Express server running on port ${PORT}`);
  console.log(`🔌 WebSocket server ready for connections`);
});

export default app;
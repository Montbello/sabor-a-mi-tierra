import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env, connectDatabase, disconnectDatabase } from './config/index.js';
import { errorHandler } from './shared/middleware/index.js';
import { apiV1Router } from './api/v1.js';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Cookie parsing
app.use(cookieParser(env.COOKIE_SECRET));

// Trust proxy (for IP address in production)
app.set('trust proxy', 1);

// API routes
app.use('/api/v1', apiV1Router);

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    success: true,
    data: {
      name: 'Sabor a mi Tierra API',
      version: '1.0.0',
      documentation: '/api/v1/health',
    },
  });
});

// Error handling (must be last)
app.use(errorHandler);

// Graceful shutdown
async function shutdown(signal: string) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  await disconnectDatabase();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start server
async function main() {
  try {
    await connectDatabase();
    
    app.listen(env.PORT, () => {
      console.log(`
🌮 Sabor a mi Tierra API
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Environment: ${env.NODE_ENV}
Server:      http://localhost:${env.PORT}
API:         http://localhost:${env.PORT}/api/v1
Health:      http://localhost:${env.PORT}/api/v1/health
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();

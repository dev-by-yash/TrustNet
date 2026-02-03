import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import connectDB from './config/database';

// Import services
import logger from './utils/logger';
import redisService from './services/RedisService';
import ensService from './services/ENSService';
import webSocketService from './services/WebSocketService';
import cronService from './services/CronService';
import securityMiddleware from './middleware/SecurityMiddleware';

// Import routes
import organizationRoutes from './routes/organizations';
import employeeRoutes from './routes/employees';
import transactionRoutes from './routes/transactions';
import ensRoutes from './routes/ens';
import authRoutes from './routes/auth';

// Load environment variables
dotenv.config();

// Initialize Express app
const app: Express = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server for WebSocket
const httpServer = http.createServer(app);

// Security Middleware
app.use(securityMiddleware.helmetConfig());
app.use(cors(securityMiddleware.corsOptions()));
app.use(securityMiddleware.sanitizeInputs());
app.use(securityMiddleware.generalRateLimiter());

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.http(`${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'TrustNet Backend API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/ens', ensRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/transactions', transactionRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  logger.warn(`404 Not Found: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// Error handling middleware
app.use(securityMiddleware.errorHandler());

// Start server
const startServer = async () => {
  try {
    logger.info('Starting TrustNet Backend Server...');

    // Connect to MongoDB
    await connectDB();
    logger.info('✓ MongoDB connected');

    // Initialize Redis
    await redisService.connect();
    logger.info('✓ Redis connected');

    // Initialize ENS Service
    await ensService.initialize();
    logger.info('✓ ENS Service initialized');

    // Initialize WebSocket Service
    webSocketService.initialize(httpServer);
    logger.info('✓ WebSocket Service initialized');

    // Initialize and start Cron Service
    cronService.initialize();
    cronService.startAll();
    logger.info('✓ Cron Service initialized and started');

    // Start listening
    httpServer.listen(PORT, () => {
      logger.info('\n' + '='.repeat(60));
      logger.info('  TrustNet Backend API Server');
      logger.info('='.repeat(60));
      logger.info(`  Server: http://localhost:${PORT}`);
      logger.info('  Database: MongoDB');
      logger.info(`  Redis: ${redisService.isHealthy() ? 'Connected' : 'Disconnected'}`);
      logger.info('  WebSocket: Active');
      logger.info('  Cron Jobs: Running');
      logger.info(`  Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info('');
      logger.info('  API Documentation:');
      logger.info('  - Authentication: /api/auth');
      logger.info('  - ENS Service: /api/ens');
      logger.info('  - Organizations: /api/organizations');
      logger.info('  - Employees: /api/employees');
      logger.info('  - Transactions: /api/transactions');
      logger.info('='.repeat(60) + '\n');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Received shutdown signal, cleaning up...');
  
  try {
    // Stop cron jobs
    cronService.stopAll();
    logger.info('✓ Cron jobs stopped');

    // Close Redis connection
    await redisService.disconnect();
    logger.info('✓ Redis disconnected');

    // Close HTTP server
    httpServer.close(() => {
      logger.info('✓ HTTP server closed');
      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  logger.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

// Start the server
startServer();

export default app;

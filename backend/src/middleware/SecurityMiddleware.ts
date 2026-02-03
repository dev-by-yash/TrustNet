import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { body, validationResult, ValidationChain } from 'express-validator';
import logger from '../utils/logger';
import authService from '../services/AuthenticationService';
import redisService from '../services/RedisService';

/**
 * Audit log entry interface
 */
interface AuditLogEntry {
  timestamp: Date;
  userId?: string;
  action: string;
  resource: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  details?: any;
}

/**
 * Security Middleware Class
 */
class SecurityMiddleware {
  /**
   * Configure Helmet security headers
   */
  helmetConfig() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      noSniff: true,
      xssFilter: true,
      hidePoweredBy: true,
    });
  }

  /**
   * General API rate limiter
   */
  generalRateLimiter() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
          success: false,
          error: 'Too many requests, please try again later.',
        });
      },
    });
  }

  /**
   * Strict rate limiter for authentication endpoints
   */
  authRateLimiter() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // Limit each IP to 5 authentication attempts
      message: 'Too many authentication attempts, please try again later.',
      skipSuccessfulRequests: true,
      handler: (req, res) => {
        logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
          success: false,
          error: 'Too many authentication attempts, please try again in 15 minutes.',
        });
      },
    });
  }

  /**
   * Transaction rate limiter
   */
  transactionRateLimiter() {
    return rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 10, // Limit to 10 transactions per minute
      message: 'Too many transactions, please slow down.',
      handler: (req, res) => {
        logger.warn(`Transaction rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
          success: false,
          error: 'Transaction rate limit exceeded. Please wait before trying again.',
        });
      },
    });
  }

  /**
   * JWT authentication middleware
   */
  authenticate() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          logger.warn(`Missing or invalid authorization header from ${req.ip}`);
          return res.status(401).json({
            success: false,
            error: 'Authentication required',
          });
        }

        const token = authHeader.substring(7);
        const decoded = authService.verifyToken(token);

        if (!decoded) {
          logger.warn(`Invalid token from ${req.ip}`);
          return res.status(401).json({
            success: false,
            error: 'Invalid or expired token',
          });
        }

        // Validate session
        const sessionValid = await authService.validateSession(decoded.sessionId);
        
        if (!sessionValid) {
          logger.warn(`Invalid session for ${decoded.address}`);
          return res.status(401).json({
            success: false,
            error: 'Session expired, please login again',
          });
        }

        // Attach user info to request
        (req as any).user = decoded;

        next();
      } catch (error) {
        logger.error('Authentication middleware error:', error);
        return res.status(500).json({
          success: false,
          error: 'Authentication error',
        });
      }
    };
  }

  /**
   * Role-based access control middleware
   */
  authorize(requiredPermission: string) {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = (req as any).user;

        if (!user) {
          return res.status(401).json({
            success: false,
            error: 'Authentication required',
          });
        }

        const hasPermission = authService.hasPermission(user.role, requiredPermission as any);

        if (!hasPermission) {
          logger.warn(`Permission denied for ${user.address}: ${requiredPermission}`);
          return res.status(403).json({
            success: false,
            error: 'Insufficient permissions',
          });
        }

        next();
      } catch (error) {
        logger.error('Authorization middleware error:', error);
        return res.status(500).json({
          success: false,
          error: 'Authorization error',
        });
      }
    };
  }

  /**
   * Request validation middleware
   */
  validate(validations: ValidationChain[]) {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Run all validations
      for (const validation of validations) {
        await validation.run(req);
      }

      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        logger.warn(`Validation failed: ${JSON.stringify(errors.array())}`);
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      next();
    };
  }

  /**
   * Audit logging middleware
   */
  auditLog(action: string, resource: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      
      // Store original send function
      const originalSend = res.send;

      // Override send function to capture response
      res.send = function (data: any): Response {
        const duration = Date.now() - startTime;
        
        const logEntry: AuditLogEntry = {
          timestamp: new Date(),
          userId: (req as any).user?.address,
          action,
          resource,
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown',
          success: res.statusCode < 400,
          details: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration,
            body: req.body,
          },
        };

        // Log to file
        logger.info(`AUDIT: ${JSON.stringify(logEntry)}`);

        // Call original send
        return originalSend.call(this, data);
      };

      next();
    };
  }

  /**
   * Input sanitization middleware
   */
  sanitizeInputs() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (req.body) {
        req.body = this.sanitizeObject(req.body);
      }
      if (req.query) {
        req.query = this.sanitizeObject(req.query);
      }
      if (req.params) {
        req.params = this.sanitizeObject(req.params);
      }
      next();
    };
  }

  /**
   * Sanitize object recursively
   */
  private sanitizeObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return typeof obj === 'string' ? this.sanitizeString(obj) : obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = this.sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }

  /**
   * Sanitize string input
   */
  private sanitizeString(str: string): string {
    return str
      .replace(/[<>]/g, '') // Remove HTML tags
      .trim();
  }

  /**
   * CORS configuration
   */
  corsOptions() {
    return {
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
        
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          logger.warn(`CORS blocked origin: ${origin}`);
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400, // 24 hours
    };
  }

  /**
   * Error handling middleware
   */
  errorHandler() {
    return (err: Error, req: Request, res: Response, next: NextFunction) => {
      logger.error('Error:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        ip: req.ip,
      });

      // Don't leak error details in production
      const message = process.env.NODE_ENV === 'production'
        ? 'An error occurred'
        : err.message;

      res.status(500).json({
        success: false,
        error: message,
      });
    };
  }

  /**
   * Validation rules for common inputs
   */
  validationRules = {
    ethereumAddress: body('address')
      .isEthereumAddress()
      .withMessage('Invalid Ethereum address'),
    
    ensName: body('ensName')
      .matches(/^[a-z0-9-]+\.eth$/)
      .withMessage('Invalid ENS name format'),
    
    organizationId: body('organizationId')
      .isString()
      .notEmpty()
      .withMessage('Organization ID is required'),
    
    employeeId: body('employeeId')
      .isString()
      .notEmpty()
      .withMessage('Employee ID is required'),
    
    amount: body('amount')
      .isNumeric()
      .isFloat({ gt: 0 })
      .withMessage('Amount must be a positive number'),
    
    signature: body('signature')
      .isString()
      .matches(/^0x[a-fA-F0-9]+$/)
      .withMessage('Invalid signature format'),
  };
}

export default new SecurityMiddleware();

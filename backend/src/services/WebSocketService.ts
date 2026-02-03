import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import logger from '../utils/logger';
import authService from './AuthenticationService';

interface SocketUser {
  address: string;
  organizationId?: string;
  employeeId?: string;
  role: string;
}

class WebSocketService {
  private io: SocketIOServer | null = null;
  private connectedUsers: Map<string, SocketUser> = new Map();

  /**
   * Initialize WebSocket server
   */
  initialize(httpServer: HTTPServer): void {
    try {
      this.io = new SocketIOServer(httpServer, {
        cors: {
          origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
          methods: ['GET', 'POST'],
          credentials: true,
        },
        pingTimeout: 60000,
        pingInterval: 25000,
      });

      this.setupEventHandlers();
      logger.info('WebSocket service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize WebSocket service:', error);
      throw error;
    }
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.use(this.authenticateSocket.bind(this));

    this.io.on('connection', (socket: Socket) => {
      const user = (socket as any).user as SocketUser;
      
      logger.info(`Client connected: ${socket.id}, address: ${user.address}`);
      this.connectedUsers.set(socket.id, user);

      // Join organization room
      if (user.organizationId) {
        socket.join(`org:${user.organizationId}`);
        logger.debug(`Socket ${socket.id} joined room: org:${user.organizationId}`);
      }

      // Join employee room
      if (user.employeeId) {
        socket.join(`employee:${user.employeeId}`);
        logger.debug(`Socket ${socket.id} joined room: employee:${user.employeeId}`);
      }

      // Handle custom events
      this.registerSocketEvents(socket, user);

      // Handle disconnect
      socket.on('disconnect', (reason) => {
        logger.info(`Client disconnected: ${socket.id}, reason: ${reason}`);
        this.connectedUsers.delete(socket.id);
      });
    });
  }

  /**
   * Authenticate socket connection
   */
  private async authenticateSocket(socket: Socket, next: (err?: Error) => void): Promise<void> {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = authService.verifyToken(token);

      if (!decoded) {
        return next(new Error('Invalid authentication token'));
      }

      // Validate session
      const sessionValid = await authService.validateSession(decoded.sessionId);
      
      if (!sessionValid) {
        return next(new Error('Session expired'));
      }

      // Attach user to socket
      (socket as any).user = {
        address: decoded.address,
        organizationId: decoded.organizationId,
        employeeId: decoded.employeeId,
        role: decoded.role,
      };

      next();
    } catch (error) {
      logger.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  }

  /**
   * Register custom socket events
   */
  private registerSocketEvents(socket: Socket, user: SocketUser): void {
    // Transaction events
    socket.on('transaction:subscribe', (data: { transactionId: string }) => {
      socket.join(`transaction:${data.transactionId}`);
      logger.debug(`Socket ${socket.id} subscribed to transaction: ${data.transactionId}`);
    });

    socket.on('transaction:unsubscribe', (data: { transactionId: string }) => {
      socket.leave(`transaction:${data.transactionId}`);
      logger.debug(`Socket ${socket.id} unsubscribed from transaction: ${data.transactionId}`);
    });

    // Payroll events
    socket.on('payroll:subscribe', () => {
      if (user.organizationId) {
        socket.join(`payroll:${user.organizationId}`);
        logger.debug(`Socket ${socket.id} subscribed to payroll updates`);
      }
    });

    // Network topology events
    socket.on('network:subscribe', () => {
      if (user.organizationId) {
        socket.join(`network:${user.organizationId}`);
        logger.debug(`Socket ${socket.id} subscribed to network updates`);
      }
    });

    // Ping/Pong for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });
  }

  /**
   * Emit event to specific user
   */
  emitToUser(employeeId: string, event: string, data: any): void {
    if (!this.io) {
      logger.warn('WebSocket server not initialized');
      return;
    }

    this.io.to(`employee:${employeeId}`).emit(event, data);
    logger.debug(`Emitted ${event} to employee: ${employeeId}`);
  }

  /**
   * Emit event to organization
   */
  emitToOrganization(organizationId: string, event: string, data: any): void {
    if (!this.io) {
      logger.warn('WebSocket server not initialized');
      return;
    }

    this.io.to(`org:${organizationId}`).emit(event, data);
    logger.debug(`Emitted ${event} to organization: ${organizationId}`);
  }

  /**
   * Emit event to specific room
   */
  emitToRoom(room: string, event: string, data: any): void {
    if (!this.io) {
      logger.warn('WebSocket server not initialized');
      return;
    }

    this.io.to(room).emit(event, data);
    logger.debug(`Emitted ${event} to room: ${room}`);
  }

  /**
   * Broadcast event to all connected clients
   */
  broadcast(event: string, data: any): void {
    if (!this.io) {
      logger.warn('WebSocket server not initialized');
      return;
    }

    this.io.emit(event, data);
    logger.debug(`Broadcasted ${event} to all clients`);
  }

  /**
   * Emit transaction update
   */
  emitTransactionUpdate(transactionId: string, status: string, details: any): void {
    this.emitToRoom(`transaction:${transactionId}`, 'transaction:update', {
      transactionId,
      status,
      details,
      timestamp: Date.now(),
    });
  }

  /**
   * Emit payroll distribution event
   */
  emitPayrollDistribution(organizationId: string, data: any): void {
    this.emitToRoom(`payroll:${organizationId}`, 'payroll:distributed', {
      ...data,
      timestamp: Date.now(),
    });
  }

  /**
   * Emit balance update
   */
  emitBalanceUpdate(employeeId: string, chain: string, balance: string): void {
    this.emitToUser(employeeId, 'balance:update', {
      chain,
      balance,
      timestamp: Date.now(),
    });
  }

  /**
   * Emit network topology update
   */
  emitNetworkUpdate(organizationId: string, topology: any): void {
    this.emitToRoom(`network:${organizationId}`, 'network:update', {
      topology,
      timestamp: Date.now(),
    });
  }

  /**
   * Emit employee status change
   */
  emitEmployeeStatus(organizationId: string, employeeId: string, status: string): void {
    this.emitToOrganization(organizationId, 'employee:status', {
      employeeId,
      status,
      timestamp: Date.now(),
    });
  }

  /**
   * Get connected users count
   */
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Get connected users in organization
   */
  getOrganizationUsersCount(organizationId: string): number {
    if (!this.io) return 0;
    
    const room = this.io.sockets.adapter.rooms.get(`org:${organizationId}`);
    return room ? room.size : 0;
  }

  /**
   * Check if user is connected
   */
  isUserConnected(employeeId: string): boolean {
    if (!this.io) return false;
    
    const room = this.io.sockets.adapter.rooms.get(`employee:${employeeId}`);
    return room ? room.size > 0 : false;
  }

  /**
   * Disconnect user
   */
  disconnectUser(employeeId: string, reason?: string): void {
    if (!this.io) return;

    const socketsInRoom = this.io.sockets.adapter.rooms.get(`employee:${employeeId}`);
    
    if (socketsInRoom) {
      socketsInRoom.forEach((socketId) => {
        const socket = this.io?.sockets.sockets.get(socketId);
        if (socket) {
          socket.disconnect(true);
          logger.info(`Disconnected user ${employeeId}, reason: ${reason || 'manual'}`);
        }
      });
    }
  }

  /**
   * Get WebSocket server instance
   */
  getIO(): SocketIOServer | null {
    return this.io;
  }
}

export default new WebSocketService();

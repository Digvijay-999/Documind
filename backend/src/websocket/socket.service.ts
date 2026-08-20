import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_for_development';

export interface DocumentStatusPayload {
  documentId: string;
  status: 'PROCESSING' | 'READY' | 'FAILED';
  stage: 'uploading' | 'extracting' | 'chunking' | 'embedding' | 'storing_vectors' | 'completed' | 'error';
  message?: string;
  progress?: number;
}

let ioInstance: Server | null = null;

export const initSocketIO = (httpServer: HttpServer): Server => {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  // JWT Authentication Middleware for Socket.IO
  io.use((socket: Socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers?.authorization &&
        socket.handshake.headers.authorization.replace('Bearer ', ''));

    if (!token) {
      return next(new Error('Authentication error: Missing token'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role?: string };
      socket.data.userId = decoded.id;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;
    if (userId) {
      const userRoom = `user:${userId}`;
      socket.join(userRoom);
      console.log(`[WebSocket] Authenticated client connected for user ${userId} (socket ${socket.id})`);
    }

    socket.on('disconnect', (reason) => {
      console.log(`[WebSocket] Client disconnected: ${socket.id}, reason: ${reason}`);
    });
  });

  ioInstance = io;
  return io;
};

export const getIO = (): Server | null => {
  return ioInstance;
};

/**
 * Emits real-time document processing updates to the user's private room.
 * This guarantees strict multi-tenant isolation (users only receive events for their own documents).
 */
export const emitDocumentStatus = (userId: string, payload: DocumentStatusPayload): void => {
  if (ioInstance) {
    ioInstance.to(`user:${userId}`).emit('document:status', payload);
  }
};

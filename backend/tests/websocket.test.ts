import http from 'http';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import express from 'express';
import jwt from 'jsonwebtoken';
import { initSocketIO, emitDocumentStatus } from '../src/websocket/socket.service';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_for_development';

describe('WebSocket / Real-Time Document Status', () => {
  let server: http.Server;
  let port: number;
  const userId = 'ws-test-user-uuid';
  const validToken = jwt.sign({ id: userId }, JWT_SECRET);

  beforeAll((done) => {
    const app = express();
    server = http.createServer(app);
    initSocketIO(server);
    server.listen(() => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        port = addr.port;
      }
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  it('1. Authenticated socket connects successfully', (done) => {
    const client: ClientSocket = Client(`http://localhost:${port}`, {
      auth: { token: validToken },
      transports: ['websocket'],
    });

    client.on('connect', () => {
      expect(client.connected).toBe(true);
      client.disconnect();
      done();
    });

    client.on('connect_error', (err: any) => {
      done(err);
    });
  });

  it('2. Unauthenticated socket is rejected with authentication error', (done) => {
    const client: ClientSocket = Client(`http://localhost:${port}`, {
      auth: { token: 'invalid_tampered_token' },
      transports: ['websocket'],
    });

    client.on('connect', () => {
      client.disconnect();
      done(new Error('Should not have connected without valid token'));
    });

    client.on('connect_error', (err: any) => {
      expect(err.message).toContain('Authentication error');
      client.disconnect();
      done();
    });
  });

  it('3. Authorized user receives real-time document processing events', (done) => {
    const client: ClientSocket = Client(`http://localhost:${port}`, {
      auth: { token: validToken },
      transports: ['websocket'],
    });

    client.on('connect', () => {
      // Emit a status update for this user
      emitDocumentStatus(userId, {
        documentId: 'doc-test-123',
        status: 'PROCESSING',
        stage: 'embedding',
        message: 'Generating embeddings with Nemotron...',
        progress: 75,
      });
    });

    client.on('document:status', (data: any) => {
      expect(data.documentId).toBe('doc-test-123');
      expect(data.status).toBe('PROCESSING');
      expect(data.stage).toBe('embedding');
      expect(data.progress).toBe(75);
      client.disconnect();
      done();
    });
  });
});

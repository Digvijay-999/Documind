import request from 'supertest';
import app from '../src/server';
import prisma from '../src/utils/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_for_development';

describe('Phase 10A: OpenAPI / Swagger & Error Handling Tests', () => {
  let userToken: string;
  let adminToken: string;
  let testUserId: string;

  beforeAll(async () => {
    await prisma.document.deleteMany();
    await prisma.user.deleteMany();

    const passwordHash = await bcrypt.hash('password123', 10);

    const user = await prisma.user.create({
      data: {
        name: 'Swagger Regular User',
        email: 'swagger_user@example.com',
        passwordHash,
        role: 'USER',
      },
    });
    testUserId = user.id;
    userToken = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });

    const admin = await prisma.user.create({
      data: {
        name: 'Swagger Admin User',
        email: 'swagger_admin@example.com',
        passwordHash,
        role: 'ADMIN',
      },
    });
    adminToken = jwt.sign({ id: admin.id, role: admin.role }, JWT_SECRET, { expiresIn: '1h' });
  });

  afterAll(async () => {
    await prisma.document.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe('1. Swagger / OpenAPI Endpoints', () => {
    it('GET /api-docs/ returns 200 and Swagger UI HTML', async () => {
      const res = await request(app).get('/api-docs/');
      expect(res.statusCode).toBe(200);
      expect(res.text).toContain('swagger-ui');
    });

    it('GET /api-docs/swagger.json returns valid OpenAPI 3.0 schema', async () => {
      const res = await request(app).get('/api-docs/swagger.json');
      expect(res.statusCode).toBe(200);
      expect(res.body.openapi).toBe('3.0.0');
      expect(res.body.info.title).toBe('DocuMind AI API');
      expect(res.body.paths['/api/auth/register']).toBeDefined();
      expect(res.body.paths['/api/documents']).toBeDefined();
      expect(res.body.paths['/api/ai/chat/stream']).toBeDefined();
      expect(res.body.paths['/api/payments/verify']).toBeDefined();
      expect(res.body.components.securitySchemes.bearerAuth).toBeDefined();
    });
  });

  describe('2. Standard Error Response Format Verification', () => {
    it('400 VALIDATION_ERROR: invalid register body', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: '', email: 'not-an-email', password: '123' });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(Array.isArray(res.body.error.details)).toBe(true);
      expect(res.body.error.details.length).toBeGreaterThan(0);
    });

    it('401 UNAUTHORIZED: request without JWT token', async () => {
      const res = await request(app).get('/api/documents');

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('UNAUTHORIZED');
      expect(res.body.message).toContain('Unauthorized');
    });

    it('403 FORBIDDEN: non-admin accessing admin endpoint', async () => {
      const res = await request(app)
        .get('/api/admin/documents')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.message).toContain('Forbidden');
    });

    it('404 NOT_FOUND: requesting non-existent document', async () => {
      const res = await request(app)
        .get('/api/documents/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('409 CONFLICT: registering with existing email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Duplicate User',
          email: 'swagger_user@example.com',
          password: 'password123',
        });

      expect(res.statusCode).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('CONFLICT');
      expect(res.body.message).toContain('already exists');
    });
  });

  describe('3. Public and Health Endpoints', () => {
    it('GET /api/health returns 200', async () => {
      const res = await request(app).get('/api/health');
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('GET /api/public/stats returns 200 with aggregate data', async () => {
      const res = await request(app).get('/api/public/stats');
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });
});

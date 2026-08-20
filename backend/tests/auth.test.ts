import request from 'supertest';
import app from '../src/server';
import prisma from '../src/utils/prisma';

beforeAll(async () => {
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe('Auth Endpoints', () => {
  let userToken: string;
  let adminToken: string;

  it('should register a new user successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('test@example.com');
  });

  it('should reject duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Another User',
        email: 'test@example.com',
        password: 'password123',
      });
    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('should reject invalid registration body', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: '',
        email: 'invalid-email',
        password: '123',
      });
    expect(res.statusCode).toBe(400);
  });

  it('should login successfully', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123',
      });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    userToken = res.body.token;
  });

  it('should reject invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'wrongpassword',
      });
    expect(res.statusCode).toBe(401);
  });

  it('should deny access to /me without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
  });

  it('should allow access to /me with valid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.email).toBe('test@example.com');
  });

  it('should deny USER access to admin endpoint', async () => {
    const res = await request(app)
      .get('/api/admin/documents')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toBe(403);
  });

  it('should allow ADMIN access to admin endpoint', async () => {
    // Manually create an admin user
    const bcrypt = require('bcrypt');
    const passwordHash = await bcrypt.hash('adminpass', 10);
    await prisma.user.create({
      data: {
        name: 'Admin User',
        email: 'admin@example.com',
        passwordHash,
        role: 'ADMIN',
      },
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'adminpass',
      });
    adminToken = loginRes.body.token;

    const res = await request(app)
      .get('/api/admin/documents')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

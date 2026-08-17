import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Note: To simulate restarting the backend process within a single test run without actually killing the process,
// we will instantiate the controller functions directly or use supertest on the app.
// Since the issue is "across restarts", we will also test if the JWT_SECRET and Prisma behave deterministically.

import app from '../src/server';

const prisma = new PrismaClient();

describe('Authentication Persistence Regression Test', () => {
  const testEmail = 'restart_test@example.com';
  const testPassword = 'mysecurepassword123';
  let createdUserId = '';

  beforeAll(async () => {
    await prisma.user.deleteMany({ where: { email: testEmail } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await prisma.$disconnect();
  });

  it('1. Register user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Restart Test User',
        email: testEmail,
        password: testPassword,
      });
    
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    createdUserId = res.body.data.id;
  });

  it('2. Login successfully right after registration', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: testPassword,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
  });

  it('3. Simulate fresh backend process and Prisma client behavior', async () => {
    // We check that the user is actually stored in the DB
    const freshPrisma = new PrismaClient();
    const user = await freshPrisma.user.findUnique({ where: { email: testEmail } });
    
    expect(user).not.toBeNull();
    expect(user?.email).toBe(testEmail);
    expect(user?.passwordHash).toBeDefined();

    // The JWT_SECRET should be stable
    const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_for_development';
    expect(secret).toBe('super_secret_jwt_key_for_development');
    
    await freshPrisma.$disconnect();
  });

  it('4. Login again with same credentials (simulating after restart)', async () => {
    // Note: Since this uses `app`, it hits the exact same `/api/auth/login` endpoint
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: testPassword,
      });

    if (res.status !== 200) {
      console.log('Login failed response:', res.body);
    }

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

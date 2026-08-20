import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';
import { registerSchema, loginSchema } from '../utils/validation';
import { z } from 'zod';
import { formatErrorResponse } from '../utils/errors';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_for_development';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = registerSchema.parse(req.body);
    
    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      res.status(409).json(formatErrorResponse('CONFLICT', 'Email already exists'));
      return;
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(data.password, saltRounds);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash
      }
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        subscriptionPlan: user.subscriptionPlan,
        subscriptionStatus: user.subscriptionStatus,
      }
    });
  } catch (error: any) {
    if (error instanceof z.ZodError || error.name === 'ZodError') {
      const details = error.issues?.map((i: any) => ({ field: i.path.join('.'), message: i.message })) || [];
      const msg = details[0]?.message || error.errors?.[0]?.message || 'Validation failed';
      res.status(400).json(formatErrorResponse('VALIDATION_ERROR', msg, details));
      return;
    }
    res.status(500).json(formatErrorResponse('INTERNAL_SERVER_ERROR', 'Internal server error'));
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = loginSchema.parse(req.body);
    
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      res.status(401).json(formatErrorResponse('UNAUTHORIZED', 'Invalid credentials'));
      return;
    }

    const isValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isValid) {
      res.status(401).json(formatErrorResponse('UNAUTHORIZED', 'Invalid credentials'));
      return;
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });

    res.status(200).json({
      success: true,
      token,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        subscriptionPlan: user.subscriptionPlan,
        subscriptionStatus: user.subscriptionStatus,
      }
    });
  } catch (error: any) {
    if (error instanceof z.ZodError || error.name === 'ZodError') {
      const details = error.issues?.map((i: any) => ({ field: i.path.join('.'), message: i.message })) || [];
      const msg = details[0]?.message || error.errors?.[0]?.message || 'Validation failed';
      res.status(400).json(formatErrorResponse('VALIDATION_ERROR', msg, details));
      return;
    }
    res.status(500).json(formatErrorResponse('INTERNAL_SERVER_ERROR', 'Internal server error'));
  }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json(formatErrorResponse('UNAUTHORIZED', 'Unauthorized'));
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json(formatErrorResponse('NOT_FOUND', 'User not found'));
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        subscriptionPlan: user.subscriptionPlan,
        subscriptionStatus: user.subscriptionStatus,
      }
    });
  } catch (error: any) {
    res.status(500).json(formatErrorResponse('INTERNAL_SERVER_ERROR', 'Internal server error'));
  }
};

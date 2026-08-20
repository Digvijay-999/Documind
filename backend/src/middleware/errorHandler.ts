import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, formatErrorResponse } from '../utils/errors';
import multer from 'multer';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // 1. Zod Validation Error
  if (err instanceof ZodError || err?.name === 'ZodError') {
    const details = err.issues?.map((issue: any) => ({
      field: issue.path?.join('.') || 'body',
      message: issue.message,
    })) || err.errors?.map((e: any) => ({
      field: e.path?.join('.') || 'body',
      message: e.message,
    })) || [];

    const message = details[0]?.message || 'Validation failed';
    res.status(400).json(formatErrorResponse('VALIDATION_ERROR', message, details));
    return;
  }

  // 2. Custom AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json(formatErrorResponse(err.code, err.message, err.details));
    return;
  }

  // 3. Multer Upload Errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json(
        formatErrorResponse('PAYLOAD_TOO_LARGE', 'File is too large (maximum allowed: 10MB)', [
          { field: 'file', message: 'File exceeds 10MB limit' },
        ])
      );
      return;
    }
    res.status(400).json(formatErrorResponse('VALIDATION_ERROR', err.message, [{ field: 'file', message: err.message }]));
    return;
  }

  // 4. Other known custom error objects with code/status
  if (err?.code === 'ECONNREFUSED' || err?.name === 'MongoServerError') {
    console.error('[Database Error]', err.message);
    res.status(500).json(formatErrorResponse('INTERNAL_SERVER_ERROR', 'Database service currently unavailable'));
    return;
  }

  // 5. Unhandled Server Error
  console.error('[Unhandled Server Error]', err);
  const isProduction = process.env.NODE_ENV === 'production';
  const message = isProduction ? 'Internal server error' : err?.message || 'Internal server error';

  res.status(500).json(formatErrorResponse('INTERNAL_SERVER_ERROR', message));
};

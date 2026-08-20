export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'PAYLOAD_TOO_LARGE'
  | 'RATE_LIMITED'
  | 'INTERNAL_SERVER_ERROR';

export interface ErrorDetails {
  field?: string;
  message: string;
  [key: string]: any;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  error: {
    code: ErrorCode;
    message: string;
    details?: ErrorDetails[];
  };
}

export class AppError extends Error {
  public statusCode: number;
  public code: ErrorCode;
  public details?: ErrorDetails[];

  constructor(statusCode: number, code: ErrorCode, message: string, details?: ErrorDetails[]) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const formatErrorResponse = (
  code: ErrorCode,
  message: string,
  details?: ErrorDetails[]
): ApiErrorResponse => {
  return {
    success: false,
    message,
    error: {
      code,
      message,
      ...(details && details.length > 0 ? { details } : {}),
    },
  };
};

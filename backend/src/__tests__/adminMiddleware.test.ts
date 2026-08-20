import { requireAdmin } from '../middleware/adminMiddleware';
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';

describe('Admin Middleware', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction = jest.fn();

  beforeEach(() => {
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  it('should return 401 if no user is present', () => {
    mockRequest = {};
    requireAdmin(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ success: false, message: 'Unauthorized' });
  });

  it('should return 403 if user is not an admin', () => {
    mockRequest = {
      user: { id: '1', email: 'test@test.com', role: 'USER' }
    };
    requireAdmin(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({ success: false, message: 'Forbidden: Admins only' });
  });

  it('should call next if user is an admin', () => {
    mockRequest = {
      user: { id: '1', email: 'admin@test.com', role: 'ADMIN' }
    };
    requireAdmin(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalled();
  });
});

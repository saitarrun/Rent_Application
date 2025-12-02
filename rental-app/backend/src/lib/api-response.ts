export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  meta?: {
    timestamp: string;
    version: string;
  };
}

export function successResponse<T>(data: T, meta = true): ApiResponse<T> {
  return {
    success: true,
    data,
    ...(meta && {
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0'
      }
    })
  };
}

export function errorResponse(code: string, message: string, details?: Record<string, any>): ApiResponse {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details && { details })
    },
    meta: {
      timestamp: new Date().toISOString(),
      version: '1.0'
    }
  };
}

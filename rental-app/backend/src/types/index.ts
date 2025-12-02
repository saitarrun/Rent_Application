/**
 * Global TypeScript types and interfaces
 */

export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
  details?: Record<string, any>;
}

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface SortOptions {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface QueryParams extends PaginationParams, SortOptions {
  search?: string;
  filters?: Record<string, any>;
}

export interface User {
  id: string;
  email: string;
  ethAddr?: string | null;
  role: 'owner' | 'tenant' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthToken {
  userId: string;
  role: string;
  ethAddr?: string | null;
  iat: number;
  exp: number;
}

export interface Lease {
  id: string;
  propertyId: string;
  ownerId: string;
  tenantId: string;
  tenantEth: string;
  status: 'pending' | 'active' | 'ended' | 'terminated';
  monthlyRentEth: string;
  securityDepositEth: string;
  startISO: string;
  endISO: string;
  createdAt: Date;
}

export interface Invoice {
  id: string;
  leaseId: string;
  amountEth: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  periodStartISO: string;
  periodEndISO: string;
  dueISO: string;
  paidISO?: string | null;
  createdAt: Date;
}

export interface ApplicationError extends Error {
  statusCode?: number;
  code?: string;
}

// Frontend-specific types
export interface NotificationPayload {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

export interface FormFieldError {
  field: string;
  message: string;
}

export interface LoadingState {
  isLoading: boolean;
  error?: string | null;
}

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

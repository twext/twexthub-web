import { vi } from 'vitest';
import type { ProblemDetails } from '../../types/api';

export class ApiError extends Error {
  status: number;
  problem?: ProblemDetails;

  constructor(message: string, status: number, problem?: ProblemDetails) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.problem = problem;
  }
}

export const api = {
  getBaseUrl: vi.fn(() => 'http://localhost:3000/api/v0'),
  setBaseUrl: vi.fn(),
  resetBaseUrl: vi.fn(),
  getToken: vi.fn(() => null),
  setToken: vi.fn(),
  getStoredUser: vi.fn(() => null),
  setStoredUser: vi.fn(),
  getStats: vi.fn(),
  getMeta: vi.fn(),
  getExtensions: vi.fn(),
  searchExtensions: vi.fn(),
  getExtension: vi.fn(),
  getTerms: vi.fn(),
  getPrivacy: vi.fn(),
  getUsers: vi.fn(),
  getUser: vi.fn(),
  login: vi.fn(),
  signup: vi.fn(),
  logout: vi.fn(),
  getMe: vi.fn(),
  acceptTerms: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  getSessions: vi.fn(),
  revokeSession: vi.fn(),
  getTokens: vi.fn(),
  createToken: vi.fn(),
  updateToken: vi.fn(),
  deleteToken: vi.fn(),
  deleteExtension: vi.fn(),
  yankVersion: vi.fn(),
  getVersion: vi.fn(),
  downloadVersion: vi.fn(),
  listVersionsForReview: vi.fn(),
  reviewVersion: vi.fn(),
  updateUserRole: vi.fn(),
  updateTerms: vi.fn(),
  updatePrivacyPolicy: vi.fn(),
};

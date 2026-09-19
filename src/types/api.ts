export interface ProblemDetails {
  type?: string;
  title: string;
  status: number;
  detail: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

export type UserRole = 'admin' | 'normal';

export interface User {
  namespace: string;
  displayName: string;
  role?: UserRole;
  hasPublished: boolean;
  createdAt: string;
  termsAcceptedVersion?: number | null;
}

export interface AuthSessionResponse {
  user: User;
  token: string;
}

export interface Session {
  id: string;
  createdAt: string;
  expiresAt: string;
  lastUsedAt?: string;
}

export type TokenScope = 'publish' | 'yank';

export interface AutomationToken {
  id: string;
  name: string;
  scopes: TokenScope[];
  createdAt: string;
  expiresAt?: string | null;
  lastUsedAt?: string | null;
  token?: string; // only present upon creation
}

export type ModerationStatus = 'published' | 'pending' | 'rejected' | 'yanked';

export interface ExtensionVersion {
  version: string;
  status: ModerationStatus;
  createdAt?: string;
  changelog?: string;
  downloadUrl?: string;
}

export interface Extension {
  namespace: string;
  id: string;
  name: string;
  description?: string;
  shortDescription?: string;
  author:
    | string
    | {
        namespace: string;
        displayName?: string;
      };
  latestVersion?: string;
  status?: ModerationStatus;
  versions?: ExtensionVersion[];
  createdAt?: string;
  updatedAt?: string;
  codeUrl?: string;
}

export interface InstanceStats {
  published: number;
  pending: number;
  authors: number;
}

export interface TermsDoc {
  version: number;
  body: string;
  updatedAt: string;
}

export interface PrivacyDoc {
  version: number;
  body: string;
  updatedAt: string;
}

export interface Pagination {
  nextCursor: string | null;
  hasMore: boolean;
}

export interface PaginatedList<T> {
  data: T[];
  pagination: Pagination;
}

export interface VersionInfo {
  namespace: string;
  id: string;
  version: string;
  status: ModerationStatus | 'staging';
  name: string;
  license: string;
  description: string;
  author?: string | null;
  createdAt: string;
  publishedAt?: string;
  dist?: {
    downloadUrl: string;
  };
}

export interface PendingVersion extends VersionInfo {
  ownerNamespace: string;
}

export interface Meta {
  name: string;
  version: string;
  tagline: string;
  homepage: string;
}

export interface ReviewVersionPayload {
  status: 'approved' | 'rejected';
  reason?: string;
}

export interface UpdateUserPayload {
  displayName?: string;
  password?: string;
  currentPassword?: string;
  role?: UserRole;
}

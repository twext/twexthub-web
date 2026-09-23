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

export type Visibility = 'public' | 'unlisted' | 'private';

export type Sources = Record<string, string>;

export interface User {
  namespace: string;
  displayName: string;
  role?: UserRole;
  hasPublished: boolean;
  isPrivate?: boolean;
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
  /** Server-provided marker for the session serving the current request. */
  isCurrent?: boolean;
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
  visibility?: Visibility;
  name?: string;
  license?: string;
  description?: string;
  author?: string | null;
  changelog?: string;
  createdAt?: string;
  publishedAt?: string;
  twextVersion?: string;
  downloadUrl?: string;
  manifestSource?: string;
  sources?: Sources;
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
  version?: string;
  status?: ModerationStatus;
  visibility?: Visibility;
  license?: string;
  color1?: string | null;
  color2?: string | null;
  color3?: string | null;
  readme?: string | null;
  versions?: ExtensionVersion[];
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
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
  visibility: Visibility;
  name: string;
  license: string;
  description: string;
  author?: string | null;
  twextVersion?: string;
  createdAt: string;
  publishedAt?: string;
  /** Returned only to the owner or an admin. */
  manifestSource?: string;
  /** Returned only to the owner or an admin. */
  sources?: Sources;
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
  private?: boolean;
}

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
  /** Plain text, max 280 chars. Absent when unset. */
  bio?: string;
  website?: string | null;
  github?: string | null;
  /** Referenced, not proxied. Served via `GET /users/{ns}/avatar`. */
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  createdAt: string;
  termsAcceptedVersion?: number | null;
}

export interface AuthSessionResponse {
  session: Session;
  user: User;
  /** Plaintext bearer token, shown once at creation and never again. */
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

export type ModerationStatus =
  'published' | 'pending' | 'rejected' | 'yanked' | 'deprecated' | 'staging';

export interface ExtensionVersion {
  version: string;
  status: ModerationStatus;
  createdAt?: string;
  changelog?: string;
  downloadUrl?: string;
  /** Present only while the version is `deprecated`. */
  deprecation?: string | null;
}

export interface Extension {
  namespace: string;
  id: string;
  name: string;
  /** Latest published version, as the server spells it on detail and list rows. */
  version?: string;
  description?: string;
  shortDescription?: string;
  author:
    | string
    | {
        namespace: string;
        displayName?: string;
      }
    | null;
  /** Legacy local-storage spelling kept for previously saved items. */
  latestVersion?: string;
  status?: ModerationStatus;
  versions?: ExtensionVersion[];
  license?: string;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  codeUrl?: string;
}

/** List/search/trending shape: the newest published version, not full detail. */
export interface ExtensionSummary {
  namespace: string;
  id: string;
  name: string;
  version: string;
  description: string;
  publishedAt: string;
}

export interface InstanceStats {
  published: number;
  pending: number;
  authors: number;
  /** Total recorded downloads across the registry. */
  downloads: number;
}

export type ServerSettingType = 'string' | 'number' | 'bytes' | 'boolean' | 'url' | 'origins';

/** One instance setting an admin may change from the interface. */
export interface ServerSetting {
  /** Dotted path in the configuration file, e.g. `limits.maxBlobBytes`. */
  key: string;
  label: string;
  help?: string | null;
  type: ServerSettingType;
  min?: number | null;
  max?: number | null;
  /** True when the running process only reads this at startup. */
  restartRequired: boolean;
  /** `null` when the configuration file does not set it. */
  value: string | number | boolean | string[] | null;
}

export interface ServerConfig {
  /** False when the file cannot hold a change that would survive a restart. */
  editable: boolean;
  /** Why the file is read-only, when it is. */
  reason?: string | null;
  configPath: string;
  settings: ServerSetting[];
}

export interface ServerConfigChange {
  before: ServerSetting['value'];
  after: ServerSetting['value'];
}

export interface ServerConfigUpdate {
  changed: Record<string, ServerConfigChange>;
  restartRequired: string[];
  settings: ServerSetting[];
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
  /**
   * Derived from the server's `_links` (next/prev as full URLs): `nextCursor`
   * is the `cursor` inside `_links.next`, and `hasMore` reflects whether such a
   * link exists.
   */
  pagination: Pagination;
}

export interface VersionInfo {
  namespace: string;
  id: string;
  version: string;
  status: ModerationStatus;
  name: string;
  license: string;
  description: string;
  author?: string | null;
  visibility?: 'public' | 'private';
  createdAt: string;
  publishedAt?: string;
  deprecation?: string | null;
  dist?: {
    downloadUrl: string;
    digest?: string;
    integrity?: string;
  };
  buildLog?: string;
  sourceUrl?: string;
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
  bio?: string | null;
  website?: string | null;
  github?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
}

export type WebhookEvent =
  | 'version.published'
  | 'version.yanked'
  | 'version.deprecated'
  | 'version.rejected'
  | 'owners.changed';

export const WEBHOOK_EVENTS: WebhookEvent[] = [
  'version.published',
  'version.yanked',
  'version.deprecated',
  'version.rejected',
  'owners.changed',
];

export interface Webhook {
  id: number;
  url: string;
  events: WebhookEvent[];
  active: boolean;
  lastDeliveryStatus?: string | null;
  lastDeliveryAt?: string | null;
  createdAt: string;
}

export interface WebhookCreated extends Webhook {
  /** Returned exactly once, on the create response. Never returned by list. */
  secret: string;
}

export interface CreateWebhookPayload {
  url: string;
  events: WebhookEvent[];
  active?: boolean;
}

export type NotificationKind =
  | 'review.approved'
  | 'review.rejected'
  | 'terms.bumped'
  | 'tokens.revoked'
  | 'role.changed'
  | 'broadcast'
  | 'extension.owner.added'
  | 'extension.owner.removed';

export interface Notification {
  id: string;
  kind: NotificationKind;
  message: string;
  payload: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

export interface NotificationList {
  data: Notification[];
  /** Unread count for the whole mailbox, not just this page. */
  unreadCount: number;
  pagination: Pagination;
}

export interface MarkNotificationsReadResult {
  updated: number;
}

export interface AuditEntry {
  id: string;
  /** Actor namespace, or `system` for automated work. */
  actor: string;
  action: string;
  target: {
    namespace?: string | null;
    id?: string | null;
    version?: string | null;
  };
  detail: Record<string, unknown>;
  createdAt: string;
}

export interface ExtensionOwner {
  namespace: string;
  displayName: string;
  role?: UserRole;
  addedAt?: string;
}

/** Tag name to version, e.g. `{ latest: '1.2.0', next: '2.0.0-rc.1' }`. */
export type DistTags = Record<string, string>;

export interface Quota {
  namespace: string;
  blobBytes: number;
  /** Per-account override; `null` means the instance default. */
  maxBlobBytes: number | null;
}

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';
import { DEFAULT_API_BASE_URL } from '../config/settings';
import { paginated, makeUser } from '../test/testUtils';

const JSON_HEADERS = { 'content-type': 'application/json' };

function jsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = JSON_HEADERS,
): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

describe('ApiService', () => {
  const fetchMock = vi.fn();
  const baseUrl = DEFAULT_API_BASE_URL;

  beforeEach(() => {
    localStorage.clear();
    api.setToken(null);
    api.setStoredUser(null);
    api.resetBaseUrl();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('defaults to the official TwextHub API base URL', () => {
    expect(api.getBaseUrl()).toBe(DEFAULT_API_BASE_URL);
  });

  it('uses the base URL configured via config.yml/env', () => {
    api.configure({ apiBaseUrl: 'https://hub.example.com/api/v0' });
    expect(api.getBaseUrl()).toBe('https://hub.example.com/api/v0');
  });

  it('falls back to the enforced default when the configured URL is invalid', () => {
    api.setBaseUrl('not a url');
    expect(api.getBaseUrl()).toBe(DEFAULT_API_BASE_URL);
  });

  it('resets to the enforced default', () => {
    api.setBaseUrl('https://hub.example.com/api/v0');
    api.resetBaseUrl();
    expect(api.getBaseUrl()).toBe(DEFAULT_API_BASE_URL);
  });

  it('GETs a JSON endpoint and parses the payload', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ published: 12, pending: 3, authors: 5 }));
    await expect(api.getStats()).resolves.toEqual({ published: 12, pending: 3, authors: 5 });
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/stats`,
      expect.objectContaining({ headers: expect.objectContaining({ Accept: 'application/json' }) }),
    );
  });

  it('serializes cursor and limit query parameters', async () => {
    fetchMock.mockResolvedValue(jsonResponse(paginated([])));
    await api.getExtensions({ cursor: 'abc', limit: 6 });
    expect(fetchMock.mock.calls[0][0]).toBe(`${baseUrl}/extensions?cursor=abc&limit=6`);
  });

  it('searchExtensions sends the query parameter', async () => {
    fetchMock.mockResolvedValue(jsonResponse(paginated([])));
    await api.searchExtensions('gamepad', { limit: 12 });
    expect(fetchMock.mock.calls[0][0]).toBe(`${baseUrl}/search?query=gamepad&limit=12`);
  });

  it('URL-encodes namespace and id path segments', async () => {
    fetchMock.mockResolvedValue(jsonResponse(makeUser()));
    await api.getExtension('a/b', 'c d');
    expect(fetchMock.mock.calls[0][0]).toBe(`${baseUrl}/@a%2Fb/c%20d`);
  });

  it('attaches a Bearer authorization header when a token is present', async () => {
    api.setToken('tok-abc');
    fetchMock.mockResolvedValue(jsonResponse(paginated([])));
    await api.getExtensions();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/extensions'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer tok-abc' }),
      }),
    );
  });

  it('login POSTs JSON and persists token + user to localStorage', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ token: 'tok-123', user: makeUser() }));
    const res = await api.login({ namespace: 'kane', password: 'secret' });
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/auth/login`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ namespace: 'kane', password: 'secret' }),
      }),
    );
    expect(res.token).toBe('tok-123');
    expect(localStorage.getItem('twexthub_auth_token')).toBe('tok-123');
    expect(JSON.parse(localStorage.getItem('twexthub_auth_user')!)).toEqual(makeUser());
    expect(api.getToken()).toBe('tok-123');
  });

  it('surfaces an RFC 7807 problem+json payload as a typed ApiError', async () => {
    const problem = {
      type: 'about:blank',
      title: 'Unprocessable Entity',
      status: 422,
      detail: 'Namespace already registered.',
      errors: [{ field: 'namespace', message: 'is taken' }],
    };
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify(problem), {
          status: 422,
          headers: { 'content-type': 'application/problem+json' },
        }),
      ),
    );
    await expect(api.signup({ namespace: 'kane', password: 'xxxx1234' })).rejects.toEqual(
      expect.objectContaining({
        name: 'ApiError',
        status: 422,
        problem: expect.objectContaining({ detail: 'Namespace already registered.' }),
      }),
    );
    await expect(api.signup({ namespace: 'kane', password: 'xxxx1234' })).rejects.toThrow(
      'Namespace already registered. (namespace: is taken)',
    );
  });

  it('throws ApiError with status 0 on network failure', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(api.getStats()).rejects.toEqual(
      expect.objectContaining({ name: 'ApiError', status: 0 }),
    );
    await expect(api.getStats()).rejects.toThrow(/Unable to reach the TwextHub API/);
  });

  it('resolves undefined for 204 No Content responses', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(api.acceptTerms(2)).resolves.toBeUndefined();
  });

  it('logout revokes the session server-side then clears local credentials', async () => {
    api.setToken('tok-123');
    api.setStoredUser(makeUser());
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await api.logout();
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/auth/logout`,
      expect.objectContaining({ method: 'POST' }),
    );
    expect(api.getToken()).toBeNull();
    expect(localStorage.getItem('twexthub_auth_token')).toBeNull();
    expect(localStorage.getItem('twexthub_auth_user')).toBeNull();
  });

  it('getMe refreshes the stored user profile', async () => {
    fetchMock.mockResolvedValue(jsonResponse(makeUser({ role: 'admin' })));
    const me = await api.getMe();
    expect(api.getStoredUser()).toEqual(makeUser({ role: 'admin' }));
    expect(me.role).toBe('admin');
  });

  it('getVersion fetches a single version by SemVer or latest', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse({ version: '1.2.3', status: 'published' })),
    );
    await api.getVersion('kane', 'demo', '1.2.3');
    expect(fetchMock.mock.calls[0][0]).toBe(`${baseUrl}/@kane/demo/versions/1.2.3`);

    await api.getVersion('kane', 'demo', 'latest');
    expect(fetchMock.mock.calls[1][0]).toBe(`${baseUrl}/@kane/demo/versions/latest`);
  });

  it('listVersionsForReview requests the pending moderation queue', async () => {
    fetchMock.mockResolvedValue(jsonResponse(paginated([])));
    await api.listVersionsForReview({ cursor: 'abc' });
    expect(fetchMock.mock.calls[0][0]).toBe(`${baseUrl}/versions?status=pending&cursor=abc`);
  });

  it('reviewVersion PATCHes the version review endpoint', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ status: 'approved' }));
    await api.reviewVersion('kane', 'demo', '1.0.0', { status: 'approved' });
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/@kane/demo/versions/1.0.0`,
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status: 'approved' }),
      }),
    );
  });

  it('updateUserRole PATCHes the user endpoint', async () => {
    fetchMock.mockResolvedValue(jsonResponse(makeUser({ namespace: 'ada', role: 'admin' })));
    await api.updateUserRole('ada', { role: 'admin' });
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/users/ada`,
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ role: 'admin' }) }),
    );
  });

  it('updateTerms and updatePrivacyPolicy PATCH the admin document endpoints', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse({ version: 3, body: '# Doc' })),
    );
    await api.updateTerms('# Terms');
    expect(fetchMock.mock.calls[0][0]).toBe(`${baseUrl}/admin/terms`);
    expect(fetchMock.mock.calls[0][1]).toEqual(
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ body: '# Terms' }) }),
    );

    await api.updatePrivacyPolicy('# Privacy');
    expect(fetchMock.mock.calls[1][0]).toBe(`${baseUrl}/admin/privacy`);
    expect(fetchMock.mock.calls[1][1]).toEqual(
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ body: '# Privacy' }) }),
    );
  });

  it('createToken forwards the expiration window', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 'tok-1', name: 'ci', scopes: ['publish'] }));
    await api.createToken({ name: 'ci', scopes: ['publish'], expiresInDays: 30 });
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/tokens`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'ci', scopes: ['publish'], expiresInDays: 30 }),
      }),
    );
  });
});

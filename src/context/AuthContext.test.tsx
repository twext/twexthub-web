import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from './AuthContext';
import { api, ApiError } from '../services/api';
import { makeUser } from '../test/testUtils';

vi.mock('../services/api');

const apiMock = vi.mocked(api);

function Probe() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="user">{auth.user?.namespace ?? 'null'}</span>
      <span data-testid="token">{auth.token ?? 'null'}</span>
      <span data-testid="auth">{String(auth.isAuthenticated)}</span>
      <span data-testid="loading">{String(auth.isLoading)}</span>
      <span data-testid="terms">{String(auth.latestTermsVersion)}</span>
      <span data-testid="accepted">{String(auth.hasAcceptedCurrentTerms)}</span>
      <span data-testid="role">{auth.user?.role ?? 'none'}</span>
      <button onClick={() => auth.login('kane', 'password')}>login</button>
      <button onClick={() => auth.logout()}>logout</button>
      <button onClick={() => auth.acceptCurrentTerms()}>accept</button>
    </div>
  );
}

function renderProbe() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
}

const termsDoc = { version: 3, body: 'Terms', updatedAt: '2026-01-01T00:00:00Z' };

beforeEach(() => {
  localStorage.clear();
  apiMock.getTerms.mockResolvedValue(termsDoc);
  apiMock.getMe.mockResolvedValue(makeUser({ role: 'admin' }));
  apiMock.getToken.mockImplementation(() => localStorage.getItem('twexthub_auth_token'));
  apiMock.getStoredUser.mockImplementation(() => {
    const raw = localStorage.getItem('twexthub_auth_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  });
});

describe('AuthContext', () => {
  it('loads the latest terms version on mount', async () => {
    renderProbe();
    await waitFor(() => expect(screen.getByTestId('terms')).toHaveTextContent('3'));
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
  });

  it('defaults terms version to 1 when the API is unreachable', async () => {
    apiMock.getTerms.mockRejectedValue(new ApiError('Down', 0));
    renderProbe();
    await waitFor(() => expect(screen.getByTestId('terms')).toHaveTextContent('1'));
  });

  it('login sets the user and token and refreshes terms', async () => {
    apiMock.login.mockResolvedValue({ user: makeUser(), token: 'tok-1' });
    renderProbe();
    await userEvent.click(screen.getByRole('button', { name: 'login' }));
    await waitFor(() => expect(screen.getByTestId('token')).toHaveTextContent('tok-1'));
    expect(screen.getByTestId('user')).toHaveTextContent('kane');
    expect(screen.getByTestId('auth')).toHaveTextContent('true');
    expect(apiMock.login).toHaveBeenCalledWith({ namespace: 'kane', password: 'password' });
  });

  it('hydrates an existing session from localStorage and verifies via getMe', async () => {
    localStorage.setItem('twexthub_auth_token', 'tok-persisted');
    localStorage.setItem('twexthub_auth_user', JSON.stringify(makeUser({ role: 'admin' })));
    renderProbe();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(apiMock.getMe).toHaveBeenCalled();
    expect(screen.getByTestId('token')).toHaveTextContent('tok-persisted');
    expect(screen.getByTestId('role')).toHaveTextContent('admin');
  });

  it('does not repeatedly refetch /auth/me after hydration', async () => {
    localStorage.setItem('twexthub_auth_token', 'tok-1');
    localStorage.setItem('twexthub_auth_user', JSON.stringify(makeUser({ role: 'admin' })));
    renderProbe();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    await waitFor(() => expect(apiMock.getMe).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(apiMock.getMe).toHaveBeenCalledTimes(1);
  });

  it('logs out locally when getMe returns 401', async () => {
    localStorage.setItem('twexthub_auth_token', 'tok-expired');
    localStorage.setItem('twexthub_auth_user', JSON.stringify(makeUser()));
    apiMock.getMe.mockRejectedValue(new ApiError('Unauthorized', 401));
    renderProbe();
    await waitFor(() => expect(screen.getByTestId('token')).toHaveTextContent('null'));
    expect(screen.getByTestId('user')).toHaveTextContent('null');
  });

  it('logout clears credentials and calls the api', async () => {
    apiMock.login.mockResolvedValue({ user: makeUser(), token: 'tok-1' });
    renderProbe();
    await userEvent.click(screen.getByRole('button', { name: 'login' }));
    await waitFor(() => expect(screen.getByTestId('token')).toHaveTextContent('tok-1'));
    await userEvent.click(screen.getByRole('button', { name: 'logout' }));
    await waitFor(() => expect(screen.getByTestId('token')).toHaveTextContent('null'));
    expect(apiMock.logout).toHaveBeenCalled();
    expect(screen.getByTestId('auth')).toHaveTextContent('false');
  });

  it('exposes term acceptance state and records acceptance', async () => {
    apiMock.login.mockResolvedValue({
      user: makeUser({ termsAcceptedVersion: 2 }),
      token: 'tok-1',
    });
    renderProbe();
    await userEvent.click(screen.getByRole('button', { name: 'login' }));
    await waitFor(() => expect(screen.getByTestId('token')).toHaveTextContent('tok-1'));
    expect(screen.getByTestId('accepted')).toHaveTextContent('false');

    await userEvent.click(screen.getByRole('button', { name: 'accept' }));
    await waitFor(() => expect(screen.getByTestId('accepted')).toHaveTextContent('true'));
    expect(apiMock.acceptTerms).toHaveBeenCalledWith(3);
  });
});

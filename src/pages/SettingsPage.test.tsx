import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsPage } from './SettingsPage';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  makeAuthState,
  makeSession,
  makeToken,
  makeUser,
  paginated,
  noop,
  renderWithProviders,
} from '../test/testUtils';

vi.mock('../services/api');
vi.mock('../context/AuthContext');

const apiMock = vi.mocked(api);
const useAuthMock = vi.mocked(useAuth);
let authState: ReturnType<typeof makeAuthState>;

beforeEach(() => {
  apiMock.getSessions.mockResolvedValue(paginated([makeSession()]));
  apiMock.getTokens.mockResolvedValue(paginated([makeToken()]));
  apiMock.updateUser.mockResolvedValue(makeUser());
  apiMock.deleteUser.mockResolvedValue(undefined);
  apiMock.createToken.mockResolvedValue(
    makeToken({ id: 'tok-new', name: 'ci-dev', token: 'TWEXT-secret-1' }),
  );
  authState = makeAuthState();
  useAuthMock.mockReset();
  useAuthMock.mockReturnValue(authState);
});

describe('SettingsPage', () => {
  it('renders the account tab by default', () => {
    renderWithProviders(<SettingsPage onNavigate={noop} />);
    expect(screen.getByRole('heading', { level: 1, name: /User Settings/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Account' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByPlaceholderText('e.g. Kane Marshall')).toBeInTheDocument();
  });

  it('redirects a signed-out visitor to login', async () => {
    useAuthMock.mockReturnValue(makeAuthState({ user: null, token: null, isAuthenticated: false }));
    const onNavigate = vi.fn();
    renderWithProviders(<SettingsPage onNavigate={onNavigate} />);
    expect(await screen.findByText('Redirecting to login...')).toBeInTheDocument();
    expect(onNavigate).toHaveBeenCalledWith('login');
  });

  it('saves profile changes', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SettingsPage onNavigate={noop} />);
    const displayName = screen.getByPlaceholderText('e.g. Kane Marshall');
    await user.clear(displayName);
    await user.type(displayName, 'Kane Marshall');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(apiMock.updateUser).toHaveBeenCalledWith('kane', { displayName: 'Kane Marshall' });
    expect(authState.refreshUser).toHaveBeenCalled();
    expect(await screen.findByText('Account profile updated successfully.')).toBeInTheDocument();
  });

  it('requires and sends the current password when changing it', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SettingsPage onNavigate={noop} />);

    await user.type(screen.getByPlaceholderText('Minimum 8 characters'), 'new-secret-1');
    await user.type(screen.getByPlaceholderText('Your existing password'), 'old-secret-1');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(apiMock.updateUser).toHaveBeenCalledWith('kane', {
      password: 'new-secret-1',
      currentPassword: 'old-secret-1',
    });
  });

  it('warns when a new password is set without the current one', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SettingsPage onNavigate={noop} />);

    await user.type(screen.getByPlaceholderText('Minimum 8 characters'), 'new-secret-1');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(apiMock.updateUser).not.toHaveBeenCalled();
    expect(
      await screen.findByText('Enter your current password to set a new one.'),
    ).toBeInTheDocument();
  });

  it('creates a token with an expiration', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SettingsPage onNavigate={noop} />);
    await user.click(screen.getByRole('tab', { name: 'Automation Tokens' }));
    await screen.findByText('Active Tokens (1)');
    await user.type(screen.getByPlaceholderText(/github-actions-ci or release-bot/), 'ci');
    await user.selectOptions(screen.getByRole('combobox'), '30');
    await user.click(screen.getByRole('button', { name: /Create Automation Token/ }));
    expect(apiMock.createToken).toHaveBeenCalledWith({
      name: 'ci',
      scopes: ['publish'],
      expiresInDays: 30,
    });
  });

  it('renames and rescopes a token inline', async () => {
    apiMock.updateToken.mockResolvedValue(
      makeToken({ id: 'tok-1', name: 'renamed', scopes: ['publish', 'yank'] }),
    );
    const user = userEvent.setup();
    renderWithProviders(<SettingsPage onNavigate={noop} />);
    await user.click(screen.getByRole('tab', { name: 'Automation Tokens' }));
    await screen.findByText('Active Tokens (1)');

    await user.click(screen.getByTitle('Edit Token'));
    const nameInput = screen.getByDisplayValue('ci-deploy');
    await user.clear(nameInput);
    await user.type(nameInput, 'renamed');
    await user.click(screen.getByRole('checkbox', { name: 'yank' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(apiMock.updateToken).toHaveBeenCalledWith('tok-1', {
      name: 'renamed',
      scopes: ['publish', 'yank'],
    });
    expect(await screen.findByText('Automation token updated successfully.')).toBeInTheDocument();
  });

  it('loads additional sessions via the pagination cursor', async () => {
    apiMock.getSessions.mockResolvedValueOnce(
      paginated([makeSession({ id: 'sess-1' })], 'cursor-2', true),
    );
    apiMock.getSessions.mockResolvedValueOnce(paginated([makeSession({ id: 'sess-2' })]));
    const user = userEvent.setup();
    renderWithProviders(<SettingsPage onNavigate={noop} />);
    await user.click(screen.getByRole('tab', { name: 'Sessions' }));
    await screen.findByText('Active Web Sessions');

    await user.click(screen.getByRole('button', { name: 'Load more sessions' }));

    expect(apiMock.getSessions).toHaveBeenLastCalledWith({ cursor: 'cursor-2' });
  });

  it('revokes an active session from the sessions tab', async () => {
    apiMock.getSessions.mockResolvedValue(
      paginated([
        makeSession({ id: 'sess-1', lastUsedAt: '2026-03-01T00:00:00Z' }),
        makeSession({ id: 'sess-2', lastUsedAt: '2026-03-02T00:00:00Z' }),
      ]),
    );
    const user = userEvent.setup();
    renderWithProviders(<SettingsPage onNavigate={noop} />);
    await user.click(screen.getByRole('tab', { name: 'Sessions' }));
    await screen.findByText('Active Web Sessions');
    await user.click(
      screen
        .getAllByRole('button', { name: 'Revoke' })
        .filter((button) => !(button as HTMLButtonElement).disabled)[0],
    );
    expect(apiMock.revokeSession).toHaveBeenCalledWith('sess-1');
    expect(await screen.findByText('Session revoked successfully.')).toBeInTheDocument();
  });

  it('creates a token and reveals the one-time secret', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SettingsPage onNavigate={noop} />);
    await user.click(screen.getByRole('tab', { name: 'Automation Tokens' }));
    await screen.findByText('Active Tokens (1)');
    await user.type(screen.getByPlaceholderText(/github-actions-ci or release-bot/), 'ci-dev');
    await user.click(screen.getByRole('button', { name: /Create Automation Token/ }));
    expect(apiMock.createToken).toHaveBeenCalledWith({ name: 'ci-dev', scopes: ['publish'] });
    expect(await screen.findByText('Your New Automation Token')).toBeInTheDocument();
    expect(screen.getByText('TWEXT-secret-1')).toBeInTheDocument();
  });

  it('deletes an automation token after confirmation', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SettingsPage onNavigate={noop} />);
    await user.click(screen.getByRole('tab', { name: 'Automation Tokens' }));
    await screen.findByText('Active Tokens (1)');
    await user.click(screen.getByRole('button', { name: 'Revoke Token' }));
    await user.click(screen.getByRole('button', { name: 'Delete token' }));
    expect(apiMock.deleteToken).toHaveBeenCalledWith('tok-1');
    expect(await screen.findByText('Token deleted successfully.')).toBeInTheDocument();
  });

  it('deletes the account and signs out after typing the namespace', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    renderWithProviders(<SettingsPage onNavigate={onNavigate} />);
    await user.click(screen.getByRole('button', { name: 'Delete my account' }));
    const confirmButton = screen.getByRole('button', { name: 'Delete account' });
    expect(confirmButton).toBeDisabled();
    await user.type(screen.getByLabelText(/Type kane to confirm/), 'kane');
    expect(confirmButton).toBeEnabled();
    await user.click(confirmButton);
    expect(apiMock.deleteUser).toHaveBeenCalledWith('kane');
    expect(authState.logout).toHaveBeenCalled();
    expect(onNavigate).toHaveBeenCalledWith('home');
  });
});

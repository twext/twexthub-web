import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardPage } from './DashboardPage';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { makeAuthState, makeExtension, paginated, noop } from '../test/testUtils';

vi.mock('../services/api');
vi.mock('../context/AuthContext');

const apiMock = vi.mocked(api);
const useAuthMock = vi.mocked(useAuth);

beforeEach(() => {
  apiMock.searchExtensions.mockResolvedValue(paginated([makeExtension()]));
  useAuthMock.mockReset();
  useAuthMock.mockReturnValue(makeAuthState());
});

describe('DashboardPage', () => {
  it('renders the profile header and a settings action', async () => {
    render(<DashboardPage onNavigate={noop} />);
    expect(await screen.findByText('Your Extensions')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
  });

  it('navigates to settings from the header action', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<DashboardPage onNavigate={onNavigate} />);
    await screen.findByText('Your Extensions');
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    expect(onNavigate).toHaveBeenCalledWith('settings');
  });

  it('lists extensions owned by the current user', async () => {
    render(<DashboardPage onNavigate={noop} />);
    expect(await screen.findByText('Demo Extension')).toBeInTheDocument();
    expect(apiMock.searchExtensions).toHaveBeenCalledWith('kane', { limit: 50 });
  });

  it('shows an empty state when the user has no published extensions', async () => {
    apiMock.searchExtensions.mockResolvedValue(paginated([]));
    render(<DashboardPage onNavigate={noop} />);
    expect(await screen.findByText('No extensions under @kane yet')).toBeInTheDocument();
  });

  it('redirects a signed-out visitor to login', async () => {
    useAuthMock.mockReturnValue(makeAuthState({ user: null, token: null, isAuthenticated: false }));
    const onNavigate = vi.fn();
    render(<DashboardPage onNavigate={onNavigate} />);
    expect(await screen.findByText('Redirecting to login...')).toBeInTheDocument();
    expect(onNavigate).toHaveBeenCalledWith('login');
  });
});

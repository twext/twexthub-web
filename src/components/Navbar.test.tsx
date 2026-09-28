import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Navbar } from './Navbar';
import { renderWithTheme } from '../test/testUtils';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { makeAuthState, noop } from '../test/testUtils';

vi.mock('../services/api');
vi.mock('../context/AuthContext');
vi.mock('../hooks/useCollections', () => ({
  useSavedExtensions: () => ({ saved: [], isSaved: () => false, toggle: vi.fn(), remove: vi.fn() }),
  useRecentExtensions: () => ({ record: vi.fn() }),
}));

const apiMock = vi.mocked(api);
const useAuthMock = vi.mocked(useAuth);

beforeEach(() => {
  localStorage.clear();
  useAuthMock.mockReset();
  apiMock.getNotifications.mockResolvedValue({
    data: [],
    unreadCount: 0,
    pagination: { nextCursor: null, hasMore: false },
  });
});

describe('Navbar notifications', () => {
  it('shows no bell for signed-out visitors', async () => {
    useAuthMock.mockReturnValue(makeAuthState({ user: null, token: null, isAuthenticated: false }));
    renderWithTheme(<Navbar currentRoute="home" onNavigate={noop} />);

    expect(screen.queryByRole('button', { name: /^Notifications/ })).toBeNull();
    expect(apiMock.getNotifications).not.toHaveBeenCalled();
  });

  it('renders the bell without a count when the mailbox is empty', async () => {
    useAuthMock.mockReturnValue(makeAuthState());
    renderWithTheme(<Navbar currentRoute="home" onNavigate={noop} />);

    expect(await screen.findByRole('button', { name: 'Notifications' })).toBeInTheDocument();
    expect(apiMock.getNotifications).toHaveBeenCalledWith({ limit: 1 });
  });

  it('badges the unread count from a single call', async () => {
    apiMock.getNotifications.mockResolvedValue({
      data: [],
      unreadCount: 5,
      pagination: { nextCursor: null, hasMore: false },
    });
    useAuthMock.mockReturnValue(makeAuthState());
    renderWithTheme(<Navbar currentRoute="home" onNavigate={noop} />);

    expect(
      await screen.findByRole('button', { name: 'Notifications (5 unread)' }),
    ).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('caps the displayed badge at 99+', async () => {
    apiMock.getNotifications.mockResolvedValue({
      data: [],
      unreadCount: 250,
      pagination: { nextCursor: null, hasMore: false },
    });
    useAuthMock.mockReturnValue(makeAuthState());
    renderWithTheme(<Navbar currentRoute="home" onNavigate={noop} />);

    expect(await screen.findByText('99+')).toBeInTheDocument();
  });

  it('opens the inbox from the bell', async () => {
    useAuthMock.mockReturnValue(makeAuthState());
    const user = userEvent.setup();
    renderWithTheme(<Navbar currentRoute="home" onNavigate={noop} />);

    await user.click(await screen.findByRole('button', { name: 'Notifications' }));

    expect(await screen.findByRole('dialog', { name: 'Notifications' })).toBeInTheDocument();
  });
});

describe('Navbar navigation styling', () => {
  /** Every header destination is signalled with an underline, never a fill. */
  const underlined = (element: HTMLElement) => {
    expect(element.className).toMatch(/border-b-2/);
    expect(element.className).toMatch(/-mb-px/);
    expect(element.className).not.toMatch(/rounded-md/);
    expect(element.className).not.toMatch(/bg-(amber|lilac)-500\/15/);
  };

  const navTargets = (route: string) => {
    useAuthMock.mockReturnValue(makeAuthState({ isAdmin: true }));
    const { container } = renderWithTheme(<Navbar currentRoute={route} onNavigate={noop} />);
    // This test renders several routes, so scope every query to this render's
    // container; otherwise `screen` would match earlier renders too.
    const view = within(container);
    // The mobile dropdown mirrors these labels, so scope to the desktop <nav>.
    const nav = within(container.querySelector('nav')!);
    return {
      explore: nav.getByRole('button', { name: 'Explore' }),
      saved: nav.getByRole('button', { name: /Saved/ }),
      admin: nav.getByRole('button', { name: /Admin/ }),
      settings: view.getAllByRole('button', { name: 'Settings' })[0],
    };
  };

  it('underlines Explore, Saved and Settings in the lilac accent', () => {
    const active = [
      ['search', 'explore'],
      ['saved', 'saved'],
      ['settings', 'settings'],
    ] as const;

    for (const [route, key] of active) {
      // Only the destination matching the current route takes the accent.
      const target = navTargets(route)[key];
      underlined(target);
      expect(target.className).toMatch(/border-lilac-500(?!\/)/);
    }
  });

  it('underlines Admin in the amber accent rather than the lilac one', () => {
    const { admin } = navTargets('admin');
    underlined(admin);
    expect(admin.className).toMatch(/border-amber-500(?!\/)/);
    expect(admin.className).not.toMatch(/border-lilac-500(?!\/)/);
  });

  it('gives inactive destinations no accent underline of their own', () => {
    const targets = navTargets('home');
    for (const target of Object.values(targets)) {
      underlined(target);
      expect(target.className).not.toMatch(/border-(amber|lilac)-500(?!\/)/);
    }
  });
});

describe('Navbar profile menu', () => {
  const signedIn = () =>
    makeAuthState({
      user: {
        namespace: 'kane',
        displayName: 'Kane Marshall',
        role: 'normal',
        hasPublished: false,
        bio: 'Builds things.',
        website: 'https://kane.dev',
        github: 'kane',
        avatarUrl: null,
        bannerUrl: null,
        createdAt: new Date().toISOString(),
        termsAcceptedVersion: 1,
      },
      isAuthenticated: true,
      token: 'tok',
    });

  beforeEach(() => {
    apiMock.getBaseUrl.mockReturnValue('https://api.test/v1');
    apiMock.logout?.mockResolvedValue(undefined);
  });

  it('shows no profile chip for a signed-out visitor', () => {
    useAuthMock.mockReturnValue(makeAuthState({ user: null, isAuthenticated: false, token: null }));
    renderWithTheme(<Navbar currentRoute="home" onNavigate={noop} />);
    expect(screen.queryByTestId('profile-trigger')).toBeNull();
  });

  it('opens the account details on click instead of navigating', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    useAuthMock.mockReturnValue(signedIn());
    renderWithTheme(<Navbar currentRoute="home" onNavigate={onNavigate} />);

    await user.click(screen.getByTestId('profile-trigger'));

    const menu = within(screen.getByRole('dialog', { name: 'Your profile' }));
    expect(menu.getByText('Kane Marshall')).toBeInTheDocument();
    expect(menu.getByText('@kane')).toBeInTheDocument();
    expect(menu.getByText('Builds things.')).toBeInTheDocument();
    // Opening the menu is not a navigation.
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('keeps the account name as the trigger accessible name', () => {
    useAuthMock.mockReturnValue(signedIn());
    renderWithTheme(<Navbar currentRoute="home" onNavigate={noop} />);
    expect(screen.getByRole('button', { name: 'Kane Marshall' })).toBeInTheDocument();
  });

  it('toggles closed on a second click', async () => {
    const user = userEvent.setup();
    useAuthMock.mockReturnValue(signedIn());
    renderWithTheme(<Navbar currentRoute="home" onNavigate={noop} />);

    await user.click(screen.getByTestId('profile-trigger'));
    await user.click(screen.getByTestId('profile-trigger'));

    expect(screen.queryByRole('dialog', { name: 'Your profile' })).toBeNull();
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    useAuthMock.mockReturnValue(signedIn());
    renderWithTheme(<Navbar currentRoute="home" onNavigate={noop} />);

    await user.click(screen.getByTestId('profile-trigger'));
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog', { name: 'Your profile' })).toBeNull();
  });

  it('closes on a click outside', async () => {
    const user = userEvent.setup();
    useAuthMock.mockReturnValue(signedIn());
    renderWithTheme(<Navbar currentRoute="home" onNavigate={noop} />);

    await user.click(screen.getByTestId('profile-trigger'));
    await user.click(document.body);

    expect(screen.queryByRole('dialog', { name: 'Your profile' })).toBeNull();
  });

  it('sends the user to their own public profile from the menu and closes', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    useAuthMock.mockReturnValue(signedIn());
    renderWithTheme(<Navbar currentRoute="home" onNavigate={onNavigate} />);

    await user.click(screen.getByTestId('profile-trigger'));
    await user.click(
      within(screen.getByRole('dialog', { name: 'Your profile' })).getByRole('button', {
        name: /Kane Marshall/,
      }),
    );

    expect(onNavigate).toHaveBeenCalledWith('author/kane');
    expect(screen.queryByRole('dialog', { name: 'Your profile' })).toBeNull();
  });

  it('leaves the dashboard out of the menu', async () => {
    const user = userEvent.setup();
    useAuthMock.mockReturnValue(signedIn());
    renderWithTheme(<Navbar currentRoute="home" onNavigate={noop} />);

    await user.click(screen.getByTestId('profile-trigger'));

    expect(
      within(screen.getByRole('dialog', { name: 'Your profile' })).queryByRole('button', {
        name: 'Dashboard',
      }),
    ).toBeNull();
  });

  it('reaches the settings form from the menu', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    useAuthMock.mockReturnValue(signedIn());
    renderWithTheme(<Navbar currentRoute="home" onNavigate={onNavigate} />);

    await user.click(screen.getByTestId('profile-trigger'));
    await user.click(screen.getByRole('button', { name: /Edit profile/ }));

    expect(onNavigate).toHaveBeenCalledWith('settings');
  });

  it('falls back to the registry identicon when no avatar is set', async () => {
    const user = userEvent.setup();
    useAuthMock.mockReturnValue(signedIn());
    renderWithTheme(<Navbar currentRoute="home" onNavigate={noop} />);

    await user.click(screen.getByTestId('profile-trigger'));

    expect(document.querySelector('[role="dialog"] img')?.getAttribute('src')).toBe(
      'https://api.test/v1/users/kane/avatar',
    );
  });
});

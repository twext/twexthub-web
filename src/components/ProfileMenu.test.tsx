import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileMenu } from './ProfileMenu';
import { api } from '../services/api';
import { makeUser } from '../test/testUtils';

// Automock, matching the other component tests. getBaseUrl is stubbed below
// with a fixed value: without it the identicon-fallback assertion would compare
// undefined against undefined and pass regardless of what the component did.
vi.mock('../services/api');

const apiMock = vi.mocked(api);
const API_BASE_URL = 'https://api.test/v1';

const FULL_USER = makeUser({
  namespace: 'kane',
  displayName: 'Kane Marshall',
  bio: 'Builds tools for twext authors.',
  website: 'https://kane.dev',
  github: 'kane',
  role: 'admin',
});

const renderMenu = (
  user = FULL_USER,
  overrides: Partial<React.ComponentProps<typeof ProfileMenu>> = {},
) => {
  const onNavigate = overrides.onNavigate ?? vi.fn();
  const onSignOut = overrides.onSignOut ?? vi.fn();
  const onDismiss = overrides.onDismiss ?? vi.fn();
  const result = render(
    <ProfileMenu user={user} onDismiss={onDismiss} onNavigate={onNavigate} onSignOut={onSignOut} />,
  );
  return { ...result, onNavigate, onSignOut, onDismiss };
};

beforeEach(() => {
  vi.clearAllMocks();
  apiMock.getBaseUrl.mockReturnValue(API_BASE_URL);
});

describe('ProfileMenu', () => {
  it('is exposed as a named dialog', () => {
    renderMenu();
    expect(screen.getByRole('dialog', { name: 'Your profile' })).toBeInTheDocument();
  });

  it('shows the display name and namespace', () => {
    renderMenu();
    expect(screen.getByText('Kane Marshall')).toBeInTheDocument();
    expect(screen.getByText('@kane')).toBeInTheDocument();
  });

  it('falls back to the namespace when there is no display name', () => {
    renderMenu(makeUser({ namespace: 'nameless', displayName: '' }));
    expect(screen.getByText('nameless')).toBeInTheDocument();
  });

  it('shows the bio', () => {
    renderMenu();
    expect(screen.getByText('Builds tools for twext authors.')).toBeInTheDocument();
  });

  it('shows the website without its scheme', () => {
    renderMenu();
    const link = screen.getByRole('link', { name: 'kane.dev' });
    expect(link).toHaveAttribute('href', 'https://kane.dev');
  });

  it('shows the GitHub profile link', () => {
    renderMenu();
    const link = screen.getByRole('link', { name: /@kane/ });
    expect(link).toHaveAttribute('href', 'https://github.com/kane');
  });

  it('opens external profile links safely', () => {
    renderMenu();
    for (const link of screen.getAllByRole('link')) {
      expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    }
  });

  it('marks an admin account', () => {
    renderMenu();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('omits the admin badge for a normal account', () => {
    renderMenu(makeUser({ role: 'normal' }));
    expect(screen.queryByText('Admin')).toBeNull();
  });

  it('prompts a user with no profile details to add some', () => {
    renderMenu(makeUser({ bio: '', website: null, github: null }));
    expect(screen.getByText(/Add a bio, website, or GitHub username/)).toBeInTheDocument();
  });

  it('prefers the stored avatar URL over the identicon', () => {
    renderMenu(makeUser({ avatarUrl: 'https://cdn.example/a.png' }));
    expect(document.querySelector('img')?.getAttribute('src')).toBe('https://cdn.example/a.png');
  });

  it('falls back to the registry identicon when no avatar is set', () => {
    renderMenu(makeUser({ avatarUrl: null }));
    expect(document.querySelector('img')?.getAttribute('src')).toBe(
      `${API_BASE_URL}/users/kane/avatar`,
    );
  });

  it('leaves the dashboard out of the menu', () => {
    renderMenu();
    expect(screen.queryByRole('button', { name: 'Dashboard' })).toBeNull();
  });

  it('navigates to the public profile from the identity block and closes', async () => {
    const user = userEvent.setup();
    const { onNavigate, onDismiss } = renderMenu();

    await user.click(screen.getByRole('button', { name: /Kane Marshall/ }));

    expect(onNavigate).toHaveBeenCalledWith('author/kane');
    expect(onDismiss).toHaveBeenCalled();
  });

  it('navigates to settings and closes', async () => {
    const user = userEvent.setup();
    const { onNavigate, onDismiss } = renderMenu();

    await user.click(screen.getByRole('button', { name: /Edit profile/ }));

    expect(onNavigate).toHaveBeenCalledWith('settings');
    expect(onDismiss).toHaveBeenCalled();
  });

  it('signs out and closes', async () => {
    const user = userEvent.setup();
    const { onSignOut, onDismiss } = renderMenu();

    await user.click(screen.getByRole('button', { name: /Sign out/ }));

    expect(onSignOut).toHaveBeenCalled();
    expect(onDismiss).toHaveBeenCalled();
  });

  it('closes on Escape', () => {
    const { onDismiss } = renderMenu();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onDismiss).toHaveBeenCalled();
  });

  it('closes on a pointer press outside', () => {
    const { onDismiss } = renderMenu();
    fireEvent.pointerDown(document.body);
    expect(onDismiss).toHaveBeenCalled();
  });

  it('stays open on a pointer press inside', () => {
    const { onDismiss } = renderMenu();
    fireEvent.pointerDown(screen.getByRole('dialog', { name: 'Your profile' }));
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('stays open for unrelated keys', () => {
    const { onDismiss } = renderMenu();
    fireEvent.keyDown(window, { key: 'a' });
    expect(onDismiss).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExtensionDetailPage } from './ExtensionDetailPage';
import { api, ApiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { makeAuthState, makeExtension, makeUser, noop } from '../test/testUtils';

vi.mock('../services/api');
vi.mock('../context/AuthContext');

const apiMock = vi.mocked(api);
const useAuthMock = vi.mocked(useAuth);
const loadUrl = 'http://localhost:3000/api/v0/@kane/demo/versions/1.2.0/download';

const versionedExtension = () =>
  makeExtension({
    namespace: 'kane',
    id: 'demo',
    name: 'Demo Extension',
    description: 'A test extension.',
    latestVersion: '1.2.0',
    author: { namespace: 'kane', displayName: 'Kane' },
    versions: [
      { version: '1.2.0', status: 'published', createdAt: '2026-02-01T00:00:00Z' },
      { version: '1.1.0', status: 'published', createdAt: '2026-01-01T00:00:00Z' },
    ],
  });

beforeEach(() => {
  apiMock.getExtension.mockResolvedValue(versionedExtension());
  useAuthMock.mockReset();
  useAuthMock.mockReturnValue(makeAuthState());
});

describe('ExtensionDetailPage', () => {
  it('renders the extension metadata, load URL, and TurboWarp launcher', async () => {
    render(<ExtensionDetailPage namespace="kane" id="demo" onNavigate={noop} />);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Demo Extension' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Back to search results/ })).toBeInTheDocument();
    expect(screen.getByDisplayValue(loadUrl)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Version History' })).toBeInTheDocument();
  });

  it('links to the owner namespace when the manifest author is a display name', async () => {
    apiMock.getExtension.mockResolvedValue(
      makeExtension({
        namespace: 'kane',
        id: 'demo',
        name: 'Demo Extension',
        author: 'Kane Marshall',
      }),
    );
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    render(<ExtensionDetailPage namespace="kane" id="demo" onNavigate={onNavigate} />);
    await screen.findByRole('heading', { level: 1, name: 'Demo Extension' });

    expect(screen.getByText('Kane Marshall')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /View all packages by @kane/ }));
    expect(onNavigate).toHaveBeenCalledWith('author/kane');
  });

  it('copies the load URL to the clipboard', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    render(<ExtensionDetailPage namespace="kane" id="demo" onNavigate={noop} />);
    await screen.findByRole('heading', { level: 1, name: 'Demo Extension' });
    fireEvent.click(screen.getByTitle('Copy URL'));
    expect(writeText).toHaveBeenCalledWith(loadUrl);
  });

  it('warns when an extension is pending moderation', async () => {
    apiMock.getExtension.mockResolvedValue(makeExtension({ status: 'pending', name: 'Wait List' }));
    render(<ExtensionDetailPage namespace="kane" id="demo" onNavigate={noop} />);
    expect(await screen.findByText('Pending Moderation Review')).toBeInTheDocument();
  });

  it('renders the not-found state and navigates back to explore', async () => {
    apiMock.getExtension.mockRejectedValue(new ApiError('Not Found', 404));
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    render(<ExtensionDetailPage namespace="ghost" id="nope" onNavigate={onNavigate} />);
    expect(await screen.findByRole('heading', { name: 'Extension Not Found' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Back to Explore/ }));
    expect(onNavigate).toHaveBeenCalledWith('search');
  });

  it('lets the owner yank a published version', async () => {
    const user = userEvent.setup();
    render(<ExtensionDetailPage namespace="kane" id="demo" onNavigate={noop} />);
    await screen.findByRole('heading', { level: 1, name: 'Demo Extension' });

    await user.click(screen.getAllByRole('button', { name: 'Yank' })[0]);
    await user.click(screen.getByRole('button', { name: 'Yank version' }));
    expect(apiMock.yankVersion).toHaveBeenCalledWith('kane', 'demo', '1.2.0');
    expect(await screen.findByText('Version 1.2.0 has been yanked.')).toBeInTheDocument();
    expect(screen.getByText('Yanked')).toBeInTheDocument();
  });

  it('lets the owner delete the extension', async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    render(<ExtensionDetailPage namespace="kane" id="demo" onNavigate={onNavigate} />);
    await screen.findByRole('heading', { level: 1, name: 'Demo Extension' });

    expect(screen.getByText('Manage Extension')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete extension' }));
    await user.type(screen.getByLabelText(/Type @kane\/demo to confirm/), '@kane/demo');
    await user.click(screen.getByRole('button', { name: 'Permanently delete' }));
    expect(apiMock.deleteExtension).toHaveBeenCalledWith('kane', 'demo');
    expect(onNavigate).toHaveBeenCalledWith('dashboard');
  });

  it('hides management controls from non-owners and non-admins', async () => {
    useAuthMock.mockReturnValue(makeAuthState({ user: makeUser({ namespace: 'ada' }) }));
    render(<ExtensionDetailPage namespace="kane" id="demo" onNavigate={noop} />);
    await screen.findByRole('heading', { level: 1, name: 'Demo Extension' });

    expect(screen.queryByText('Manage Extension')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Yank/ })).not.toBeInTheDocument();
  });

  it('shows management controls to admins who are not the owner', async () => {
    useAuthMock.mockReturnValue(
      makeAuthState({ user: makeUser({ namespace: 'root', role: 'admin' }) }),
    );
    render(<ExtensionDetailPage namespace="kane" id="demo" onNavigate={noop} />);
    await screen.findByRole('heading', { level: 1, name: 'Demo Extension' });

    expect(screen.getByText('Manage Extension')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete extension' })).toBeInTheDocument();
  });
});

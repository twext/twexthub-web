import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExtensionDetailPage } from './ExtensionDetailPage';
import { api, ApiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  makeAuthState,
  makeExtension,
  makeExtensionOwnerInvite,
  makeUser,
  noop,
} from '../test/testUtils';

vi.mock('../services/api');
vi.mock('../context/AuthContext');

const apiMock = vi.mocked(api);
const useAuthMock = vi.mocked(useAuth);
const loadUrl = 'http://localhost:3000/api/v1/@kane/demo/versions/1.2.0/download';

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
  apiMock.getPendingExtensionOwnerInvites.mockResolvedValue([]);
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

  it('shows nothing about invitations when none are pending', async () => {
    render(<ExtensionDetailPage namespace="kane" id="demo" onNavigate={noop} />);

    await screen.findByRole('heading', { level: 1, name: 'Demo Extension' });
    expect(screen.queryByTestId('pending-owner-invite')).toBeNull();
  });

  it('offers the invited account the chance to take the co-ownership', async () => {
    const user = userEvent.setup();
    apiMock.getPendingExtensionOwnerInvites.mockResolvedValue([
      makeExtensionOwnerInvite({ namespace: 'ada', displayName: 'Ada L' }),
    ]);
    apiMock.acceptExtensionOwner.mockResolvedValue(undefined);
    render(<ExtensionDetailPage namespace="kane" id="demo" onNavigate={noop} />);

    const row = await screen.findByTestId('pending-owner-invite');
    expect(row).toHaveTextContent('@ada');
    expect(row).toHaveTextContent('Ada L');
    expect(row).toHaveTextContent('invited by @mallory');

    await user.click(within(row).getByRole('button', { name: /Accept/ }));

    await waitFor(() =>
      expect(apiMock.acceptExtensionOwner).toHaveBeenCalledWith('kane', 'demo', 'ada'),
    );
    // Granted, not still pending.
    await waitFor(() => expect(screen.queryByTestId('pending-owner-invite')).toBeNull());
  });

  it('takes the account back off the list when it declines', async () => {
    const user = userEvent.setup();
    apiMock.getPendingExtensionOwnerInvites.mockResolvedValue([
      makeExtensionOwnerInvite({ namespace: 'ada' }),
    ]);
    apiMock.removeExtensionOwner.mockResolvedValue(undefined);
    render(<ExtensionDetailPage namespace="kane" id="demo" onNavigate={noop} />);

    const row = await screen.findByTestId('pending-owner-invite');
    await user.click(within(row).getByRole('button', { name: /Decline/ }));

    await waitFor(() =>
      expect(apiMock.removeExtensionOwner).toHaveBeenCalledWith('kane', 'demo', 'ada'),
    );
    expect(apiMock.acceptExtensionOwner).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByTestId('pending-owner-invite')).toBeNull());
  });

  it('says who is being let in when the invitation is an organization', async () => {
    apiMock.getPendingExtensionOwnerInvites.mockResolvedValue([
      makeExtensionOwnerInvite({
        namespace: 'acme',
        displayName: 'Acme Inc',
        kind: 'organization',
      }),
    ]);
    render(<ExtensionDetailPage namespace="kane" id="demo" onNavigate={noop} />);

    const row = await screen.findByTestId('pending-owner-invite');
    expect(row).toHaveTextContent('@acme');
    expect(row).toHaveTextContent('organization');
  });

  it('asks the registry whether this account is holding an invitation', async () => {
    useAuthMock.mockReturnValue(
      makeAuthState({ user: makeUser({ namespace: 'ada' }), isAuthenticated: true }),
    );
    render(<ExtensionDetailPage namespace="kane" id="demo" onNavigate={noop} />);

    await waitFor(() =>
      expect(apiMock.getPendingExtensionOwnerInvites).toHaveBeenCalledWith('kane', 'demo'),
    );
  });

  it('shows no invitation to a visitor who cannot be sent one', async () => {
    useAuthMock.mockReturnValue(makeAuthState({ user: null, token: null, isAuthenticated: false }));
    render(<ExtensionDetailPage namespace="kane" id="demo" onNavigate={noop} />);

    await screen.findByRole('heading', { level: 1, name: 'Demo Extension' });
    expect(apiMock.getPendingExtensionOwnerInvites).not.toHaveBeenCalled();
  });

  it('still shows the extension when the invitation inbox cannot be read', async () => {
    apiMock.getPendingExtensionOwnerInvites.mockRejectedValue(new ApiError('not authorized', 403));
    render(<ExtensionDetailPage namespace="kane" id="demo" onNavigate={noop} />);

    // A viewer who may not read the inbox simply has no invitations to answer.
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Demo Extension' }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('pending-owner-invite')).toBeNull();
  });

  it('keeps the invitation and the answer when accepting fails', async () => {
    const user = userEvent.setup();
    apiMock.getPendingExtensionOwnerInvites.mockResolvedValue([
      makeExtensionOwnerInvite({ namespace: 'ada' }),
    ]);
    apiMock.acceptExtensionOwner.mockRejectedValue(new ApiError('invitation expired', 410));
    render(<ExtensionDetailPage namespace="kane" id="demo" onNavigate={noop} />);

    const row = await screen.findByTestId('pending-owner-invite');
    await user.click(within(row).getByRole('button', { name: /Accept/ }));

    expect(await screen.findByText('invitation expired')).toBeInTheDocument();
    expect(screen.getByTestId('pending-owner-invite')).toBeInTheDocument();
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

  it('lets the owner unpublish a published version', async () => {
    const user = userEvent.setup();
    render(<ExtensionDetailPage namespace="kane" id="demo" onNavigate={noop} />);
    await screen.findByRole('heading', { level: 1, name: 'Demo Extension' });

    await user.click(screen.getAllByRole('button', { name: 'Unpublish' })[0]);
    await user.click(screen.getByRole('button', { name: 'Unpublish version' }));
    expect(apiMock.yankVersion).toHaveBeenCalledWith('kane', 'demo', '1.2.0');
    expect(await screen.findByText('Version 1.2.0 has been unpublished.')).toBeInTheDocument();
    expect(screen.getByText('Unpublished')).toBeInTheDocument();
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
    expect(screen.queryByRole('button', { name: /Unpublish/ })).not.toBeInTheDocument();
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

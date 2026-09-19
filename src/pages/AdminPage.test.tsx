import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminPage } from './AdminPage';
import { api, ApiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  makeAdminUser,
  makeAuthState,
  makeExtension,
  makePendingVersion,
  makeSession,
  makeStats,
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

const termsDoc = { version: 2, body: '# Terms', updatedAt: '2026-01-01T00:00:00Z' };

const codeJs = 'class DemoExtension {}\nScratch.extensions.register(new DemoExtension());';

beforeEach(() => {
  apiMock.getStats.mockResolvedValue(makeStats());
  apiMock.listVersionsForReview.mockResolvedValue(paginated([makePendingVersion()]));
  apiMock.getExtensions.mockResolvedValue(paginated([makeExtension()]));
  apiMock.getUsers.mockResolvedValue(paginated([makeUser({ role: 'normal' })]));
  apiMock.getTerms.mockResolvedValue(termsDoc);
  apiMock.getPrivacy.mockResolvedValue({
    version: 2,
    body: '# Privacy',
    updatedAt: '2026-01-01T00:00:00Z',
  });
  apiMock.downloadVersion.mockResolvedValue(codeJs);
  authState = makeAuthState({ user: makeAdminUser() });
  useAuthMock.mockReset();
  useAuthMock.mockReturnValue(authState);
});

describe('AdminPage', () => {
  it('restricts access to administrators', () => {
    useAuthMock.mockReturnValue(makeAuthState({ user: makeUser({ role: 'normal' }) }));
    renderWithProviders(<AdminPage onNavigate={noop} />);
    expect(
      screen.getByRole('heading', { name: 'Administrator Access Required' }),
    ).toBeInTheDocument();
  });

  it('renders the admin console and its tabs', async () => {
    renderWithProviders(<AdminPage onNavigate={noop} />);
    expect(screen.getByRole('heading', { name: 'Registry Administration' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Moderation Queue/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Extension Catalog/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /User Accounts/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Platform Policies/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Maintenance/ })).toBeInTheDocument();
  });

  it('opens the maintenance tab with the prune tool', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminPage onNavigate={noop} />);
    await user.click(screen.getByRole('button', { name: /Maintenance/ }));
    expect(screen.getByText('Prune Dormant Accounts')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Scan for Dormant Accounts/ })).toBeInTheDocument();
  });

  it('lists the pending moderation queue with review actions', async () => {
    renderWithProviders(<AdminPage onNavigate={noop} />);
    expect(await screen.findByText('Demo Extension')).toBeInTheDocument();
    expect(screen.getByText('@kane/demo')).toBeInTheDocument();
    expect(screen.getByText('v1.0.0')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument();
  });

  it('approves a pending submission', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminPage onNavigate={noop} />);
    await screen.findByText('Demo Extension');
    await user.click(screen.getByRole('button', { name: 'Approve' }));
    expect(apiMock.reviewVersion).toHaveBeenCalledWith('kane', 'demo', '1.0.0', {
      status: 'approved',
    });
    expect(
      await screen.findByText('Version v1.0.0 of @kane/demo has been approved and published!'),
    ).toBeInTheDocument();
  });

  it('rejects a pending submission with feedback through the modal', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminPage onNavigate={noop} />);
    await screen.findByText('Demo Extension');
    await user.click(screen.getByRole('button', { name: 'Reject' }));
    expect(screen.getByText('Reject Extension Submission')).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText(/Manifest icon is missing/), 'Missing icon asset.');
    await user.click(screen.getByRole('button', { name: 'Confirm Rejection' }));
    expect(apiMock.reviewVersion).toHaveBeenCalledWith('kane', 'demo', '1.0.0', {
      status: 'rejected',
      reason: 'Missing icon asset.',
    });
    expect(
      await screen.findByText('Version v1.0.0 of @kane/demo was rejected.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Reject Extension Submission')).not.toBeInTheDocument();
  });

  it('filters the catalog via search', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminPage onNavigate={noop} />);
    await screen.findByText('Demo Extension');
    await user.click(screen.getByRole('button', { name: /Extension Catalog/ }));
    await user.type(screen.getByPlaceholderText(/Search extensions in catalog/), 'physics');
    await user.keyboard('{Enter}');
    expect(apiMock.searchExtensions).toHaveBeenCalledWith('physics', { limit: 50 });
  });

  it('deletes another account after typing its namespace', async () => {
    apiMock.getUsers.mockResolvedValue(
      paginated([
        makeUser({ role: 'normal' }),
        makeUser({ namespace: 'ada', displayName: 'Ada Lovelace', role: 'normal' }),
      ]),
    );
    const user = userEvent.setup();
    renderWithProviders(<AdminPage onNavigate={noop} />);
    await user.click(screen.getByRole('button', { name: /User Accounts/ }));
    await user.click(await screen.findByTitle('Permanently delete @ada'));

    const confirmButton = screen.getByRole('button', { name: 'Permanently delete' });
    expect(confirmButton).toBeDisabled();
    await user.type(screen.getByLabelText(/Type ada to confirm/), 'ada');
    await user.click(confirmButton);
    expect(apiMock.deleteUser).toHaveBeenCalledWith('ada');
    expect(
      await screen.findByText('Account @ada has been permanently deleted.'),
    ).toBeInTheDocument();
    expect(screen.queryByTitle('Permanently delete @ada')).not.toBeInTheDocument();
  });

  it('does not delete an account when confirmation is cancelled', async () => {
    apiMock.getUsers.mockResolvedValue(
      paginated([
        makeUser({ role: 'normal' }),
        makeUser({ namespace: 'ada', displayName: 'Ada Lovelace', role: 'normal' }),
      ]),
    );
    const user = userEvent.setup();
    renderWithProviders(<AdminPage onNavigate={noop} />);
    await user.click(screen.getByRole('button', { name: /User Accounts/ }));
    await user.click(await screen.findByTitle('Permanently delete @ada'));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(apiMock.deleteUser).not.toHaveBeenCalled();
    expect(screen.getByTitle('Permanently delete @ada')).toBeInTheDocument();
  });

  it('loads more of the moderation queue via the cursor', async () => {
    apiMock.listVersionsForReview.mockResolvedValueOnce(
      paginated([makePendingVersion()], 'cursor-1', true),
    );
    apiMock.listVersionsForReview.mockResolvedValueOnce(
      paginated([makePendingVersion({ version: '2.0.0' })]),
    );
    const user = userEvent.setup();
    renderWithProviders(<AdminPage onNavigate={noop} />);
    await screen.findByText('Demo Extension');

    await user.click(screen.getByRole('button', { name: 'Load more submissions' }));

    expect(apiMock.listVersionsForReview).toHaveBeenLastCalledWith({ cursor: 'cursor-1' });
  });

  it('inspects another account sessions and tokens', async () => {
    apiMock.getUsers.mockResolvedValue(
      paginated([makeUser({ namespace: 'ada', displayName: 'Ada Lovelace' })]),
    );
    apiMock.getSessions.mockResolvedValue(paginated([makeSession()]));
    apiMock.getTokens.mockResolvedValue(paginated([makeToken()]));
    const user = userEvent.setup();
    renderWithProviders(<AdminPage onNavigate={noop} />);

    await user.click(screen.getByRole('button', { name: /User Accounts/ }));
    await user.click(await screen.findByTitle('Sessions & tokens for @ada'));

    expect(apiMock.getSessions).toHaveBeenCalledWith({ namespace: 'ada' });
    expect(apiMock.getTokens).toHaveBeenCalledWith({ namespace: 'ada' });
    expect(await screen.findByText('Active Sessions (1)')).toBeInTheDocument();
    expect(screen.getByText('Automation Tokens (1)')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('sends admins to Settings instead of the activity modal for their own account', async () => {
    const onNavigate = vi.fn();
    apiMock.getUsers.mockResolvedValue(paginated([makeAdminUser({ namespace: 'kane' })]));
    const user = userEvent.setup();
    renderWithProviders(<AdminPage onNavigate={onNavigate} />);

    await user.click(screen.getByRole('button', { name: /User Accounts/ }));
    expect(screen.queryByTitle('Sessions & tokens for @kane')).not.toBeInTheDocument();

    await user.click(
      await screen.findByRole('button', {
        name: 'Manage your own sessions and tokens in Settings',
      }),
    );
    expect(onNavigate).toHaveBeenCalledWith('settings');
    expect(apiMock.getSessions).not.toHaveBeenCalled();
  });

  it('publishes a policy revision from the markdown editor', async () => {
    apiMock.updateTerms.mockResolvedValue({
      version: 3,
      body: '# Updated Terms',
      updatedAt: '2026-04-01T00:00:00Z',
    });
    const user = userEvent.setup();
    renderWithProviders(<AdminPage onNavigate={noop} />);

    await user.click(screen.getByRole('button', { name: /Platform Policies/ }));
    const openButtons = await screen.findAllByRole('button', { name: /Open Editor/ });
    await user.click(openButtons[0]);

    const editor = screen.getByRole('textbox', { name: 'Terms of Service markdown editor' });
    await user.clear(editor);
    await user.type(editor, '# Updated Terms');
    await user.click(screen.getByRole('button', { name: /Publish Revision/ }));

    expect(apiMock.updateTerms).toHaveBeenCalledWith('# Updated Terms');
    expect(await screen.findByText('Terms of Service updated to revision #3.')).toBeInTheDocument();
    expect(
      screen.queryByRole('textbox', { name: 'Terms of Service markdown editor' }),
    ).not.toBeInTheDocument();
  });

  it('opens the source review editor and loads the compiled source', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminPage onNavigate={noop} />);
    await screen.findByText('Demo Extension');
    await user.click(screen.getByRole('button', { name: /Inspect/ }));

    expect(await screen.findByRole('heading', { name: 'Demo Extension' })).toBeInTheDocument();

    const codeEditor = await screen.findByRole('textbox', { name: 'extension.js editor' });
    expect(codeEditor).toHaveValue(codeJs);
    expect(apiMock.downloadVersion).toHaveBeenCalledWith('kane', 'demo', '1.0.0');
  });

  it('reports when pending source code cannot be loaded', async () => {
    const user = userEvent.setup();
    apiMock.downloadVersion.mockRejectedValue(new ApiError('Not Found', 404));
    renderWithProviders(<AdminPage onNavigate={noop} />);
    await screen.findByText('Demo Extension');
    await user.click(screen.getByRole('button', { name: /Inspect/ }));

    expect(await screen.findByText(/extension.js is not available/i)).toBeInTheDocument();
    expect(screen.queryByText(/Unable to load extension.js/i)).not.toBeInTheDocument();
  });
});

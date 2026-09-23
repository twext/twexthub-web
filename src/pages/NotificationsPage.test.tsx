import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationsPage } from './NotificationsPage';
import { api, ApiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  makeAuthState,
  makeNotification,
  makeUser,
  noop,
  renderWithProviders,
} from '../test/testUtils';
import type { Notification } from '../types/api';

vi.mock('../services/api');
vi.mock('../context/AuthContext');

const apiMock = vi.mocked(api);
const useAuthMock = vi.mocked(useAuth);

function notificationList(
  data: Notification[],
  unreadCount: number,
  nextCursor: string | null = null,
  hasMore = false,
) {
  return { data, unreadCount, pagination: { nextCursor, hasMore } };
}

beforeEach(() => {
  apiMock.getNotifications.mockResolvedValue(
    notificationList(
      [
        makeNotification({
          id: 'notif-1',
          kind: 'broadcast',
          message: 'Scheduled maintenance tonight at 02:00 UTC.',
        }),
        makeNotification({
          id: 'notif-2',
          kind: 'review.approved',
          message: 'demo@1.0.0 was approved and is live.',
          payload: { namespace: 'kane', id: 'demo', version: '1.0.0' },
          read: true,
        }),
      ],
      1,
    ),
  );
  apiMock.markNotificationsRead.mockResolvedValue({ updated: 1 });
  useAuthMock.mockReset();
  useAuthMock.mockReturnValue(makeAuthState());
});

describe('NotificationsPage', () => {
  it('redirects a signed-out visitor to login', async () => {
    useAuthMock.mockReturnValue(makeAuthState({ user: null, token: null, isAuthenticated: false }));
    const onNavigate = vi.fn();
    renderWithProviders(<NotificationsPage onNavigate={onNavigate} />);
    expect(await screen.findByText('Redirecting to login...')).toBeInTheDocument();
    expect(onNavigate).toHaveBeenCalledWith('login');
    expect(apiMock.getNotifications).not.toHaveBeenCalled();
  });

  it('lists notifications with kind labels and the unread count', async () => {
    renderWithProviders(<NotificationsPage onNavigate={noop} />);
    expect(
      await screen.findByText('Scheduled maintenance tonight at 02:00 UTC.'),
    ).toBeInTheDocument();
    expect(screen.getByText('demo@1.0.0 was approved and is live.')).toBeInTheDocument();
    expect(screen.getByText('Broadcast')).toBeInTheDocument();
    expect(screen.getByText('Version approved')).toBeInTheDocument();
    expect(screen.getByText('1 unread')).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();
    expect(screen.getAllByText('Read')).toHaveLength(1);
    expect(apiMock.getNotifications).toHaveBeenCalledWith(expect.objectContaining({ limit: 25 }));
  });

  it('offers a link to the notification extension', async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<NotificationsPage onNavigate={onNavigate} />);
    await user.click(await screen.findByRole('button', { name: 'View @kane/demo' }));
    expect(onNavigate).toHaveBeenCalledWith('ext/kane/demo');
  });

  it('marks a single notification read', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NotificationsPage onNavigate={noop} />);
    await screen.findByText('Scheduled maintenance tonight at 02:00 UTC.');

    await user.click(screen.getAllByRole('button', { name: 'Mark read' })[0]);

    expect(apiMock.markNotificationsRead).toHaveBeenCalledWith({ ids: ['notif-1'] });
    expect(await screen.findByText('Notification marked as read.')).toBeInTheDocument();
    expect(screen.getByText('0 unread')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mark read' })).not.toBeInTheDocument();
  });

  it('marks the whole mailbox read', async () => {
    apiMock.markNotificationsRead.mockResolvedValue({ updated: 2 });
    const user = userEvent.setup();
    renderWithProviders(<NotificationsPage onNavigate={noop} />);
    await screen.findByText('Scheduled maintenance tonight at 02:00 UTC.');

    await user.click(screen.getByRole('button', { name: 'Mark all read' }));

    expect(apiMock.markNotificationsRead).toHaveBeenCalledWith({ all: true });
    expect(await screen.findByText('All notifications marked as read.')).toBeInTheDocument();
    expect(screen.getByText('0 unread')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark all read' })).toBeDisabled();
    expect(screen.getAllByText('Read')).toHaveLength(2);
  });

  it('fetches only unread rows when the filter is on', async () => {
    apiMock.getNotifications.mockResolvedValue(
      notificationList([makeNotification({ id: 'notif-1' })], 1),
    );
    const user = userEvent.setup();
    renderWithProviders(<NotificationsPage onNavigate={noop} />);
    await screen.findByText('Scheduled maintenance tonight at 02:00 UTC.');
    expect(apiMock.getNotifications).toHaveBeenCalledWith(
      expect.not.objectContaining({ unread: true }),
    );

    await user.click(screen.getByLabelText('Unread only'));

    expect(apiMock.getNotifications).toHaveBeenLastCalledWith(
      expect.objectContaining({ unread: true }),
    );
  });

  it('loads more notifications via the cursor', async () => {
    apiMock.getNotifications.mockResolvedValueOnce(
      notificationList([makeNotification({ id: 'notif-1' })], 2, 'cursor-5', true),
    );
    apiMock.getNotifications.mockResolvedValueOnce(
      notificationList(
        [makeNotification({ id: 'notif-3', message: 'Your account role changed to "admin".' })],
        2,
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<NotificationsPage onNavigate={noop} />);
    await screen.findByText('Scheduled maintenance tonight at 02:00 UTC.');

    await user.click(screen.getByRole('button', { name: 'Load more notifications' }));

    expect(apiMock.getNotifications).toHaveBeenLastCalledWith(
      expect.objectContaining({ cursor: 'cursor-5' }),
    );
    expect(await screen.findByText('Your account role changed to "admin".')).toBeInTheDocument();
  });

  it('shows an empty inbox state', async () => {
    apiMock.getNotifications.mockResolvedValue(notificationList([], 0));
    renderWithProviders(<NotificationsPage onNavigate={noop} />);
    expect(await screen.findByText('Your inbox is empty')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark all read' })).toBeDisabled();
  });

  it('offers a way back from an empty unread filter', async () => {
    apiMock.getNotifications.mockResolvedValue(notificationList([], 0));
    const user = userEvent.setup();
    renderWithProviders(<NotificationsPage onNavigate={noop} />);
    await screen.findByText('Your inbox is empty');
    await user.click(screen.getByLabelText('Unread only'));

    expect(await screen.findByText('No unread notifications')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show all notifications' }));
    expect(screen.getByLabelText('Unread only')).not.toBeChecked();
    expect(await screen.findByText('Your inbox is empty')).toBeInTheDocument();
  });

  it('reports fetch failures as an error toast', async () => {
    apiMock.getNotifications.mockRejectedValue(new ApiError('Service unavailable.', 503));
    renderWithProviders(<NotificationsPage onNavigate={noop} />);
    expect(await screen.findByText('Service unavailable.')).toBeInTheDocument();
    expect(apiMock.markNotificationsRead).not.toHaveBeenCalled();
  });

  it('only shows the mailbox for the signed-in account', async () => {
    useAuthMock.mockReturnValue(makeAuthState({ user: makeUser({ namespace: 'ada' }) }));
    renderWithProviders(<NotificationsPage onNavigate={noop} />);
    expect(await screen.findByText(/for @ada/)).toBeInTheDocument();
  });
});

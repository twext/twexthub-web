import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BroadcastPanel } from './BroadcastPanel';
import { api, ApiError } from '../services/api';
import { renderWithProviders } from '../test/testUtils';

vi.mock('../services/api');

const apiMock = vi.mocked(api);

beforeEach(() => {
  apiMock.broadcastNotification.mockResolvedValue({ created: 3 });
});

describe('BroadcastPanel', () => {
  it('renders the broadcast composer', () => {
    renderWithProviders(<BroadcastPanel />);
    expect(screen.getByText('Broadcast to All Accounts')).toBeInTheDocument();
    expect(screen.getByLabelText('Broadcast message')).toBeInTheDocument();
    expect(screen.getByText('0/280')).toBeInTheDocument();
  });

  it('does not send an empty or whitespace-only message', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BroadcastPanel />);
    const button = screen.getByRole('button', { name: 'Send Broadcast' });
    expect(button).toBeDisabled();

    await user.type(screen.getByLabelText('Broadcast message'), '   ');
    expect(button).toBeDisabled();
    expect(apiMock.broadcastNotification).not.toHaveBeenCalled();
  });

  it('caps the message at 280 characters', () => {
    renderWithProviders(<BroadcastPanel />);
    const textarea = screen.getByLabelText('Broadcast message') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'a'.repeat(300) } });
    expect(textarea.value).toHaveLength(280);
    expect(screen.getByText('280/280')).toBeInTheDocument();
  });

  it('sends a broadcast after confirmation and reports the mailbox count', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BroadcastPanel />);
    await user.type(
      screen.getByLabelText('Broadcast message'),
      '  Maintenance tonight at 02:00 UTC.  ',
    );
    await user.click(screen.getByRole('button', { name: 'Send Broadcast' }));

    expect(screen.getByText('Send registry broadcast')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Send broadcast' }));

    expect(apiMock.broadcastNotification).toHaveBeenCalledWith('Maintenance tonight at 02:00 UTC.');
    expect(await screen.findByText('Broadcast sent to 3 mailboxes.')).toBeInTheDocument();
    expect(screen.getByLabelText('Broadcast message')).toHaveValue('');
  });

  it('does not broadcast when confirmation is cancelled', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BroadcastPanel />);
    await user.type(screen.getByLabelText('Broadcast message'), 'Hello everyone');
    await user.click(screen.getByRole('button', { name: 'Send Broadcast' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(apiMock.broadcastNotification).not.toHaveBeenCalled();
  });

  it('reports send failures as an error toast', async () => {
    apiMock.broadcastNotification.mockRejectedValue(
      new ApiError('Message exceeds 280 characters.', 400),
    );
    const user = userEvent.setup();
    renderWithProviders(<BroadcastPanel />);
    await user.type(screen.getByLabelText('Broadcast message'), 'Short message');
    await user.click(screen.getByRole('button', { name: 'Send Broadcast' }));
    await user.click(screen.getByRole('button', { name: 'Send broadcast' }));

    expect(await screen.findByText('Message exceeds 280 characters.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send Broadcast' })).toBeInTheDocument();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuditPanel } from './AuditPanel';
import { api } from '../services/api';
import {
  makeSession,
  makeToken,
  makeUser,
  paginated,
  renderWithProviders,
} from '../test/testUtils';

vi.mock('../services/api');

const apiMock = vi.mocked(api);

beforeEach(() => {
  apiMock.getUsers.mockResolvedValue(paginated([makeUser({ termsAcceptedVersion: 2 })]));
  apiMock.getTerms.mockResolvedValue({ version: 2, body: '# Terms', updatedAt: '2026-01-01' });
  apiMock.getSessions.mockResolvedValue(
    paginated([makeSession({ id: 'sess-expired', expiresAt: '2020-01-01T00:00:00Z' })]),
  );
  apiMock.getTokens.mockResolvedValue(
    paginated([makeToken({ id: 'tok-expired', expiresAt: '2020-01-01T00:00:00Z' })]),
  );
  apiMock.revokeSession.mockResolvedValue(undefined);
  apiMock.deleteToken.mockResolvedValue(undefined);
});

describe('AuditPanel', () => {
  it('scans accounts and reports expired sessions and tokens', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AuditPanel />);

    expect(screen.queryByText(/Audited/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Run Audit/ }));

    expect(await screen.findByText(/Audited 1 account\(s\)/)).toBeInTheDocument();
    expect(screen.getByText('Expired sessions')).toBeInTheDocument();
    expect(screen.getByText('Expired tokens')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Revoke all/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete all/ })).toBeInTheDocument();
  });

  it('revokes expired sessions after confirmation', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AuditPanel />);

    await user.click(screen.getByRole('button', { name: /Run Audit/ }));
    await screen.findByText(/Audited 1 account\(s\)/);
    await user.click(screen.getByRole('button', { name: /Revoke all/ }));
    await user.click(await screen.findByRole('button', { name: 'Revoke sessions' }));

    expect(apiMock.revokeSession).toHaveBeenCalledWith('sess-expired');
  });

  it('flags accounts that have not accepted the latest terms', async () => {
    apiMock.getUsers.mockResolvedValue(
      paginated([makeUser({ namespace: 'newbie', termsAcceptedVersion: null })]),
    );
    apiMock.getSessions.mockResolvedValue(paginated([]));
    apiMock.getTokens.mockResolvedValue(paginated([]));

    const user = userEvent.setup();
    renderWithProviders(<AuditPanel />);
    await user.click(screen.getByRole('button', { name: /Run Audit/ }));

    expect(await screen.findByText('Terms not accepted')).toBeInTheDocument();
    expect(screen.getByText('Dormant accounts')).toBeInTheDocument();
    expect(screen.getAllByText('@newbie').length).toBeGreaterThan(0);
  });
});

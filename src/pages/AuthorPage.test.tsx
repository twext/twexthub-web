import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthorPage } from './AuthorPage';
import { ApiError, api } from '../services/api';
import { makeExtension, makeUser, paginated, noop } from '../test/testUtils';

vi.mock('../services/api');

const apiMock = vi.mocked(api);

beforeEach(() => {
  apiMock.getUser.mockResolvedValue(makeUser({ namespace: 'kane', displayName: 'Kane Marshall' }));
  apiMock.searchExtensions.mockResolvedValue(
    paginated([
      makeExtension({ namespace: 'kane', id: 'demo', name: 'Demo Extension' }),
      makeExtension({ namespace: 'other', id: 'nope', name: 'Other Extension', author: 'other' }),
    ]),
  );
});

describe('AuthorPage', () => {
  it('renders the author profile and only their extensions', async () => {
    render(<AuthorPage namespace="kane" onNavigate={noop} />);

    expect(await screen.findByRole('heading', { name: 'Kane Marshall' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Extensions by @kane/ })).toBeInTheDocument();
    expect(screen.getAllByText('@kane').length).toBeGreaterThan(0);
    expect(screen.getByText('Demo Extension')).toBeInTheDocument();
    expect(screen.queryByText('Other Extension')).not.toBeInTheDocument();
    expect(apiMock.getUser).toHaveBeenCalledWith('kane');
  });

  it('shows a not-found state when the profile request fails', async () => {
    apiMock.getUser.mockRejectedValue(new ApiError('Account not found', 404));
    render(<AuthorPage namespace="ghost" onNavigate={noop} />);

    expect(await screen.findByText('Author Not Found')).toBeInTheDocument();
    expect(screen.getByText('Account not found')).toBeInTheDocument();
  });

  it('navigates back to explore', async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    render(<AuthorPage namespace="kane" onNavigate={onNavigate} />);
    await screen.findByRole('heading', { name: 'Kane Marshall' });
    await user.click(screen.getAllByRole('button', { name: /Back to Explore/ })[0]);
    expect(onNavigate).toHaveBeenCalledWith('search');
  });
});

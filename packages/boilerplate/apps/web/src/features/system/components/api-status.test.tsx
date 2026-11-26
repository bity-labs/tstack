import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ApiStatus } from './api-status';

function showStatus() {
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <ApiStatus />
    </QueryClientProvider>,
  );
}

it('shows the connection result returned through the SDK', async () => {
  vi.stubGlobal('fetch', async () =>
    Response.json({ status: 'ok', storage: 'sqlite' }),
  );
  showStatus();
  expect(await screen.findByText('All systems ready')).toBeVisible();
  expect(
    screen.getByText('Effect API connected. Storage: sqlite.'),
  ).toBeVisible();
});

it('shows an error and lets the user retry successfully', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({ message: 'Unavailable' }, { status: 503 }),
    )
    .mockImplementation(async () =>
      Response.json({ status: 'ok', storage: 'sqlite' }),
    );
  vi.stubGlobal('fetch', fetch);
  showStatus();
  expect(await screen.findByText('API unavailable')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Check again' }));
  expect(await screen.findByText('All systems ready')).toBeVisible();
});

it('announces loading and disables refresh while a request is pending', () => {
  vi.stubGlobal('fetch', () => new Promise(() => undefined));
  showStatus();
  expect(screen.getByRole('status')).toHaveTextContent(
    'Checking your connection',
  );
  expect(screen.getByRole('button', { name: 'Checking…' })).toBeDisabled();
});

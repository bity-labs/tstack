import { useSyncExternalStore } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { expect, it, vi } from 'vitest';
import { Route } from '../../../routes/_authenticated.account';
import { Route as AuthenticatedRoute } from '../../../routes/_authenticated';

const state = vi.hoisted(() => ({
  user: {
    id: 'alice',
    name: 'Alice',
    email: 'alice@example.test',
    emailVerified: false,
  },
  session: {
    data: null as null | {
      user: { id: string };
      session: { expiresAt: Date };
    },
    isPending: false,
    error: null as null | Error,
    refetch: vi.fn(),
  },
  listeners: new Set<() => void>(),
}));

vi.mock('../../../lib/session.functions', () => ({
  getCurrentUser: async () => state.user,
}));
vi.mock('../../../lib/auth-client', () => ({
  authClient: {
    useSession: () =>
      useSyncExternalStore(
        (listener) => {
          state.listeners.add(listener);
          return () => state.listeners.delete(listener);
        },
        () => state.session,
      ),
  },
}));

it('revalidates empty client caches, reloads changed identities and hides failed sessions', async () => {
  const root = createRootRouteWithContext<{ queryClient: QueryClient }>()();
  const authenticated = createRoute({
    getParentRoute: () => root,
    id: '_authenticated',
    beforeLoad: AuthenticatedRoute.options.beforeLoad,
    component: AuthenticatedRoute.options.component,
  });
  const account = createRoute({
    getParentRoute: () => authenticated,
    path: '/account',
    loader: ({ context }) => context.user,
    component: Route.options.component,
  });
  const router = createRouter({
    routeTree: root.addChildren([authenticated.addChildren([account])]),
    history: createMemoryHistory({ initialEntries: ['/account'] }),
    context: { queryClient: new QueryClient() },
  });
  await router.load();
  render(<RouterProvider router={router} />);
  await waitFor(() => expect(router.state.status).toBe('idle'));
  expect(router.state.location.pathname).toBe('/account');
  act(() => {
    state.session = {
      ...state.session,
      data: {
        user: { id: 'alice' },
        session: { expiresAt: new Date(Date.now() + 3_600_000) },
      },
    };
    state.listeners.forEach((listener) => listener());
  });
  expect(await screen.findByText('Welcome, Alice.')).toBeVisible();

  act(() => {
    state.user = {
      id: 'bob',
      name: '',
      email: 'bob@example.test',
      emailVerified: false,
    };
    state.session = {
      ...state.session,
      data: {
        user: { id: 'bob' },
        session: { expiresAt: new Date(Date.now() + 3_600_000) },
      },
    };
    state.listeners.forEach((listener) => listener());
  });
  expect(screen.queryByText('alice@example.test')).toBeNull();
  await waitFor(() => expect(screen.getByText('Welcome.')).toBeVisible());

  act(() => {
    state.session = { ...state.session, error: new Error('offline') };
    state.listeners.forEach((listener) => listener());
  });
  expect(screen.queryByText('bob@example.test')).toBeNull();
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Unable to refresh your session',
  );
});

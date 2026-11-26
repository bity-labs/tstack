import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { beforeEach, expect, it, vi } from 'vitest';
import { AuthForm } from './auth-form';

// Better Auth captures fetch when its client is created, before rendering.
const network = vi.hoisted(() => {
  const fetch = vi.fn<typeof globalThis.fetch>();
  vi.stubGlobal('fetch', fetch);
  return { fetch };
});

beforeEach(() => network.fetch.mockReset());

async function showForm() {
  vi.stubGlobal('scrollTo', vi.fn());
  const root = createRootRoute();
  const login = createRoute({
    getParentRoute: () => root,
    path: '/',
    component: AuthForm,
  });
  const account = createRoute({
    getParentRoute: () => root,
    path: '/account',
    component: () => <h1>Your account</h1>,
  });
  const router = createRouter({
    routeTree: root.addChildren([login, account]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  await router.load();
  render(<RouterProvider router={router} />);
  await screen.findByRole('heading', { name: 'Welcome back.' });
}

it('signs in with an emailed code without asking for a password', async () => {
  const fetch = network.fetch.mockImplementation(async () =>
    Response.json({ status: true }),
  );
  await showForm();
  fireEvent.click(screen.getByRole('button', { name: 'Use an email code' }));
  expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'alice@example.test' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Send code' }));
  expect(await screen.findByLabelText('Email code')).toBeVisible();
  expect(screen.getByText(/alice@example.test/)).toBeVisible();
  expect(String(fetch.mock.calls[0]?.[0])).toContain(
    '/email-otp/send-verification-otp',
  );
  expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({
    email: 'alice@example.test',
    type: 'sign-in',
  });
  fireEvent.change(screen.getByLabelText('Email code'), {
    target: { value: '123456' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Verify and continue' }));
  expect(
    await screen.findByRole('heading', { name: 'Your account' }),
  ).toBeVisible();
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  expect(String(fetch.mock.calls[1]?.[0])).toContain('/sign-in/email-otp');
  expect(JSON.parse(String(fetch.mock.calls[1]?.[1]?.body))).toEqual({
    email: 'alice@example.test',
    otp: '123456',
  });
});

it('resends to the same email, clears the old code and announces a replacement', async () => {
  const fetch = network.fetch.mockImplementation(async () =>
    Response.json({ status: true }),
  );
  await showForm();
  fireEvent.click(screen.getByRole('button', { name: 'Use an email code' }));
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'alice@example.test' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Send code' }));
  fireEvent.change(await screen.findByLabelText('Email code'), {
    target: { value: '123456' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Resend code' }));
  expect(await screen.findByRole('status')).toHaveTextContent(
    'A new code has been sent. Use the latest code.',
  );
  expect(screen.getByLabelText('Email code')).toHaveValue('');
  expect(String(fetch.mock.calls[1]?.[0])).toContain(
    '/email-otp/send-verification-otp',
  );
  expect(JSON.parse(String(fetch.mock.calls[1]?.[1]?.body))).toEqual({
    email: 'alice@example.test',
    type: 'sign-in',
  });
});

it('lets users change email and return to password access without retaining a code', async () => {
  network.fetch.mockImplementation(async () => Response.json({ status: true }));
  await showForm();
  fireEvent.click(screen.getByRole('button', { name: 'Use an email code' }));
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'alice@example.test' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Send code' }));
  fireEvent.change(await screen.findByLabelText('Email code'), {
    target: { value: '123456' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Change email' }));
  expect(screen.getByLabelText('Email')).toHaveValue('alice@example.test');
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'bob@example.test' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Send code' }));
  expect(await screen.findByLabelText('Email code')).toHaveValue('');
  expect(screen.getByText(/bob@example.test/)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Back to password' }));
  expect(screen.getByLabelText('Password')).toBeVisible();
  expect(screen.queryByLabelText('Email code')).not.toBeInTheDocument();
});

it('accepts only six digits and explains code expiry', async () => {
  network.fetch.mockImplementation(async () => Response.json({ status: true }));
  await showForm();
  fireEvent.click(screen.getByRole('button', { name: 'Use an email code' }));
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'alice@example.test' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Send code' }));
  const code = await screen.findByLabelText('Email code');
  for (const value of ['', '12345', '1234567', 'abcdef', '12 345']) {
    fireEvent.change(code, { target: { value } });
    expect(code).toBeInvalid();
  }
  fireEvent.change(code, { target: { value: '012345' } });
  expect(code).toBeValid();
  expect(code).toHaveAccessibleDescription(
    'Use the latest 6-digit code. It expires in 5 minutes.',
  );
});

it('shows a safe send error and lets users retry without exposing server details', async () => {
  network.fetch
    .mockResolvedValueOnce(
      Response.json(
        { code: 'RATE_LIMITED', message: 'private delivery details' },
        { status: 429 },
      ),
    )
    .mockImplementation(async () => Response.json({ status: true }));
  await showForm();
  fireEvent.click(screen.getByRole('button', { name: 'Use an email code' }));
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'alice@example.test' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Send code' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Unable to send a code. Check your email or try again later.',
  );
  expect(
    screen.queryByText(/private delivery details/),
  ).not.toBeInTheDocument();
  expect(screen.getByLabelText('Email')).toHaveValue('alice@example.test');
  fireEvent.click(screen.getByRole('button', { name: 'Send code' }));
  expect(await screen.findByLabelText('Email code')).toBeVisible();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it.each(['INVALID_OTP', 'OTP_EXPIRED', 'TOO_MANY_ATTEMPTS'])(
  'keeps verification failure %s private and allows requesting a new code',
  async (code) => {
    network.fetch
      .mockResolvedValueOnce(Response.json({ status: true }))
      .mockResolvedValueOnce(
        Response.json(
          { code, message: 'private verification details' },
          { status: 400 },
        ),
      )
      .mockImplementation(async () => Response.json({ status: true }));
    await showForm();
    fireEvent.click(screen.getByRole('button', { name: 'Use an email code' }));
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'alice@example.test' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send code' }));
    fireEvent.change(await screen.findByLabelText('Email code'), {
      target: { value: '123456' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Verify and continue' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to verify this code. Try again or request a new code.',
    );
    expect(
      screen.queryByText(/private verification details/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Your account' }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Resend code' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'A new code has been sent.',
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  },
);

it.each(['send', 'resend', 'verify'])(
  'disables all controls while %s is pending and restores them after failure',
  async (action) => {
    network.fetch.mockImplementation(async () =>
      Response.json({ status: true }),
    );
    await showForm();
    fireEvent.click(screen.getByRole('button', { name: 'Use an email code' }));
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'alice@example.test' },
    });
    if (action !== 'send') {
      fireEvent.click(screen.getByRole('button', { name: 'Send code' }));
      fireEvent.change(await screen.findByLabelText('Email code'), {
        target: { value: '012345' },
      });
    }
    let finish!: (response: Response) => void;
    network.fetch.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
    );
    const button = screen.getByRole('button', {
      name:
        action === 'send'
          ? 'Send code'
          : action === 'resend'
            ? 'Resend code'
            : 'Verify and continue',
    });
    fireEvent.click(button);
    expect(screen.getByRole('button', { name: 'Please wait…' })).toBeDisabled();
    for (const control of screen.getAllByRole('button')) {
      expect(control).toBeDisabled();
    }
    expect(screen.getByRole('textbox')).toBeDisabled();
    fireEvent.click(button);
    const calls = action === 'send' ? 1 : 2;
    await waitFor(() => expect(network.fetch).toHaveBeenCalledTimes(calls));
    await act(async () =>
      finish(
        Response.json(
          { code: 'UNAVAILABLE', message: 'private details' },
          { status: 503 },
        ),
      ),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      action === 'verify'
        ? 'Unable to verify this code.'
        : 'Unable to send a code.',
    );
    expect(screen.getByRole('textbox')).toBeEnabled();
    expect(
      screen.getByRole('button', { name: 'Back to password' }),
    ).toBeEnabled();
    expect(network.fetch).toHaveBeenCalledTimes(calls);
  },
);

it('recovers from an offline send without exposing the thrown error', async () => {
  network.fetch
    .mockRejectedValueOnce(new TypeError('private network failure'))
    .mockImplementation(async () => Response.json({ status: true }));
  await showForm();
  fireEvent.click(screen.getByRole('button', { name: 'Use an email code' }));
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'alice@example.test' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Send code' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Unable to reach the server. Please try again.',
  );
  expect(screen.queryByText(/private network failure/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Send code' }));
  expect(await screen.findByLabelText('Email code')).toBeVisible();
});

it.each([false, true])(
  'preserves password access (creating account: %s)',
  async (creating) => {
    network.fetch.mockImplementation(async () =>
      Response.json({ status: true }),
    );
    await showForm();
    if (creating) {
      fireEvent.click(
        screen.getByRole('button', { name: 'New here? Create an account' }),
      );
      fireEvent.change(screen.getByLabelText('Name'), {
        target: { value: 'Alice' },
      });
      expect(screen.getByLabelText('Password')).toHaveAttribute(
        'minlength',
        '12',
      );
    }
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'alice@example.test' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'a long password for testing' },
    });
    fireEvent.click(
      screen.getByRole('button', {
        name: creating ? 'Create account' : 'Sign in',
      }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Your account' }),
    ).toBeVisible();
    expect(String(network.fetch.mock.calls[0]?.[0])).toContain(
      creating ? '/sign-up/email' : '/sign-in/email',
    );
    expect(JSON.parse(String(network.fetch.mock.calls[0]?.[1]?.body))).toEqual({
      email: 'alice@example.test',
      password: 'a long password for testing',
      ...(creating ? { name: 'Alice' } : {}),
    });
  },
);

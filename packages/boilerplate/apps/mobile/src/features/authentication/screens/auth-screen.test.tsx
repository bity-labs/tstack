import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { ApiError, me } from '@tstack/sdk';

import { AuthScreen } from './auth-screen';
import { getAuthClient } from '../../../lib/auth-client';

jest.mock('../../../lib/auth-client', () => ({ getAuthClient: jest.fn() }));
jest.mock(
  '@tstack/sdk',
  () => ({
    me: jest.fn(),
    ApiError: class extends Error {
      status: number;
      constructor(status: number) {
        super('API error');
        this.status = status;
      }
    },
  }),
  { virtual: true },
);

const mockRefetch = jest.fn().mockResolvedValue(undefined);
const mockSignIn = jest.fn();
const mockSignUp = jest.fn();
const mockSignOut = jest.fn();
const mockSendOtp = jest.fn();
const mockSignInOtp = jest.fn();
const mockCookie = jest
  .fn()
  .mockResolvedValue('better-auth.session_token=test');
let mockSession: {
  session: { id: string; expiresAt: Date };
  user: { id: string; name: string };
} | null = null;
let mockPending = false;
let mockSessionError: Error | null = null;

const mockClient = {
  useSession: () => ({
    data: mockSession,
    isPending: mockPending,
    error: mockSessionError,
    refetch: mockRefetch,
  }),
  signIn: { email: mockSignIn, emailOtp: mockSignInOtp },
  emailOtp: { sendVerificationOtp: mockSendOtp },
  signUp: { email: mockSignUp },
  signOut: mockSignOut,
  getCookie: mockCookie,
};

async function fillCredentials() {
  await fireEvent.changeText(
    screen.getByLabelText('Email'),
    'person@example.com',
  );
  await fireEvent.changeText(
    screen.getByLabelText('Password'),
    'long-password123',
  );
}

async function requestEmailCode() {
  await fireEvent.press(
    screen.getByRole('button', { name: 'Continue with email code' }),
  );
  await fireEvent.changeText(
    screen.getByLabelText('Email'),
    'person@example.com',
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Send code' }));
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.EXPO_PUBLIC_API_URL = 'https://api.example.com';
  mockSession = null;
  mockPending = false;
  mockSessionError = null;
  jest
    .mocked(getAuthClient)
    .mockReturnValue(mockClient as unknown as ReturnType<typeof getAuthClient>);
  mockSignIn.mockResolvedValue({ error: null });
  mockSignUp.mockResolvedValue({ error: null });
  mockSignOut.mockResolvedValue({ error: null });
  mockSendOtp.mockResolvedValue({ error: null });
  mockSignInOtp.mockResolvedValue({ error: null });
  mockCookie.mockResolvedValue('better-auth.session_token=test');
  jest.mocked(me).mockResolvedValue({
    id: 'user-1',
    name: 'Taylor',
    email: 'person@example.com',
    emailVerified: false,
  });
});

it('waits for persisted session validation rather than showing a signed-out form', async () => {
  mockPending = true;
  await render(<AuthScreen />);
  expect(screen.getByLabelText('Restoring session')).toBeVisible();
  expect(screen.queryByLabelText('Password')).toBeNull();
  expect(me).not.toHaveBeenCalled();
});

it('submits sign-in and refetches the session without requesting a profile when signed out', async () => {
  await render(<AuthScreen />);
  expect(screen.getByRole('header', { name: 'Sign in' })).toBeVisible();
  expect(me).not.toHaveBeenCalled();
  await fillCredentials();
  await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
  expect(mockSignIn).toHaveBeenCalledWith({
    email: 'person@example.com',
    password: 'long-password123',
  });
  await waitFor(() => expect(mockRefetch).toHaveBeenCalled());
  expect(screen.getByLabelText('Password')).toHaveDisplayValue('');
});

it('submits name, email and password for sign-up', async () => {
  await render(<AuthScreen />);
  await fireEvent.press(
    screen.getByRole('button', { name: 'New here? Create an account' }),
  );
  await fireEvent.changeText(screen.getByLabelText('Name'), 'Taylor');
  await fillCredentials();
  await fireEvent.press(screen.getByRole('button', { name: 'Create account' }));
  expect(mockSignUp).toHaveBeenCalledWith({
    name: 'Taylor',
    email: 'person@example.com',
    password: 'long-password123',
  });
});

it('requests a sign-in code without requiring a password or creating a session', async () => {
  await render(<AuthScreen />);
  await fireEvent.press(
    screen.getByRole('button', { name: 'Continue with email code' }),
  );
  expect(screen.queryByLabelText('Password')).toBeNull();
  await fireEvent.changeText(
    screen.getByLabelText('Email'),
    ' person@example.com ',
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Send code' }));
  expect(mockSendOtp).toHaveBeenCalledWith({
    email: 'person@example.com',
    type: 'sign-in',
  });
  expect(screen.getByLabelText('Verification code')).toBeVisible();
  expect(mockSignIn).not.toHaveBeenCalled();
  expect(mockSignInOtp).not.toHaveBeenCalled();
  expect(mockRefetch).not.toHaveBeenCalled();
});

it('verifies a six-digit code through the official client and revalidates before showing a profile', async () => {
  await render(<AuthScreen />);
  await requestEmailCode();
  const input = screen.getByLabelText('Verification code');
  expect(input).toHaveProp('autoComplete', 'one-time-code');
  expect(input).toHaveProp('textContentType', 'oneTimeCode');
  expect(input).toHaveProp('keyboardType', 'number-pad');
  await fireEvent.changeText(input, '12345');
  await fireEvent.press(
    screen.getByRole('button', { name: 'Verify and sign in' }),
  );
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Enter the 6-digit code.',
  );
  expect(mockSignInOtp).not.toHaveBeenCalled();
  await fireEvent.changeText(input, '012345');
  await fireEvent.press(
    screen.getByRole('button', { name: 'Verify and sign in' }),
  );
  expect(mockSignInOtp).toHaveBeenCalledWith({
    email: 'person@example.com',
    otp: '012345',
  });
  expect(mockRefetch).toHaveBeenCalledTimes(1);
  expect(me).not.toHaveBeenCalled();
  expect(screen.queryByLabelText('Verification code')).toBeNull();
  expect(screen.getByLabelText('Password')).toHaveDisplayValue('');
});

it('resends for the locked email and discards codes when changing email or returning to password sign-in', async () => {
  await render(<AuthScreen />);
  await fillCredentials();
  await requestEmailCode();
  await fireEvent.changeText(
    screen.getByLabelText('Verification code'),
    '123456',
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Resend code' }));
  expect(mockSendOtp).toHaveBeenCalledTimes(2);
  expect(mockSendOtp).toHaveBeenLastCalledWith({
    email: 'person@example.com',
    type: 'sign-in',
  });
  expect(screen.getByLabelText('Verification code')).toHaveDisplayValue('');
  await fireEvent.changeText(
    screen.getByLabelText('Verification code'),
    '123456',
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Change email' }));
  expect(screen.queryByLabelText('Verification code')).toBeNull();
  await fireEvent.changeText(
    screen.getByLabelText('Email'),
    'other@example.com',
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Send code' }));
  expect(mockSendOtp).toHaveBeenLastCalledWith({
    email: 'other@example.com',
    type: 'sign-in',
  });
  expect(screen.getByLabelText('Verification code')).toHaveDisplayValue('');
  await fireEvent.press(
    screen.getByRole('button', { name: 'Back to password sign-in' }),
  );
  expect(screen.getByLabelText('Password')).toHaveDisplayValue('');
  await fireEvent.press(
    screen.getByRole('button', { name: 'Continue with email code' }),
  );
  expect(screen.queryByLabelText('Verification code')).toBeNull();
  expect(screen.getByLabelText('Email')).toHaveDisplayValue(
    'other@example.com',
  );
  await fireEvent.press(
    screen.getByRole('button', { name: 'Back to password sign-in' }),
  );
  expect(screen.getByLabelText('Password')).toBeVisible();
});

it('labels an in-flight resend as sending and blocks verification and navigation until it completes', async () => {
  await render(<AuthScreen />);
  await requestEmailCode();
  let finish!: (value: { error: null }) => void;
  mockSendOtp.mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Resend code' }));
  expect(screen.getByRole('button', { name: 'Sending code…' })).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'Verifying…' })).toBeNull();
  expect(screen.getByLabelText('Verification code')).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Change email' })).toBeDisabled();
  expect(
    screen.getByRole('button', { name: 'Back to password sign-in' }),
  ).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: 'Sending code…' }));
  expect(mockSendOtp).toHaveBeenCalledTimes(2);
  await act(async () => {
    finish({ error: null });
  });
  expect(
    screen.getByRole('button', { name: 'Verify and sign in' }),
  ).toBeEnabled();
});

it.each([
  [
    'server rejection',
    { error: { message: 'Too many requests. Please try again later.' } },
    'Too many requests. Please try again later.',
  ],
  [
    'missing server message',
    { error: {} },
    'Unable to send code. Please try again.',
  ],
  [
    'network failure',
    new Error('offline'),
    'Unable to connect. Check your connection and try again.',
  ],
] as const)(
  'keeps the email form available after an OTP request %s',
  async (_case, result, message) => {
    if (result instanceof Error) mockSendOtp.mockRejectedValueOnce(result);
    else mockSendOtp.mockResolvedValueOnce(result);
    await render(<AuthScreen />);
    await fireEvent.press(
      screen.getByRole('button', { name: 'Continue with email code' }),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Send code' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter your email address.',
    );
    expect(mockSendOtp).not.toHaveBeenCalled();
    await fireEvent.changeText(
      screen.getByLabelText('Email'),
      'person@example.com',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Send code' }));
    expect(screen.getByRole('alert')).toHaveTextContent(message);
    expect(screen.queryByLabelText('Verification code')).toBeNull();
    expect(screen.getByRole('button', { name: 'Send code' })).toBeEnabled();
    await fireEvent.press(screen.getByRole('button', { name: 'Send code' }));
    expect(screen.getByLabelText('Verification code')).toBeVisible();
    expect(screen.queryByRole('alert')).toBeNull();
  },
);

it.each([
  ['invalid code', { error: { message: 'Invalid OTP' } }, 'Invalid OTP'],
  ['expired code', { error: { message: 'OTP expired' } }, 'OTP expired'],
  [
    'exhausted attempts',
    { error: { message: 'Too many attempts' } },
    'Too many attempts',
  ],
  [
    'missing server message',
    { error: {} },
    'Authentication failed. Please try again.',
  ],
  [
    'network failure',
    new Error('offline'),
    'Unable to connect. Check your connection and try again.',
  ],
] as const)(
  'keeps protected content hidden after OTP verification %s and allows resend',
  async (_case, result, message) => {
    if (result instanceof Error) mockSignInOtp.mockRejectedValueOnce(result);
    else mockSignInOtp.mockResolvedValueOnce(result);
    await render(<AuthScreen />);
    await requestEmailCode();
    await fireEvent.changeText(
      screen.getByLabelText('Verification code'),
      '012345',
    );
    await fireEvent.press(
      screen.getByRole('button', { name: 'Verify and sign in' }),
    );
    expect(screen.getByRole('alert')).toHaveTextContent(message);
    expect(mockRefetch).not.toHaveBeenCalled();
    expect(me).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: 'Verify and sign in' }),
    ).toBeEnabled();
    await fireEvent.press(screen.getByRole('button', { name: 'Resend code' }));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByLabelText('Verification code')).toHaveDisplayValue('');
  },
);

it('disables duplicate code requests and verification while preserving the entered email', async () => {
  let finishRequest!: (value: { error: null }) => void;
  let finishVerification!: (value: { error: null }) => void;
  mockSendOtp.mockReturnValueOnce(
    new Promise((resolve) => {
      finishRequest = resolve;
    }),
  );
  mockSignInOtp.mockReturnValueOnce(
    new Promise((resolve) => {
      finishVerification = resolve;
    }),
  );
  await render(<AuthScreen />);
  await requestEmailCode();
  expect(screen.getByLabelText('Email')).toBeDisabled();
  expect(
    screen.getByRole('button', { name: 'Back to password sign-in' }),
  ).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: 'Sending code…' }));
  expect(mockSendOtp).toHaveBeenCalledTimes(1);
  await act(async () => {
    finishRequest({ error: null });
  });
  await fireEvent.changeText(
    screen.getByLabelText('Verification code'),
    '012345',
  );
  await fireEvent.press(
    screen.getByRole('button', { name: 'Verify and sign in' }),
  );
  expect(screen.getByRole('button', { name: 'Verifying…' })).toBeDisabled();
  expect(screen.getByLabelText('Verification code')).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Resend code' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Change email' })).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: 'Verifying…' }));
  expect(mockSignInOtp).toHaveBeenCalledTimes(1);
  await act(async () => {
    finishVerification({ error: null });
  });
  expect(mockSignInOtp).toHaveBeenCalledWith({
    email: 'person@example.com',
    otp: '012345',
  });
});

it('validates required fields before calling the client', async () => {
  await render(<AuthScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Complete all fields.');
  expect(mockSignIn).not.toHaveBeenCalled();
});

it('shows server authentication errors and does not transition to a profile', async () => {
  mockSignIn.mockResolvedValue({
    error: { message: 'Invalid email or password' },
  });
  await render(<AuthScreen />);
  await fillCredentials();
  await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Invalid email or password',
  );
  expect(mockRefetch).not.toHaveBeenCalled();
  expect(me).not.toHaveBeenCalled();
});

it('shows thrown network errors and allows retry', async () => {
  mockSignUp.mockRejectedValueOnce(new Error('offline'));
  await render(<AuthScreen />);
  await fireEvent.press(
    screen.getByRole('button', { name: 'New here? Create an account' }),
  );
  await fireEvent.changeText(screen.getByLabelText('Name'), 'Taylor');
  await fillCredentials();
  await fireEvent.press(screen.getByRole('button', { name: 'Create account' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Unable to connect. Check your connection and try again.',
  );
  expect(screen.getByRole('button', { name: 'Create account' })).toBeEnabled();
});

it('disables duplicate submission while authentication is pending', async () => {
  let finish!: (value: { error: null }) => void;
  mockSignIn.mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  await render(<AuthScreen />);
  await fillCredentials();
  await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
  expect(screen.getByRole('button', { name: 'Please wait…' })).toBeDisabled();
  expect(screen.getByLabelText('Email')).toBeDisabled();
  await act(async () => {
    finish({ error: null });
  });
});

it.each(['Taylor', ''])(
  'restores a validated session with profile name %p through the SDK with native cookies',
  async (name) => {
    jest.mocked(me).mockResolvedValueOnce({
      id: 'user-1',
      name,
      email: 'person@example.com',
      emailVerified: false,
    });
    mockSession = {
      session: { id: 'session-1', expiresAt: new Date(Date.now() + 3_600_000) },
      user: { id: 'user-1', name: 'Untrusted cached name' },
    };
    await render(<AuthScreen />);
    expect(await screen.findByText(name || 'Welcome')).toBeVisible();
    expect(screen.queryByText('Untrusted cached name')).toBeNull();
    expect(me).toHaveBeenCalledWith({
      baseUrl: 'https://api.example.com',
      headers: { Cookie: 'better-auth.session_token=test' },
      credentials: 'omit',
    });
    expect(screen.getByText('Email not verified')).toBeVisible();
  },
);

it('hides protected content and returns to sign-in when the server rejects a session', async () => {
  mockSession = {
    session: { id: 'revoked', expiresAt: new Date(Date.now() + 3_600_000) },
    user: { id: 'user-1', name: 'Taylor' },
  };
  jest.mocked(me).mockRejectedValueOnce(new ApiError(401, {}));
  await render(<AuthScreen />);
  expect(await screen.findByRole('header', { name: 'Sign in' })).toBeVisible();
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Your session expired. Please sign in again.',
  );
  expect(screen.queryByText('Taylor')).toBeNull();
  expect(mockRefetch).toHaveBeenCalled();
});

it('keeps profile network failures distinct from expired sessions and supports retry', async () => {
  mockSession = {
    session: { id: 'session-1', expiresAt: new Date(Date.now() + 3_600_000) },
    user: { id: 'user-1', name: 'Taylor' },
  };
  jest.mocked(me).mockRejectedValueOnce(new Error('offline'));
  await render(<AuthScreen />);
  await fireEvent.press(
    await screen.findByRole('button', { name: 'Retry profile' }),
  );
  expect(await screen.findByText('Taylor')).toBeVisible();
});

it('signs out and hides the profile even before the session hook updates', async () => {
  mockSession = {
    session: { id: 'session-1', expiresAt: new Date(Date.now() + 3_600_000) },
    user: { id: 'user-1', name: 'Taylor' },
  };
  await render(<AuthScreen />);
  await screen.findByText('Taylor');
  await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
  expect(mockSignOut).toHaveBeenCalled();
  expect(screen.queryByText('Taylor')).toBeNull();
  expect(screen.getByRole('header', { name: 'Sign in' })).toBeVisible();
});

it('does not expose a previously loaded profile when session revalidation fails', async () => {
  mockSession = {
    session: { id: 'session-1', expiresAt: new Date(Date.now() + 3_600_000) },
    user: { id: 'user-1', name: 'Taylor' },
  };
  const view = await render(<AuthScreen />);
  await screen.findByText('Taylor');
  mockSessionError = new Error('offline');
  await view.rerender(<AuthScreen />);
  expect(screen.queryByText('Taylor')).toBeNull();
  expect(screen.getByRole('button', { name: 'Retry session' })).toBeVisible();
});

it('keeps protected content hidden after a failed sign-out and offers retry', async () => {
  mockSession = {
    session: { id: 'session-1', expiresAt: new Date(Date.now() + 3_600_000) },
    user: { id: 'user-1', name: 'Taylor' },
  };
  mockSignOut.mockRejectedValueOnce(new Error('offline'));
  await render(<AuthScreen />);
  await screen.findByText('Taylor');
  await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
  expect(screen.queryByText('Taylor')).toBeNull();
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Sign-out could not be confirmed. Check your connection and retry.',
  );
  mockCookie.mockResolvedValue('');
  expect(screen.queryByLabelText('Password')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Retry sign out' }));
  expect(mockSignOut).toHaveBeenLastCalledWith({
    fetchOptions: { headers: { cookie: 'better-auth.session_token=test' } },
  });
  expect(screen.getByLabelText('Password')).toBeVisible();
});

it('loads the revalidated OTP session and blocks another email-code login until sign-out is confirmed with the original cookie', async () => {
  const view = await render(<AuthScreen />);
  await requestEmailCode();
  await fireEvent.changeText(
    screen.getByLabelText('Verification code'),
    '012345',
  );
  await fireEvent.press(
    screen.getByRole('button', { name: 'Verify and sign in' }),
  );
  mockSession = {
    session: { id: 'otp-session', expiresAt: new Date(Date.now() + 3_600_000) },
    user: { id: 'user-1', name: 'Cached profile' },
  };
  jest.mocked(me).mockResolvedValue({
    id: 'user-1',
    name: 'Taylor',
    email: 'person@example.com',
    emailVerified: true,
  });
  await view.rerender(<AuthScreen />);
  expect(await screen.findByText('Email verified')).toBeVisible();
  expect(screen.queryByText('Cached profile')).toBeNull();
  mockSignOut.mockResolvedValueOnce({ error: { message: 'offline' } });
  await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
  expect(screen.queryByText('Taylor')).toBeNull();
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Sign-out could not be confirmed. Please retry.',
  );
  mockSession = null;
  mockCookie.mockResolvedValue('');
  await view.rerender(<AuthScreen />);
  expect(
    screen.queryByRole('button', { name: 'Continue with email code' }),
  ).toBeNull();
  expect(screen.queryByLabelText('Password')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Retry sign out' }));
  expect(mockSignOut).toHaveBeenLastCalledWith({
    fetchOptions: { headers: { cookie: 'better-auth.session_token=test' } },
  });
  expect(
    screen.getByRole('button', { name: 'Continue with email code' }),
  ).toBeVisible();
});

it('hides an expired session without waiting for a focus or network change', async () => {
  jest.useFakeTimers();
  try {
    mockSession = {
      session: { id: 'session-1', expiresAt: new Date(Date.now() + 5000) },
      user: { id: 'user-1', name: 'Taylor' },
    };
    await render(<AuthScreen />);
    await screen.findByText('Taylor');
    await act(async () => jest.advanceTimersByTime(5001));
    expect(screen.queryByText('Taylor')).toBeNull();
    expect(screen.getByRole('header', { name: 'Sign in' })).toBeVisible();
  } finally {
    jest.useRealTimers();
  }
});

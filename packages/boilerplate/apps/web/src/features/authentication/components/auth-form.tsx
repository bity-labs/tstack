import { useState, type FormEvent } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { authClient } from '../../../lib/auth-client';
import { Button } from '../../../components/ui/button';

export function AuthForm() {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [method, setMethod] = useState<'password' | 'email' | 'code'>(
    'password',
  );
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function sendCode() {
    if (pending) return;
    setPending(true);
    setError('');
    setNotice('');
    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email: email.trim(),
        type: 'sign-in',
      });
      if (result.error) {
        setError('Unable to send a code. Check your email or try again later.');
        return;
      }
      setEmail(email.trim());
      setOtp('');
      setMethod('code');
      if (method === 'code') {
        setNotice('A new code has been sent. Use the latest code.');
      }
    } catch {
      setError('Unable to reach the server. Please try again.');
    } finally {
      setPending(false);
    }
  }

  async function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (method === 'email') {
      await sendCode();
      return;
    }
    setPending(true);
    setError('');
    setNotice('');
    try {
      const result = await authClient.signIn.emailOtp({ email, otp });
      if (result.error) {
        setError(
          'Unable to verify this code. Try again or request a new code.',
        );
        return;
      }
      await navigate({ to: '/account' });
    } catch {
      setError('Unable to reach the server. Please try again.');
    } finally {
      setPending(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const email = String(values.get('email')).trim();
    const password = String(values.get('password'));
    setPending(true);
    setError('');
    try {
      const result = creating
        ? await authClient.signUp.email({
            name: String(values.get('name')).trim(),
            email,
            password,
          })
        : await authClient.signIn.email({ email, password });
      if (result.error) {
        setError(
          creating
            ? 'Unable to create your account. Check your details or try signing in.'
            : 'Unable to sign in. Check your email and password.',
        );
        return;
      }
      await navigate({ to: '/account' });
    } catch {
      setError('Unable to reach the server. Please try again.');
    } finally {
      setPending(false);
    }
  }

  if (method !== 'password') {
    return (
      <section className="auth-panel" aria-label="Account access">
        <h1>
          {method === 'code' ? 'Check your email.' : 'Continue with email.'}
        </h1>
        <p className="intro">
          {method === 'code'
            ? `Enter the code sent to ${email}.`
            : 'Sign in or create an account with an email code. No password needed.'}
        </p>
        <form onSubmit={submitCode} className="auth-form">
          <fieldset disabled={pending}>
            {method === 'email' ? (
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>
            ) : (
              <label>
                Email code
                <input
                  name="otp"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  aria-describedby="email-code-hint"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  required
                />
              </label>
            )}
            {method === 'code' && (
              <p id="email-code-hint" className="auth-hint">
                Use the latest 6-digit code. It expires in 5 minutes.
              </p>
            )}
            {error && (
              <p role="alert" className="auth-error">
                {error}
              </p>
            )}
            {notice && (
              <p role="status" className="auth-hint">
                {notice}
              </p>
            )}
            <Button type="submit">
              {pending
                ? 'Please wait…'
                : method === 'email'
                  ? 'Send code'
                  : 'Verify and continue'}
            </Button>
            {method === 'code' && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void sendCode()}
                >
                  Resend code
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setMethod('email');
                    setOtp('');
                    setError('');
                    setNotice('');
                  }}
                >
                  Change email
                </Button>
              </>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setMethod('password');
                setOtp('');
                setError('');
                setNotice('');
              }}
            >
              Back to password
            </Button>
          </fieldset>
        </form>
      </section>
    );
  }

  return (
    <section className="auth-panel" aria-label="Account access">
      <h1>{creating ? 'Create your account.' : 'Welcome back.'}</h1>
      <p className="intro">
        {creating
          ? 'One account for the web and mobile app.'
          : 'Sign in to your TStack account.'}
      </p>
      <form onSubmit={submit} className="auth-form">
        <fieldset disabled={pending}>
          {creating && (
            <label>
              Name
              <input name="name" autoComplete="name" required maxLength={100} />
            </label>
          )}
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete={creating ? 'new-password' : 'current-password'}
              minLength={creating ? 12 : 1}
              maxLength={128}
              required
            />
          </label>
          {creating && <p className="auth-hint">Use at least 12 characters.</p>}
          {error && (
            <p role="alert" className="auth-error">
              {error}
            </p>
          )}
          <Button type="submit">
            {pending ? 'Please wait…' : creating ? 'Create account' : 'Sign in'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setMethod('email');
              setError('');
            }}
          >
            Use an email code
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setCreating(!creating);
              setError('');
            }}
          >
            {creating
              ? 'Already have an account? Sign in'
              : 'New here? Create an account'}
          </Button>
        </fieldset>
      </form>
    </section>
  );
}

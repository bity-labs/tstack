import { useEffect, useState } from 'react';
import { Link, useNavigate, useRouter } from '@tanstack/react-router';
import type { UserEncoded } from '@tstack/sdk';
import { authClient } from '../../../lib/auth-client';
import { Button } from '../../../components/ui/button';

export function AccountScreen({ user }: { user: UserEncoded }) {
  const session = authClient.useSession();
  const navigate = useNavigate();
  const router = useRouter();
  const [checkedAt, setCheckedAt] = useState(Date.now);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const expiresAt = session.data?.session.expiresAt.getTime();
  const expired = expiresAt !== undefined && expiresAt <= checkedAt;

  useEffect(() => {
    if (expiresAt === undefined) return;
    const timer = setTimeout(
      () => {
        setCheckedAt(Date.now());
        void session.refetch();
      },
      Math.max(0, expiresAt - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [expiresAt, session.refetch]);

  useEffect(() => {
    if (!session.isPending && !session.data && !session.error)
      void router.invalidate();
  }, [session.isPending, session.data, session.error, router]);

  useEffect(() => {
    if (session.data && session.data.user.id !== user.id && !session.error)
      void router.invalidate();
  }, [session.data, session.error, user.id, router]);

  async function signOut() {
    setPending(true);
    setError('');
    try {
      const result = await authClient.signOut();
      if (result.error) {
        setError('Unable to sign out. Please try again.');
        return;
      }
      await navigate({ to: '/login', replace: true });
    } catch {
      setError('Unable to reach the server. Please try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="workspace">
      <header className="topbar">
        <Link className="wordmark" to="/">
          tstack<span>/</span>
        </Link>
        <span className="environment">Your account</span>
      </header>
      <main>
        <p className="eyebrow">YOUR ACCOUNT</p>
        {session.data?.user.id === user.id && !session.error && !expired ? (
          <>
            <h1>{user.name ? `Welcome, ${user.name}.` : 'Welcome.'}</h1>
            <p className="intro">{user.email}</p>
          </>
        ) : (
          <h1>Verifying your session…</h1>
        )}
        <div className="status-card">
          <h3>Account access</h3>
          <p>
            This page was verified by the API through the generated SDK. Signing
            out here does not sign out your other devices.
          </p>
          {(error || session.error) && (
            <p role="alert" className="auth-error">
              {error || 'Unable to refresh your session. Please try again.'}
            </p>
          )}
          <Button disabled={pending} onClick={signOut}>
            {pending ? 'Signing out…' : 'Sign out'}
          </Button>
        </div>
      </main>
    </div>
  );
}

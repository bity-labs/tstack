import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { getCurrentUser } from '../lib/session.functions';
import { Button } from '../components/ui/button';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async () => {
    const user = await getCurrentUser();
    if (!user) throw redirect({ to: '/login' });
    return { user };
  },
  component: Outlet,
  errorComponent: () => (
    <div className="workspace">
      <main>
        <h1>Unable to load your account.</h1>
        <p role="alert">Unable to verify your session. Please try again.</p>
        <Button onClick={() => window.location.reload()}>Try again</Button>
      </main>
    </div>
  ),
});

import { createFileRoute, Link } from '@tanstack/react-router';
import { AuthForm } from '../features/authentication';

export const Route = createFileRoute('/login')({ component: Login });

function Login() {
  return (
    <div className="workspace">
      <header className="topbar">
        <Link className="wordmark" to="/">
          tstack<span>/</span>
        </Link>
      </header>
      <main>
        <AuthForm />
      </main>
    </div>
  );
}

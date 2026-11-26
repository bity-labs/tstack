import { createFileRoute, Link } from '@tanstack/react-router';
import { ApiStatus } from '../features/system';

export const Route = createFileRoute('/')({ component: Home });

function Home() {
  return (
    <div className="workspace">
      <header className="topbar">
        <a className="wordmark" href="/">
          tstack<span>/</span>
        </a>
        <Link to="/account" className="environment">
          Your account →
        </Link>
      </header>
      <main>
        <p className="eyebrow">YOUR STARTING POINT</p>
        <h1>
          A clean start.
          <br />
          <span>Ready to build.</span>
        </h1>
        <p className="intro">
          Your application, connected through one typed API contract. No product
          assumptions. Just the foundation.
        </p>
        <ApiStatus />
        <div className="foundation">
          <span>TanStack Start</span>
          <span>Effect</span>
          <span>SQLite</span>
          <span>Orval SDK</span>
        </div>
      </main>
      <footer>One workspace. Independent applications.</footer>
    </div>
  );
}

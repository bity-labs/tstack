import { useHealth } from '@tstack/sdk/react';
import { Button } from '../../../components/ui/button';

export function ApiStatus() {
  const query = useHealth({ query: { retry: false, staleTime: 30_000 } });
  return (
    <section className="status-card" aria-labelledby="api-heading">
      <div className="status-card-heading">
        <h2 id="api-heading">API connection</h2>
        <span
          className={`status-dot ${query.isSuccess ? 'connected' : ''}`}
          aria-hidden="true"
        />
      </div>
      <div aria-live="polite" role="status">
        {query.isPending ? (
          <>
            <h3>Checking your connection…</h3>
            <p>Calling the generated SDK.</p>
          </>
        ) : query.isError ? (
          <>
            <h3>API unavailable</h3>
            <p>The API could not be reached. Start the API and try again.</p>
          </>
        ) : (
          <>
            <h3>All systems ready</h3>
            <p>Effect API connected. Storage: {query.data.storage}.</p>
          </>
        )}
      </div>
      <Button
        variant="outline"
        onClick={() => void query.refetch()}
        disabled={query.isFetching}
      >
        {query.isFetching ? 'Checking…' : 'Check again'}
      </Button>
    </section>
  );
}

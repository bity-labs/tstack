import { createFileRoute } from '@tanstack/react-router';
import { AccountScreen } from '../features/account';

export const Route = createFileRoute('/_authenticated/account')({
  loader: ({ context }) => context.user,
  component: Account,
});

function Account() {
  return <AccountScreen user={Route.useLoaderData()} />;
}

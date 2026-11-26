import { render, screen } from '@testing-library/react-native';

import { Welcome } from './welcome';

describe('Welcome', () => {
  it('renders the initial screen with an accessible heading', async () => {
    await render(<Welcome />);

    expect(
      screen.getByRole('header', { name: 'Welcome to TStack' }),
    ).toBeVisible();
    expect(
      screen.getByText(
        'Your mobile workspace is ready. Build something useful.',
      ),
    ).toBeVisible();
  });

  it('renders supplied copy rather than the default copy', async () => {
    await render(<Welcome title="A new idea" description="Start here." />);

    expect(screen.getByRole('header', { name: 'A new idea' })).toBeVisible();
    expect(screen.getByText('Start here.')).toBeVisible();
    expect(screen.queryByText('Welcome to TStack')).toBeNull();
  });
});

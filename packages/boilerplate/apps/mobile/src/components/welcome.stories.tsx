import type { Meta, StoryObj } from '@storybook/react-native';

import { Welcome } from './welcome';

const meta = {
  title: 'Welcome',
  component: Welcome,
  args: {
    title: 'Welcome to TStack',
    description: 'Your mobile workspace is ready. Build something useful.',
  },
} satisfies Meta<typeof Welcome>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongContent: Story = {
  args: {
    title: 'A workspace for your next idea',
    description:
      'Use this story to check how longer English content wraps on smaller screens and with larger accessibility text settings.',
  },
};

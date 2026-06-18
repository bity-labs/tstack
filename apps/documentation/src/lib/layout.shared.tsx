import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="flex items-center gap-2 font-medium">
          <span aria-hidden="true" className="text-lg">
            ◇
          </span>
          TStack
        </span>
      ),
      url: '/',
    },
    links: [
      {
        text: 'GitHub',
        url: 'https://github.com/bity-labs/tstack',
      },
    ],
    githubUrl: 'https://github.com/bity-labs/tstack',
  };
}

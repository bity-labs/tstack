import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import Image from 'next/image';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="flex items-center gap-2 font-medium">
          <Image
            src="/logo.png"
            alt="TStack"
            width={120}
            height={32}
            className="h-8 w-auto"
          />
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

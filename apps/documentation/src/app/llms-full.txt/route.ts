import { getLLMText, source } from '@/lib/source';

export const revalidate = false;

export async function GET() {
  const pages = source.getPages();
  const rendered = await Promise.all(pages.map(getLLMText));

  return new Response(rendered.join('\n\n'), {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
    },
  });
}

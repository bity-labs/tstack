export function buildReplacements(options: {
  slug: string;
  displayName: string;
}): Map<string, string> {
  const { slug, displayName } = options;
  return new Map([
    ["myapp", slug],
    ["MyApp", displayName],
    ["@tstack/boilerplate", slug],
    [`myapp-dev-password`, `${slug}-dev-password`],
    [`/myapp`, `/${slug}`],
  ]);
}

export function replacePlaceholders(text: string, replacements: Map<string, string>): string {
  let result = text;
  for (const [from, to] of replacements) {
    result = result.split(from).join(to);
  }
  return result;
}

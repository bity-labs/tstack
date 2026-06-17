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
  // Sort by length descending so longer keys replace before shorter ones,
  // preventing partial matches (e.g. "myapp-dev-password" before "myapp").
  const sorted = Array.from(replacements.entries()).sort((a, b) => b[0].length - a[0].length);
  for (const [from, to] of sorted) {
    // Use word-boundary regex for simple identifiers to avoid matching
    // inside larger words (e.g. "myapp" inside "myapple").
    if (/^[a-zA-Z0-9_]+$/.test(from)) {
      const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      result = result.replace(new RegExp(`\\b${escaped}\\b`, "g"), to);
    } else {
      result = result.split(from).join(to);
    }
  }
  return result;
}

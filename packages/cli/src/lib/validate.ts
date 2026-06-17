export function validateProjectSlug(slug: string): string | null {
  if (slug.length === 0) {
    return "Project slug is required.";
  }

  if (!/^[a-z]/.test(slug)) {
    return "Slug must start with a letter.";
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    return "Slug must be lowercase alphanumeric with hyphens only.";
  }

  return null;
}

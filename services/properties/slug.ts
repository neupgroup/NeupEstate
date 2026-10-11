/** Builds the canonical public identifier for a property. */
export function getPropertySlugId(property: { slug?: string | null; id: string }): string {
  return `${property.slug?.trim() || property.id}--${property.id}`;
}

/** Splits the final slug/id separator, leaving any earlier `--` inside the slug. */
export function parsePropertySlugId(value: string): { slug: string; id: string } | null {
  const separator = value.lastIndexOf('--');
  if (separator <= 0 || separator + 2 >= value.length) return null;

  return {
    slug: value.slice(0, separator),
    id: value.slice(separator + 2),
  };
}

export function getHttpStatusFromError(error: unknown): string | null {
  const message = error instanceof Error ? error.message : String(error);
  const match = message.match(/status:\s*(\d{3})/i);
  return match ? match[1] : null;
}

export function isLoggedStatus(status: string | null | undefined): boolean {
  return status === 'logged';
}

export function buildDefaultTitle(url: string, title?: string | null): string {
  return title?.trim() || new URL(url).pathname.split('/').filter(Boolean).join(' / ') || 'Listing';
}

export function getFriendlyAiError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (
    message.includes('RESOURCE_EXHAUSTED') ||
    message.includes('Too Many Requests') ||
    message.includes('quota') ||
    message.includes('rate limit') ||
    message.includes('429')
  ) {
    return 'AI quota exceeded. Please try again later.';
  }

  return message || 'Failed to extract listing.';
}


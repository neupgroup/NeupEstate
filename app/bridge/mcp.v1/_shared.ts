import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/* Formats successful tool data using an optional template selected by its tool. */
export function mcpSuccess(value: Record<string, unknown>, format?: string, formatTemplates?: Record<string, string>) {
  const template = format === undefined ? undefined : formatTemplates?.[format];
  if (template) {
    const text = template.replace('{payload}', JSON.stringify(value));
    return { content: [{ type: 'text' as const, text }], structuredContent: value };
  }

  const response = format === undefined ? value : { ...value, format };
  return { content: [{ type: 'text' as const, text: JSON.stringify(response) }], structuredContent: response };
}

/* Reads the optional public response format from the MCP request URL. */
export function getMcpFormat(request: Request): string | undefined {
  return new URL(request.url).searchParams.get('format') ?? undefined;
}

/* Formats a tool error as MCP content. */
export function mcpError(error: unknown, fallback = 'The MCP operation failed.') {
  const message = typeof error === 'string' ? error : error instanceof Error ? error.message : fallback;
  return { content: [{ type: 'text' as const, text: message }], isError: true as const };
}

/* Adds a tool function type anchor for domain registration modules. */
export type McpToolServer = McpServer;

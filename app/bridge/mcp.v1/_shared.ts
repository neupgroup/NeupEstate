import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/* Formats successful tool data as MCP text and structured content. */
export function mcpSuccess(value: Record<string, unknown>) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value) }], structuredContent: value };
}

/* Formats a tool error as MCP content. */
export function mcpError(error: unknown, fallback = 'The MCP operation failed.') {
  const message = typeof error === 'string' ? error : error instanceof Error ? error.message : fallback;
  return { content: [{ type: 'text' as const, text: message }], isError: true as const };
}

/* Adds a tool function type anchor for domain registration modules. */
export type McpToolServer = McpServer;

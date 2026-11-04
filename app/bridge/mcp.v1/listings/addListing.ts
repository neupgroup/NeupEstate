import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerListingCreateTool } from '../../listings/create';

/* Registers the shared property creation tool from the bridge property module. */
export function registerAddListingTool(server: McpServer, actorAccountId: string, format?: string): void {
  registerListingCreateTool(server, actorAccountId, format);
}

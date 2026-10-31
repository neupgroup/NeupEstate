import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerPropertyCreateTool } from '../../properties/create';

/* Registers the shared property creation tool from the bridge property module. */
export function registerAddPropertyTool(server: McpServer, actorAccountId: string): void {
  registerPropertyCreateTool(server, actorAccountId);
}

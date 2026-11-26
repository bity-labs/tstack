import { McpServer } from '@modelcontextprotocol/server';
import { registerApiHealthTool } from './tools/api-health.tool.js';

export function createMcpServer(baseUrl: string) {
  const server = new McpServer({ name: 'tstack', version: '0.0.0' });
  registerApiHealthTool(server, baseUrl);
  return server;
}

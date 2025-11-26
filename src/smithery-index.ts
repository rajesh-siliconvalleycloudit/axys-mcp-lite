import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from "@modelcontextprotocol/sdk/types.js";
import { z } from 'zod';
import { GptMcpClient } from './axys-client.js';
import { GptSearchRequest } from './types.js';

// Configuration schema for Smithery
export const configSchema = z.object({
  AXYS_API_HOST: z.string().describe("AXYS API host URL (e.g., https://api.axys.com)"),
  MCP_KEY: z.string().describe("MCP API key for AI-powered search")
});

export type Config = z.infer<typeof configSchema>;

// Define MCP AI tools
const TOOLS = [
  {
    name: "ai_search_structured",
    description: "Search using AI with structured search - returns structured data from configured data sources. This uses natural language understanding to query structured databases and returns organized, tabular results. Best for questions that require querying relational data, structured records, or when you need precise data extraction from databases.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Natural language query to search for (e.g., 'how to install AXYS', 'find all users in engineering department'). This is mostly used for transaction, details, users, people, sessions etc"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "ai_search_unstructured",
    description: "Search using AI with unstructured search - searches documents, videos, and files using natural language. This tool performs semantic search across unstructured content like PDFs, Word documents, videos, images, and other file types. It uses AI to understand context and meaning, making it ideal for finding information in documentation, presentations, or media files. Can optionally return just file references or full content extracts.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Natural language query describing what you're looking for in documents or media (e.g., 'deployment instructions', 'architecture diagrams')"
        },
        searchIndices: {
          type: "string",
          description: "Optional: Specific index to search (e.g., 'video', 'document', 'pdf'). Leave empty to search across all unstructured content types."
        },
        fileOnly: {
          type: "boolean",
          description: "Set to true to return only file metadata and references without extracting content. Use this for faster searches when you only need to know which files match, not their full content.",
          default: false
        }
      },
      required: ["query"]
    }
  },
  {
    name: "validate_connection",
    description: "Validate the connection to MCP API and verify that the MCP_KEY is properly configured. Use this to troubleshoot connectivity issues or confirm the API credentials are working before attempting AI-powered searches.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  }
];

// Helper function to log tool calls
function logToolCall(toolName: string, args: any) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] Tool called: ${toolName}`);
  console.error(`[${timestamp}] Arguments:`, JSON.stringify(args, null, 2));
}

// Helper function to log tool results
function logToolResult(toolName: string, success: boolean, error?: string) {
  const timestamp = new Date().toISOString();
  if (success) {
    console.error(`[${timestamp}] Tool ${toolName} completed successfully`);
  } else {
    console.error(`[${timestamp}] Tool ${toolName} failed: ${error}`);
  }
}

// Export the createServer function required by Smithery
export default function createServer(config: Config) {
  // Validate required configuration
  if (!config.AXYS_API_HOST || !config.MCP_KEY) {
    throw new Error("Missing required configuration: AXYS_API_HOST and MCP_KEY are required");
  }

  // Initialize MCP client
  const mcpClient = new GptMcpClient({
    host: config.AXYS_API_HOST,
    mcpKey: config.MCP_KEY
  });

  // Create the MCP server instance
  const server = new Server(
    {
      name: "axys-mcp-lite",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Handle tool listing
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] Client requested tool list`);
    return {
      tools: TOOLS,
    };
  });

  // Handle tool execution
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    // Log the incoming tool call
    logToolCall(name, args);

    try {
      switch (name) {
        case "ai_search_structured": {
          const query = args?.query as string;
          if (!query) {
            throw new McpError(
              ErrorCode.InvalidParams,
              "query is required"
            );
          }

          const searchRequest: GptSearchRequest = {
            query,
            searchType: 'structured'
          };

          const result = await mcpClient.aiSearch(searchRequest);
          logToolResult(name, true);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2)
              }
            ]
          };
        }

        case "ai_search_unstructured": {
          const query = args?.query as string;
          if (!query) {
            throw new McpError(
              ErrorCode.InvalidParams,
              "query is required"
            );
          }

          const searchRequest: GptSearchRequest = {
            query,
            searchType: 'unstructured'
          };

          if (args?.searchIndices) {
            searchRequest.searchIndices = args.searchIndices as string;
          }

          if (args?.fileOnly !== undefined) {
            searchRequest.fileOnly = args.fileOnly as boolean;
          }

          const result = await mcpClient.aiSearch(searchRequest);
          logToolResult(name, true);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2)
              }
            ]
          };
        }

        case "validate_connection": {
          const isValid = await mcpClient.validateConnection();
          logToolResult(name, true);
          return {
            content: [
              {
                type: "text",
                text: isValid
                  ? "✓ Connection to MCP API is valid and working"
                  : "✗ Failed to connect to MCP API. Please check your configuration."
              }
            ]
          };
        }

        default:
          logToolResult(name, false, `Unknown tool: ${name}`);
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${name}`
          );
      }
    } catch (error) {
      // Log failed execution
      const errorMessage = error instanceof Error ? error.message : String(error);
      logToolResult(name, false, errorMessage);

      if (error instanceof McpError) {
        throw error;
      }

      // Handle axios errors or other errors
      throw new McpError(
        ErrorCode.InternalError,
        `Error executing ${name}: ${errorMessage}`
      );
    }
  });

  return server;
}

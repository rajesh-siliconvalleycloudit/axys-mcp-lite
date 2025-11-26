import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { CallToolRequestSchema, ListToolsRequestSchema, ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import express from 'express';
import { randomUUID } from 'node:crypto';
import { GptMcpClient } from './axys-client.js';
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
function logToolCall(toolName, args) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] Tool called: ${toolName}`);
    console.error(`[${timestamp}] Arguments:`, JSON.stringify(args, null, 2));
}
// Helper function to log tool results
function logToolResult(toolName, success, error) {
    const timestamp = new Date().toISOString();
    if (success) {
        console.error(`[${timestamp}] Tool ${toolName} completed successfully`);
    }
    else {
        console.error(`[${timestamp}] Tool ${toolName} failed: ${error}`);
    }
}
// Create the MCP server with handlers
function createMcpServer(mcpClient) {
    const server = new Server({
        name: "axys-mcp-lite",
        version: "1.0.0",
    }, {
        capabilities: {
            tools: {},
        },
    });
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
                    const query = args?.query;
                    if (!query) {
                        throw new McpError(ErrorCode.InvalidParams, "query is required");
                    }
                    const searchRequest = {
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
                    const query = args?.query;
                    if (!query) {
                        throw new McpError(ErrorCode.InvalidParams, "query is required");
                    }
                    const searchRequest = {
                        query,
                        searchType: 'unstructured'
                    };
                    if (args?.searchIndices) {
                        searchRequest.searchIndices = args.searchIndices;
                    }
                    if (args?.fileOnly !== undefined) {
                        searchRequest.fileOnly = args.fileOnly;
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
                    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
            }
        }
        catch (error) {
            // Log failed execution
            const errorMessage = error instanceof Error ? error.message : String(error);
            logToolResult(name, false, errorMessage);
            if (error instanceof McpError) {
                throw error;
            }
            // Handle axios errors or other errors
            throw new McpError(ErrorCode.InternalError, `Error executing ${name}: ${errorMessage}`);
        }
    });
    return server;
}
// Main function to start the HTTP server
async function main() {
    const API_HOST = process.env.AXYS_API_HOST;
    const MCP_KEY = process.env.MCP_KEY;
    const PORT = parseInt(process.env.PORT || '8000', 10);
    if (!API_HOST || !MCP_KEY) {
        console.error("Error: Missing required environment variables AXYS_API_HOST or MCP_KEY");
        process.exit(1);
    }
    // Initialize MCP client
    const mcpClient = new GptMcpClient({
        host: API_HOST,
        mcpKey: MCP_KEY
    });
    // Validate MCP connection
    console.error("Validating MCP API connection...");
    const isConnected = await mcpClient.validateConnection();
    if (!isConnected) {
        console.error("Warning: Could not validate MCP API connection. Please check your MCP_KEY.");
    }
    else {
        console.error("Successfully connected to MCP API");
    }
    const app = express();
    app.use(express.json());
    // Store active transports by session ID
    const transports = {};
    // Health check endpoint
    app.get('/health', (_req, res) => {
        res.json({ status: 'ok' });
    });
    // MCP endpoint - handles POST requests
    app.post('/mcp', async (req, res) => {
        const sessionId = req.headers['mcp-session-id'];
        console.error(`Received MCP POST request, session: ${sessionId || 'new'}`);
        try {
            let transport;
            if (sessionId && transports[sessionId]) {
                // Reuse existing transport
                transport = transports[sessionId];
            }
            else if (!sessionId && isInitializeRequest(req.body)) {
                // New initialization request - create new transport
                transport = new StreamableHTTPServerTransport({
                    sessionIdGenerator: () => randomUUID(),
                    onsessioninitialized: (newSessionId) => {
                        console.error(`Session initialized: ${newSessionId}`);
                        transports[newSessionId] = transport;
                    }
                });
                // Clean up on close
                transport.onclose = () => {
                    const sid = transport.sessionId;
                    if (sid && transports[sid]) {
                        console.error(`Transport closed for session ${sid}`);
                        delete transports[sid];
                    }
                };
                // Connect transport to MCP server
                const server = createMcpServer(mcpClient);
                await server.connect(transport);
            }
            else {
                // Invalid request
                res.status(400).json({
                    jsonrpc: '2.0',
                    error: {
                        code: -32000,
                        message: 'Bad Request: No valid session ID provided'
                    },
                    id: null
                });
                return;
            }
            // Handle the request
            await transport.handleRequest(req, res, req.body);
        }
        catch (error) {
            console.error('Error handling MCP request:', error);
            if (!res.headersSent) {
                res.status(500).json({
                    jsonrpc: '2.0',
                    error: {
                        code: -32603,
                        message: 'Internal server error'
                    },
                    id: null
                });
            }
        }
    });
    // Handle GET requests for SSE streams
    app.get('/mcp', async (req, res) => {
        const sessionId = req.headers['mcp-session-id'];
        if (!sessionId || !transports[sessionId]) {
            res.status(400).send('Invalid or missing session ID');
            return;
        }
        console.error(`SSE stream request for session: ${sessionId}`);
        const transport = transports[sessionId];
        await transport.handleRequest(req, res);
    });
    // Handle DELETE requests for session termination
    app.delete('/mcp', async (req, res) => {
        const sessionId = req.headers['mcp-session-id'];
        if (!sessionId || !transports[sessionId]) {
            res.status(400).send('Invalid or missing session ID');
            return;
        }
        console.error(`Session termination request for: ${sessionId}`);
        const transport = transports[sessionId];
        await transport.handleRequest(req, res);
    });
    app.listen(PORT, '0.0.0.0', () => {
        console.error(`MCP Server is running on HTTP port ${PORT}`);
        console.error(`Listening on 0.0.0.0:${PORT}`);
        console.error(`Connected to: ${API_HOST}`);
        console.error(`Total tools available: ${TOOLS.length}`);
        console.error(`MCP endpoint: http://0.0.0.0:${PORT}/mcp`);
    });
    // Handle server shutdown
    process.on('SIGINT', async () => {
        console.error('Shutting down server...');
        for (const sessionId in transports) {
            try {
                await transports[sessionId].close();
                delete transports[sessionId];
            }
            catch (error) {
                console.error(`Error closing transport for session ${sessionId}:`, error);
            }
        }
        process.exit(0);
    });
}
main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
//# sourceMappingURL=smithery-index.js.map
#!/usr/bin/env node
import 'dotenv/config';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { CallToolRequestSchema, ListToolsRequestSchema, ErrorCode, McpError, isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import express from 'express';
import { randomUUID } from 'node:crypto';
import { GptMcpClient } from './axys-client.js';
// Default API host - used when not provided or invalid
const DEFAULT_API_HOST = 'https://directory.axys.ai';
// Check if running in stdio mode (for Smithery)
// Smithery sets this when using commandFunction, or detect if stdin is not a TTY
const STDIO_MODE = process.env.MCP_TRANSPORT === 'stdio' ||
    (process.env.MCP_KEY && !process.stdin.isTTY && !process.env.PORT);
// Check if a value is a valid URL (not a dummy placeholder like "string")
function isValidUrl(url) {
    if (!url)
        return false;
    try {
        new URL(url);
        return url.startsWith('http://') || url.startsWith('https://');
    }
    catch {
        return false;
    }
}
// Store MCP clients by config hash to reuse connections
const mcpClients = new Map();
// Default MCP client (from env vars, for local development)
let defaultMcpClient = null;
// Helper to get or create MCP client for a config
function getMcpClient(config) {
    // If config provided (from Smithery query param), use it
    if (config && config.MCP_KEY) {
        // Use default API host if the provided one is invalid (e.g., "string" from Smithery scanner)
        const apiHost = isValidUrl(config.AXYS_API_HOST) ? config.AXYS_API_HOST : DEFAULT_API_HOST;
        const configKey = `${apiHost}:${config.MCP_KEY}`;
        if (!mcpClients.has(configKey)) {
            console.error(`Creating new MCP client for config (host: ${apiHost})`);
            mcpClients.set(configKey, new GptMcpClient({
                host: apiHost,
                mcpKey: config.MCP_KEY
            }));
        }
        return mcpClients.get(configKey);
    }
    // Fall back to default client (from env vars)
    return defaultMcpClient;
}
// Parse config from query parameters (Smithery passes config as URL params)
function parseConfigFromQuery(req) {
    // Log all query params for debugging
    console.error(`Query params received: ${JSON.stringify(req.query)}`);
    // Method 1: Direct query params (Smithery HTTP format)
    // e.g., ?AXYS_API_HOST=xxx&MCP_KEY=yyy
    if (req.query.MCP_KEY || req.query.AXYS_API_HOST) {
        const config = {
            AXYS_API_HOST: req.query.AXYS_API_HOST,
            MCP_KEY: req.query.MCP_KEY
        };
        console.error(`Parsed config from direct query params: AXYS_API_HOST=${config.AXYS_API_HOST}, MCP_KEY=${config.MCP_KEY ? '[SET]' : '[NOT SET]'}`);
        return config;
    }
    // Method 2: JSON config param (fallback)
    // e.g., ?config={"AXYS_API_HOST":"xxx","MCP_KEY":"yyy"}
    const configParam = req.query.config;
    if (configParam && typeof configParam === 'string') {
        try {
            const decoded = decodeURIComponent(configParam);
            const config = JSON.parse(decoded);
            console.error(`Parsed config from JSON query param: AXYS_API_HOST=${config.AXYS_API_HOST}, MCP_KEY=${config.MCP_KEY ? '[SET]' : '[NOT SET]'}`);
            return config;
        }
        catch (e) {
            console.error(`Failed to parse JSON config from query: ${e}`);
        }
    }
    return undefined;
}
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
function createMcpServer(config) {
    // Get the MCP client for this config
    const mcpClient = getMcpClient(config);
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
        // Check if client is initialized
        if (!mcpClient && name !== 'validate_connection') {
            return {
                content: [
                    {
                        type: "text",
                        text: "Error: MCP client not initialized. Please check MCP_KEY configuration."
                    }
                ]
            };
        }
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
                    if (!mcpClient) {
                        logToolResult(name, false, "MCP client not initialized");
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: "✗ MCP client not initialized. Please check MCP_KEY configuration."
                                }
                            ]
                        };
                    }
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
// Start server in stdio mode (for Smithery)
async function startStdioServer() {
    const envApiHost = process.env.AXYS_API_HOST;
    // Use default if env var is not a valid URL (e.g., "string" from Smithery scanner)
    const API_HOST = isValidUrl(envApiHost) ? envApiHost : DEFAULT_API_HOST;
    const MCP_KEY = process.env.MCP_KEY;
    console.error(`Starting MCP Server in STDIO mode...`);
    console.error(`API_HOST: ${API_HOST} (env was: ${envApiHost})`);
    console.error(`MCP_KEY: ${MCP_KEY ? '[SET]' : '[NOT SET]'}`);
    if (!MCP_KEY) {
        console.error("Error: MCP_KEY environment variable is required");
        process.exit(1);
    }
    // Initialize MCP client from env vars (passed by Smithery commandFunction)
    defaultMcpClient = new GptMcpClient({
        host: API_HOST,
        mcpKey: MCP_KEY
    });
    // Validate connection (don't fail if it doesn't work - might be dummy credentials from scanner)
    console.error("Validating MCP API connection...");
    try {
        const isConnected = await defaultMcpClient.validateConnection();
        if (!isConnected) {
            console.error("Warning: Could not validate MCP API connection.");
        }
        else {
            console.error("Successfully connected to MCP API");
        }
    }
    catch (error) {
        console.error("Warning: Connection validation failed:", error);
    }
    // Create server and connect via stdio
    const server = createMcpServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MCP Server running on stdio");
}
// Start server in HTTP mode
async function startHttpServer() {
    const envApiHost = process.env.AXYS_API_HOST;
    // Use default if env var is not a valid URL (e.g., "string" from Smithery scanner)
    const API_HOST = isValidUrl(envApiHost) ? envApiHost : DEFAULT_API_HOST;
    const MCP_KEY = process.env.MCP_KEY || '';
    const PORT = parseInt(process.env.PORT || '8000', 10);
    console.error(`Starting MCP Server in HTTP mode...`);
    console.error(`API_HOST: ${API_HOST} (env was: ${envApiHost})`);
    console.error(`MCP_KEY from env: ${MCP_KEY ? '[SET]' : '[NOT SET]'}`);
    console.error(`PORT: ${PORT}`);
    // Initialize default MCP client from env vars (for local development)
    if (MCP_KEY) {
        defaultMcpClient = new GptMcpClient({
            host: API_HOST,
            mcpKey: MCP_KEY
        });
        console.error(`Default MCP client initialized from env vars`);
    }
    else {
        console.error(`No MCP_KEY in env - will use config from query params`);
    }
    const app = express();
    app.use(express.json());
    // Store active transports by session ID
    const transports = {};
    // Health check endpoint
    app.get('/health', (_req, res) => {
        res.json({ status: 'ok' });
    });
    // Well-known endpoint for Smithery to discover config schema
    // This tells Smithery what credentials are required and triggers the credential prompt
    app.get('/.well-known/mcp-config', (_req, res) => {
        res.json({
            "$schema": "https://json-schema.org/draft/2020-12/schema",
            "$id": "/.well-known/mcp-config",
            "title": "MCP Session Configuration",
            "description": "Configuration for AXYS MCP Server",
            "x-query-style": "dot+bracket",
            "x-user-input-required": true,
            "type": "object",
            "required": ["AXYS_API_HOST", "MCP_KEY"],
            "properties": {
                "AXYS_API_HOST": {
                    "type": "string",
                    "title": "AXYS API Host",
                    "description": "AXYS API host URL (e.g., https://directory.axys.ai)",
                    "x-user-input-required": true
                },
                "MCP_KEY": {
                    "type": "string",
                    "title": "MCP Key",
                    "description": "MCP API key for authentication (obtain from AXYS admin)",
                    "x-user-input-required": true
                }
            }
        });
    });
    // MCP endpoint - handles POST requests
    app.post('/mcp', async (req, res) => {
        const sessionId = req.headers['mcp-session-id'];
        // Parse config from query parameter (Smithery passes config this way)
        const config = parseConfigFromQuery(req);
        console.error(`Received MCP POST request, session: ${sessionId || 'new'}, config: ${config ? 'provided' : 'none'}`);
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
                // Connect transport to MCP server with config from query params
                const server = createMcpServer(config);
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
    // Start server on 0.0.0.0 for container compatibility
    app.listen(PORT, '0.0.0.0', () => {
        console.error(`MCP Server is running on HTTP port ${PORT}`);
        console.error(`Listening on 0.0.0.0:${PORT}`);
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
// Main entry point - choose mode based on environment
async function main() {
    if (STDIO_MODE) {
        await startStdioServer();
    }
    else {
        await startHttpServer();
    }
}
main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map
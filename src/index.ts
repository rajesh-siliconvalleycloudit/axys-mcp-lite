import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { GptMcpClient } from './axys-client.js'
import { GptSearchRequest } from './types.js'

// Default API host
const DEFAULT_API_HOST = 'https://directory.axys.ai'

// Export configSchema for Smithery to discover
export const configSchema = z.object({
	MCP_KEY: z.string()
		.min(1)
		.describe("MCP API key for authentication (obtain from AXYS admin)")
})

export default function createServer({
	config,
}: {
	config: z.infer<typeof configSchema>
}) {
	const server = new McpServer({
		name: "axys-mcp-lite",
		version: "1.0.0",
	})

	// Initialize MCP client with static API host and config MCP_KEY
	const mcpClient = new GptMcpClient({
		host: DEFAULT_API_HOST,
		mcpKey: config.MCP_KEY
	})

	// Tool: AI Search Structured
	server.registerTool(
		"ai_search_structured",
		{
			title: "AI Search Structured",
			description: "Search using AI with structured search - returns structured data from configured data sources. This uses natural language understanding to query structured databases and returns organized, tabular results. Best for questions that require querying relational data, structured records, or when you need precise data extraction from databases.",
			inputSchema: {
				query: z.string().describe("Natural language query to search for (e.g., 'how to install AXYS', 'find all users in engineering department'). This is mostly used for transaction, details, users, people, sessions etc")
			},
		},
		async ({ query }) => {
			try {
				const searchRequest: GptSearchRequest = {
					query,
					searchType: 'structured'
				}
				const result = await mcpClient.aiSearch(searchRequest)
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(result, null, 2)
						}
					]
				}
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				return {
					content: [
						{
							type: "text",
							text: `Error executing ai_search_structured: ${errorMessage}`
						}
					]
				}
			}
		}
	)

	// Tool: AI Search Unstructured
	server.registerTool(
		"ai_search_unstructured",
		{
			title: "AI Search Unstructured",
			description: "Search using AI with unstructured search - searches documents, videos, and files using natural language. This tool performs semantic search across unstructured content like PDFs, Word documents, videos, images, and other file types. It uses AI to understand context and meaning, making it ideal for finding information in documentation, presentations, or media files. Can optionally return just file references or full content extracts.",
			inputSchema: {
				query: z.string().describe("Natural language query describing what you're looking for in documents or media (e.g., 'deployment instructions', 'architecture diagrams')"),
				searchIndices: z.string().optional().describe("Optional: Specific index to search (e.g., 'video', 'document', 'pdf'). Leave empty to search across all unstructured content types."),
				fileOnly: z.boolean().default(false).describe("Set to true to return only file metadata and references without extracting content. Use this for faster searches when you only need to know which files match, not their full content.")
			},
		},
		async ({ query, searchIndices, fileOnly }) => {
			try {
				const searchRequest: GptSearchRequest = {
					query,
					searchType: 'unstructured'
				}

				if (searchIndices) {
					searchRequest.searchIndices = searchIndices
				}

				if (fileOnly !== undefined) {
					searchRequest.fileOnly = fileOnly
				}

				const result = await mcpClient.aiSearch(searchRequest)
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(result, null, 2)
						}
					]
				}
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				return {
					content: [
						{
							type: "text",
							text: `Error executing ai_search_unstructured: ${errorMessage}`
						}
					]
				}
			}
		}
	)

	// Tool: Validate Connection
	server.registerTool(
		"validate_connection",
		{
			title: "Validate Connection",
			description: "Validate the connection to MCP API and verify that the MCP_KEY is properly configured. Use this to troubleshoot connectivity issues or confirm the API credentials are working before attempting AI-powered searches.",
			inputSchema: {},
		},
		async () => {
			try {
				const isValid = await mcpClient.validateConnection()
				return {
					content: [
						{
							type: "text",
							text: isValid
								? "✓ Connection to MCP API is valid and working"
								: "✗ Failed to connect to MCP API. Please check your configuration."
						}
					]
				}
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				return {
					content: [
						{
							type: "text",
							text: `✗ Connection validation failed: ${errorMessage}`
						}
					]
				}
			}
		}
	)

	return server.server
}

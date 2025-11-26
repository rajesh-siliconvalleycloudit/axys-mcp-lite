# AXYS MCP Lite

A Model Context Protocol (MCP) server that provides AI-powered search capabilities, enabling AI assistants like Claude to search through structured and unstructured data using natural language commands.

[![smithery badge](https://smithery.ai/badge/@rajesh-siliconvalleycloudit/axys-mcp-lite)](https://smithery.ai/server/@rajesh-siliconvalleycloudit/axys-mcp-lite)
[![npm version](https://badge.fury.io/js/axys-mcp-lite.svg)](https://www.npmjs.com/package/axys-mcp-lite)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **AI-Powered Structured Search**: Natural language queries on structured databases
- **AI-Powered Unstructured Search**: Search documents, videos, and files using natural language
- **Semantic Search**: AI understands context and meaning for better results
- **Multiple Content Types**: Search PDFs, Word documents, videos, images, and more
- **Secure Authentication**: API key-based authentication for secure access

## Prerequisites

- Node.js 18 or higher
- MCP API key
- Claude Desktop application or any MCP-compatible client

## Installation

### Via npm (Recommended)

```bash
npm install -g axys-mcp-lite
```

### From Source

```bash
git clone https://github.com/rajesh-siliconvalleycloudit/axys-mcp-lite.git
cd axys-mcp-lite
npm install
npm run build
```

## Quick Start

### 1. Get Your MCP API Key

Contact your administrator to obtain your MCP API key.

### 2. Configure Claude Desktop

Add this configuration to your Claude Desktop config file:

**On macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**On Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "axys-mcp-lite": {
      "command": "npx",
      "args": ["-y", "axys-mcp-lite"],
      "env": {
        "AXYS_API_HOST": "https://your-axys-host.com",
        "MCP_KEY": "your-mcp-key-here"
      }
    }
  }
}
```

### 3. Restart Claude Desktop

Restart Claude Desktop to load the MCP server. You should now be able to use the AI search commands!

## Available Tools

### 1. `ai_search_structured`
Search structured data sources using natural language.

**Parameters:**
- `query` (required): Natural language query

**Example:**
```
Find all users in engineering department
```

### 2. `ai_search_unstructured`
Search documents, videos, and files using natural language.

**Parameters:**
- `query` (required): Natural language query
- `searchIndices` (optional): Specific index to search (e.g., 'video', 'document')
- `fileOnly` (optional): Return only file references without content

**Example:**
```
Find deployment documentation videos
```

### 3. `validate_connection`
Validate connection to MCP API.

## Usage Examples

### Structured Search
```
"Find all employees named John"
"Show customers with revenue over $1M"
"List users in the Sales department"
```

### Unstructured Search
```
"How to install AXYS?"
"Find videos about API integration"
"Search for architecture diagrams"
```

## Configuration Options

### Environment Variables

Create a `.env` file in your project directory:

```env
# Required
AXYS_API_HOST=https://your-axys-host.com
MCP_KEY=your-mcp-key-here

# Optional: Logging configuration
LOG_LEVEL=info
```

## Development

### Running Locally

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Project Structure

```
axys-mcp-lite/
├── src/
│   ├── index.ts        # Main MCP server implementation
│   ├── axys-client.ts  # API client wrapper
│   └── types.ts        # TypeScript type definitions
├── dist/               # Compiled JavaScript output
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Troubleshooting

### Connection Issues
- Verify `AXYS_API_HOST` URL is correct
- Check MCP_KEY is valid and active
- Ensure network connectivity to the API server

### No Results
- Try rephrasing your query
- Check if the data exists in the system
- Verify your API key has appropriate permissions

## API Response Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | AI Tool not configured |
| 401 | Invalid API Key |
| 402 | Bad Request |
| 500 | Internal Server Error |

## Security Best Practices

1. **Never commit API keys** to version control
2. **Use environment variables** for sensitive configuration
3. **Regularly rotate API keys** for security
4. **Monitor API usage** for unusual activity

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Support

For issues:
- **MCP Server**: [Open an issue](https://github.com/rajesh-siliconvalleycloudit/axys-mcp-lite/issues)
- **MCP Protocol**: [MCP Documentation](https://github.com/modelcontextprotocol/docs)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk)
- Designed for use with Claude Desktop and other MCP clients

## Changelog

### Version 1.0.0
- Initial release
- AI-powered structured search
- AI-powered unstructured search (documents, videos, files)
- Connection validation tool

---

Made with care for the MCP community
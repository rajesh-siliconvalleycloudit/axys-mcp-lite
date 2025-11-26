FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY src ./src
COPY tsconfig.json ./

# Build the application
RUN npm run build

# Remove devDependencies after build
RUN npm prune --production

# Set environment variables
ENV NODE_ENV=production

# Expose the HTTP port
EXPOSE 8000

# Run the MCP server (smithery-index.js for HTTP transport)
CMD ["node", "dist/smithery-index.js"]

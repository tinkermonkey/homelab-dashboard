# Stage 1: Build dependencies and shared module
FROM node:20-alpine AS base
WORKDIR /workspace

# Copy all package.json files
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY client/package.json ./client/
COPY server/package.json ./server/

# Install dependencies using workspace
RUN npm install

# Stage 2: Build client
FROM base AS client-builder
WORKDIR /workspace
COPY . .
RUN npm run build --workspace=client

# Stage 3: Build server
FROM base AS server-builder
WORKDIR /workspace
COPY . .
RUN npm run build --workspace=server

# Stage 4: Production image
FROM node:20-alpine AS runtime
WORKDIR /app

# Copy built client from client-builder
COPY --from=client-builder /workspace/client/dist ./client/dist

# Copy built server and package files
COPY --from=server-builder /workspace/server/dist ./server/dist
COPY --from=server-builder /workspace/server/package.json ./server/
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev --ignore-scripts

# Copy shared module for types/runtime
COPY --from=base /workspace/shared ./shared

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Expose the port
EXPOSE 3000

# Start the server
CMD ["node", "server/index.js"]

# Production Dockerfile for TrailWhisper Mastra Agent Server
FROM node:20-slim AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json tsconfig.json ./
RUN npm install

# Copy source code and build
COPY src ./src
RUN npm run build

# Production runtime stage
FROM node:20-slim

WORKDIR /app
ENV NODE_ENV=production \
    PORT=4000

COPY package.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://localhost:4000/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["node", "dist/server.js"]

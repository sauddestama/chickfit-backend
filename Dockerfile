FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S chickfit -u 1001

# Change ownership (INCLUDE service account key)
RUN chown -R chickfit:nodejs /app
RUN chmod 644 /app/service-account-key.json 2>/dev/null || true

USER chickfit

# Expose port
EXPOSE 8080

# Health check (FIX PORT!)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Start application
CMD ["node", "server.js"]
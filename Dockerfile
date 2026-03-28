FROM node:18-alpine

LABEL maintainer="PrajaVaani Project <info@prajavaani.app>"
LABEL description="PrajaVaani Eligibility Checker API Server"

# Set working directory
WORKDIR /app

# Install TypeScript globally for compilation
RUN npm install -g typescript

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm install -D typescript ts-node @types/node @types/express

# Copy source files
COPY eligibilityChecker.ts .
COPY expressServer.ts .
COPY schemes_dataset.json .
COPY tsconfig.json .

# Compile TypeScript to JavaScript
RUN tsc

# Expose port
EXPOSE 5000

# Environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => { if (r.statusCode !== 200) throw new Error(r.statusCode) })"

# Start the server
CMD ["node", "dist/expressServer.js"]

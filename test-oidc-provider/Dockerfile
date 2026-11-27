FROM node:22-alpine

RUN apk upgrade --no-cache

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev \
    && npm uninstall -g npm \
    && rm -f /usr/local/bin/npm /usr/local/bin/npx

# Copy application files
COPY server.js ./

USER node

# Expose port
EXPOSE 9000

# Start the server
CMD ["node", "server.js"]

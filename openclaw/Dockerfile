# Use the official Node.js 22 image
FROM node:22

# Install git, jq and nginx
RUN apt-get update && apt-get install -y git jq nginx && rm -rf /var/lib/apt/lists/*

# Create required directories
RUN mkdir -p /root/.openclaw/credentials /root/.openclaw/workspace /root/.mcporter

# Install OpenClaw CLI and mcporter globally
RUN npm install -g openclaw@2026.2.26 mcporter@latest

# Copy workspace files
COPY ./workspace/ /root/.openclaw/workspace/

# Copy OpenClaw configuration
COPY openclaw.json /root/.openclaw/openclaw.json


# Set the working directory
WORKDIR /app

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy the entrypoint script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 18789

# Set the entrypoint and default command
ENTRYPOINT ["/app/start.sh"]
CMD ["openclaw", "gateway"]

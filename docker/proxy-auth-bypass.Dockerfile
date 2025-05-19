FROM node:20-slim

WORKDIR /app

# Set environment variables
ENV NODE_ENV=development \
    AUTH_BYPASS=true

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Create auth_backups directory
RUN mkdir -p /app/auth_backups

# Copy the clean server.js file
COPY server.clean.js .

# Backup the original server.js if it exists
COPY server.js /app/auth_backups/server.js.original

# Replace server.js with clean version
RUN cp server.clean.js server.js

# Set up a special entrypoint script to handle auth bypass setup
COPY docker/proxy-entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 5000

# Use the entrypoint script
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

# Default command
CMD ["node", "server.js"]
FROM node:20-slim

WORKDIR /app

# Copy package.json and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy the clean server file
COPY server.clean.js ./server.js

# Create public directory
RUN mkdir -p public

# Expose the API proxy port
EXPOSE 5000

# Set environment variables
ENV NODE_ENV=development
ENV PORT=5000

# Start the server
CMD ["node", "server.js"]
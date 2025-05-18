FROM node:20-slim

WORKDIR /app

# Copy package files and install dependencies
COPY frontend/package*.json ./
RUN npm install

# Copy the rest of the frontend code
COPY frontend/ ./

# Build the frontend
RUN npm run build

# Install serve to run the frontend
RUN npm install -g serve

# Expose the frontend port
EXPOSE 3000

# Command to serve the built frontend
CMD ["serve", "-s", "dist", "-l", "3000"]
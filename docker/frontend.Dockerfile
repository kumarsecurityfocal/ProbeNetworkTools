FROM node:20-slim

WORKDIR /app

# Copy package.json and install dependencies
COPY frontend/package.json frontend/package-lock.json ./
RUN npm install

# Copy the frontend code
COPY frontend/ ./

# Expose the Vite development server port
EXPOSE 3000

# Set environment variables for development
ENV NODE_ENV=development
ENV VITE_DEV_MODE=true
ENV VITE_AUTH_BYPASS=true

# Start the Vite development server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]
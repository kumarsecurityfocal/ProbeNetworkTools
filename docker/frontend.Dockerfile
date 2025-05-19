FROM node:20-slim

WORKDIR /app

# Set environment variables
ENV NODE_ENV=development \
    VITE_AUTH_BYPASS=true

# Copy package.json and package-lock.json
COPY frontend/package*.json ./

# Install dependencies
RUN npm install

# Copy the frontend code
COPY frontend/ ./

# Add auth debug components
RUN mkdir -p /app/src/components/debug

# Build the frontend for production
# RUN npm run build

EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
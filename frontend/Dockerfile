# Simple single-stage build
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Copy all files
COPY . .

# Install dependencies with legacy peer deps to avoid conflicts
RUN npm install --legacy-peer-deps

# Install PostCSS and Tailwind plugins explicitly
RUN npm install autoprefixer postcss tailwindcss @tailwindcss/postcss --no-save --legacy-peer-deps

# Build the frontend with explicit output to /app/dist directory
RUN npm run build -- --outDir=/app/dist

# Add a marker file to verify assets were correctly built
RUN echo "Frontend assets successfully built at $(date)" > /app/dist/build-info.txt
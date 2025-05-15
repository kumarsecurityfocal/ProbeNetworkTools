# --- Build Stage ---
FROM node:20-alpine AS build

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies - using npm install instead of npm ci for better compatibility
RUN npm install

# Copy all files
COPY . .

# Install tailwindcss and postcss plugins explicitly to ensure they're available
RUN npm install @tailwindcss/postcss autoprefixer postcss tailwindcss --no-save

# Build the app with error handling
RUN npm run build || (echo "Build failed, checking for missing dependencies..." && npm install && npm run build)

# --- Production Stage ---
FROM nginx:alpine

# Create the directory if it doesn't exist
RUN mkdir -p /usr/share/nginx/html

# Copy the build output to nginx html directory
COPY --from=build /app/dist /usr/share/nginx/html
# In our Vite setup, the build output is configured to go to ../public
# This is handled by the copy-frontend-assets.sh script in our deployment

# Add a marker file to verify assets were correctly copied
RUN echo "Frontend assets successfully built and copied at $(date)" > /usr/share/nginx/html/build-info.txt

# We don't need to configure nginx here since the main nginx container will handle it
# Note: In production, these assets are served by the main nginx container, not this one
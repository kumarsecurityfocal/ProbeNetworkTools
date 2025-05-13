# --- Build Stage ---
FROM node:20-alpine AS build

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy all files
COPY . .

# Build the app
RUN npm run build

# --- Production Stage ---
FROM nginx:alpine

# Copy the build output to nginx html directory
COPY --from=build /app/dist /usr/share/nginx/html

# We don't need to configure nginx here since the main nginx container will handle it
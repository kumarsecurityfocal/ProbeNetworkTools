FROM node:20-alpine as build

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

# Production stage
FROM nginx:alpine as frontend

# Copy the build output
COPY --from=build /app/dist /app/dist

# We don't need to configure nginx here since the main nginx container will handle it
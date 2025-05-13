FROM node:18-alpine as build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy project files
COPY . .

# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config (this will be overridden by the mounted config in docker-compose)
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 5000
EXPOSE 5000

CMD ["nginx", "-g", "daemon off;"]

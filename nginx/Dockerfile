FROM nginx:alpine

# Remove default nginx configuration
RUN rm /etc/nginx/conf.d/default.conf

# Copy our custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy SSL parameters configuration
COPY ssl-params.conf /etc/nginx/ssl-params.conf

# Create directories for SSL certificates
RUN mkdir -p /etc/letsencrypt
RUN mkdir -p /var/www/certbot

# Copy the built frontend files to nginx html directory
# This will be handled by volume mounting in docker-compose.yml
# or can be built as a multi-stage build when needed

# Expose ports
EXPOSE 80
EXPOSE 443

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
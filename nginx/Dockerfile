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

# Create nginx html directory if it doesn't exist
RUN mkdir -p /usr/share/nginx/html

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Expose ports
EXPOSE 80
EXPOSE 443

# Use our custom entrypoint script
ENTRYPOINT ["/entrypoint.sh"]
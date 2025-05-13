FROM nginx:alpine

# Remove default nginx configuration
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy our custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy SSL parameters configuration
COPY ssl-params.conf /etc/nginx/ssl-params.conf

# Create directories for SSL certificates
RUN mkdir -p /etc/letsencrypt
RUN mkdir -p /var/www/certbot

# Remove default nginx welcome page if it exists to prevent it from being served
RUN rm -f /var/www/html/index.html

# Create nginx html directory and add a marker file 
RUN mkdir -p /usr/share/nginx/html
RUN echo "ProbeOps NGINX container - Built on $(date)" > /usr/share/nginx/html/nginx-container-info.txt

# Copy frontend build assets (these are copied by the copy-frontend-assets.sh script)
COPY frontend-build/ /usr/share/nginx/html/

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Expose ports
EXPOSE 80
EXPOSE 443

# Use our custom entrypoint script
ENTRYPOINT ["/entrypoint.sh"]
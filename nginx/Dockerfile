FROM frontend:latest as frontend

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

# Copy the built frontend files from the frontend image
# No volume mounting should be used in production to avoid empty directories
COPY --from=frontend /usr/share/nginx/html /usr/share/nginx/html

# Create a marker file to confirm assets were copied properly
RUN echo "Assets properly copied from frontend container" > /usr/share/nginx/html/assets-verification.txt

# Expose ports
EXPOSE 80
EXPOSE 443

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
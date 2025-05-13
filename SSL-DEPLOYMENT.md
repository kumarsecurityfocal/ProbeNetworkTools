# SSL Certificate Deployment Guide for ProbeOps

This document outlines the steps necessary to deploy SSL certificates for HTTPS access to the ProbeOps application in production.

## Prerequisites

- A registered domain (probeops.com) pointing to your server's IP address
- Open ports 80 and 443 on your firewall
- Docker and Docker Compose installed on your server

## Step 1: Initial SSL Certificate Issuance

On your production server, follow these steps to obtain real Let's Encrypt certificates:

1. **Stop any services using port 80**:
   ```bash
   docker compose down
   ```

2. **Run Certbot in standalone mode**:
   ```bash
   sudo certbot certonly --standalone --preferred-challenges http \
     --email admin@probeops.com --agree-tos --no-eff-email \
     -d probeops.com -d www.probeops.com
   ```

   This will create certificates in `/etc/letsencrypt/live/probeops.com/`

3. **Copy certificates to the project structure**:
   ```bash
   # First, determine the actual certificate directory name (it may include a suffix like -0001)
   CERT_DIR=$(ls -d /etc/letsencrypt/live/probeops.com* | head -n 1)
   CERT_NAME=$(basename $CERT_DIR)
   
   # Create directories and copy files
   sudo mkdir -p ./nginx/ssl/live/$CERT_NAME
   sudo cp $CERT_DIR/*.pem ./nginx/ssl/live/$CERT_NAME/
   sudo cp /etc/letsencrypt/ssl-dhparams.pem ./nginx/ssl/
   sudo chown -R $(whoami):$(whoami) ./nginx/ssl/
   
   echo "Certificates copied from $CERT_DIR"
   ```
   
   **Note:** Let's Encrypt may create numbered directories (e.g., `probeops.com-0001`) for certificate renewals.

## Step 2: Verify NGINX Configuration

The NGINX configuration should be set up to use the certificates with the correct path:

```nginx
# SSL certificate configuration - make sure the path matches your actual certificate location
ssl_certificate /etc/letsencrypt/live/probeops.com-0001/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/probeops.com-0001/privkey.pem;
include /etc/nginx/ssl-params.conf;
```

**Important:** You must update the path in `nginx/nginx.conf` to match the actual certificate location. When Let's Encrypt renews certificates, it may create numbered directories (e.g., `probeops.com-0001`). Always check the certificate path with:

```bash
ls -la /etc/letsencrypt/live/
```

If the directory name changes, update the paths in your NGINX configuration.

## Step 3: Start Services with HTTPS Support

Launch the services with Docker Compose:

```bash
docker compose up --build -d
```

## Step 4: Verify SSL Configuration

Verify that your site is accessible via HTTPS:

```bash
curl -v https://probeops.com
```

You should see a valid SSL certificate chain with Let's Encrypt as the certificate authority.

## Certificate Renewal

Let's Encrypt certificates expire after 90 days. The `cert-renewal.sh` script is set up to handle automatic renewal:

1. **Ensure the renewal script is executable**:
   ```bash
   chmod +x cert-renewal.sh
   ```

2. **Set up a cron job** to run the renewal script twice a day:
   ```bash
   crontab -e
   ```
   
   Add this line:
   ```
   0 3,15 * * * /path/to/your/cert-renewal.sh >> /path/to/your/ssl-renewal.log 2>&1
   ```

## Troubleshooting

1. **Certificate validation failures**:
   - Ensure ports 80 and 443 are accessible from the internet
   - Confirm your domain's DNS resolves to your server's IP

2. **NGINX fails to start**:
   - Check NGINX logs: `docker compose logs nginx`
   - Verify certificate paths and permissions
   - Make sure certificate paths in `nginx.conf` match the actual location:
     ```bash
     # Check actual certificate location
     ls -la /etc/letsencrypt/live/
     
     # Update NGINX configuration if needed
     vi nginx/nginx.conf
     
     # Restart NGINX container
     docker compose restart nginx
     ```

3. **Certificate renewal failures**:
   - Check the renewal log: `cat ssl-renewal.log`
   - Run the renewal script manually to see errors: `./cert-renewal.sh`

4. **TLS handshake failures**:
   - Verify SSL parameters in `/etc/nginx/ssl-params.conf`
   - Confirm DH parameters exist and are accessible

## Security Considerations

- SSL certificates should be readable only by the user running NGINX
- Private keys should have restricted permissions (mode 600)
- DH parameters should be at least 2048 bits for proper security
- Keep your server and Certbot updated to patch vulnerabilities
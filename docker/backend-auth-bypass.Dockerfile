FROM python:3.11-slim

WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    AUTH_BYPASS=true

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create auth_backups directory
RUN mkdir -p /app/auth_backups

# Copy backend requirements
COPY backend/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ .

# Copy auth_bypass.py to auth.py location and to its own file
COPY auth_bypass.py /app/app/auth_bypass.py
COPY auth_bypass.py /app/app/auth.py

# Create initial backup of original auth.py if it exists
RUN if [ -f /app/app/auth.py.original ]; then \
    cp /app/app/auth.py.original /app/auth_backups/auth.py.original; \
    fi

# Set up a special entrypoint script to handle auth bypass setup
COPY docker/backend-entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 8000

# Use the entrypoint script
ENTRYPOINT ["entrypoint.sh"]

# Default command
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
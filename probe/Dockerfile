FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    netcat-openbsd \
    dnsutils \
    traceroute \
    iputils-ping \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set Python environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    LOG_DIR=/var/log/probeops

# Create log directory
RUN mkdir -p ${LOG_DIR} && chmod 777 ${LOG_DIR}

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Make script executable
RUN chmod +x probe.py

# Create a non-root user to run the application
RUN adduser --disabled-password --gecos "" appuser
RUN chown -R appuser:appuser /app ${LOG_DIR}
USER appuser

# Command to run the application
CMD ["python", "probe.py"]

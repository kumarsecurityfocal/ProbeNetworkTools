FROM python:3.11-slim

WORKDIR /app

# Copy requirements first to leverage Docker cache
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend code
COPY backend/ .

# Copy the auth bypass file to replace the regular auth file
COPY backend/app/auth_bypass.py /app/app/auth.py

# Expose the FastAPI port
EXPOSE 8000

# Set environment variables for auth bypass mode
ENV AUTH_BYPASS_MODE=true
ENV SQLALCHEMY_WARN_20=ignore

# Command to run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
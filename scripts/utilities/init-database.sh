#!/bin/bash
# Initialize the database with default subscription tiers and users

# Script header
echo "==============================================="
echo "ProbeOps Database Initialization Script"
echo "==============================================="
echo ""

# Check for DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL environment variable is not set!"
    echo "Please set the DATABASE_URL environment variable before running this script."
    exit 1
fi

echo "Testing database connection..."
# Attempt database connection
python -c "
import psycopg2
import os
import sys
try:
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    print('Database connection successful!')
    conn.close()
except Exception as e:
    print(f'Error: Could not connect to the database: {str(e)}')
    sys.exit(1)
"

if [ $? -ne 0 ]; then
    echo "Database connection failed. Aborting."
    exit 1
fi

echo ""
echo "Creating database tables..."
echo "---------------------------------------------"
cd backend
python -c "
import sys
sys.path.append('.')
from app.database import Base, engine
Base.metadata.create_all(bind=engine)
print('Database tables created successfully!')
"

if [ $? -ne 0 ]; then
    echo "Error creating database tables. Aborting."
    exit 1
fi

echo ""
echo "Initializing database with subscription tiers and users..."
echo "---------------------------------------------"
python init_db.py

echo ""
echo "Assigning default subscriptions to users..."
echo "---------------------------------------------"
python assign_subscriptions.py

echo ""
echo "Database initialization complete!"
echo "You can now start the application with initialized database."
echo ""
echo "The following users have been created:"
echo "  - Admin: admin@probeops.com (password: probeopS1@)"
echo "  - Test User: test@probeops.com (password: probeopS1@)"
echo ""
echo "==============================================="
#!/bin/bash
# Script to launch pgAdmin for Amazon RDS connection

echo "Starting pgAdmin for connecting to Amazon RDS..."

# Extract database connection details from DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL environment variable is not set"
    exit 1
fi

# Parse the DATABASE_URL to extract PostgreSQL connection details
# Format expected: postgres://username:password@hostname:port/database
DB_USER=$(echo $DATABASE_URL | sed -n 's/^postgres:\/\/\([^:]*\):.*/\1/p')
DB_PASSWORD=$(echo $DATABASE_URL | sed -n 's/^postgres:\/\/[^:]*:\([^@]*\).*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/^postgres:\/\/[^@]*@\([^:]*\).*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/^postgres:\/\/[^:]*:[^@]*@[^:]*:\([^\/]*\).*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/^postgres:\/\/[^\/]*\/\(.*\)$/\1/p')

echo "Connection details extracted:"
echo "Host: $DB_HOST"
echo "Port: $DB_PORT"
echo "Database: $DB_NAME"
echo "Username: $DB_USER"
echo "Password: ********"

# Create a temporary pgpass file to store credentials securely
PGPASS_FILE="/tmp/pgpass_temp"
echo "$DB_HOST:$DB_PORT:$DB_NAME:$DB_USER:$DB_PASSWORD" > $PGPASS_FILE
chmod 600 $PGPASS_FILE

# Write connection details to a config file for pgAdmin
CONFIG_FILE="/tmp/pgadmin_servers.json"
cat > $CONFIG_FILE << EOL
{
  "Servers": {
    "1": {
      "Name": "AWS RDS PostgreSQL",
      "Group": "Servers",
      "Host": "$DB_HOST",
      "Port": $DB_PORT,
      "MaintenanceDB": "$DB_NAME",
      "Username": "$DB_USER",
      "SSLMode": "prefer",
      "SavePassword": true
    }
  }
}
EOL

echo "Configuration created. Running pgAdmin..."
echo "IMPORTANT: When prompted for the master password in pgAdmin, create a new one of your choice."
echo "NOTE: pgAdmin may take a moment to start. Please be patient."
echo "---------------------------------------------"

# Launch pgAdmin with the configuration
pgadmin4 --load-servers=$CONFIG_FILE

# Clean up temporary files when pgAdmin exits
rm $PGPASS_FILE $CONFIG_FILE
echo "pgAdmin closed. Temporary files cleaned up."
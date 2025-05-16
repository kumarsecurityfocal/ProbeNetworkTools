#!/bin/bash
# AWS RDS PostgreSQL pgAdmin Setup Script
# This script helps set up pgAdmin to connect to an AWS RDS PostgreSQL instance

echo "AWS RDS pgAdmin Connection Setup Helper"
echo "========================================"

# Check if we have database credentials in environment
if [ -z "$DATABASE_URL" ]; then
    echo "No DATABASE_URL found in environment. Manual input required."
    
    # Request connection details from user
    read -p "Enter AWS RDS Hostname: " DB_HOST
    read -p "Enter Database Port [5432]: " DB_PORT
    DB_PORT=${DB_PORT:-5432}
    read -p "Enter Database Name: " DB_NAME
    read -p "Enter Username: " DB_USER
    read -sp "Enter Password: " DB_PASSWORD
    echo ""
else
    echo "Found DATABASE_URL in environment. Extracting connection details..."
    
    # Parse the DATABASE_URL to extract PostgreSQL connection details
    DB_USER=$(echo $DATABASE_URL | sed -n 's/^postgres:\/\/\([^:]*\):.*/\1/p')
    DB_PASSWORD=$(echo $DATABASE_URL | sed -n 's/^postgres:\/\/[^:]*:\([^@]*\).*/\1/p')
    DB_HOST=$(echo $DATABASE_URL | sed -n 's/^postgres:\/\/[^@]*@\([^:]*\).*/\1/p')
    DB_PORT=$(echo $DATABASE_URL | sed -n 's/^postgres:\/\/[^:]*:[^@]*@[^:]*:\([^\/]*\).*/\1/p')
    DB_NAME=$(echo $DATABASE_URL | sed -n 's/^postgres:\/\/[^\/]*\/\(.*\)$/\1/p')
fi

echo ""
echo "Connection details:"
echo "Host: $DB_HOST"
echo "Port: $DB_PORT"
echo "Database: $DB_NAME"
echo "Username: $DB_USER"
echo "Password: ********"
echo ""

# Set up pgAdminPass file for your AWS server
echo "Creating ~/.pgpass file for password-less psql connection..."
PGPASS_FILE="$HOME/.pgpass"
echo "$DB_HOST:$DB_PORT:$DB_NAME:$DB_USER:$DB_PASSWORD" > $PGPASS_FILE
chmod 600 $PGPASS_FILE
echo "Created $PGPASS_FILE with restricted permissions"

# Test the connection
echo "Testing connection to the database..."
PGPASSFILE=$PGPASS_FILE psql -h $DB_HOST -p $DB_PORT -d $DB_NAME -U $DB_USER -c "SELECT version();" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Connection successful!"
    
    # Create server.json for pgAdmin
    PGADMIN_CONFIG_DIR="$HOME/pgadmin4"
    mkdir -p "$PGADMIN_CONFIG_DIR"
    
    SERVER_JSON="$PGADMIN_CONFIG_DIR/servers.json"
    cat > $SERVER_JSON << EOL
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
    chmod 600 $SERVER_JSON
    
    echo "Created pgAdmin server configuration at $SERVER_JSON"
    echo ""
    echo "Instructions to connect using pgAdmin:"
    echo "1. Launch pgAdmin4"
    echo "2. Create a master password when prompted"
    echo "3. Right-click on 'Servers' in the left panel and select 'Import/Export Servers'"
    echo "4. Choose 'Import' and select the file: $SERVER_JSON"
    echo "5. Enter your database password when prompted"
    echo ""
    echo "Alternatively, run: pgadmin4 --load-servers=$SERVER_JSON"
    
    # Create a convenience psql script
    PSQL_SCRIPT="connect-to-rds.sh"
    cat > $PSQL_SCRIPT << EOL
#!/bin/bash
# Quick connection to AWS RDS PostgreSQL database
PGPASSFILE=~/.pgpass psql -h $DB_HOST -p $DB_PORT -d $DB_NAME -U $DB_USER
EOL
    chmod +x $PSQL_SCRIPT
    
    echo ""
    echo "Created a convenience script for psql connection: ./$PSQL_SCRIPT"
    echo "You can now run ./$PSQL_SCRIPT to quickly connect to your database via psql"
else
    echo "❌ Connection failed. Please check your credentials and network settings."
    echo "Make sure your security group allows connections from your IP address."
    echo "For AWS RDS, check that the 'Publicly Accessible' option is enabled."
fi
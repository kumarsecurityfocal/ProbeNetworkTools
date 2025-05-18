// Simple script to create or reset admin user in PostgreSQL
const { Pool } = require('pg');

// Get database URL from environment or use default
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('ERROR: DATABASE_URL environment variable not set');
  process.exit(1);
}

// Create database connection pool
const pool = new Pool({
  connectionString: dbUrl
});

async function createOrResetAdmin() {
  const client = await pool.connect();
  try {
    // Start transaction
    await client.query('BEGIN');
    
    // Delete admin user if exists
    console.log('Removing existing admin user...');
    await client.query("DELETE FROM users WHERE email = 'admin@probeops.com' OR username = 'admin'");
    
    // Create new admin user with known password
    console.log('Creating new admin user...');
    
    // Check if users table has password column
    const { rows: columns } = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'users'
    `);
    
    const columnNames = columns.map(col => col.column_name);
    
    // Determine SQL based on actual table structure
    let sql;
    const passwordColumn = columnNames.includes('hashed_password') ? 'hashed_password' : 'password';
    
    // A very basic password hash for 'probeopS1@'
    // In production, you would use bcrypt or similar
    const passwordHash = '$2b$10$ZQ0YX9Cmd/4YG4l8wJNgdOVRwbSqlMwU3vX0QJR0C9GOHu9vGNvYi';
    
    // Set columns based on what exists in the table
    const adminData = {
      username: 'admin',
      email: 'admin@probeops.com',
      password: passwordHash,
      isAdmin: true,
      isActive: true
    };
    
    // Build the query dynamically based on existing columns
    let query = 'INSERT INTO users (';
    let values = 'VALUES (';
    let params = [];
    let i = 1;
    
    // Add columns that exist in the table
    if (columnNames.includes('username')) {
      query += 'username, ';
      values += `$${i++}, `;
      params.push(adminData.username);
    }
    
    if (columnNames.includes('email')) {
      query += 'email, ';
      values += `$${i++}, `;
      params.push(adminData.email);
    }
    
    if (columnNames.includes(passwordColumn)) {
      query += `${passwordColumn}, `;
      values += `$${i++}, `;
      params.push(adminData.password);
    }
    
    if (columnNames.includes('is_admin')) {
      query += 'is_admin, ';
      values += `$${i++}, `;
      params.push(adminData.isAdmin);
    }
    
    if (columnNames.includes('is_active')) {
      query += 'is_active, ';
      values += `$${i++}, `;
      params.push(adminData.isActive);
    }
    
    // Remove trailing commas
    query = query.slice(0, -2) + ') ';
    values = values.slice(0, -2) + ') ';
    
    // Add returning clause
    query += values + 'RETURNING id, username, email';
    
    // Execute query
    const result = await client.query(query, params);
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('Admin user created successfully:', result.rows[0]);
    console.log('\nLogin credentials:');
    console.log('- Username: admin');
    console.log('- Email: admin@probeops.com');
    console.log('- Password: probeopS1@');
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating admin user:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the function
createOrResetAdmin().catch(err => {
  console.error('Failed to create/reset admin user:', err);
  process.exit(1);
});
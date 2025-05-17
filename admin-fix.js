// Admin User Authentication Fix
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// Connect to the PostgreSQL database using environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function fixAdminUser() {
  const client = await pool.connect();
  try {
    // Start a transaction
    await client.query('BEGIN');

    // First, check if admin user exists
    const checkQuery = `
      SELECT * FROM users 
      WHERE email = 'admin@probeops.com' OR username = 'admin'
    `;
    
    const userResult = await client.query(checkQuery);
    const adminExists = userResult.rowCount > 0;
    
    console.log(`Admin user exists: ${adminExists}`);
    
    if (adminExists) {
      const adminUser = userResult.rows[0];
      console.log('Current admin user:', adminUser);
      
      // Hash the new password
      const saltRounds = 10;
      const newPassword = 'probeopS1@';
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      
      // Update the admin password and ensure admin privileges
      // Adjust column names based on your actual schema
      const updateQuery = `
        UPDATE users 
        SET 
          password = $1,
          is_admin = true,
          is_active = true
        WHERE id = $2
        RETURNING *
      `;
      
      const updateResult = await client.query(updateQuery, [hashedPassword, adminUser.id]);
      console.log('Admin user updated:', updateResult.rows[0]);
    } else {
      // If admin user doesn't exist, create it
      // Hash the password
      const saltRounds = 10;
      const password = 'probeopS1@';
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      // Insert the admin user with appropriate privileges
      const insertQuery = `
        INSERT INTO users (
          username, email, password, is_admin, is_active
        ) VALUES (
          'admin', 'admin@probeops.com', $1, true, true
        )
        RETURNING *
      `;
      
      const insertResult = await client.query(insertQuery, [hashedPassword]);
      console.log('Admin user created:', insertResult.rows[0]);
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    console.log('Admin user fix completed successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error fixing admin user:', error);
  } finally {
    client.release();
    pool.end();
  }
}

// Run the function
fixAdminUser().catch(err => {
  console.error('Failed to fix admin user:', err);
  process.exit(1);
});
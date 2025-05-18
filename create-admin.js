/**
 * Simple Admin User Creator
 * 
 * This script ensures the admin user exists in the database with
 * the correct credentials that match what the frontend is using.
 */

const { Pool } = require('pg');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

// Configuration
const ADMIN_EMAIL = 'admin@probeops.com';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'AdminPassword123';
const SALT_ROUNDS = 12;

async function createOrResetAdmin() {
  console.log('Connecting to database...');
  // Get database connection from environment variables
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Get admin user from database
    console.log(`Checking for admin user with email: ${ADMIN_EMAIL}`);
    const userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [ADMIN_EMAIL]
    );

    const adminExists = userResult.rows.length > 0;
    
    if (adminExists) {
      const admin = userResult.rows[0];
      console.log(`Admin user found: ${admin.username} (${admin.email})`);
      
      // Update password
      console.log('Updating admin password...');
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS);
      
      await pool.query(
        'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
        [hashedPassword, admin.id]
      );
      
      console.log('Admin password updated successfully');
    } else {
      console.log('Admin user not found. Creating new admin user...');
      
      // Create admin user
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS);
      
      const insertResult = await pool.query(
        `INSERT INTO users (
          email, username, password, is_admin, is_active, email_verified, 
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING id`,
        [ADMIN_EMAIL, ADMIN_USERNAME, hashedPassword, true, true, true]
      );
      
      console.log(`Admin user created with ID: ${insertResult.rows[0].id}`);
    }
    
    // Verify admin account can be retrieved
    const verifyResult = await pool.query(
      'SELECT id, username, email, is_admin FROM users WHERE email = $1',
      [ADMIN_EMAIL]
    );
    
    if (verifyResult.rows.length > 0) {
      console.log('Verification successful:');
      console.log(verifyResult.rows[0]);
    } else {
      console.error('Admin account could not be verified after update/creation!');
    }

  } catch (error) {
    console.error('Error creating/updating admin user:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
createOrResetAdmin().catch(console.error);
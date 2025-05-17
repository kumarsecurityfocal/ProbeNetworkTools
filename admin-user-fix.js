#!/usr/bin/env node

/**
 * Simple Admin User Authentication Fix
 * 
 * This script ensures the admin user exists in the database and 
 * fixes any authentication-related issues.
 */

const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Configuration
const ADMIN_EMAIL = 'admin@probeops.com';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'probeopS1@';
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production';

// Create a database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  console.log('✨ ProbeOps Admin User Authentication Fix ✨');
  console.log('=========================================');
  
  let client;
  try {
    client = await pool.connect();
    console.log('📊 Database connection established successfully');
    
    // Check if tables exist
    const tablesExist = await checkTablesExist(client);
    if (!tablesExist) {
      console.error('❌ Required database tables are missing. Run database migrations first.');
      process.exit(1);
    }
    
    // Check if admin user exists
    const adminUser = await getAdminUser(client);
    
    if (adminUser) {
      console.log('✅ Admin user exists:', adminUser);
      await updateAdminPassword(client, adminUser);
    } else {
      console.log('⚠️ Admin user does not exist. Creating...');
      await createAdminUser(client);
    }
    
    // Generate a JWT token for the admin user
    const adminToken = await generateAdminToken(client);
    console.log('🔑 JWT token generated for admin:', adminToken);
    
    console.log('\n✅ Admin authentication fix completed successfully');
    console.log('\nLogin Information:');
    console.log('- Email: admin@probeops.com');
    console.log('- Username: admin');
    console.log('- Password: probeopS1@');
    
  } catch (error) {
    console.error('❌ Error fixing admin authentication:', error.message);
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

// Check if required tables exist
async function checkTablesExist(client) {
  const { rows } = await client.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_name = 'users'
    );
  `);
  
  return rows[0].exists;
}

// Get admin user from database
async function getAdminUser(client) {
  const { rows } = await client.query(`
    SELECT * FROM users 
    WHERE email = $1 OR username = $2
    LIMIT 1;
  `, [ADMIN_EMAIL, ADMIN_USERNAME]);
  
  return rows[0];
}

// Create admin user
async function createAdminUser(client) {
  // Check for password column
  const { rows: columns } = await client.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name IN ('password', 'hashed_password');
  `);
  
  // Determine which password column to use
  const hasPasswordColumn = columns.some(col => col.column_name === 'password');
  const hasHashedPasswordColumn = columns.some(col => col.column_name === 'hashed_password');
  
  // Hash the password
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, saltRounds);
  
  // Check for other columns
  const { rows: tableColumns } = await client.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'users';
  `);
  
  const columnNames = tableColumns.map(col => col.column_name);
  
  // Build dynamic query based on available columns
  let query = 'INSERT INTO users (';
  let valuesPart = 'VALUES (';
  let params = [];
  let paramIndex = 1;
  
  // Add required fields
  if (columnNames.includes('username')) {
    query += 'username, ';
    valuesPart += `$${paramIndex++}, `;
    params.push(ADMIN_USERNAME);
  }
  
  if (columnNames.includes('email')) {
    query += 'email, ';
    valuesPart += `$${paramIndex++}, `;
    params.push(ADMIN_EMAIL);
  }
  
  // Add password field depending on schema
  if (hasPasswordColumn) {
    query += 'password, ';
    valuesPart += `$${paramIndex++}, `;
    params.push(hashedPassword);
  } else if (hasHashedPasswordColumn) {
    query += 'hashed_password, ';
    valuesPart += `$${paramIndex++}, `;
    params.push(hashedPassword);
  }
  
  // Add optional fields if they exist
  if (columnNames.includes('is_admin')) {
    query += 'is_admin, ';
    valuesPart += `$${paramIndex++}, `;
    params.push(true);
  }
  
  if (columnNames.includes('is_active')) {
    query += 'is_active, ';
    valuesPart += `$${paramIndex++}, `;
    params.push(true);
  }
  
  if (columnNames.includes('email_verified')) {
    query += 'email_verified, ';
    valuesPart += `$${paramIndex++}, `;
    params.push(true);
  }
  
  // Remove trailing comma and space
  query = query.slice(0, -2);
  valuesPart = valuesPart.slice(0, -2);
  
  // Complete the query
  query += ') ' + valuesPart + ') RETURNING *;';
  
  // Execute the query
  const { rows } = await client.query(query, params);
  console.log('✅ Admin user created successfully:', rows[0]);
  
  return rows[0];
}

// Update admin password if needed
async function updateAdminPassword(client, adminUser) {
  // Check if password column exists
  const { rows: columns } = await client.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name IN ('password', 'hashed_password');
  `);
  
  const hasPasswordColumn = columns.some(col => col.column_name === 'password');
  const hasHashedPasswordColumn = columns.some(col => col.column_name === 'hashed_password');
  
  if (!hasPasswordColumn && !hasHashedPasswordColumn) {
    console.log('⚠️ No password column found in users table');
    return;
  }
  
  // Hash the password
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, saltRounds);
  
  // Update the password
  let query;
  if (hasPasswordColumn) {
    query = `UPDATE users SET password = $1 WHERE id = $2 RETURNING *;`;
  } else {
    query = `UPDATE users SET hashed_password = $1 WHERE id = $2 RETURNING *;`;
  }
  
  const { rows } = await client.query(query, [hashedPassword, adminUser.id]);
  console.log('✅ Admin password updated successfully');
  
  return rows[0];
}

// Generate a JWT token for admin user
async function generateAdminToken(client) {
  const adminUser = await getAdminUser(client);
  if (!adminUser) {
    console.error('❌ Admin user not found when generating token');
    process.exit(1);
  }
  
  // Create payload - use email as subject
  const payload = {
    sub: adminUser.email || ADMIN_EMAIL,
    userId: adminUser.id,
    isAdmin: true,
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  };
  
  // Sign token
  const token = jwt.sign(payload, JWT_SECRET);
  return token;
}

main().catch(console.error);
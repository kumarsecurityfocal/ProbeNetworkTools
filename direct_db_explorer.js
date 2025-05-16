// Standalone Database Explorer
const express = require('express');
const { Pool } = require('pg');
const path = require('path');

// Create express app
const app = express();
const port = 4000; // Separate port for database explorer

// Middleware
app.use(express.static('public'));
app.use(express.json());

// Configure PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected successfully at:', res.rows[0].now);
  }
});

// HTML endpoint for direct database access
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'direct-database.html'));
});

// API endpoint to get database information
app.get('/api/db-info', async (req, res) => {
  try {
    // Get table list and information
    const tableListQuery = `
      SELECT 
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns 
         WHERE table_name = t.table_name) AS column_count
      FROM 
        information_schema.tables t
      WHERE 
        table_schema = 'public'
      ORDER BY 
        table_name;
    `;
    
    const tableResult = await pool.query(tableListQuery);
    
    // Get row counts for each table
    const tables = await Promise.all(
      tableResult.rows.map(async (table) => {
        try {
          const countQuery = `SELECT COUNT(*) FROM "${table.table_name}"`;
          const countResult = await pool.query(countQuery);
          return {
            name: table.table_name,
            rows: parseInt(countResult.rows[0].count),
            description: `${table.column_count} columns`
          };
        } catch (error) {
          console.error(`Error counting rows for ${table.table_name}:`, error);
          return {
            name: table.table_name,
            rows: 0,
            description: `${table.column_count} columns (error counting rows)`
          };
        }
      })
    );
    
    // Get database version
    const versionResult = await pool.query('SELECT version()');
    
    res.json({
      connected: true,
      tables: tables,
      status: 'Connected to PostgreSQL database',
      version: versionResult.rows[0].version.split(' ')[0],
      uptime: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching database info:', error);
    res.status(500).json({ 
      error: 'Failed to fetch database information',
      message: error.message 
    });
  }
});

// API endpoint to execute a query
app.post('/api/db-query', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'No query provided' });
    }
    
    // Security check - only allow SELECT queries
    if (!query.trim().toLowerCase().startsWith('select')) {
      return res.status(403).json({ 
        error: 'Only SELECT queries are allowed for security reasons' 
      });
    }
    
    console.log('Executing query:', query);
    
    // Measure query execution time
    const startTime = Date.now();
    const result = await pool.query(query);
    const executionTime = Date.now() - startTime;
    
    res.json({
      columns: result.fields.map(field => field.name),
      rows: result.rows,
      rowCount: result.rowCount,
      query_time: `${executionTime}ms`,
      status: 'success'
    });
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).json({ 
      error: 'Error executing query',
      message: error.message 
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Direct database explorer running on port ${port}`);
});
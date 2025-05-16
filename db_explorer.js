// Direct Database Explorer API
const express = require('express');
const { Pool } = require('pg');
const path = require('path');

// Create a standalone express app for the database explorer
const app = express();
const port = 4000;

// Parse JSON requests
app.use(express.json());

// Set up PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Get database information
app.get('/api/db-info', async (req, res) => {
  try {
    // Get list of tables
    const tablesQuery = `
      SELECT 
        table_name as name,
        (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) as columns
      FROM 
        information_schema.tables t
      WHERE 
        table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY 
        table_name
    `;
    
    const tablesResult = await pool.query(tablesQuery);
    
    // Get row counts for each table
    const tables = await Promise.all(tablesResult.rows.map(async (table) => {
      try {
        const countResult = await pool.query(`SELECT COUNT(*) FROM "${table.name}"`);
        return {
          ...table,
          rows: parseInt(countResult.rows[0].count),
          description: `Table ${table.name} with ${table.columns} columns`
        };
      } catch (error) {
        console.error(`Error counting rows for ${table.name}:`, error);
        return {
          ...table,
          rows: 0,
          description: `Table ${table.name} with ${table.columns} columns`
        };
      }
    }));
    
    // Get database version
    const versionResult = await pool.query('SELECT version()');
    const version = versionResult.rows[0].version.split(' ')[0];
    
    res.json({
      connected: true,
      tables: tables,
      status: 'Connected to PostgreSQL database',
      version: version,
      uptime: 'Database online'
    });
  } catch (error) {
    console.error('Error fetching database info:', error);
    res.status(500).json({
      connected: false,
      tables: [],
      status: 'Error connecting to database',
      error: error.message
    });
  }
});

// Execute a query
app.post('/api/query', async (req, res) => {
  try {
    const { query } = req.body;
    
    // Security check: only allow SELECT queries
    if (!query || !query.trim().toLowerCase().startsWith('select')) {
      return res.status(403).json({ 
        error: 'Only SELECT queries are allowed for security reasons' 
      });
    }
    
    // Measure execution time
    const startTime = Date.now();
    
    // Execute the query
    const result = await pool.query(query);
    
    // Calculate execution time
    const executionTime = Date.now() - startTime;
    
    // If we have results, return them
    if (result.rows && result.rows.length > 0) {
      // Extract column names from the first row
      const columns = Object.keys(result.rows[0]);
      
      res.json({
        columns: columns,
        rows: result.rows,
        query_time: `${executionTime}ms`,
        status: 'success'
      });
    } else {
      res.json({
        columns: [],
        rows: [],
        query_time: `${executionTime}ms`,
        status: 'success',
        message: 'Query executed successfully, but no results were returned'
      });
    }
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).json({ 
      error: `Error executing query: ${error.message}` 
    });
  }
});

// Direct database page
app.get('/db', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'direct-database.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Database explorer running on port ${port}`);
});

module.exports = app;
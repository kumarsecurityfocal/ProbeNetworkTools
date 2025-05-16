// Simple database explorer for ProbeOps
// This standalone server provides direct access to the database

const express = require('express');
const { Pool } = require('pg');
const path = require('path');

// Create express app
const app = express();
const PORT = 7000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Create database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Test database connection on startup
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected at:', res.rows[0].now);
  }
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'db-explorer.html'));
});

// API endpoint to get tables
app.get('/api/db-tables', async (req, res) => {
  try {
    // Get table list from database
    const result = await pool.query(`
      SELECT 
        table_name, 
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM 
        information_schema.tables t 
      WHERE 
        table_schema = 'public' 
      ORDER BY 
        table_name
    `);
    
    // Get row counts for each table
    const tables = await Promise.all(
      result.rows.map(async (table) => {
        try {
          const countResult = await pool.query(`SELECT COUNT(*) FROM "${table.table_name}"`);
          return {
            name: table.table_name,
            row_count: parseInt(countResult.rows[0].count),
            columns: table.column_count
          };
        } catch (error) {
          console.error(`Error counting rows for ${table.table_name}:`, error);
          return {
            name: table.table_name,
            row_count: 0,
            columns: table.column_count
          };
        }
      })
    );
    
    res.json({ 
      success: true, 
      tables 
    });
  } catch (error) {
    console.error('Error getting tables:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// API endpoint to execute queries
app.post('/api/db-query', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ 
        success: false, 
        error: 'No query provided' 
      });
    }
    
    // Security check: only allow SELECT queries
    if (!query.trim().toLowerCase().startsWith('select')) {
      return res.status(403).json({ 
        success: false, 
        error: 'Only SELECT queries are allowed for security reasons' 
      });
    }
    
    console.log('Executing query:', query);
    
    // Execute the query with timeout
    const startTime = Date.now();
    const queryResult = await pool.query(query);
    const executionTime = Date.now() - startTime;
    
    // Format the response
    res.json({
      success: true,
      columns: queryResult.fields.map(f => f.name),
      rows: queryResult.rows,
      rowCount: queryResult.rowCount,
      executionTime: `${executionTime}ms`
    });
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// API endpoint to get table schema
app.get('/api/db-schema/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    
    if (!tableName) {
      return res.status(400).json({ 
        success: false, 
        error: 'Table name is required' 
      });
    }
    
    // Get table columns
    const columnsResult = await pool.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable, 
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale,
        udt_name
      FROM 
        information_schema.columns 
      WHERE 
        table_schema = 'public' 
        AND table_name = $1
      ORDER BY 
        ordinal_position
    `, [tableName]);
    
    // Get foreign keys
    const foreignKeysResult = await pool.query(`
      SELECT
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM
        information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE
        tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = $1
    `, [tableName]);
    
    // Get indexes
    const indexesResult = await pool.query(`
      SELECT
        i.relname AS index_name,
        a.attname AS column_name,
        ix.indisunique AS is_unique,
        ix.indisprimary AS is_primary
      FROM
        pg_index ix
        JOIN pg_class i ON i.oid = ix.indexrelid
        JOIN pg_class t ON t.oid = ix.indrelid
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      WHERE
        t.relname = $1
        AND t.relkind = 'r'
      ORDER BY
        i.relname, a.attnum
    `, [tableName]);
    
    res.json({
      success: true,
      table: tableName,
      columns: columnsResult.rows,
      foreignKeys: foreignKeysResult.rows,
      indexes: indexesResult.rows
    });
  } catch (error) {
    console.error(`Error getting schema for ${req.params.tableName}:`, error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Database explorer running on port ${PORT}`);
});
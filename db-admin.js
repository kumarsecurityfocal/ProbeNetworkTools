// Database Admin Utility
// This module provides functions for database administration
const { Pool } = require('pg');

// Create a database pool
let pool = null;

// Initialize the database pool
function initPool() {
  if (!pool) {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL environment variable not found');
    }
    
    pool = new Pool({
      connectionString: dbUrl
    });
  }
  return pool;
}

// Get a list of tables
async function getTables() {
  const client = await initPool().connect();
  try {
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    return result.rows.map(row => row.table_name);
  } finally {
    client.release();
  }
}

// Get table data
async function getTableData(tableName) {
  // Sanitize table name to prevent SQL injection
  if (!tableName.match(/^[a-zA-Z0-9_]+$/)) {
    throw new Error('Invalid table name');
  }
  
  const client = await initPool().connect();
  try {
    // Get column information
    const columnQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `;
    const columnResult = await client.query(columnQuery, [tableName]);
    const columns = columnResult.rows.map(row => row.column_name);
    
    // Get table data
    const dataQuery = `SELECT * FROM "${tableName}" LIMIT 100`;
    const dataResult = await client.query(dataQuery);
    
    return {
      columns,
      rows: dataResult.rows
    };
  } finally {
    client.release();
  }
}

// Update a row in a table
async function updateRow(tableName, originalRow, updatedRow) {
  // Sanitize table name to prevent SQL injection
  if (!tableName.match(/^[a-zA-Z0-9_]+$/)) {
    throw new Error('Invalid table name');
  }
  
  const client = await initPool().connect();
  try {
    // Identify the primary key columns
    const pkQuery = `
      SELECT a.attname
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = $1::regclass AND i.indisprimary
    `;
    const pkResult = await client.query(pkQuery, [`public.${tableName}`]);
    const primaryKeys = pkResult.rows.map(row => row.attname);
    
    // If no primary key is found, use all columns for condition
    const conditionColumns = primaryKeys.length > 0 ? primaryKeys : Object.keys(originalRow);
    
    // Build the condition part of the query
    const conditions = [];
    const conditionValues = [];
    
    conditionColumns.forEach((column, index) => {
      conditions.push(`"${column}" = $${index + 1}`);
      conditionValues.push(originalRow[column]);
    });
    
    // Build the update part of the query
    const updates = [];
    const updateValues = [];
    let valueCounter = conditionValues.length;
    
    Object.entries(updatedRow).forEach(([column, value]) => {
      updates.push(`"${column}" = $${valueCounter + 1}`);
      updateValues.push(value);
      valueCounter++;
    });
    
    // Create the update query
    const updateQuery = `
      UPDATE "${tableName}"
      SET ${updates.join(', ')}
      WHERE ${conditions.join(' AND ')}
      RETURNING *
    `;
    
    // Execute the update
    const result = await client.query(
      updateQuery,
      [...conditionValues, ...updateValues]
    );
    
    if (result.rows.length === 0) {
      throw new Error('No rows were updated. The row may have been modified or deleted.');
    }
    
    return result.rows[0];
  } finally {
    client.release();
  }
}

// Delete a row from a table
async function deleteRow(tableName, row) {
  // Sanitize table name to prevent SQL injection
  if (!tableName.match(/^[a-zA-Z0-9_]+$/)) {
    throw new Error('Invalid table name');
  }
  
  const client = await initPool().connect();
  try {
    // Identify the primary key columns
    const pkQuery = `
      SELECT a.attname
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = $1::regclass AND i.indisprimary
    `;
    const pkResult = await client.query(pkQuery, [`public.${tableName}`]);
    const primaryKeys = pkResult.rows.map(row => row.attname);
    
    // If no primary key is found, use all columns for condition
    const conditionColumns = primaryKeys.length > 0 ? primaryKeys : Object.keys(row);
    
    // Build the condition part of the query
    const conditions = [];
    const values = [];
    
    conditionColumns.forEach((column, index) => {
      conditions.push(`"${column}" = $${index + 1}`);
      values.push(row[column]);
    });
    
    // Create the delete query
    const deleteQuery = `
      DELETE FROM "${tableName}"
      WHERE ${conditions.join(' AND ')}
      RETURNING *
    `;
    
    // Execute the delete
    const result = await client.query(deleteQuery, values);
    
    if (result.rows.length === 0) {
      throw new Error('No rows were deleted. The row may have been modified or deleted.');
    }
    
    return { success: true, deletedCount: result.rows.length };
  } finally {
    client.release();
  }
}

// Execute a custom SQL query
async function executeQuery(query) {
  const client = await initPool().connect();
  try {
    // Execute the query
    const result = await client.query(query);
    
    return {
      rows: result.rows,
      rowCount: result.rowCount,
      affected: !result.fields || result.fields.length === 0
    };
  } finally {
    client.release();
  }
}

module.exports = {
  getTables,
  getTableData,
  updateRow,
  deleteRow,
  executeQuery
};
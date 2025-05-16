// Simple Database Explorer - Standalone tool that bypasses authentication
const express = require('express');
const { Pool } = require('pg');
const path = require('path');

// Create express app
const app = express();
const PORT = 7777;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected successfully:', res.rows[0].now);
  }
});

// Root route - HTML interface
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>ProbeOps Simple DB Explorer</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          background-color: #f5f5f5;
        }
        h1, h2 {
          color: #333;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
        }
        .card {
          background: white;
          border-radius: 5px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          padding: 20px;
          margin-bottom: 20px;
        }
        .form-group {
          margin-bottom: 15px;
        }
        label {
          display: block;
          margin-bottom: 5px;
          font-weight: bold;
        }
        textarea {
          width: 100%;
          min-height: 100px;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-family: monospace;
        }
        button {
          background-color: #4CAF50;
          color: white;
          border: none;
          padding: 10px 15px;
          border-radius: 4px;
          cursor: pointer;
        }
        button:hover {
          background-color: #45a049;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        th, td {
          padding: 8px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }
        th {
          background-color: #f2f2f2;
        }
        .info {
          color: #31708f;
          background-color: #d9edf7;
          border-color: #bce8f1;
          padding: 15px;
          border-radius: 4px;
          margin-bottom: 20px;
        }
        .error {
          color: #a94442;
          background-color: #f2dede;
          border-color: #ebccd1;
          padding: 15px;
          border-radius: 4px;
          margin-bottom: 20px;
        }
        .success {
          color: #3c763d;
          background-color: #dff0d8;
          border-color: #d6e9c6;
          padding: 15px;
          border-radius: 4px;
          margin-bottom: 20px;
        }
        .table-list {
          list-style: none;
          padding: 0;
        }
        .table-list li {
          padding: 8px;
          border-bottom: 1px solid #eee;
          cursor: pointer;
        }
        .table-list li:hover {
          background-color: #f5f5f5;
        }
        .tabs {
          display: flex;
          margin-bottom: 20px;
        }
        .tab {
          padding: 10px 20px;
          cursor: pointer;
          border: 1px solid #ddd;
          background: #f9f9f9;
          margin-right: 5px;
        }
        .tab.active {
          background: #fff;
          border-bottom: 2px solid #4CAF50;
        }
        .tab-content {
          display: none;
        }
        .tab-content.active {
          display: block;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>ProbeOps Database Explorer</h1>
        <div class="info">
          This tool provides direct access to the PostgreSQL database without authentication.
          For security reasons, only SELECT queries are allowed.
        </div>
        
        <div class="tabs">
          <div class="tab active" data-tab="query">Query Database</div>
          <div class="tab" data-tab="tables">Tables</div>
          <div class="tab" data-tab="schema">Database Schema</div>
        </div>
        
        <div class="tab-content active" id="query-tab">
          <div class="card">
            <h2>Run SQL Query</h2>
            <div class="form-group">
              <label for="sql-query">SQL Query:</label>
              <textarea id="sql-query">SELECT * FROM users LIMIT 10;</textarea>
            </div>
            <button id="run-query">Run Query</button>
            <button id="examples">Examples</button>
            <div id="examples-menu" style="display:none; position:absolute; background:white; border:1px solid #ddd; padding:10px; z-index:100;">
              <ul class="table-list">
                <li data-query="SELECT * FROM users LIMIT 10;">Show Users</li>
                <li data-query="SELECT * FROM subscription_tiers LIMIT 10;">Show Subscription Tiers</li>
                <li data-query="SELECT * FROM subscriptions LIMIT 10;">Show Subscriptions</li>
                <li data-query="SELECT * FROM api_keys LIMIT 10;">Show API Keys</li>
                <li data-query="SELECT * FROM probe_nodes LIMIT 10;">Show Probe Nodes</li>
                <li data-query="SELECT * FROM diagnostic_history LIMIT 10;">Show Diagnostic History</li>
                <li data-query="SELECT u.username, u.email, st.name as tier_name, s.expires_at FROM users u JOIN subscriptions s ON u.id = s.user_id JOIN subscription_tiers st ON s.tier_id = st.id LIMIT 10;">Users with Subscriptions</li>
              </ul>
            </div>
            <div id="query-result"></div>
          </div>
        </div>
        
        <div class="tab-content" id="tables-tab">
          <div class="card">
            <h2>Database Tables</h2>
            <div id="tables-list"></div>
          </div>
        </div>
        
        <div class="tab-content" id="schema-tab">
          <div class="card">
            <h2>Database Schema</h2>
            <div id="schema-info"></div>
          </div>
        </div>
      </div>
      
      <script>
        // Switch tabs
        document.querySelectorAll('.tab').forEach(tab => {
          tab.addEventListener('click', () => {
            // Remove active class from all tabs
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab + '-tab').classList.add('active');
            
            // Load data for the tab if needed
            if (tab.dataset.tab === 'tables') {
              loadTables();
            } else if (tab.dataset.tab === 'schema') {
              loadSchema();
            }
          });
        });
        
        // Example queries dropdown
        document.getElementById('examples').addEventListener('click', function(e) {
          const menu = document.getElementById('examples-menu');
          menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
          menu.style.top = (e.target.offsetTop + e.target.offsetHeight) + 'px';
          menu.style.left = e.target.offsetLeft + 'px';
          e.stopPropagation();
        });
        
        document.addEventListener('click', function() {
          document.getElementById('examples-menu').style.display = 'none';
        });
        
        document.querySelectorAll('#examples-menu li').forEach(item => {
          item.addEventListener('click', function() {
            document.getElementById('sql-query').value = this.dataset.query;
            document.getElementById('examples-menu').style.display = 'none';
          });
        });
        
        // Run query
        document.getElementById('run-query').addEventListener('click', async function() {
          const queryResult = document.getElementById('query-result');
          queryResult.innerHTML = '<div class="info">Running query...</div>';
          
          const query = document.getElementById('sql-query').value;
          
          try {
            const response = await fetch('/api/query', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ query })
            });
            
            const data = await response.json();
            
            if (data.error) {
              queryResult.innerHTML = '<div class="error">' + data.error + '</div>';
              return;
            }
            
            if (data.rows.length === 0) {
              queryResult.innerHTML = '<div class="info">Query returned no results</div>';
              return;
            }
            
            // Create table with results
            let tableHtml = '<table><thead><tr>';
            
            // Table headers
            const columns = Object.keys(data.rows[0]);
            columns.forEach(column => {
              tableHtml += '<th>' + column + '</th>';
            });
            
            tableHtml += '</tr></thead><tbody>';
            
            // Table rows
            data.rows.forEach(row => {
              tableHtml += '<tr>';
              columns.forEach(column => {
                if (row[column] === null) {
                  tableHtml += '<td><em>null</em></td>';
                } else {
                  tableHtml += '<td>' + row[column] + '</td>';
                }
              });
              tableHtml += '</tr>';
            });
            
            tableHtml += '</tbody></table>';
            
            queryResult.innerHTML = '<div class="success">Query returned ' + data.rows.length + ' rows</div>' + tableHtml;
          } catch (error) {
            queryResult.innerHTML = '<div class="error">Error: ' + error.message + '</div>';
          }
        });
        
        // Load tables
        async function loadTables() {
          const tablesList = document.getElementById('tables-list');
          tablesList.innerHTML = '<div class="info">Loading tables...</div>';
          
          try {
            const response = await fetch('/api/tables');
            const data = await response.json();
            
            if (data.error) {
              tablesList.innerHTML = '<div class="error">' + data.error + '</div>';
              return;
            }
            
            if (data.tables.length === 0) {
              tablesList.innerHTML = '<div class="info">No tables found in database</div>';
              return;
            }
            
            let html = '<ul class="table-list">';
            
            data.tables.forEach(table => {
              html += '<li data-table="' + table.table_name + '">' + table.table_name + ' (' + table.row_count + ' rows)</li>';
            });
            
            html += '</ul>';
            
            tablesList.innerHTML = html;
            
            // Add click event to tables
            document.querySelectorAll('#tables-list li').forEach(item => {
              item.addEventListener('click', function() {
                document.getElementById('sql-query').value = 'SELECT * FROM ' + this.dataset.table + ' LIMIT 100;';
                
                // Switch to query tab
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                document.querySelector('.tab[data-tab="query"]').classList.add('active');
                document.getElementById('query-tab').classList.add('active');
                
                // Run the query
                document.getElementById('run-query').click();
              });
            });
          } catch (error) {
            tablesList.innerHTML = '<div class="error">Error: ' + error.message + '</div>';
          }
        }
        
        // Load schema
        async function loadSchema() {
          const schemaInfo = document.getElementById('schema-info');
          schemaInfo.innerHTML = '<div class="info">Loading schema...</div>';
          
          try {
            const response = await fetch('/api/schema');
            const data = await response.json();
            
            if (data.error) {
              schemaInfo.innerHTML = '<div class="error">' + data.error + '</div>';
              return;
            }
            
            if (Object.keys(data.tables).length === 0) {
              schemaInfo.innerHTML = '<div class="info">No schema information available</div>';
              return;
            }
            
            let html = '';
            
            for (const tableName in data.tables) {
              html += '<div class="card"><h3>' + tableName + '</h3><table><thead><tr>';
              html += '<th>Column</th><th>Type</th><th>Nullable</th><th>Default</th>';
              html += '</tr></thead><tbody>';
              
              data.tables[tableName].forEach(column => {
                html += '<tr>';
                html += '<td>' + column.column_name + '</td>';
                html += '<td>' + column.data_type + '</td>';
                html += '<td>' + (column.is_nullable === 'YES' ? 'YES' : 'NO') + '</td>';
                html += '<td>' + (column.column_default || '') + '</td>';
                html += '</tr>';
              });
              
              html += '</tbody></table></div>';
            }
            
            schemaInfo.innerHTML = html;
          } catch (error) {
            schemaInfo.innerHTML = '<div class="error">Error: ' + error.message + '</div>';
          }
        }
      </script>
    </body>
    </html>
  `);
});

// API route to execute a query
app.post('/api/query', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'No query provided' });
    }
    
    // Security check: only allow SELECT queries
    if (!query.trim().toLowerCase().startsWith('select')) {
      return res.status(403).json({ error: 'Only SELECT queries are allowed for security reasons' });
    }
    
    console.log('Executing query:', query);
    
    const result = await pool.query(query);
    
    res.json({
      rows: result.rows,
      rowCount: result.rowCount
    });
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).json({ error: error.message });
  }
});

// API route to get tables
app.get('/api/tables', async (req, res) => {
  try {
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
            ...table,
            row_count: parseInt(countResult.rows[0].count)
          };
        } catch (error) {
          console.error(`Error counting rows for ${table.table_name}:`, error);
          return {
            ...table,
            row_count: 0
          };
        }
      })
    );
    
    res.json({ tables });
  } catch (error) {
    console.error('Error getting tables:', error);
    res.status(500).json({ error: error.message });
  }
});

// API route to get schema
app.get('/api/schema', async (req, res) => {
  try {
    // Get all tables first
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    const tables = {};
    
    // Get columns for each table
    for (const row of tablesResult.rows) {
      const tableName = row.table_name;
      
      const columnsResult = await pool.query(`
        SELECT 
          column_name, 
          data_type, 
          is_nullable, 
          column_default,
          ordinal_position
        FROM 
          information_schema.columns 
        WHERE 
          table_schema = 'public' AND table_name = $1
        ORDER BY 
          ordinal_position
      `, [tableName]);
      
      tables[tableName] = columnsResult.rows;
    }
    
    res.json({ tables });
  } catch (error) {
    console.error('Error getting schema:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Simple DB Explorer running on port ${PORT}`);
});
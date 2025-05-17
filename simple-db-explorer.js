// A simple standalone database explorer for token management
const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const app = express();
const port = 5001;

// Connect to PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Database explorer UI
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>ProbeOps DB Explorer</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 5px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
        h1, h2 { color: #333; }
        h1 { border-bottom: 1px solid #eee; padding-bottom: 10px; }
        button { background: #4CAF50; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; margin-right: 5px; }
        button.danger { background: #f44336; }
        button.secondary { background: #2196F3; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
        tr:hover { background-color: #f9f9f9; }
        .controls { margin-bottom: 15px; display: flex; align-items: center; }
        .search { margin-left: auto; padding: 6px; border-radius: 4px; border: 1px solid #ddd; }
        .modal { display: none; position: fixed; z-index: 1; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); }
        .modal-content { background-color: white; margin: 10% auto; padding: 20px; width: 50%; border-radius: 5px; }
        .close { color: #aaa; float: right; font-size: 28px; font-weight: bold; cursor: pointer; }
        .close:hover { color: black; }
        input, textarea { width: 100%; padding: 8px; margin: 5px 0 15px; border: 1px solid #ddd; border-radius: 4px; }
        label { font-weight: bold; }
        .modal-footer { margin-top: 15px; text-align: right; }
        .token-display { background: #f5f5f5; padding: 10px; border-radius: 4px; word-break: break-all; }
        .field-view { margin-bottom: 8px; }
        .field-name { font-weight: bold; margin-right: 5px; }
        .field-value { word-break: break-all; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>ProbeOps DB Explorer</h1>
        
        <div id="tables-section">
          <h2>Database Tables</h2>
          <div class="controls">
            <button id="refresh-tables">Refresh Tables</button>
            <input type="text" id="table-search" class="search" placeholder="Search tables...">
          </div>
          <table id="tables-list">
            <thead>
              <tr>
                <th>Table Name</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
        
        <div id="records-section" style="display: none; margin-top: 20px;">
          <h2 id="current-table">Table Records</h2>
          <div class="controls">
            <button id="back-to-tables" class="secondary">Back to Tables</button>
            <button id="add-record">Add Record</button>
            <input type="text" id="record-search" class="search" placeholder="Search records...">
          </div>
          <div id="records-container">
            <table id="records-list">
              <thead></thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      </div>
      
      <!-- Add/Edit Record Modal -->
      <div id="record-modal" class="modal">
        <div class="modal-content">
          <span class="close">&times;</span>
          <h2 id="modal-title">Add Record</h2>
          <form id="record-form">
            <div id="form-fields"></div>
            <div class="modal-footer">
              <button type="button" class="secondary close-btn">Cancel</button>
              <button type="submit">Save</button>
            </div>
          </form>
        </div>
      </div>
      
      <!-- View Record Modal -->
      <div id="view-modal" class="modal">
        <div class="modal-content">
          <span class="close">&times;</span>
          <h2>Record Details</h2>
          <div id="record-details"></div>
          <div class="modal-footer">
            <button type="button" class="secondary close-btn">Close</button>
          </div>
        </div>
      </div>
      
      <!-- Delete Confirmation Modal -->
      <div id="delete-modal" class="modal">
        <div class="modal-content">
          <span class="close">&times;</span>
          <h2>Confirm Deletion</h2>
          <p>Are you sure you want to delete this record? This action cannot be undone.</p>
          <div class="modal-footer">
            <button type="button" class="secondary close-btn">Cancel</button>
            <button type="button" id="confirm-delete" class="danger">Delete</button>
          </div>
        </div>
      </div>
      
      <!-- Generate Token Modal -->
      <div id="token-modal" class="modal">
        <div class="modal-content">
          <span class="close">&times;</span>
          <h2>Generate API Token</h2>
          <form id="token-form">
            <label for="token-description">Description</label>
            <input type="text" id="token-description" placeholder="What is this token for?" required>
            
            <label for="token-expiry">Expiry (days)</label>
            <input type="number" id="token-expiry" min="1" max="365" value="30">
            
            <div class="modal-footer">
              <button type="button" class="secondary close-btn">Cancel</button>
              <button type="submit">Generate</button>
            </div>
          </form>
          
          <div id="token-result" style="display: none; margin-top: 20px;">
            <h3>Your New Token</h3>
            <p>Please copy this token now. It will not be shown again.</p>
            <div id="token-value" class="token-display"></div>
            <div style="margin-top: 10px;">
              <button id="copy-token">Copy to Clipboard</button>
            </div>
          </div>
        </div>
      </div>
      
      <script>
        // Global state
        let currentTable = '';
        let currentColumns = [];
        let deleteRecordId = null;
        
        // DOM elements
        const tablesSection = document.getElementById('tables-section');
        const recordsSection = document.getElementById('records-section');
        const tablesList = document.getElementById('tables-list').querySelector('tbody');
        const recordsList = document.getElementById('records-list');
        const currentTableHeader = document.getElementById('current-table');
        const recordSearch = document.getElementById('record-search');
        const tableSearch = document.getElementById('table-search');
        
        // Modal elements
        const recordModal = document.getElementById('record-modal');
        const viewModal = document.getElementById('view-modal');
        const deleteModal = document.getElementById('delete-modal');
        const tokenModal = document.getElementById('token-modal');
        const formFields = document.getElementById('form-fields');
        const recordForm = document.getElementById('record-form');
        const modalTitle = document.getElementById('modal-title');
        const recordDetails = document.getElementById('record-details');
        
        // Button handlers
        document.getElementById('refresh-tables').addEventListener('click', fetchTables);
        document.getElementById('back-to-tables').addEventListener('click', showTablesSection);
        document.getElementById('add-record').addEventListener('click', showAddRecordModal);
        document.getElementById('confirm-delete').addEventListener('click', deleteRecord);
        
        // Search handlers
        tableSearch.addEventListener('input', filterTables);
        recordSearch.addEventListener('input', filterRecords);
        
        // Modal close handlers
        document.querySelectorAll('.close, .close-btn').forEach(element => {
          element.addEventListener('click', () => {
            recordModal.style.display = 'none';
            viewModal.style.display = 'none';
            deleteModal.style.display = 'none';
            tokenModal.style.display = 'none';
          });
        });
        
        // Form submission handler
        recordForm.addEventListener('submit', saveRecord);
        
        // Token form handler
        document.getElementById('token-form').addEventListener('submit', generateToken);
        document.getElementById('copy-token').addEventListener('click', copyTokenToClipboard);
        
        // When the user clicks anywhere outside of the modals, close them
        window.addEventListener('click', (event) => {
          if (event.target === recordModal) recordModal.style.display = 'none';
          if (event.target === viewModal) viewModal.style.display = 'none';
          if (event.target === deleteModal) deleteModal.style.display = 'none';
          if (event.target === tokenModal) tokenModal.style.display = 'none';
        });
        
        // Initialize: fetch tables on load
        fetchTables();
        
        function filterTables() {
          const searchTerm = tableSearch.value.toLowerCase();
          const rows = tablesList.querySelectorAll('tr');
          rows.forEach(row => {
            const tableName = row.querySelector('td:first-child').textContent.toLowerCase();
            row.style.display = tableName.includes(searchTerm) ? '' : 'none';
          });
        }
        
        function filterRecords() {
          const searchTerm = recordSearch.value.toLowerCase();
          const rows = recordsList.querySelector('tbody').querySelectorAll('tr');
          rows.forEach(row => {
            let matchFound = false;
            row.querySelectorAll('td').forEach(cell => {
              if (cell.textContent.toLowerCase().includes(searchTerm)) {
                matchFound = true;
              }
            });
            row.style.display = matchFound ? '' : 'none';
          });
        }
        
        function showTablesSection() {
          tablesSection.style.display = 'block';
          recordsSection.style.display = 'none';
          currentTable = '';
        }
        
        function showRecordsSection(tableName) {
          currentTable = tableName;
          currentTableHeader.textContent = 'Table: ' + tableName;
          tablesSection.style.display = 'none';
          recordsSection.style.display = 'block';
          fetchTableData(tableName);
        }
        
        async function fetchTables() {
          try {
            const response = await fetch('/api/tables');
            const data = await response.json();
            
            tablesList.innerHTML = '';
            
            data.tables.forEach(table => {
              const row = document.createElement('tr');
              
              const nameCell = document.createElement('td');
              nameCell.textContent = table;
              row.appendChild(nameCell);
              
              const actionsCell = document.createElement('td');
              
              const viewButton = document.createElement('button');
              viewButton.textContent = 'View Records';
              viewButton.addEventListener('click', () => showRecordsSection(table));
              actionsCell.appendChild(viewButton);
              
              // Add special Token Generator button for api_keys table
              if (table === 'api_keys') {
                const tokenButton = document.createElement('button');
                tokenButton.textContent = 'Generate Token';
                tokenButton.className = 'secondary';
                tokenButton.style.marginLeft = '5px';
                tokenButton.addEventListener('click', showTokenModal);
                actionsCell.appendChild(tokenButton);
              }
              
              row.appendChild(actionsCell);
              tablesList.appendChild(row);
            });
          } catch (error) {
            console.error('Error fetching tables:', error);
            alert('Failed to fetch tables: ' + error.message);
          }
        }
        
        async function fetchTableData(tableName) {
          try {
            const response = await fetch(\`/api/tables/\${tableName}\`);
            const data = await response.json();
            
            // Extract column names and setup table header
            const headerRow = document.createElement('tr');
            const columns = data.columns;
            currentColumns = columns;
            
            columns.forEach(column => {
              const th = document.createElement('th');
              th.textContent = column;
              headerRow.appendChild(th);
            });
            
            // Add actions column
            const actionsHeader = document.createElement('th');
            actionsHeader.textContent = 'Actions';
            headerRow.appendChild(actionsHeader);
            
            recordsList.querySelector('thead').innerHTML = '';
            recordsList.querySelector('thead').appendChild(headerRow);
            
            // Populate table data
            const tbody = recordsList.querySelector('tbody');
            tbody.innerHTML = '';
            
            data.rows.forEach(row => {
              const tr = document.createElement('tr');
              
              columns.forEach(column => {
                const td = document.createElement('td');
                let value = row[column];
                
                // Format date values
                if (value && (column.includes('date') || column.includes('time'))) {
                  try {
                    value = new Date(value).toLocaleString();
                  } catch (e) {
                    // Keep original value if date parsing fails
                  }
                }
                
                // Truncate long text values
                if (typeof value === 'string' && value.length > 100) {
                  td.title = value; // Show full text on hover
                  value = value.substring(0, 100) + '...';
                }
                
                td.textContent = value === null ? 'NULL' : value;
                tr.appendChild(td);
              });
              
              // Add action buttons
              const actionsTd = document.createElement('td');
              
              const viewButton = document.createElement('button');
              viewButton.textContent = 'View';
              viewButton.addEventListener('click', () => showViewModal(row));
              actionsTd.appendChild(viewButton);
              
              const editButton = document.createElement('button');
              editButton.textContent = 'Edit';
              editButton.className = 'secondary';
              editButton.style.marginLeft = '5px';
              editButton.addEventListener('click', () => showEditRecordModal(row));
              actionsTd.appendChild(editButton);
              
              const deleteButton = document.createElement('button');
              deleteButton.textContent = 'Delete';
              deleteButton.className = 'danger';
              deleteButton.style.marginLeft = '5px';
              deleteButton.addEventListener('click', () => showDeleteModal(row));
              actionsTd.appendChild(deleteButton);
              
              tr.appendChild(actionsTd);
              tbody.appendChild(tr);
            });
          } catch (error) {
            console.error('Error fetching table data:', error);
            alert('Failed to fetch table data: ' + error.message);
          }
        }
        
        function showAddRecordModal() {
          modalTitle.textContent = 'Add New Record';
          formFields.innerHTML = '';
          
          currentColumns.forEach(column => {
            const label = document.createElement('label');
            label.setAttribute('for', column);
            label.textContent = column;
            
            const input = document.createElement('input');
            input.setAttribute('name', column);
            input.setAttribute('id', column);
            
            if (column.includes('date') || column.includes('time')) {
              // Date/time inputs
              if (column.includes('time')) {
                input.setAttribute('type', 'datetime-local');
              } else {
                input.setAttribute('type', 'date');
              }
            } else if (column === 'id' || column.endsWith('_id')) {
              // For primary keys or foreign keys
              input.setAttribute('type', 'number');
              if (column === 'id') {
                input.setAttribute('readonly', 'readonly');
                input.setAttribute('placeholder', 'Auto-generated');
              }
            } else {
              // Default to text input
              input.setAttribute('type', 'text');
            }
            
            formFields.appendChild(label);
            formFields.appendChild(input);
          });
          
          // Set form data attribute to indicate this is a new record
          recordForm.setAttribute('data-mode', 'add');
          recordForm.setAttribute('data-id', '');
          recordModal.style.display = 'block';
        }
        
        function showEditRecordModal(row) {
          modalTitle.textContent = 'Edit Record';
          formFields.innerHTML = '';
          
          currentColumns.forEach(column => {
            const label = document.createElement('label');
            label.setAttribute('for', column);
            label.textContent = column;
            
            const input = document.createElement('input');
            input.setAttribute('name', column);
            input.setAttribute('id', column);
            
            if (column.includes('date') || column.includes('time')) {
              // Process date/time fields
              if (column.includes('time')) {
                input.setAttribute('type', 'datetime-local');
                if (row[column]) {
                  // Format for datetime-local input (YYYY-MM-DDTHH:MM)
                  const date = new Date(row[column]);
                  input.value = date.toISOString().slice(0, 16);
                }
              } else {
                input.setAttribute('type', 'date');
                if (row[column]) {
                  // Format for date input (YYYY-MM-DD)
                  const date = new Date(row[column]);
                  input.value = date.toISOString().slice(0, 10);
                }
              }
            } else if (column === 'id' || column.endsWith('_id')) {
              // Primary keys or foreign keys
              input.setAttribute('type', 'number');
              if (column === 'id') {
                input.setAttribute('readonly', 'readonly');
              }
              input.value = row[column] !== null ? row[column] : '';
            } else {
              // Default text fields
              input.setAttribute('type', 'text');
              input.value = row[column] !== null ? row[column] : '';
            }
            
            formFields.appendChild(label);
            formFields.appendChild(input);
          });
          
          // Set form data attributes for edit mode
          recordForm.setAttribute('data-mode', 'edit');
          recordForm.setAttribute('data-id', row.id);
          recordModal.style.display = 'block';
        }
        
        function showViewModal(row) {
          recordDetails.innerHTML = '';
          
          currentColumns.forEach(column => {
            const fieldContainer = document.createElement('div');
            fieldContainer.className = 'field-view';
            
            const fieldName = document.createElement('span');
            fieldName.className = 'field-name';
            fieldName.textContent = column + ':';
            
            const fieldValue = document.createElement('span');
            fieldValue.className = 'field-value';
            
            let value = row[column];
            
            // Format date values
            if (value && (column.includes('date') || column.includes('time'))) {
              try {
                value = new Date(value).toLocaleString();
              } catch (e) {
                // Keep original value if date parsing fails
              }
            }
            
            fieldValue.textContent = value === null ? 'NULL' : value;
            
            fieldContainer.appendChild(fieldName);
            fieldContainer.appendChild(fieldValue);
            recordDetails.appendChild(fieldContainer);
          });
          
          viewModal.style.display = 'block';
        }
        
        function showDeleteModal(row) {
          deleteRecordId = row.id;
          deleteModal.style.display = 'block';
        }
        
        function showTokenModal() {
          document.getElementById('token-result').style.display = 'none';
          document.getElementById('token-description').value = '';
          document.getElementById('token-expiry').value = '30';
          document.getElementById('token-form').style.display = 'block';
          tokenModal.style.display = 'block';
        }
        
        async function saveRecord(event) {
          event.preventDefault();
          
          const formData = {};
          currentColumns.forEach(column => {
            const input = document.getElementById(column);
            if (input.value || input.value === 0) {
              formData[column] = input.value;
            } else {
              formData[column] = null;
            }
          });
          
          const mode = recordForm.getAttribute('data-mode');
          
          try {
            let response;
            if (mode === 'add') {
              response = await fetch(\`/api/tables/\${currentTable}\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
              });
            } else {
              const recordId = recordForm.getAttribute('data-id');
              response = await fetch(\`/api/tables/\${currentTable}/\${recordId}\`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
              });
            }
            
            if (!response.ok) {
              throw new Error(\`Server error: \${response.status}\`);
            }
            
            recordModal.style.display = 'none';
            fetchTableData(currentTable);
          } catch (error) {
            console.error('Error saving record:', error);
            alert('Failed to save record: ' + error.message);
          }
        }
        
        async function deleteRecord() {
          try {
            const response = await fetch(\`/api/tables/\${currentTable}/\${deleteRecordId}\`, {
              method: 'DELETE'
            });
            
            if (!response.ok) {
              throw new Error(\`Server error: \${response.status}\`);
            }
            
            deleteModal.style.display = 'none';
            fetchTableData(currentTable);
          } catch (error) {
            console.error('Error deleting record:', error);
            alert('Failed to delete record: ' + error.message);
          }
        }
        
        async function generateToken(event) {
          event.preventDefault();
          
          const description = document.getElementById('token-description').value;
          const expiry = document.getElementById('token-expiry').value;
          
          if (!description) {
            alert('Please enter a description for the token');
            return;
          }
          
          try {
            const response = await fetch('/api/generate-token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ description, expiry })
            });
            
            if (!response.ok) {
              throw new Error(\`Server error: \${response.status}\`);
            }
            
            const data = await response.json();
            
            // Hide the form and show the token result
            document.getElementById('token-form').style.display = 'none';
            document.getElementById('token-result').style.display = 'block';
            document.getElementById('token-value').textContent = data.token;
            
            // Refresh the api_keys table if currently viewing it
            if (currentTable === 'api_keys') {
              fetchTableData('api_keys');
            }
          } catch (error) {
            console.error('Error generating token:', error);
            alert('Failed to generate token: ' + error.message);
          }
        }
        
        function copyTokenToClipboard() {
          const tokenValue = document.getElementById('token-value').textContent;
          navigator.clipboard.writeText(tokenValue)
            .then(() => {
              alert('Token copied to clipboard');
            })
            .catch(err => {
              console.error('Could not copy text: ', err);
              alert('Failed to copy token');
            });
        }
      </script>
    </body>
    </html>
  `);
});

// API endpoints
app.get('/api/tables', async (req, res) => {
  try {
    const query = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    const result = await pool.query(query);
    const tables = result.rows.map(row => row.table_name);
    res.json({ tables });
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tables/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    
    // Get column information
    const columnsQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `;
    const columnsResult = await pool.query(columnsQuery, [tableName]);
    const columns = columnsResult.rows.map(row => row.column_name);
    
    // Get table data
    const dataQuery = `SELECT * FROM "${tableName}" ORDER BY id DESC LIMIT 100`;
    const dataResult = await pool.query(dataQuery);
    
    res.json({
      columns,
      rows: dataResult.rows
    });
  } catch (error) {
    console.error(`Error fetching data for table ${req.params.tableName}:`, error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tables/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    const recordData = req.body;
    
    // Filter out null/undefined values and the id field if it's empty
    const filteredData = Object.entries(recordData)
      .filter(([key, value]) => value !== null && value !== undefined && !(key === 'id' && !value))
      .reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {});
    
    const columns = Object.keys(filteredData);
    const values = Object.values(filteredData);
    const placeholders = values.map((_, i) => `$${i + 1}`);
    
    // Build and execute INSERT query
    const query = `
      INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(`Error adding record to table ${req.params.tableName}:`, error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/tables/:tableName/:id', async (req, res) => {
  try {
    const { tableName, id } = req.params;
    const recordData = req.body;
    
    // Filter out null/undefined values and the id field
    const filteredData = Object.entries(recordData)
      .filter(([key, value]) => key !== 'id')
      .reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {});
    
    const columns = Object.keys(filteredData);
    const values = Object.values(filteredData);
    
    // Build SET clause for UPDATE query
    const setClause = columns.map((col, i) => `"${col}" = $${i + 1}`).join(', ');
    
    // Build and execute UPDATE query
    const query = `
      UPDATE "${tableName}"
      SET ${setClause}
      WHERE id = $${values.length + 1}
      RETURNING *
    `;
    
    const result = await pool.query(query, [...values, id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error(`Error updating record in table ${req.params.tableName}:`, error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/tables/:tableName/:id', async (req, res) => {
  try {
    const { tableName, id } = req.params;
    
    // Execute DELETE query
    const query = `DELETE FROM "${tableName}" WHERE id = $1 RETURNING *`;
    const result = await pool.query(query, [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }
    
    res.json({ message: 'Record deleted successfully' });
  } catch (error) {
    console.error(`Error deleting record from table ${req.params.tableName}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// API token generation endpoint
app.post('/api/generate-token', async (req, res) => {
  try {
    const { description, expiry } = req.body;
    
    // Generate a secure random token
    const crypto = require('crypto');
    const tokenValue = crypto.randomBytes(32).toString('hex');
    
    // Calculate expiry date
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + parseInt(expiry, 10));
    
    // Insert token into database
    const query = `
      INSERT INTO api_keys (description, value, expiry_date, used)
      VALUES ($1, $2, $3, false)
      RETURNING *
    `;
    
    const result = await pool.query(query, [description, tokenValue, expiryDate]);
    
    res.status(201).json({
      id: result.rows[0].id,
      token: tokenValue,
      message: 'Token created successfully'
    });
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(port, () => {
  console.log(`DB Explorer running on port ${port}`);
  console.log(`Visit http://localhost:${port} to use the database explorer`);
});
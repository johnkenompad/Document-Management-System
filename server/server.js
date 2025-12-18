const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const readlineSync = require('readline-sync');
require('dotenv').config(); // Load environment variables

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0'; // Bind to all network interfaces

// Multer for file uploads - only accept images
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    // Use original filename with timestamp to prevent conflicts
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    cb(null, nameWithoutExt + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Accept images, PDFs, and Word documents
    const allowedTypes = [
      'image/',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    const isAllowed = allowedTypes.some(type => file.mimetype.startsWith(type) || file.mimetype === type);
    
    if (isAllowed) {
      cb(null, true);
    } else {
      cb(new Error('Only images, PDFs, and Word documents are allowed!'), false);
    }
  },
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit for documents
  }
});

// Separate upload handler for database imports (no file type restrictions)
const dbUpload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit for database files
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Configuration for network database path
// Change this to your network folder path (e.g., '\\\\SERVER\\SharedFolder\\database.db')
let networkDbPath = null; // Will be set when database is imported
let dbPath = path.join(__dirname, 'database.db'); // Default local path
let db = null;

// Database selection function
const selectDatabase = () => {
  console.log('\n' + '='.repeat(60));
  console.log('  DATABASE SELECTION');
  console.log('='.repeat(60) + '\n');

  // Get available databases
  const sharedDbFolder = path.join(__dirname, 'shared-databases');
  const localDbPath = path.join(__dirname, 'database.db');
  const lastSelectedFile = path.join(__dirname, 'last-database.txt');
  
  let databases = [];
  
  // Check for local database
  if (fs.existsSync(localDbPath)) {
    databases.push({
      name: 'Local Database (database.db)',
      path: localDbPath,
      type: 'local'
    });
  }
  
  // Check for shared databases folder
  if (fs.existsSync(sharedDbFolder)) {
    const files = fs.readdirSync(sharedDbFolder);
    const dbFiles = files.filter(f => f.endsWith('.db'));
    
    dbFiles.forEach(file => {
      databases.push({
        name: `Shared: ${file}`,
        path: path.join(sharedDbFolder, file),
        type: 'shared'
      });
    });
  }
  
  // Add option to create new database
  databases.push({
    name: 'Create New Database',
    path: null,
    type: 'new'
  });
  
  if (databases.length === 1) {
    console.log('No databases found. Creating new local database...');
    return localDbPath;
  }
  
  // Display databases with file info
  console.log('Available Databases:\n');
  databases.forEach((db, index) => {
    if (db.path && fs.existsSync(db.path)) {
      const stats = fs.statSync(db.path);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      const modified = stats.mtime.toLocaleString();
      console.log(`  [${index + 1}] ${db.name}`);
      console.log(`      Size: ${sizeMB} MB | Last Modified: ${modified}`);
    } else {
      console.log(`  [${index + 1}] ${db.name}`);
    }
    console.log('');
  });
  
  // Check if there's a last selected database
  let defaultChoice = 1;
  if (fs.existsSync(lastSelectedFile)) {
    try {
      const lastPath = fs.readFileSync(lastSelectedFile, 'utf8').trim();
      const lastIndex = databases.findIndex(db => db.path === lastPath);
      if (lastIndex !== -1) {
        defaultChoice = lastIndex + 1;
        console.log(`Last used: [${defaultChoice}] ${databases[lastIndex].name}\n`);
      }
    } catch (err) {
      // Ignore errors reading last database file
    }
  }
  
  const choice = readlineSync.questionInt(
    `Select database [1-${databases.length}] (default: ${defaultChoice}): `,
    { defaultInput: defaultChoice.toString() }
  );
  
  if (choice < 1 || choice > databases.length) {
    console.log('Invalid choice. Using default database.');
    return localDbPath;
  }
  
  const selected = databases[choice - 1];
  
  if (selected.type === 'new') {
    const dbName = readlineSync.question('Enter new database name (without .db): ');
    const saveTo = readlineSync.keyInSelect(
      ['Local (server folder)', 'Shared (shared-databases folder)'],
      'Save to:'
    );
    
    if (saveTo === -1) {
      console.log('Cancelled. Using default database.');
      return localDbPath;
    }
    
    const newDbPath = saveTo === 0 
      ? path.join(__dirname, `${dbName}.db`)
      : path.join(sharedDbFolder, `${dbName}.db`);
    
    console.log(`Creating new database at: ${newDbPath}`);
    
    // Save selection
    fs.writeFileSync(lastSelectedFile, newDbPath, 'utf8');
    return newDbPath;
  }
  
  console.log(`\nSelected: ${selected.name}`);
  console.log(`Path: ${selected.path}\n`);
  
  // Save last selection
  if (selected.path) {
    fs.writeFileSync(lastSelectedFile, selected.path, 'utf8');
  }
  
  return selected.path;
};

// Initialize database
const initDatabase = () => {
  // Ensure uploads folder exists
  if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads', { recursive: true });
  }

  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err);
    } else {
      console.log('Connected to SQLite database');
      createTables();
    }
  });
};

// Create tables
const createTables = () => {
  // Create documents table
  db.run(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      sender TEXT NOT NULL,
      recipient TEXT NOT NULL,
      department TEXT NOT NULL,
      documentType TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL,
      dateSent TEXT,
      dateReceived TEXT,
      lastUpdated TEXT,
      fileName TEXT,
      documentCategory TEXT DEFAULT 'queue',
      updatedBy TEXT,
      createdByUser TEXT
    )
  `, (err) => {
    if (err) {
      console.error('Error creating table:', err);
    } else {
      console.log('Documents table ready');
      // Add updatedBy column if it doesn't exist (for existing databases)
      db.run(`ALTER TABLE documents ADD COLUMN updatedBy TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding updatedBy column:', err);
        } else if (!err) {
          console.log('Added updatedBy column to existing table');
        }
      });
      // Add createdByUser column if it doesn't exist (for existing databases)
      db.run(`ALTER TABLE documents ADD COLUMN createdByUser TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding createdByUser column:', err);
        } else if (!err) {
          console.log('Added createdByUser column to existing table');
        }
      });
    }
  });

  // Create users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      department TEXT,
      createdAt TEXT,
      createdBy TEXT,
      preferences TEXT DEFAULT '{}'
    )
  `, (err) => {
    if (err) {
      console.error('Error creating users table:', err);
    } else {
      console.log('Users table ready');
      
      // Add department column if it doesn't exist (for existing databases)
      db.run(`ALTER TABLE users ADD COLUMN department TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding department column:', err);
        } else if (!err) {
          console.log('Added department column to users table');
        }
      });
      
      // Add preferences column if it doesn't exist (for existing databases)
      db.run(`ALTER TABLE users ADD COLUMN preferences TEXT DEFAULT '{}'`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding preferences column:', err);
        } else if (!err) {
          console.log('Added preferences column to users table');
        }
      });
      
      // Create default admin account if it doesn't exist
      db.get('SELECT * FROM users WHERE username = ?', ['admin'], (err, row) => {
        if (!row) {
          db.run(
            'INSERT INTO users (username, password, role, department, createdAt, createdBy) VALUES (?, ?, ?, ?, ?, ?)',
            ['admin', 'admin123', 'Admin', null, new Date().toLocaleString(), 'system'],
            (err) => {
              if (err) {
                console.error('Error creating default admin:', err);
              } else {
                console.log('Default admin account created');
              }
            }
          );
        }
      });
    }
  });
};

// Check for command line argument for auto-selection
const args = process.argv.slice(2);
const autoSelectFlag = args.find(arg => arg.startsWith('--db='));

if (autoSelectFlag) {
  // Auto-select database from command line
  const dbName = autoSelectFlag.split('=')[1];
  const sharedDbFolder = path.join(__dirname, 'shared-databases');
  const possiblePaths = [
    path.join(__dirname, dbName),
    path.join(__dirname, `${dbName}.db`),
    path.join(sharedDbFolder, dbName),
    path.join(sharedDbFolder, `${dbName}.db`)
  ];
  
  const foundPath = possiblePaths.find(p => fs.existsSync(p));
  if (foundPath) {
    dbPath = foundPath;
    console.log('Using database from command line:', dbPath);
  } else {
    console.log(`Database "${dbName}" not found. Please select manually.`);
    dbPath = selectDatabase();
  }
} else if (args.includes('--select') || args.includes('-s')) {
  // Force interactive selection
  dbPath = selectDatabase();
} else {
  // Check for last selected database
  const lastSelectedFile = path.join(__dirname, 'last-database.txt');
  if (fs.existsSync(lastSelectedFile)) {
    try {
      const lastPath = fs.readFileSync(lastSelectedFile, 'utf8').trim();
      if (fs.existsSync(lastPath)) {
        dbPath = lastPath;
        console.log('Using last selected database:', dbPath);
        console.log('(Use --select flag to choose a different database)\n');
      } else {
        console.log('Last selected database not found. Please select a database.');
        dbPath = selectDatabase();
      }
    } catch (err) {
      dbPath = selectDatabase();
    }
  } else {
    // No previous selection, use interactive selection
    dbPath = selectDatabase();
  }
}

// Initialize on startup
initDatabase();

// API Routes

// Get all documents
app.get('/api/documents', (req, res) => {
  db.all('SELECT * FROM documents', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ documents: rows });
  });
});

// Get documents by category
app.get('/api/documents/:category', (req, res) => {
  const category = req.params.category;
  db.all('SELECT documents.*, users.department AS senderDepartment FROM documents LEFT JOIN users ON documents.createdByUser = users.username WHERE documentCategory = ?', [category], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ documents: rows });
  });
});

// Add new document
app.post('/api/documents', (req, res) => {
  upload.single('attachedFile')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
        }
      } else if (err.message === 'Only image files are allowed!') {
        return res.status(400).json({ error: 'Only image files are allowed!' });
      }
      return res.status(500).json({ error: 'File upload error' });
    }

    const {
      title,
      sender,
      recipient,
      department,
      documentType,
      description,
      status,
      documentCategory,
      createdByUser
    } = req.body;

    const fileName = req.file ? req.file.filename : null;

    const timestamp = new Date().toISOString();

    db.run(
      `INSERT INTO documents (title, sender, recipient, department, documentType, description, status, dateSent, dateReceived, fileName, documentCategory, createdByUser)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, sender, recipient, department, documentType, description || '', status, timestamp, timestamp, fileName, documentCategory, createdByUser || null],
      function (err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({ id: this.lastID, message: 'Document created successfully' });
      }
    );
  });
});

// Update document status
app.put('/api/documents/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, category, updatedBy } = req.body;
  const timestamp = new Date().toISOString();

  let query = 'UPDATE documents SET status = ?, lastUpdated = ?';
  let params = [status, timestamp];

  if (updatedBy) {
    query += ', updatedBy = ?';
    params.push(updatedBy);
  }

  if (category) {
    query += ', documentCategory = ?';
    params.push(category);
  }

  query += ' WHERE id = ?';
  params.push(id);

  db.run(query, params, function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Document updated successfully', changes: this.changes });
  });
});

// Delete document
app.delete('/api/documents/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM documents WHERE id = ?', [id], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Document deleted successfully', changes: this.changes });
  });
});

// Get statistics
app.get('/api/stats', (req, res) => {
  const stats = {};

  db.get('SELECT COUNT(*) as count FROM documents WHERE documentCategory = ?', ['queue'], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    stats.queue = row.count;

    db.get('SELECT COUNT(*) as count FROM documents WHERE documentCategory = ?', ['received'], (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      stats.received = row.count;

      db.get('SELECT COUNT(*) as count FROM documents WHERE documentCategory = ?', ['archived'], (err, row) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        stats.archived = row.count;

        db.get('SELECT COUNT(*) as count FROM documents', [], (err, row) => {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          stats.total = row.count;
          res.json(stats);
        });
      });
    });
  });
});

// Export database
app.get('/api/export', (req, res) => {
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `dms-database-${timestamp}.db`;

  res.download(dbPath, filename, (err) => {
    if (err) {
      console.error('Error downloading database:', err);
      res.status(500).json({ error: 'Failed to export database' });
    }
  });
});

// Import database - file upload
app.post('/api/import', dbUpload.single('database'), (req, res) => {
  console.log('\n=== DATABASE IMPORT REQUEST ===');
  console.log('Time:', new Date().toISOString());
  
  if (!req.file) {
    console.error('Error: No file uploaded');
    return res.status(400).json({ error: 'No file uploaded. Please select a database file.' });
  }

  const uploadedPath = req.file.path;

  console.log('Importing database:', {
    originalName: req.file.originalname,
    size: `${(req.file.size / 1024).toFixed(2)}KB`,
    mimetype: req.file.mimetype,
    uploadedPath: uploadedPath
  });

  // Validate file is a SQLite database
  const validExtensions = ['.db', '.sqlite', '.sqlite3', '.db3'];
  const fileExt = path.extname(req.file.originalname).toLowerCase();
  
  if (!validExtensions.includes(fileExt)) {
    console.error('Error: Invalid file extension:', fileExt);
    fs.unlinkSync(uploadedPath);
    return res.status(400).json({ 
      error: `Invalid file type: ${fileExt}. Expected SQLite database file (${validExtensions.join(', ')})` 
    });
  }
  console.log('✓ File extension validated:', fileExt);

  // Ask user where to save the database (network path)
  // For now, we'll use a shared-databases folder on the server
  const sharedDbDir = path.join(__dirname, 'shared-databases');
  if (!fs.existsSync(sharedDbDir)) {
    fs.mkdirSync(sharedDbDir, { recursive: true });
  }

  const networkDbLocation = path.join(sharedDbDir, req.file.originalname);
  
  // Check if this database already exists in shared location
  const dbAlreadyExists = fs.existsSync(networkDbLocation);
  
  if (dbAlreadyExists) {
    console.log('✓ Database already exists in shared location - using existing version with all your changes');
    console.log('Skipping upload to preserve your data');
    
    // Delete the uploaded file since we're using the existing one
    fs.unlinkSync(uploadedPath);
  } else {
    console.log('New database - saving to shared location:', networkDbLocation);
  }

  // Close current database
  if (db) {
    db.close((err) => {
      if (err) {
        console.error('✗ Error closing database:', err.message);
      } else {
        console.log('✓ Database connection closed');
      }
    });
  }

  // Only copy uploaded file if database doesn't already exist
  if (!dbAlreadyExists) {
    fs.copyFile(uploadedPath, networkDbLocation, (err) => {
      if (err) {
        console.error('✗ Error copying database to shared location:', err.message);
        fs.unlinkSync(uploadedPath);
        return res.status(500).json({ 
          error: `Failed to save database to shared location: ${err.message}` 
        });
      }

      console.log('✓ Database saved to shared location');

      // Clean up uploaded file
      fs.unlink(uploadedPath, (unlinkErr) => {
        if (unlinkErr) {
          console.error('✗ Warning: Could not remove temp file:', unlinkErr.message);
        }
      });

      finishImport();
    });
  } else {
    // Database already exists, skip to finish
    finishImport();
  }

  function finishImport() {
    // Set this as the active database path
    dbPath = networkDbLocation;
    networkDbPath = networkDbLocation;
    
    // Save network path for future sessions
    fs.writeFileSync(path.join(__dirname, 'network-db-path.txt'), networkDbLocation);

    // Reinitialize database with new path
    try {
      initDatabase();
      
      console.log('✓ Database initialized successfully');
      console.log('=== DATABASE IMPORT SUCCESSFUL ===\n');
      
      const message = dbAlreadyExists 
        ? `Loaded existing database with all your saved changes!` 
        : `Database imported and saved to shared location. All PCs can now access this database.`;
      
      res.json({ 
        message: message,
        path: networkDbLocation,
        existed: dbAlreadyExists
      });
    } catch (initErr) {
      console.error('✗ Error initializing imported database:', initErr.message);
      console.error('Stack:', initErr.stack);
      
      return res.status(500).json({ 
        error: `Database saved but failed to initialize: ${initErr.message}` 
      });
    }
  }
});

// Export database
app.get('/api/export', (req, res) => {
  if (!fs.existsSync(dbPath)) {
    return res.status(404).json({ error: 'Database file not found' });
  }

  const fileName = path.basename(dbPath);

  res.download(dbPath, fileName, (err) => {
    if (err) {
      console.error('Error downloading database:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to export database' });
      }
    } else {
      console.log('Database exported successfully:', fileName);
    }
  });
});

// Create new empty database
app.post('/api/new-database', (req, res) => {
  // Close current database
  if (db) {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      }
    });
  }

  // Delete old database file
  const oldDbPath = path.join(__dirname, 'database.db');
  if (fs.existsSync(oldDbPath)) {
    fs.unlinkSync(oldDbPath);
  }

  // Create new database
  dbPath = oldDbPath;
  initDatabase();

  res.json({ message: 'New database created successfully' });
});

// Clear all documents
app.post('/api/clear-documents', (req, res) => {
  db.run('DELETE FROM documents', [], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'All documents deleted successfully', changes: this.changes });
  });
});

// User Management API Routes

// Get all users
app.get('/api/users', (req, res) => {
  db.all('SELECT id, username, role, department, createdAt, createdBy FROM users', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ users: rows });
  });
});

// Create new user
app.post('/api/users', (req, res) => {
  const { username, password, role, department, createdBy } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ error: 'Username, password, and role are required' });
  }

  const timestamp = new Date().toISOString();

  db.run(
    'INSERT INTO users (username, password, role, department, createdAt, createdBy) VALUES (?, ?, ?, ?, ?, ?)',
    [username, password, role, department || null, timestamp, createdBy || 'admin'],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint')) {
          res.status(400).json({ error: 'Username already exists' });
        } else {
          res.status(500).json({ error: err.message });
        }
        return;
      }
      res.json({ id: this.lastID, message: 'User created successfully' });
    }
  );
});

// Login endpoint
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  db.get('SELECT id, username, role, department FROM users WHERE username = ? AND password = ?',
    [username, password], 
    (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (row) {
        res.json({ success: true, user: row });
      } else {
        res.json({ success: false, message: 'Invalid username or password' });
      }
    }
  );
});

// Change user password
app.put('/api/users/:id/password', (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  if (!password || password.length < 3) {
    return res.status(400).json({ error: 'Password must be at least 3 characters' });
  }

  db.run('UPDATE users SET password = ? WHERE id = ?', [password, id], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ message: 'Password updated successfully' });
  });
});

// Delete user
app.delete('/api/users/:id', (req, res) => {
  const { id } = req.params;

  // Prevent deletion of admin user
  db.get('SELECT username FROM users WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (row && row.username === 'admin') {
      res.status(403).json({ error: 'Cannot delete admin account' });
      return;
    }

    db.run('DELETE FROM users WHERE id = ?', [id], function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ message: 'User deleted successfully', changes: this.changes });
    });
  });
});

// Get user preferences
app.get('/api/users/:username/preferences', (req, res) => {
  const { username } = req.params;

  db.get('SELECT preferences FROM users WHERE username = ?', [username], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (row) {
      res.json({ preferences: JSON.parse(row.preferences || '{}') });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  });
});

// Update user preferences
app.put('/api/users/:username/preferences', (req, res) => {
  const { username } = req.params;
  const { preferences } = req.body;

  if (!preferences || typeof preferences !== 'object') {
    return res.status(400).json({ error: 'Invalid preferences data' });
  }

  db.run('UPDATE users SET preferences = ? WHERE username = ?', [JSON.stringify(preferences), username], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ message: 'Preferences updated successfully' });
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Start server
app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  console.log(`Local access: http://localhost:${PORT}`);
  // Try to get and display local IP for network access
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  const ipv4Addresses = [];
  Object.keys(networkInterfaces).forEach(interfaceName => {
    networkInterfaces[interfaceName].forEach(iface => {
      if (iface.family === 'IPv4' && !iface.internal) {
        ipv4Addresses.push(iface.address);
      }
    });
  });
  if (ipv4Addresses.length > 0) {
    console.log(`Network access: http://${ipv4Addresses[0]}:${PORT}`);
    console.log(`Share this URL with other PCs on your network`);
  }
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  if (db) {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      }
      console.log('Database connection closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

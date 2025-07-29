const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const QRCode = require('qrcode');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Initialize SQLite database
const db = new sqlite3.Database('attendance.db');

// Create tables
db.serialize(() => {
  // Events table
  db.run(`CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Attendance records table
  db.run(`CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    birth_date TEXT NOT NULL,
    event_id INTEGER,
    event_name TEXT,
    scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events (id)
  )`);

  // Insert sample events
  db.run(`INSERT OR IGNORE INTO events (id, name, description, date) VALUES 
    (1, 'Team Meeting', 'Weekly team sync meeting', '2024-01-15'),
    (2, 'Training Session', 'Employee training workshop', '2024-01-16'),
    (3, 'Company Event', 'Annual company gathering', '2024-01-20'),
    (4, 'Conference', 'Industry conference attendance', '2024-01-25')`);
});

// API Routes

// Generate QR code with personal data
app.post('/api/generate-qr', async (req, res) => {
  try {
    const { firstName, lastName, birthDate } = req.body;
    
    if (!firstName || !lastName || !birthDate) {
      return res.status(400).json({ error: 'All personal data fields are required' });
    }

    const personalData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      birthDate: birthDate
    };

    // Generate QR code containing the personal data
    const qrData = JSON.stringify(personalData);
    const qrCodeDataURL = await QRCode.toDataURL(qrData, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    res.json({
      success: true,
      qrCode: qrCodeDataURL,
      data: personalData
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// Get all events
app.get('/api/events', (req, res) => {
  db.all('SELECT * FROM events ORDER BY name', (err, rows) => {
    if (err) {
      console.error('Error fetching events:', err);
      return res.status(500).json({ error: 'Failed to fetch events' });
    }
    res.json(rows);
  });
});

// Save attendance record
app.post('/api/attendance', (req, res) => {
  const { firstName, lastName, birthDate, eventId, eventName } = req.body;
  
  if (!firstName || !lastName || !birthDate || !eventId || !eventName) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const stmt = db.prepare(`
    INSERT INTO attendance (first_name, last_name, birth_date, event_id, event_name)
    VALUES (?, ?, ?, ?, ?)
  `);

  stmt.run([firstName, lastName, birthDate, eventId, eventName], function(err) {
    if (err) {
      console.error('Error saving attendance:', err);
      return res.status(500).json({ error: 'Failed to save attendance' });
    }
    
    res.json({
      success: true,
      attendanceId: this.lastID,
      message: 'Attendance recorded successfully'
    });
  });

  stmt.finalize();
});

// Get attendance records
app.get('/api/attendance', (req, res) => {
  db.all(`
    SELECT * FROM attendance 
    ORDER BY scanned_at DESC
  `, (err, rows) => {
    if (err) {
      console.error('Error fetching attendance:', err);
      return res.status(500).json({ error: 'Failed to fetch attendance records' });
    }
    res.json(rows);
  });
});

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('Database connection closed.');
    }
    process.exit(0);
  });
});
# QR Attendance Tracker

A modern web application for QR code-based attendance tracking. Users can generate QR codes with personal data and scan them to select events for attendance confirmation.

## Features

🎯 **QR Code Generation**
- Create QR codes containing personal data (first name, last name, birth date)
- Download generated QR codes
- No event selection required during generation

📱 **QR Code Scanning**
- Use rear camera for scanning QR codes
- Start/stop scanning controls
- Real-time QR code detection

🎪 **Event Selection**
- Choose from predefined events after scanning
- Event information displayed with dates
- Attendance confirmation system

📊 **Attendance Records**
- View all attendance records
- Real-time database updates
- Searchable attendance history

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the application:**
   ```bash
   npm start
   ```

3. **Open your browser:**
   Navigate to `http://localhost:3000`

## How to Use

### Generating QR Codes
1. Go to the "Generate QR" tab
2. Fill in your personal information:
   - First Name
   - Last Name  
   - Birth Date
3. Click "Generate QR Code"
4. Download or save the QR code image

### Scanning QR Codes
1. Go to the "Scan QR" tab
2. Click "Start Scanning" to activate the camera
3. Position the QR code within the frame
4. Once scanned, select an event from the dropdown
5. Confirm attendance to complete the process

### Viewing Records
1. Go to the "Records" tab
2. View all attendance records
3. Click "Refresh Records" to update the list

## Technology Stack

- **Backend:** Node.js, Express.js
- **Database:** SQLite3
- **Frontend:** Vanilla JavaScript, HTML5, CSS3
- **QR Code:** qrcode library for generation, jsQR for scanning
- **Camera:** WebRTC getUserMedia API

## API Endpoints

- `POST /api/generate-qr` - Generate QR code with personal data
- `GET /api/events` - Get all available events
- `POST /api/attendance` - Save attendance record
- `GET /api/attendance` - Get all attendance records

## Database Schema

### Events Table
- `id` - Primary key
- `name` - Event name
- `description` - Event description
- `date` - Event date
- `created_at` - Timestamp

### Attendance Table
- `id` - Primary key
- `first_name` - Person's first name
- `last_name` - Person's last name
- `birth_date` - Person's birth date
- `event_id` - Foreign key to events table
- `event_name` - Event name (denormalized)
- `scanned_at` - Attendance timestamp

## Browser Compatibility

- Chrome/Chromium (recommended)
- Firefox
- Safari
- Edge

**Note:** Camera access requires HTTPS in production environments.

## Development

For development with auto-restart:
```bash
npm run dev
```

## Security Notes

- Camera permissions are required for QR scanning
- Personal data is stored locally in SQLite database
- HTTPS recommended for production deployment
- No external data transmission

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details
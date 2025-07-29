// Global variables
let currentStream = null;
let isScanning = false;
let scannedPersonData = null;
let availableEvents = [];

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupTabNavigation();
    setupQRGeneration();
    setupQRScanning();
    loadEvents();
    loadAttendanceRecords();
}

// Tab Navigation
function setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;
            
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            document.getElementById(`${targetTab}-tab`).classList.add('active');
            
            // Stop camera if switching away from scan tab
            if (targetTab !== 'scan' && currentStream) {
                stopScanning();
            }
        });
    });
}

// QR Code Generation
function setupQRGeneration() {
    const qrForm = document.getElementById('qr-form');
    
    qrForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(qrForm);
        const personalData = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            birthDate: formData.get('birthDate')
        };
        
        try {
            showStatus('Generating QR code...', 'info');
            
            const response = await fetch('/api/generate-qr', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(personalData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                displayQRCode(result.qrCode, result.data);
                showStatus('QR code generated successfully!', 'success');
            } else {
                showStatus(`Error: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Error generating QR code:', error);
            showStatus('Failed to generate QR code. Please try again.', 'error');
        }
    });
}

function displayQRCode(qrCodeDataURL, personalData) {
    const qrResult = document.getElementById('qr-result');
    const qrImage = document.getElementById('qr-image');
    const displayName = document.getElementById('display-name');
    const displayBirthdate = document.getElementById('display-birthdate');
    
    qrImage.src = qrCodeDataURL;
    displayName.textContent = `${personalData.firstName} ${personalData.lastName}`;
    displayBirthdate.textContent = personalData.birthDate;
    
    qrResult.classList.remove('hidden');
}

function downloadQR() {
    const qrImage = document.getElementById('qr-image');
    const link = document.createElement('a');
    link.download = 'qr-code.png';
    link.href = qrImage.src;
    link.click();
}

// QR Code Scanning
function setupQRScanning() {
    const startScanBtn = document.getElementById('start-scan');
    const stopScanBtn = document.getElementById('stop-scan');
    
    startScanBtn.addEventListener('click', startScanning);
    stopScanBtn.addEventListener('click', stopScanning);
}

async function startScanning() {
    try {
        showScanStatus('Requesting camera access...', 'info');
        
        // Request rear camera
        const constraints = {
            video: {
                facingMode: { ideal: 'environment' }, // Rear camera
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        };
        
        currentStream = await navigator.mediaDevices.getUserMedia(constraints);
        const video = document.getElementById('video');
        video.srcObject = currentStream;
        
        isScanning = true;
        document.getElementById('start-scan').disabled = true;
        document.getElementById('stop-scan').disabled = false;
        
        showScanStatus('Camera ready. Position QR code in the frame.', 'info');
        
        // Start scanning loop
        video.addEventListener('loadedmetadata', () => {
            scanQRCode();
        });
        
    } catch (error) {
        console.error('Error accessing camera:', error);
        showScanStatus('Failed to access camera. Please check permissions.', 'error');
    }
}

function stopScanning() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
    
    isScanning = false;
    document.getElementById('start-scan').disabled = false;
    document.getElementById('stop-scan').disabled = true;
    
    const video = document.getElementById('video');
    video.srcObject = null;
    
    showScanStatus('Scanning stopped.', 'info');
}

function scanQRCode() {
    if (!isScanning) return;
    
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');
    
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
        });
        
        if (code) {
            try {
                const personalData = JSON.parse(code.data);
                
                // Validate the scanned data structure
                if (personalData.firstName && personalData.lastName && personalData.birthDate) {
                    stopScanning();
                    showEventSelectionModal(personalData);
                } else {
                    showScanStatus('Invalid QR code format. Please scan a valid attendance QR code.', 'error');
                }
            } catch (error) {
                showScanStatus('Invalid QR code. Please scan a valid attendance QR code.', 'error');
            }
        }
    }
    
    // Continue scanning
    requestAnimationFrame(scanQRCode);
}

// Event Selection Modal
function showEventSelectionModal(personalData) {
    scannedPersonData = personalData;
    
    const modal = document.getElementById('event-modal');
    const personInfo = document.getElementById('scanned-person-info');
    
    personInfo.innerHTML = `
        <h4>Scanned Person Information:</h4>
        <p><strong>Name:</strong> ${personalData.firstName} ${personalData.lastName}</p>
        <p><strong>Birth Date:</strong> ${personalData.birthDate}</p>
    `;
    
    // Populate events dropdown
    const eventSelect = document.getElementById('event-select');
    eventSelect.innerHTML = '<option value="">Choose an event...</option>';
    
    availableEvents.forEach(event => {
        const option = document.createElement('option');
        option.value = event.id;
        option.textContent = `${event.name} - ${event.date}`;
        option.dataset.eventName = event.name;
        eventSelect.appendChild(option);
    });
    
    modal.classList.remove('hidden');
    
    // Setup event form submission
    const eventForm = document.getElementById('event-form');
    eventForm.onsubmit = handleEventSelection;
}

async function handleEventSelection(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const eventId = formData.get('eventId');
    const eventSelect = document.getElementById('event-select');
    const selectedOption = eventSelect.options[eventSelect.selectedIndex];
    const eventName = selectedOption.dataset.eventName;
    
    if (!eventId || !eventName) {
        showScanStatus('Please select an event.', 'error');
        return;
    }
    
    try {
        const attendanceData = {
            firstName: scannedPersonData.firstName,
            lastName: scannedPersonData.lastName,
            birthDate: scannedPersonData.birthDate,
            eventId: parseInt(eventId),
            eventName: eventName
        };
        
        const response = await fetch('/api/attendance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(attendanceData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            closeEventModal();
            showConfirmationModal(attendanceData);
        } else {
            showScanStatus(`Error: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Error saving attendance:', error);
        showScanStatus('Failed to save attendance. Please try again.', 'error');
    }
}

function closeEventModal() {
    document.getElementById('event-modal').classList.add('hidden');
}

// Confirmation Modal
function showConfirmationModal(attendanceData) {
    const modal = document.getElementById('confirmation-modal');
    const confirmationDetails = document.getElementById('confirmation-details');
    
    const currentTime = new Date().toLocaleString();
    
    confirmationDetails.innerHTML = `
        <h4>Attendance Confirmed</h4>
        <p><strong>Name:</strong> ${attendanceData.firstName} ${attendanceData.lastName}</p>
        <p><strong>Birth Date:</strong> ${attendanceData.birthDate}</p>
        <p><strong>Event:</strong> ${attendanceData.eventName}</p>
        <p><strong>Time:</strong> ${currentTime}</p>
    `;
    
    modal.classList.remove('hidden');
    
    // Refresh attendance records
    loadAttendanceRecords();
}

function closeConfirmationModal() {
    document.getElementById('confirmation-modal').classList.add('hidden');
}

// Load Events
async function loadEvents() {
    try {
        const response = await fetch('/api/events');
        const events = await response.json();
        availableEvents = events;
    } catch (error) {
        console.error('Error loading events:', error);
    }
}

// Load Attendance Records
async function loadAttendanceRecords() {
    const recordsContainer = document.getElementById('records-container');
    
    try {
        recordsContainer.innerHTML = '<div class="loading">Loading records...</div>';
        
        const response = await fetch('/api/attendance');
        const records = await response.json();
        
        if (records.length === 0) {
            recordsContainer.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 40px;">No attendance records found.</p>';
            return;
        }
        
        const table = document.createElement('table');
        table.className = 'records-table';
        
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Birth Date</th>
                    <th>Event</th>
                    <th>Date & Time</th>
                </tr>
            </thead>
            <tbody>
                ${records.map(record => `
                    <tr>
                        <td>${record.first_name} ${record.last_name}</td>
                        <td>${record.birth_date}</td>
                        <td>${record.event_name}</td>
                        <td>${new Date(record.scanned_at).toLocaleString()}</td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        
        recordsContainer.innerHTML = '';
        recordsContainer.appendChild(table);
        
    } catch (error) {
        console.error('Error loading attendance records:', error);
        recordsContainer.innerHTML = '<p style="text-align: center; color: #dc3545; padding: 40px;">Failed to load attendance records.</p>';
    }
}

// Utility Functions
function showStatus(message, type) {
    // This function can be used to show status messages in the generate tab
    console.log(`${type.toUpperCase()}: ${message}`);
}

function showScanStatus(message, type) {
    const statusElement = document.getElementById('scan-status');
    statusElement.textContent = message;
    statusElement.className = `status-message ${type}`;
    
    // Auto-hide success messages after 3 seconds
    if (type === 'success') {
        setTimeout(() => {
            statusElement.textContent = '';
            statusElement.className = 'status-message';
        }, 3000);
    }
}

// Handle modal clicks outside content
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        if (e.target.id === 'event-modal') {
            closeEventModal();
        } else if (e.target.id === 'confirmation-modal') {
            closeConfirmationModal();
        }
    }
});

// Handle escape key for modals
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeEventModal();
        closeConfirmationModal();
    }
});
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const PORT = 3000;

// Middleware to parse JSON data from frontend
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- MOCK DATABASE (Replace with real DB later) ---
const USERS = [
    { email: "admin@eps.com", password: "admin123", name: "System Administrator" },
    { email: "researcher@eps.com", password: "water", name: "Lead Researcher" }
];

// --- API ROUTES ---

// 1. Login Route
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    console.log(`Login attempt for: ${email}`);

    const user = USERS.find(u => u.email === email && u.password === password);

    if (user) {
        // In a real app, you would return a JWT token here
        res.json({ success: true, name: user.name, message: "Login successful!" });
    } else {
        res.status(401).json({ success: false, message: "Invalid email or password." });
    }
});

// 2. Dashboard Data Route (Protected Data Example)
app.get('/api/dashboard-data', (req, res) => {
    // This simulates fetching private data from a database
    res.json({
        systemStatus: "Optimal",
        lastMaintenance: "2024-03-15",
        alerts: 0,
        logs: [
            "System boot sequence initiated",
            "Sensor array calibration: OK",
            "Wi-Fi connection established",
            "Data transmission interval: 15s"
        ]
    });
});

// Serve the main HTML file for the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Login with: admin@eps.com / admin123`);
});
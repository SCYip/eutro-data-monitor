const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const USERS = [
    { email: "admin@eps.com", password: "admin123", name: "System Administrator" }
];

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const user = USERS.find(u => u.email === email && u.password === password);
    if (user) {
        res.json({ success: true, name: user.name, message: "Login successful!" });
    } else {
        res.status(401).json({ success: false, message: "Invalid email or password." });
    }
});

app.get('/api/dashboard-data', (req, res) => {
    res.json({
        systemStatus: "Optimal",
        lastMaintenance: "2024-03-15",
        alerts: 0,
        logs: ["System boot sequence initiated", "Sensor array calibration: OK"]
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

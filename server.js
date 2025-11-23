const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");
const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// --- JSON DATABASE SETUP ---
const DB_FILE = path.join(__dirname, "database.json");

// Default Admin now includes Organization
const defaultData = {
    users: [
        { email: "admin@eps.com", password: "admin123", name: "System Admin", role: "admin", organization: "EPS HQ" }
    ],
    devices: [
        { id: "3175602", name: "Main System", owner: "admin@eps.com" }
    ]
};

function readDB() {
    try {
        if (!fs.existsSync(DB_FILE)) {
            fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2));
            return defaultData;
        }
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) { return defaultData; }
}

function writeDB(data) {
    try { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2)); } catch (err) { console.error(err); }
}

// --- AUTH ROUTES ---

// LOGIN
app.post("/api/login", (req, res) => {
    const { email, password } = req.body;
    const db = readDB();
    const user = db.users.find(u => u.email === email && u.password === password);
    
    if (user) {
        res.json({ 
            success: true, 
            name: user.name, 
            role: user.role, 
            email: user.email,
            organization: user.organization || "", 
            message: "Login successful!" 
        });
    } else {
        res.status(401).json({ success: false, message: "Invalid email or password." });
    }
});

// SIGN UP
app.post("/api/signup", (req, res) => {
    const { name, email, password, organization } = req.body;
    if (!name || !email || !password) return res.status(400).json({ success: false, message: "All fields required." });

    const db = readDB();
    if (db.users.find(u => u.email === email)) {
        return res.status(400).json({ success: false, message: "Email already registered." });
    }

    const orgValue = organization ? organization : "";
    db.users.push({ email, password, name, role: "user", organization: orgValue });
    writeDB(db); 

    res.json({ success: true, message: "Account created successfully!" });
});

// NEW: GET USER INFO (Refresh Profile)
app.get("/api/user", (req, res) => {
    const email = req.query.email;
    if (!email) return res.status(400).json({ success: false });

    const db = readDB();
    const user = db.users.find(u => u.email === email);
    
    if (user) {
        res.json({ 
            success: true, 
            name: user.name, 
            role: user.role, 
            email: user.email,
            organization: user.organization || "" 
        });
    } else {
        res.status(404).json({ success: false, message: "User not found" });
    }
});

// UPDATE PROFILE
app.put("/api/profile", (req, res) => {
    const { email, newName, newPassword, newOrg } = req.body;
    const db = readDB();
    const userIndex = db.users.findIndex(u => u.email === email);
    if (userIndex === -1) return res.status(404).json({ success: false, message: "User not found" });

    if (newName) db.users[userIndex].name = newName;
    if (newPassword) db.users[userIndex].password = newPassword;
    if (newOrg !== undefined) db.users[userIndex].organization = newOrg;

    writeDB(db);
    res.json({ success: true, message: "Profile updated successfully" });
});

// --- DEVICE ROUTES ---

app.get("/api/devices", (req, res) => {
    const userEmail = req.query.email;
    if (!userEmail) return res.status(400).json({ error: "Email required" });

    const db = readDB();
    const requester = db.users.find(u => u.email === userEmail);
    
    if (requester && requester.role === 'admin') {
        res.json(db.devices);
    } else {
        const userDevices = db.devices.filter(d => d.owner === userEmail);
        res.json(userDevices);
    }
});

app.post("/api/devices", (req, res) => {
    const { id, name, owner } = req.body;
    const db = readDB();
    const exists = db.devices.find(d => d.id === id && d.owner === owner);
    if (exists) return res.status(400).json({ success: false, message: "Device already added." });

    db.devices.push({ id, name, owner });
    writeDB(db); 
    res.json({ success: true, message: "Device added." });
});

app.delete("/api/devices", (req, res) => {
    const { id, owner } = req.body;
    const db = readDB();
    const initialLength = db.devices.length;
    db.devices = db.devices.filter(d => !(d.id === id && d.owner === owner));
    
    if (db.devices.length !== initialLength) {
        writeDB(db); 
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false, message: "Device not found" });
    }
});

// --- ADMIN ROUTES ---

app.get("/api/admin/data", (req, res) => {
    const db = readDB();
    res.json({
        users: db.users.map(u => ({ name: u.name, email: u.email, role: u.role, organization: u.organization })), 
        devices: db.devices,
        totalDevices: db.devices.length,
        totalUsers: db.users.filter(u => u.role !== 'admin').length
    });
});

app.delete("/api/admin/users/:email", (req, res) => {
    const emailToDelete = req.params.email;
    if(emailToDelete === "admin@eps.com") return res.status(403).json({ success: false, message: "Cannot delete Root Admin." });

    const db = readDB();
    const initialLength = db.users.length;
    db.users = db.users.filter(u => u.email !== emailToDelete);
    if(db.users.length === initialLength) return res.status(404).json({ success: false, message: "User not found." });

    db.devices = db.devices.filter(d => d.owner !== emailToDelete);
    writeDB(db); 
    res.json({ success: true, message: "User deleted." });
});

app.put("/api/admin/users/:email/role", (req, res) => {
    const emailToUpdate = req.params.email;
    const { role } = req.body; 
    if(emailToUpdate === "admin@eps.com") return res.status(403).json({ success: false, message: "Cannot change Root Admin role." });

    const db = readDB();
    const user = db.users.find(u => u.email === emailToUpdate);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    user.role = role;
    writeDB(db);
    res.json({ success: true, message: `User role updated to ${role}.` });
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Database: Local JSON storage active`);
});
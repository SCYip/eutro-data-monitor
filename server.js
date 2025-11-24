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
        { id: "3175602", name: "Main System", owner: "admin@eps.com", sharedWith: [] }
    ],
    notifications: []
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
    
    // All users (including admins) see only owned devices and shared devices
    const ownedDevices = db.devices.filter(d => {
        const isOwner = d.owner === userEmail;
        console.log(`Device ${d.id} (${d.name}): owner=${d.owner}, requester=${userEmail}, isOwner=${isOwner}`);
        return isOwner;
    });
    
    const sharedDevices = db.devices.filter(d => {
        if (d.owner === userEmail) return false; // Already in owned
        if (!d.sharedWith || !Array.isArray(d.sharedWith)) return false;
        const isShared = d.sharedWith.some(share => share.email === userEmail);
        console.log(`Device ${d.id} (${d.name}): sharedWith=${JSON.stringify(d.sharedWith)}, requester=${userEmail}, isShared=${isShared}`);
        return isShared;
    }).map(device => {
        // Add permission info to shared devices
        const shareInfo = device.sharedWith.find(share => share.email === userEmail);
        return {
            ...device,
            permission: shareInfo ? shareInfo.permission : 'view',
            isShared: true
        };
    });
    
    // Add ownership info to owned devices (include sharedWith for owners)
    const ownedWithInfo = ownedDevices.map(device => ({
        ...device,
        permission: 'owner',
        isShared: false,
        sharedWith: device.sharedWith || [] // Include sharedWith for owners
    }));
    
    const result = [...ownedWithInfo, ...sharedDevices];
    console.log(`Returning ${result.length} devices for ${userEmail}:`, result.map(d => ({id: d.id, name: d.name, owner: d.owner, permission: d.permission})));
    
    res.json(result);
});

// Admin-only endpoint for creating new devices (from admin panel)
app.post("/api/admin/devices", (req, res) => {
    const { id, name, owner } = req.body;
    if (!id || !name) {
        return res.status(400).json({ success: false, message: "Device ID and name are required." });
    }

    const db = readDB();
    
    // Check if device already exists
    const existingDevice = db.devices.find(d => d.id === id);
    if (existingDevice) {
        // Update existing device
        existingDevice.name = name;
        if (owner) existingDevice.owner = owner;
        writeDB(db);
        return res.json({ success: true, message: "Device updated." });
    }

    // Create new device (owner can be empty/unassigned)
    const deviceOwner = owner || "Unassigned";
    db.devices.push({ id, name, owner: deviceOwner, sharedWith: [] });
    writeDB(db); 
    res.json({ success: true, message: "Device created successfully." });
});

// User endpoint for adding existing devices to their account (from dashboard)
app.post("/api/devices", (req, res) => {
    const { id, name, owner } = req.body;
    if (!id || !name || !owner) {
        return res.status(400).json({ success: false, message: "Device ID, name, and owner are required." });
    }

    const db = readDB();
    
    // Check if device exists in the system (must be created by admin first)
    const existingDevice = db.devices.find(d => d.id === id);
    if (!existingDevice) {
        return res.status(403).json({ 
            success: false, 
            message: "This device has not been registered yet. Please contact an administrator to register the device in the admin control panel first." 
        });
    }

    // Device exists - check if user already owns it
    if (existingDevice.owner === owner) {
        return res.status(400).json({ success: false, message: "Device already added to your account." });
    }

    // Device exists but owned by someone else - user must request access via sharing
    return res.status(403).json({ 
        success: false, 
        message: `This device is already owned by another account (${existingDevice.owner}). Please contact the owner to request access.` 
    });
});

app.delete("/api/devices", (req, res) => {
    const { id, requesterEmail } = req.body;
    if (!id || !requesterEmail) {
        return res.status(400).json({ success: false, message: "Device ID and requester email are required." });
    }

    const db = readDB();
    const device = db.devices.find(d => d.id === id);
    
    if (!device) {
        return res.status(404).json({ success: false, message: "Device not found" });
    }

    const requester = db.users.find(u => u.email === requesterEmail);
    
    // Only owner or admin can delete the device entirely
    if (device.owner === requesterEmail || (requester && requester.role === 'admin')) {
        db.devices = db.devices.filter(d => d.id !== id);
        writeDB(db);
        res.json({ success: true, message: "Device deleted." });
    } else {
        // If user has shared access, remove them from sharedWith
        if (device.sharedWith && Array.isArray(device.sharedWith)) {
            const shareIndex = device.sharedWith.findIndex(share => share.email === requesterEmail);
            if (shareIndex !== -1) {
                device.sharedWith.splice(shareIndex, 1);
        writeDB(db); 
                res.json({ success: true, message: "Device access removed." });
            } else {
                res.status(403).json({ success: false, message: "You don't have permission to remove this device." });
            }
    } else {
            res.status(403).json({ success: false, message: "You don't have permission to remove this device." });
        }
    }
});

// Share device with another user
app.post("/api/devices/share", (req, res) => {
    const { deviceId, ownerEmail, shareWithEmail, permission } = req.body;
    
    if (!deviceId || !ownerEmail || !shareWithEmail || !permission) {
        return res.status(400).json({ success: false, message: "All fields are required." });
    }

    if (permission !== 'view' && permission !== 'manage') {
        return res.status(400).json({ success: false, message: "Permission must be 'view' or 'manage'." });
    }

    const db = readDB();
    const device = db.devices.find(d => d.id === deviceId);
    
    if (!device) {
        return res.status(404).json({ success: false, message: "Device not found." });
    }

    // Only owner can share
    if (device.owner !== ownerEmail) {
        return res.status(403).json({ success: false, message: "Only the device owner can share access." });
    }

    // Can't share with yourself
    if (shareWithEmail === ownerEmail) {
        return res.status(400).json({ success: false, message: "Cannot share device with yourself." });
    }

    // Check if user exists
    const targetUser = db.users.find(u => u.email === shareWithEmail);
    if (!targetUser) {
        return res.status(404).json({ success: false, message: "User not found." });
    }

    // Initialize sharedWith if it doesn't exist
    if (!device.sharedWith || !Array.isArray(device.sharedWith)) {
        device.sharedWith = [];
    }

    // Check if already shared
    const existingShare = device.sharedWith.find(share => share.email === shareWithEmail);
    if (existingShare) {
        // Update permission
        existingShare.permission = permission;
        writeDB(db);
        return res.json({ success: true, message: `Permission updated to ${permission}.` });
    }

    // Add new share
    device.sharedWith.push({ email: shareWithEmail, permission });
    writeDB(db);
    res.json({ success: true, message: `Device shared with ${targetUser.name} (${permission} access).` });
});

// Remove shared access
app.delete("/api/devices/share", (req, res) => {
    const { deviceId, ownerEmail, shareWithEmail } = req.body;
    
    if (!deviceId || !ownerEmail || !shareWithEmail) {
        return res.status(400).json({ success: false, message: "All fields are required." });
    }

    const db = readDB();
    const device = db.devices.find(d => d.id === deviceId);
    
    if (!device) {
        return res.status(404).json({ success: false, message: "Device not found." });
    }

    // Only owner can remove shares
    if (device.owner !== ownerEmail) {
        return res.status(403).json({ success: false, message: "Only the device owner can remove shared access." });
    }

    if (!device.sharedWith || !Array.isArray(device.sharedWith)) {
        return res.status(404).json({ success: false, message: "No shared access found." });
    }

    const shareIndex = device.sharedWith.findIndex(share => share.email === shareWithEmail);
    if (shareIndex === -1) {
        return res.status(404).json({ success: false, message: "Shared access not found." });
    }

    device.sharedWith.splice(shareIndex, 1);
    writeDB(db);
    res.json({ success: true, message: "Shared access removed." });
});

// Transfer device ownership
app.post("/api/devices/transfer", (req, res) => {
    const { deviceId, currentOwnerEmail, newOwnerEmail } = req.body;
    
    if (!deviceId || !currentOwnerEmail || !newOwnerEmail) {
        return res.status(400).json({ success: false, message: "All fields are required." });
    }

    const db = readDB();
    const device = db.devices.find(d => d.id === deviceId);
    
    if (!device) {
        return res.status(404).json({ success: false, message: "Device not found." });
    }

    // Only current owner can transfer
    if (device.owner !== currentOwnerEmail) {
        return res.status(403).json({ success: false, message: "Only the device owner can transfer ownership." });
    }

    // Can't transfer to yourself
    if (newOwnerEmail === currentOwnerEmail) {
        return res.status(400).json({ success: false, message: "Cannot transfer device to yourself." });
    }

    // Check if new owner exists
    const newOwner = db.users.find(u => u.email === newOwnerEmail);
    if (!newOwner) {
        return res.status(404).json({ success: false, message: "User not found." });
    }

    // Initialize sharedWith if it doesn't exist
    if (!device.sharedWith || !Array.isArray(device.sharedWith)) {
        device.sharedWith = [];
    }

    // Remove old owner from sharedWith completely (they lose all access)
    device.sharedWith = device.sharedWith.filter(share => share.email !== currentOwnerEmail);

    // Transfer ownership
    device.owner = newOwnerEmail;

    // Remove new owner from sharedWith if they were already shared
    device.sharedWith = device.sharedWith.filter(share => share.email !== newOwnerEmail);

    writeDB(db);
    res.json({ success: true, message: `Device ownership transferred to ${newOwner.name}.` });
});

// Get all users for sharing (excluding current user)
app.get("/api/users", (req, res) => {
    const currentEmail = req.query.exclude;
    const db = readDB();
    
    let users = db.users.map(u => ({
        email: u.email,
        name: u.name,
        organization: u.organization || ""
    }));

    if (currentEmail) {
        users = users.filter(u => u.email !== currentEmail);
    }

    res.json(users);
});

// --- NOTIFICATION ROUTES ---

// Get notifications for a user
app.get("/api/notifications", (req, res) => {
    try {
        const userEmail = req.query.email;
        if (!userEmail) return res.status(400).json({ error: "Email required" });

        const db = readDB();
        if (!db.notifications || !Array.isArray(db.notifications)) {
            db.notifications = [];
            writeDB(db);
        }
        
        const userNotifications = db.notifications
            .filter(n => n && n.toEmail === userEmail && n.status === 'pending')
            .sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
                const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
                return dateB - dateA;
            });
        
        res.json(userNotifications);
    } catch(error) {
        console.error('Error getting notifications:', error);
        res.status(500).json({ error: "Server error loading notifications" });
    }
});

// Create notification (for sharing/transfer requests)
app.post("/api/notifications", (req, res) => {
    const { type, fromEmail, toEmail, deviceId, deviceName, permission } = req.body;
    
    if (!type || !fromEmail || !toEmail || !deviceId) {
        return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    const db = readDB();
    if (!db.notifications) db.notifications = [];

    // Check if user exists
    const targetUser = db.users.find(u => u.email === toEmail);
    if (!targetUser) {
        return res.status(404).json({ success: false, message: "User not found." });
    }

    // Check if notification already exists
    const existing = db.notifications.find(n => 
        n.type === type && 
        n.fromEmail === fromEmail && 
        n.toEmail === toEmail && 
        n.deviceId === deviceId && 
        n.status === 'pending'
    );

    if (existing) {
        return res.status(400).json({ success: false, message: "Request already sent." });
    }

    const notification = {
        id: Date.now().toString(),
        type, // 'share' or 'transfer'
        fromEmail,
        toEmail,
        deviceId,
        deviceName: deviceName || '',
        permission: permission || 'view',
        status: 'pending',
        createdAt: new Date().toISOString()
    };

    db.notifications.push(notification);
    writeDB(db);
    
    res.json({ success: true, message: "Request sent successfully." });
});

// Accept notification (share/transfer)
app.post("/api/notifications/:id/accept", (req, res) => {
    const notificationId = req.params.id;
    const userEmail = req.query.email;
    
    if (!userEmail) return res.status(400).json({ success: false, message: "Email required." });

    const db = readDB();
    if (!db.notifications) db.notifications = [];
    
    const notification = db.notifications.find(n => n.id === notificationId && n.status === 'pending');
    if (!notification) {
        return res.status(404).json({ success: false, message: "Notification not found." });
    }

    if (notification.toEmail !== userEmail) {
        return res.status(403).json({ success: false, message: "Unauthorized." });
    }

    if (notification.type === 'share') {
        // Add to sharedWith
        const device = db.devices.find(d => d.id === notification.deviceId);
        if (!device) {
            return res.status(404).json({ success: false, message: "Device not found." });
        }

        if (!device.sharedWith) device.sharedWith = [];
        const existing = device.sharedWith.find(s => s.email === userEmail);
        if (existing) {
            existing.permission = notification.permission;
        } else {
            device.sharedWith.push({ email: userEmail, permission: notification.permission });
        }
        writeDB(db);
    } else if (notification.type === 'transfer') {
        // Transfer ownership
        const device = db.devices.find(d => d.id === notification.deviceId);
        if (!device) {
            return res.status(404).json({ success: false, message: "Device not found." });
        }

        if (device.owner !== notification.fromEmail) {
            return res.status(403).json({ success: false, message: "Original owner no longer owns this device." });
        }

        // Store the old owner email before transfer
        const oldOwnerEmail = device.owner;

        // Remove old owner from sharedWith completely (they lose all access)
        // Remove both the fromEmail and the current owner to be safe
        if (!device.sharedWith) device.sharedWith = [];
        device.sharedWith = device.sharedWith.filter(s => 
            s.email !== notification.fromEmail && s.email !== oldOwnerEmail
        );
        
        // Transfer ownership
        device.owner = userEmail;
        
        // Remove new owner from sharedWith if they were shared
        device.sharedWith = device.sharedWith.filter(s => s.email !== userEmail);
        
        writeDB(db);
    }

    // Mark notification as accepted
    notification.status = 'accepted';
    notification.respondedAt = new Date().toISOString();
    writeDB(db);

    res.json({ success: true, message: "Request accepted." });
});

// Reject notification
app.post("/api/notifications/:id/reject", (req, res) => {
    const notificationId = req.params.id;
    const userEmail = req.query.email;
    
    if (!userEmail) return res.status(400).json({ success: false, message: "Email required." });

    const db = readDB();
    if (!db.notifications) db.notifications = [];
    
    const notification = db.notifications.find(n => n.id === notificationId && n.status === 'pending');
    if (!notification) {
        return res.status(404).json({ success: false, message: "Notification not found." });
    }

    if (notification.toEmail !== userEmail) {
        return res.status(403).json({ success: false, message: "Unauthorized." });
    }

    notification.status = 'rejected';
    notification.respondedAt = new Date().toISOString();
    writeDB(db);

    res.json({ success: true, message: "Request rejected." });
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
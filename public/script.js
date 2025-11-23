// 1. Global UI Helpers
function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    if(menu) menu.classList.toggle('hidden');
}

function updateClock() {
    const el = document.getElementById('clock');
    if(el) el.innerText = new Date().toLocaleTimeString();
}
setInterval(updateClock, 1000);

// --- NOTIFICATION SYSTEM (Toasts) ---
function showNotification(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed bottom-6 right-6 z-50 flex flex-col space-y-3 pointer-events-none';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    const colors = { success: 'bg-green-600', error: 'bg-red-600', info: 'bg-blue-600', warning: 'bg-yellow-500' };
    toast.className = `${colors[type] || colors.info} text-white px-6 py-4 rounded-lg shadow-xl flex items-center transform transition-all duration-500 translate-y-10 opacity-0 pointer-events-auto min-w-[300px]`;
    toast.innerHTML = `<span class="font-bold text-sm">${message}</span>`;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.remove('translate-y-10', 'opacity-0'));
    setTimeout(() => { toast.classList.add('translate-y-10', 'opacity-0'); setTimeout(() => toast.remove(), 500); }, 3000);
}

// -----------------------------------------
// PROFILE & AVATAR LOGIC
// -----------------------------------------

async function loadUserProfile() {
    // 1. Get Basic Info from LocalStorage
    let email = localStorage.getItem('eps_user_email');
    if (!email) return; // Not logged in

    // 2. Fetch FRESH data from server (Fixes blank fields)
    try {
        const res = await fetch(`/api/user?email=${email}`);
        const data = await res.json();
        if (data.success) {
            // Update LocalStorage with fresh data
            localStorage.setItem('eps_user_name', data.name);
            localStorage.setItem('eps_user_role', data.role);
            localStorage.setItem('eps_user_org', data.organization);
        }
    } catch (e) { console.log("Offline: using cached profile data"); }

    // 3. Read Values (Now fresh)
    const name = localStorage.getItem('eps_user_name') || "User";
    const role = localStorage.getItem('eps_user_role') || "user";
    const org = localStorage.getItem('eps_user_org') || "";

    // 4. Update UI Elements
    const displayNameEl = document.getElementById('profile-display-name');
    if(displayNameEl) displayNameEl.innerText = name;
    
    const displayEmailEl = document.getElementById('profile-display-email');
    if(displayEmailEl) displayEmailEl.innerText = email;
    
    const inputName = document.getElementById('input-name');
    if(inputName) inputName.value = name;
    
    const inputEmail = document.getElementById('input-email');
    if(inputEmail) inputEmail.value = email;

    const inputRole = document.getElementById('input-role');
    if(inputRole) inputRole.value = role.charAt(0).toUpperCase() + role.slice(1); // Capitalize

    const inputOrg = document.getElementById('input-org');
    if(inputOrg) inputOrg.value = org;

    // Avatar
    const avatarData = localStorage.getItem('eps_user_avatar');
    const avatarImg = document.getElementById('profile-avatar-img');
    const avatarInitial = document.getElementById('profile-avatar-initial');
    
    if (avatarData && avatarImg) {
        avatarImg.src = avatarData;
        avatarImg.classList.remove('hidden');
        if(avatarInitial) avatarInitial.classList.add('hidden');
    } else if(avatarInitial) {
        avatarInitial.innerText = name.charAt(0).toUpperCase();
        if(avatarImg) avatarImg.classList.add('hidden');
        avatarInitial.classList.remove('hidden');
    }
}

function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const base64Image = e.target.result;
            localStorage.setItem('eps_user_avatar', base64Image);
            loadUserProfile(); 
            showNotification("Avatar updated", "success");
        };
        reader.readAsDataURL(file);
    }
}

async function handleUpdateProfile(event) {
    event.preventDefault();
    const newName = document.getElementById('input-name').value;
    const newOrg = document.getElementById('input-org').value;
    const email = localStorage.getItem('eps_user_email');
    
    if(newName && newName.trim() !== "") {
        try {
            const res = await fetch('/api/profile', {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ email, newName, newOrg })
            });
            const data = await res.json();

            if (data.success) {
                localStorage.setItem('eps_user_name', newName);
                localStorage.setItem('eps_user_org', newOrg);
                loadUserProfile();
                showNotification("Profile updated successfully", "success");
                
                // Update Navbar Name
                const navName = document.getElementById('user-welcome');
                if(navName) navName.innerText = newName;
            } else {
                showNotification(data.message, "error");
            }
        } catch (e) {
            showNotification("Server Error", "error");
        }
    }
}

async function handleChangePassword(event) {
    event.preventDefault();
    const newPwd = document.getElementById('pwd-new').value;
    const email = localStorage.getItem('eps_user_email');

    if (newPwd.length < 6) {
        showNotification("Password must be at least 6 chars", "warning");
        return;
    }

    try {
        const res = await fetch('/api/profile', {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ email, newPassword: newPwd })
        });
        const data = await res.json();
        
        if (data.success) {
            showNotification("Password changed successfully", "success");
            document.getElementById('pwd-new').value = "";
        } else {
            showNotification(data.message, "error");
        }
    } catch (e) {
        showNotification("Server Error", "error");
    }
}

// -----------------------------------------
// DEVICE MANAGEMENT LOGIC
// -----------------------------------------

function getStoredDevices() {
    const stored = localStorage.getItem('eps_devices');
    if (stored) return JSON.parse(stored);
    const defaultDev = [{ id: "3175602", name: "Main System" }];
    localStorage.setItem('eps_devices', JSON.stringify(defaultDev));
    return defaultDev;
}

// -- Rename Logic --
let deviceIdToRename = null;

function openRenameModal(id, currentName, event) {
    if(event) event.stopPropagation();
    deviceIdToRename = id;
    const modal = document.getElementById('rename-modal');
    const input = document.getElementById('rename-device-input');
    if(modal && input) {
        input.value = currentName;
        modal.classList.remove('hidden');
        input.focus();
    }
}

function closeRenameModal() {
    document.getElementById('rename-modal').classList.add('hidden');
    deviceIdToRename = null;
}

function confirmRename() {
    const input = document.getElementById('rename-device-input');
    if (deviceIdToRename && input && input.value.trim() !== "") {
        let devices = getStoredDevices();
        const device = devices.find(d => d.id === deviceIdToRename);
        if (device) {
            device.name = input.value.trim();
            localStorage.setItem('eps_devices', JSON.stringify(devices));
            renderDeviceList();
            showNotification("Device renamed successfully", "success");
        }
        closeRenameModal();
    }
}

// -- Delete Logic --
let deviceIdToDelete = null;

function openDeleteModal(id, event) {
    if(event) event.stopPropagation();
    deviceIdToDelete = id;
    const modal = document.getElementById('delete-modal');
    if(modal) modal.classList.remove('hidden');
}

function closeDeleteModal() {
    const modal = document.getElementById('delete-modal');
    if(modal) modal.classList.add('hidden');
    deviceIdToDelete = null;
}

async function confirmDelete() {
    if(deviceIdToDelete) {
        const email = localStorage.getItem('eps_user_email');
        // Remove from server
        await fetch('/api/devices', { 
            method: 'DELETE', 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify({ id: deviceIdToDelete, owner: email }) 
        });
        
        // Update UI
        renderDeviceList();
        // Try to update profile list if it exists
        if(typeof renderProfileDeviceList === 'function') renderProfileDeviceList();
        
        showNotification("Device deleted", "success");
        closeDeleteModal();
    }
}

// Main Delete Function called by buttons
function deleteDevice(id, event) {
    openDeleteModal(id, event);
}

// -- Filter --
function filterDevices(query) {
    const listContainer = document.getElementById('device-list');
    const allDevices = getStoredDevices();
    
    if (!query) {
        renderDeviceList();
        return;
    }

    const filtered = allDevices.filter(d => 
        d.name.toLowerCase().includes(query.toLowerCase()) || 
        d.id.includes(query)
    );

    listContainer.innerHTML = '';
    
    if (filtered.length === 0) {
        listContainer.innerHTML = '<div class="col-span-full text-center text-gray-400 py-8">No matching devices found.</div>';
        return;
    }

    filtered.forEach(device => {
        listContainer.appendChild(createDeviceCard(device));
        checkCardStatus(device.id);
    });
}

function createDeviceCard(device) {
    const card = document.createElement('div');
    card.className = "bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition group relative flex flex-col overflow-hidden";
    
    card.innerHTML = `
        <div id="card-body-${device.id}" class="p-6 cursor-pointer flex-grow transition-opacity duration-300" onclick="window.location.href='device.html?id=${device.id}&name=${encodeURIComponent(device.name)}'">
            <div class="flex items-start justify-between mb-4">
                <div class="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors">📊</div>
                <span class="bg-gray-100 text-gray-500 text-xs font-bold font-mono px-2 py-1 rounded border border-gray-200">ID: ${device.id}</span>
            </div>
            <h3 class="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition mb-2 truncate">${device.name}</h3>
            <div class="flex items-center text-xs text-gray-500" id="status-container-${device.id}">
                <span class="w-2 h-2 bg-gray-300 rounded-full mr-2"></span> Checking...
            </div>
        </div>
        <div class="bg-gray-50 border-t border-gray-100 px-4 py-3 flex items-center justify-between gap-3">
            <button id="btn-view-${device.id}" onclick="window.location.href='device.html?id=${device.id}&name=${encodeURIComponent(device.name)}'" class="flex-1 bg-white border border-gray-200 text-gray-700 hover:text-blue-600 hover:border-blue-300 text-xs font-bold py-2 rounded-lg transition shadow-sm">View</button>
            <div class="flex space-x-1 border-l border-gray-200 pl-2">
                <button onclick="openRenameModal('${device.id}', '${device.name}', event)" class="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition" title="Rename">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                </button>
                <button onclick="deleteDevice('${device.id}', event)" class="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition" title="Delete">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            </div>
        </div>
    `;
    return card;
}

// Dashboard Device List
async function renderDeviceList() {
    const listContainer = document.getElementById('device-list');
    const emptyState = document.getElementById('empty-state');
    const statTotal = document.getElementById('stat-total-devices');
    const email = localStorage.getItem('eps_user_email');

    if (!listContainer || !email) return;

    try {
        const res = await fetch(`/api/devices?email=${email}`);
        const devices = await res.json();

        if(statTotal) statTotal.innerText = devices.length;
        listContainer.innerHTML = '';

        if (devices.length === 0) {
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
            devices.forEach(device => {
                listContainer.appendChild(createDeviceCard(device));
                checkCardStatus(device.id);
            });
        }
    } catch (e) { console.error(e); }
}

// Profile Page Device List (Simple table)
async function renderProfileDeviceList() {
    const tbody = document.getElementById('profile-device-list');
    const email = localStorage.getItem('eps_user_email');
    if (!tbody || !email) return;
    
    try {
        const res = await fetch(`/api/devices?email=${email}`);
        const devices = await res.json();
        tbody.innerHTML = '';
        
        if (devices.length === 0) {
            document.getElementById('profile-no-devices').classList.remove('hidden');
            return;
        }
        
        devices.forEach(device => {
            const row = document.createElement('tr');
            row.className = "hover:bg-gray-50 transition";
            row.innerHTML = `
                <td class="px-6 py-4 font-medium text-gray-900">${device.name}</td>
                <td class="px-6 py-4 text-gray-500 font-mono text-xs">${device.id}</td>
                <td class="px-6 py-4"><span class="px-2 py-1 text-xs font-bold text-green-700 bg-green-100 rounded-full">Active</span></td>
                <td class="px-6 py-4 text-right">
                    <button onclick="deleteDevice('${device.id}', event)" class="text-red-500 hover:text-red-700 font-bold text-xs">Remove</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch(e) {}
}

async function checkCardStatus(id) {
    const container = document.getElementById(`status-container-${id}`);
    const cardBody = document.getElementById(`card-body-${id}`);
    const viewBtn = document.getElementById(`btn-view-${id}`);

    if (!container) return;

    try {
        const response = await fetch(`https://api.thingspeak.com/channels/${id}/feeds/last.json`);
        const data = await response.json();
        
        let isOnline = false;
        let statusHTML = "";

        if (data === "-1" || !data.created_at) {
            statusHTML = `<span class="w-2 h-2 bg-gray-400 rounded-full mr-2"></span> Never Seen`;
        } else {
            const diff = (new Date() - new Date(data.created_at)) / 1000 / 60;
            if (diff < 5) {
                isOnline = true;
                statusHTML = `<span class="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span> <span class="text-green-600 font-bold">Online</span>`;
            } else {
                statusHTML = `<span class="w-2 h-2 bg-red-500 rounded-full mr-2"></span> Offline`;
            }
        }

        container.innerHTML = statusHTML;

        if (isOnline) {
            if(cardBody) { cardBody.classList.remove('opacity-50', 'pointer-events-none'); cardBody.title = ""; }
            if(viewBtn) { viewBtn.disabled = false; viewBtn.classList.remove('opacity-50', 'cursor-not-allowed'); viewBtn.innerText = "View"; }
        } else {
            if(cardBody) { cardBody.classList.remove('opacity-50', 'pointer-events-none'); cardBody.title = "Device is offline"; } 
            if(viewBtn) { viewBtn.disabled = true; viewBtn.classList.add('opacity-50', 'cursor-not-allowed'); viewBtn.innerText = "Offline"; }
        }
    } catch (e) { container.innerHTML = `<span class="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span> Error`; }
}

async function handleAddDevice(event) {
    event.preventDefault();
    const name = document.getElementById('new-device-name').value;
    const id = document.getElementById('new-device-id').value;
    const email = localStorage.getItem('eps_user_email');
    const btn = document.querySelector('#add-device-modal button[type="submit"]');

    if (!name || !id) return;
    btn.innerText = "Validating..."; btn.disabled = true;

    try {
        const tsCheck = await fetch(`https://api.thingspeak.com/channels/${id}/feeds/last.json`);
        if (tsCheck.status === 404) throw new Error("Channel ID does not exist.");
        const tsData = await tsCheck.json();
        if (tsData === "-1") throw new Error("Channel ID is invalid or private.");

        const res = await fetch('/api/devices', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ id, name, owner: email })
        });
        const data = await res.json();
        if (data.success) {
            showNotification("Device added", "success");
            toggleAddDeviceModal();
            renderDeviceList();
            document.getElementById('new-device-name').value = '';
            document.getElementById('new-device-id').value = '';
        } else { showNotification(data.message, "error"); }
    } catch (error) { showNotification("Error: " + error.message, "error"); } 
    finally { btn.innerText = "Add Device"; btn.disabled = false; }
}

// --- AUTH LOGIC ---

async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const btn = document.getElementById('login-btn');
    const err = document.getElementById('error-msg');

    btn.innerText = "Verifying...";
    try {
        const res = await fetch('/api/login', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({email, password}) });
        const data = await res.json();
        if(data.success) {
            localStorage.setItem('eps_user_logged_in', 'true');
            localStorage.setItem('eps_user_name', data.name);
            localStorage.setItem('eps_user_email', data.email);
            localStorage.setItem('eps_user_role', data.role);
            localStorage.setItem('eps_user_org', data.organization);
            if (data.role === 'admin') window.location.href = 'admin.html';
            else window.location.href = 'dashboard.html';
        } else { err.innerText = data.message; err.classList.remove('hidden'); btn.innerText = "Login"; }
    } catch(e) { err.innerText = "Server Error"; err.classList.remove('hidden'); btn.innerText = "Login"; }
}

async function handleSignup(event) {
    event.preventDefault();
    const name = document.getElementById('signup-name').value;
    const org = document.getElementById('signup-org').value; 
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const btn = document.getElementById('signup-btn');

    if(!name || !email || !password) { showNotification("All fields required", "error"); return; }

    btn.innerText = "Creating Account...";
    try {
        const res = await fetch('/api/signup', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ name, email, password, organization: org })
        });
        const data = await res.json();
        
        if(data.success) {
            showNotification(data.message, "success");
            setTimeout(() => window.location.href = 'login.html', 1000);
        } else {
            showNotification(data.message, "error");
            btn.innerText = "Create Account";
        }
    } catch(e) {
        showNotification("Server Error", "error");
        btn.innerText = "Create Account";
    }
}

function handleLogout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

function toggleAddDeviceModal() {
    const m = document.getElementById('add-device-modal');
    if(m) m.classList.toggle('hidden');
}

// GLOBAL INIT
document.addEventListener("DOMContentLoaded", function() {
    const loggedIn = localStorage.getItem('eps_user_logged_in');
    const role = localStorage.getItem('eps_user_role');
    const navLogin = document.getElementById('nav-btn-login');
    const navGroup = document.getElementById('nav-group-logged-in');
    const navLoggedOut = document.getElementById('nav-group-logged-out');
    const adminLink = document.getElementById('nav-admin-link');

    if(loggedIn === 'true') {
        if(navLogin) navLogin.classList.add('hidden');
        if(navLoggedOut) navLoggedOut.classList.add('hidden');
        if(navGroup) navGroup.classList.remove('hidden');
        if(adminLink && role === 'admin') { adminLink.classList.remove('hidden'); adminLink.classList.add('flex'); }
        
        const userWelcome = document.getElementById('user-welcome');
        const name = localStorage.getItem('eps_user_name');
        
        if(userWelcome && name) {
            userWelcome.innerText = name;
            const avatarData = localStorage.getItem('eps_user_avatar');
            const avatarDiv = userWelcome.nextElementSibling;
            if(avatarData && avatarDiv && avatarDiv.classList.contains('rounded-full')) {
                avatarDiv.innerHTML = `<img src="${avatarData}" class="w-full h-full rounded-full object-cover">`;
                avatarDiv.classList.remove('bg-gray-700');
            }
        }
    } else {
        if(window.location.pathname.includes('dashboard.html') || window.location.pathname.includes('admin.html') || window.location.pathname.includes('profile.html')) {
             window.location.href = 'login.html';
        }
    }
});
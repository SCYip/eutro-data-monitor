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

// -- Share Device Logic --
let deviceIdToShare = null;
let deviceNameToShare = null;

function openShareModal(id, name, event) {
    if(event) event.stopPropagation();
    deviceIdToShare = id;
    deviceNameToShare = name;
    const modal = document.getElementById('share-device-modal');
    const nameEl = document.getElementById('share-device-name');
    if(modal) {
        modal.classList.remove('hidden');
        if(nameEl) nameEl.textContent = name;
        loadSharedUsers(id);
    }
}

function closeShareModal() {
    const modal = document.getElementById('share-device-modal');
    if(modal) modal.classList.add('hidden');
    deviceIdToShare = null;
    deviceNameToShare = null;
    const userEmailInput = document.getElementById('share-user-email');
    const permissionSelect = document.getElementById('share-permission-select');
    const transferEmailInput = document.getElementById('transfer-user-email');
    if(userEmailInput) userEmailInput.value = '';
    if(permissionSelect) permissionSelect.value = 'view';
    if(transferEmailInput) transferEmailInput.value = '';
}

// No longer needed - using email input instead
// async function loadUsersForSharing() { ... }

// No longer needed - using email input instead
// async function loadUsersForTransfer() { ... }

async function loadSharedUsers(deviceId) {
    const sharedList = document.getElementById('shared-users-list');
    if(!sharedList) return;

    try {
        const email = localStorage.getItem('eps_user_email');
        const res = await fetch(`/api/devices?email=${email}`);
        const devices = await res.json();
        const device = devices.find(d => d.id === deviceId);
        
        if(!device) {
            sharedList.innerHTML = '<p class="text-sm text-red-500 text-center py-4">Device not found.</p>';
            return;
        }

        // Check if user is owner (only owners can see shared users list)
        if(device.permission !== 'owner') {
            sharedList.innerHTML = '<p class="text-sm text-gray-500 text-center py-4">Only device owners can manage shared access.</p>';
            return;
        }
        
        if(!device.sharedWith || !Array.isArray(device.sharedWith) || device.sharedWith.length === 0) {
            sharedList.innerHTML = '<p class="text-sm text-gray-500 text-center py-4">No users have access to this device yet.</p>';
            return;
        }

        // Fetch user names
        const allUsersRes = await fetch('/api/users');
        const allUsers = await allUsersRes.json();
        
        sharedList.innerHTML = '';
        device.sharedWith.forEach(share => {
            const user = allUsers.find(u => u.email === share.email);
            const userName = user ? user.name : share.email;
            const permission = share.permission === 'manage' ? 'Manage' : 'View Only';
            const permissionColor = share.permission === 'manage' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700';
            
            const item = document.createElement('div');
            item.className = 'flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2';
            item.innerHTML = `
                <div class="flex-1">
                    <p class="text-sm font-semibold text-gray-900">${userName}</p>
                    <p class="text-xs text-gray-500">${share.email}</p>
                </div>
                <div class="flex items-center gap-3">
                    <span class="px-2 py-1 text-xs font-bold rounded-full ${permissionColor}">${permission}</span>
                    <button onclick="removeSharedAccess('${share.email}', event)" class="text-red-500 hover:text-red-700 p-1" title="Remove Access">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
            `;
            sharedList.appendChild(item);
        });
    } catch(e) {
        console.error('Error loading shared users:', e);
        sharedList.innerHTML = '<p class="text-sm text-red-500 text-center py-4">Error loading shared users.</p>';
    }
}

async function handleShareDevice(event) {
    event.preventDefault();
    const userEmailInput = document.getElementById('share-user-email');
    const permissionSelect = document.getElementById('share-permission-select');
    
    if(!userEmailInput || !permissionSelect || !deviceIdToShare) return;
    
    const shareWithEmail = userEmailInput.value.trim();
    const permission = permissionSelect.value;
    const ownerEmail = localStorage.getItem('eps_user_email');
    
    if(!shareWithEmail) {
        showNotification("Please enter a user email", "warning");
        return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if(!emailRegex.test(shareWithEmail)) {
        showNotification("Please enter a valid email address", "error");
        return;
    }

    // Check if user exists before proceeding
    let userName = shareWithEmail;
    let userExists = false;
    try {
        const usersRes = await fetch('/api/users');
        const users = await usersRes.json();
        const user = users.find(u => u.email === shareWithEmail);
        if(user) {
            userName = user.name;
            userExists = true;
        }
    } catch(e) {
        showNotification("Error checking user account. Please try again.", "error");
        return;
    }

    if(!userExists) {
        showNotification("User account not found. Please enter a valid registered email address.", "error");
        return;
    }

    try {
        // Send notification instead of directly sharing
        const res = await fetch('/api/notifications', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                type: 'share',
                fromEmail: ownerEmail,
                toEmail: shareWithEmail,
                deviceId: deviceIdToShare,
                deviceName: deviceNameToShare,
                permission: permission
            })
        });
        
        const data = await res.json();
        if(data.success) {
            showNotification(`Request sent to ${shareWithEmail}. They will receive a notification to accept.`, "success");
            loadSharedUsers(deviceIdToShare);
            userEmailInput.value = '';
        } else {
            showNotification(data.message, "error");
        }
    } catch(e) {
        showNotification("Error sending request: " + e.message, "error");
    }
}

// Custom confirmation modal
let confirmResolve = null;

function showConfirmModal(title, message, okText = "Confirm", okClass = "bg-blue-600 hover:bg-blue-700") {
    return new Promise((resolve) => {
        confirmResolve = resolve;
        const modal = document.getElementById('confirm-modal');
        const titleEl = document.getElementById('confirm-title');
        const messageEl = document.getElementById('confirm-message');
        const okBtn = document.getElementById('confirm-ok-btn');
        
        if(modal && titleEl && messageEl && okBtn) {
            titleEl.textContent = title;
            messageEl.textContent = message;
            okBtn.textContent = okText;
            okBtn.className = `flex-1 ${okClass} text-white py-3 rounded-lg font-bold shadow-md transition`;
            modal.classList.remove('hidden');
        }
    });
}

function closeConfirmModal(confirmed) {
    const modal = document.getElementById('confirm-modal');
    if(modal) {
        modal.classList.add('hidden');
    }
    if(confirmResolve) {
        confirmResolve(confirmed);
        confirmResolve = null;
    }
}

async function removeSharedAccess(email, event) {
    if(event) event.stopPropagation();
    if(!deviceIdToShare) return;
    
    const confirmed = await showConfirmModal(
        "Remove Access",
        `Are you sure you want to remove access for ${email}?`,
        "Remove Access",
        "bg-red-600 hover:bg-red-700"
    );
    
    if(!confirmed) return;

    const ownerEmail = localStorage.getItem('eps_user_email');
    
    try {
        const res = await fetch('/api/devices/share', {
            method: 'DELETE',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                deviceId: deviceIdToShare,
                ownerEmail: ownerEmail,
                shareWithEmail: email
            })
        });
        
        const data = await res.json();
        if(data.success) {
            showNotification(data.message, "success");
            loadSharedUsers(deviceIdToShare);
            renderDeviceList();
        } else {
            showNotification(data.message, "error");
        }
    } catch(e) {
        showNotification("Error removing access: " + e.message, "error");
    }
}

async function handleTransferOwnership(event) {
    event.preventDefault();
    const transferEmailInput = document.getElementById('transfer-user-email');
    
    if(!transferEmailInput || !deviceIdToShare) return;
    
    const newOwnerEmail = transferEmailInput.value.trim();
    const currentOwnerEmail = localStorage.getItem('eps_user_email');
    
    if(!newOwnerEmail) {
        showNotification("Please enter a user email", "warning");
        return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if(!emailRegex.test(newOwnerEmail)) {
        showNotification("Please enter a valid email address", "error");
        return;
    }

    // Check if user exists before proceeding
    let userName = newOwnerEmail;
    let userExists = false;
    try {
        const usersRes = await fetch('/api/users');
        const users = await usersRes.json();
        const user = users.find(u => u.email === newOwnerEmail);
        if(user) {
            userName = user.name;
            userExists = true;
        }
    } catch(e) {
        showNotification("Error checking user account. Please try again.", "error");
        return;
    }

    if(!userExists) {
        showNotification("User account not found. Please enter a valid registered email address.", "error");
        return;
    }

    const confirmed = await showConfirmModal(
        "Send Transfer Request",
        `Send ownership transfer request to ${userName} (${newOwnerEmail})? They will need to accept the request.`,
        "Send Request",
        "bg-red-600 hover:bg-red-700"
    );
    
    if(!confirmed) return;

    try {
        // Send notification instead of directly transferring
        const res = await fetch('/api/notifications', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                type: 'transfer',
                fromEmail: currentOwnerEmail,
                toEmail: newOwnerEmail,
                deviceId: deviceIdToShare,
                deviceName: deviceNameToShare
            })
        });
        
        const data = await res.json();
        if(data.success) {
            showNotification(`Transfer request sent to ${newOwnerEmail}. They will receive a notification to accept.`, "success");
            closeShareModal();
            loadNotifications();
        } else {
            showNotification(data.message, "error");
        }
    } catch(e) {
        showNotification("Error sending request: " + e.message, "error");
    }
}

async function confirmDelete() {
    if(deviceIdToDelete) {
        const email = localStorage.getItem('eps_user_email');
        // Remove from server
        const res = await fetch('/api/devices', { 
            method: 'DELETE', 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify({ id: deviceIdToDelete, requesterEmail: email }) 
        });
        const data = await res.json();
        
        // Update UI
        renderDeviceList();
        // Try to update profile list if it exists
        if(typeof renderProfileDeviceList === 'function') renderProfileDeviceList();
        
        if (data.success) {
            showNotification(data.message || "Device removed", "success");
        } else {
            showNotification(data.message || "Failed to remove device", "error");
        }
        closeDeleteModal();
    }
}

// Main Delete Function called by buttons
function deleteDevice(id, event) {
    openDeleteModal(id, event);
}

// -- Filter --
// Store devices for filtering
let cachedDevices = [];

async function filterDevices(query) {
    const listContainer = document.getElementById('device-list');
    
    if (!query || query.trim() === '') {
        renderDeviceList();
        return;
    }

    // If no cached devices, fetch them
    if (cachedDevices.length === 0) {
        const email = localStorage.getItem('eps_user_email');
        if (!email) return;
        
        try {
            const res = await fetch(`/api/devices?email=${email}`);
            cachedDevices = await res.json();
        } catch(e) {
            console.error('Error fetching devices for search:', e);
            return;
        }
    }

    const searchQuery = query.toLowerCase().trim();
    const filtered = cachedDevices.filter(d => 
        d.name.toLowerCase().includes(searchQuery) || 
        d.id.toString().includes(searchQuery)
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
    
    // Determine permission and ownership
    const permission = device.permission || 'owner';
    const isShared = device.isShared || false;
    const isOwner = permission === 'owner';
    const canManage = isOwner || permission === 'manage';
    
    // Permission badge
    let permissionBadge = '';
    if (isShared) {
        const badgeColor = permission === 'manage' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700';
        const badgeText = permission === 'manage' ? 'Manage' : 'View Only';
        permissionBadge = `<span class="px-2 py-1 text-xs font-bold rounded-full ${badgeColor}">${badgeText}</span>`;
    } else {
        permissionBadge = `<span class="px-2 py-1 text-xs font-bold rounded-full bg-green-100 text-green-700">Owner</span>`;
    }
    
    // No owner info needed since users only see their own devices or shared devices
    let ownerInfo = '';
    
    card.innerHTML = `
        <div id="card-body-${device.id}" class="p-6 cursor-pointer flex-grow transition-opacity duration-300" onclick="window.location.href='device.html?id=${device.id}&name=${encodeURIComponent(device.name)}'">
            <div class="flex items-start justify-between mb-4">
                <div class="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors">📊</div>
                <div class="flex flex-col items-end gap-1">
                    <span class="bg-gray-100 text-gray-500 text-xs font-bold font-mono px-2 py-1 rounded border border-gray-200">ID: ${device.id}</span>
                    ${permissionBadge}
                </div>
            </div>
            <h3 class="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition mb-2 truncate">${device.name}</h3>
            ${ownerInfo}
            <div class="flex items-center text-xs text-gray-500" id="status-container-${device.id}">
                <span class="w-2 h-2 bg-gray-300 rounded-full mr-2"></span> Checking...
            </div>
        </div>
        <div class="bg-gray-50 border-t border-gray-100 px-4 py-3 flex items-center justify-between gap-3">
            <button id="btn-view-${device.id}" onclick="window.location.href='device.html?id=${device.id}&name=${encodeURIComponent(device.name)}'" class="flex-1 bg-white border border-gray-200 text-gray-700 hover:text-blue-600 hover:border-blue-300 text-xs font-bold py-2 rounded-lg transition shadow-sm">View</button>
            <div class="flex space-x-1 border-l border-gray-200 pl-2">
                ${isOwner ? `<button onclick="openShareModal('${device.id}', '${device.name}', event)" class="p-2 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50 transition" title="Share Device">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
                </button>` : ''}
                ${canManage ? `<button onclick="openRenameModal('${device.id}', '${device.name}', event)" class="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition" title="Rename">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                </button>` : ''}
                ${permission === 'view' && isShared ? `<button onclick="deleteDevice('${device.id}', event)" class="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition" title="Remove My Access">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>` : `<button onclick="deleteDevice('${device.id}', event)" class="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition" title="${isOwner ? 'Delete Device' : 'Remove Access'}">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>`}
            </div>
        </div>
    `;
    return card;
}

// Load and display notifications
async function loadNotifications() {
    const notificationsList = document.getElementById('notifications-list');
    if(!notificationsList) return;

    const email = localStorage.getItem('eps_user_email');
    if(!email) {
        notificationsList.innerHTML = '<p class="text-sm text-gray-500 text-center py-4">Please log in to view notifications</p>';
        return;
    }

    try {
        const res = await fetch(`/api/notifications?email=${encodeURIComponent(email)}`);
        
        if(!res.ok) {
            throw new Error(`Server returned ${res.status}`);
        }
        
        const notifications = await res.json();

        if(!Array.isArray(notifications)) {
            throw new Error('Invalid response format');
        }

        if(notifications.length === 0) {
            notificationsList.innerHTML = '<p class="text-sm text-gray-500 text-center py-4">No pending notifications</p>';
            return;
        }

        notificationsList.innerHTML = '';
        
        // Fetch all users once for name resolution
        let users = [];
        try {
            const usersRes = await fetch('/api/users');
            users = await usersRes.json();
        } catch(e) {
            console.warn('Could not load user names:', e);
        }

        notifications.forEach(notif => {
            const item = document.createElement('div');
            item.className = 'p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition';
            
            const isShare = notif.type === 'share';
            const permissionText = isShare ? (notif.permission === 'manage' ? 'Manage' : 'View Only') : 'Ownership';
            const permissionColor = isShare ? (notif.permission === 'manage' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700') : 'bg-green-100 text-green-700';
            
            // Get sender name
            const sender = users.find(u => u.email === notif.fromEmail);
            const senderName = sender ? sender.name : notif.fromEmail;
            const createdAt = notif.createdAt ? new Date(notif.createdAt).toLocaleString() : 'Unknown date';

            item.innerHTML = `
                <div class="flex items-start justify-between">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-2">
                            <span class="px-2 py-1 text-xs font-bold rounded-full ${permissionColor}">${permissionText}</span>
                            <span class="text-xs text-gray-500">${isShare ? 'Share Request' : 'Transfer Request'}</span>
                        </div>
                        <p class="text-sm font-semibold text-gray-900 mb-1">
                            ${senderName} wants to ${isShare ? `share` : `transfer ownership of`} device
                        </p>
                        <p class="text-sm text-gray-600 font-medium">${notif.deviceName || 'Device'} (ID: ${notif.deviceId})</p>
                        <p class="text-xs text-gray-500 mt-1">${createdAt}</p>
                    </div>
                    <div class="flex gap-2 ml-4">
                        <button onclick="acceptNotification('${notif.id}')" class="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 transition">Accept</button>
                        <button onclick="rejectNotification('${notif.id}')" class="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-300 transition">Reject</button>
                    </div>
                </div>
            `;
            notificationsList.appendChild(item);
        });
    } catch(e) {
        console.error('Error loading notifications:', e);
        notificationsList.innerHTML = `<p class="text-sm text-red-500 text-center py-4">Error loading notifications: ${e.message}</p>`;
    }
}

async function acceptNotification(notificationId) {
    const email = localStorage.getItem('eps_user_email');
    if(!email) return;

    try {
        const res = await fetch(`/api/notifications/${notificationId}/accept?email=${email}`, {
            method: 'POST'
        });
        const data = await res.json();
        
        if(data.success) {
            showNotification("Request accepted", "success");
            loadNotifications();
            renderDeviceList();
            setTimeout(() => window.location.reload(), 1000);
        } else {
            showNotification(data.message, "error");
        }
    } catch(e) {
        showNotification("Error accepting request: " + e.message, "error");
    }
}

async function rejectNotification(notificationId) {
    const email = localStorage.getItem('eps_user_email');
    if(!email) return;

    try {
        const res = await fetch(`/api/notifications/${notificationId}/reject?email=${email}`, {
            method: 'POST'
        });
        const data = await res.json();
        
        if(data.success) {
            showNotification("Request rejected", "success");
            loadNotifications();
        } else {
            showNotification(data.message, "error");
        }
    } catch(e) {
        showNotification("Error rejecting request: " + e.message, "error");
    }
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

        // Debug: Log what devices are returned
        console.log('Devices returned for', email, ':', devices.map(d => ({id: d.id, name: d.name, owner: d.owner, permission: d.permission, isShared: d.isShared})));

        // Cache devices for search
        cachedDevices = devices;

        if(statTotal) statTotal.innerText = devices.length;
        listContainer.innerHTML = '';

        // Check if user has any owned devices (to determine if they can add devices)
        const hasOwnedDevices = devices.some(d => d.permission === 'owner' && !d.isShared);
        const canAddDevices = hasOwnedDevices || devices.length === 0; // Can add if they have owned devices or no devices yet

        // Hide/show Add Device FAB based on permissions
        const addDeviceFABs = document.querySelectorAll('button[onclick="toggleAddDeviceModal()"]');
        addDeviceFABs.forEach(btn => {
            if (!canAddDevices) {
                btn.classList.add('hidden');
            } else {
                btn.classList.remove('hidden');
            }
        });

        // Hide Add Device button in empty state for view-only users
        const emptyStateAddBtn = emptyState?.querySelector('button[onclick="toggleAddDeviceModal()"]');
        if (emptyStateAddBtn) {
            if (!canAddDevices) {
                emptyStateAddBtn.classList.add('hidden');
            } else {
                emptyStateAddBtn.classList.remove('hidden');
            }
        }

        if (devices.length === 0) {
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
            devices.forEach(device => {
                // Debug: Log device info to verify server response
                if (device.id === '3175602') {
                    console.log('Device 3175602 info:', {
                        permission: device.permission,
                        isShared: device.isShared,
                        owner: device.owner,
                        currentUser: email
                    });
                }
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
            const permission = device.permission || 'owner';
            const isShared = device.isShared || false;
            
            let permissionBadge = '';
            if (isShared) {
                permissionBadge = permission === 'manage' 
                    ? '<span class="px-2 py-1 text-xs font-bold text-purple-700 bg-purple-100 rounded-full">Manage</span>'
                    : '<span class="px-2 py-1 text-xs font-bold text-blue-700 bg-blue-100 rounded-full">View Only</span>';
            } else {
                permissionBadge = '<span class="px-2 py-1 text-xs font-bold text-green-700 bg-green-100 rounded-full">Owner</span>';
            }
            
            const row = document.createElement('tr');
            row.className = "hover:bg-gray-50 transition";
            row.innerHTML = `
                <td class="px-6 py-4 font-medium text-gray-900">${device.name}</td>
                <td class="px-6 py-4 text-gray-500 font-mono text-xs">${device.id}</td>
                <td class="px-6 py-4">${permissionBadge}</td>
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

// Device Page - Load Device Data
async function loadDeviceData(deviceId, deviceName) {
    // Update page header
    const pageName = document.getElementById('page-device-name');
    const pageId = document.getElementById('page-device-id');
    const breadcrumbName = document.getElementById('breadcrumb-name');
    
    if (pageName) pageName.innerText = deviceName || 'Device';
    if (pageId) pageId.innerText = `ID: ${deviceId}`;
    if (breadcrumbName) breadcrumbName.innerText = deviceName || 'Device';
    
    // Update document title
    document.title = `${deviceName || 'Device'} - ChitoNet`;
    
    // Load charts using ThingSpeak iframes
    const phContainer = document.getElementById('container-ph');
    const tempContainer = document.getElementById('container-temp');
    const turbContainer = document.getElementById('container-turbidity');
    
    if (phContainer) {
        phContainer.innerHTML = `<iframe src="https://thingspeak.com/channels/${deviceId}/charts/1?bgcolor=%23ffffff&color=%2315803d&dynamic=true&results=60&type=line&update=15&width=auto&height=auto&linewidth=2" style="width:100%;height:100%;border:none;"></iframe>`;
    }
    
    if (tempContainer) {
        tempContainer.innerHTML = `<iframe src="https://thingspeak.com/channels/${deviceId}/charts/2?bgcolor=%23ffffff&color=%23b91c1c&dynamic=true&results=60&type=line&update=15&width=auto&height=auto&linewidth=2" style="width:100%;height:100%;border:none;"></iframe>`;
    }
    
    if (turbContainer) {
        turbContainer.innerHTML = `<iframe src="https://thingspeak.com/channels/${deviceId}/charts/3?bgcolor=%23ffffff&color=%23ca8a04&dynamic=true&results=60&type=line&update=15&width=auto&height=auto&linewidth=2" style="width:100%;height:100%;border:none;"></iframe>`;
    }
    
    // Check device status
    checkDeviceStatus(deviceId);
    
    // Update status periodically
    setInterval(() => checkDeviceStatus(deviceId), 30000); // Check every 30 seconds
}

async function checkDeviceStatus(deviceId) {
    const statusDot = document.getElementById('status-dot');
    const statusPing = document.getElementById('status-ping');
    const statusText = document.getElementById('status-text');
    
    if (!statusDot || !statusText) return;
    
    try {
        const response = await fetch(`https://api.thingspeak.com/channels/${deviceId}/feeds/last.json`);
        const data = await response.json();
        
        if (data === "-1" || !data.created_at) {
            // Device never seen or invalid
            statusDot.className = "relative inline-flex rounded-full h-3 w-3 bg-gray-500";
            statusPing.classList.remove('bg-green-400');
            statusPing.classList.add('bg-gray-400');
            statusText.innerText = "Offline";
            statusText.className = "text-sm font-bold text-gray-500";
        } else {
            const diff = (new Date() - new Date(data.created_at)) / 1000 / 60; // minutes
            if (diff < 5) {
                // Online
                statusDot.className = "relative inline-flex rounded-full h-3 w-3 bg-green-500";
                statusPing.classList.remove('bg-gray-400');
                statusPing.classList.add('bg-green-400');
                statusText.innerText = "Online";
                statusText.className = "text-sm font-bold text-green-600";
            } else {
                // Offline
                statusDot.className = "relative inline-flex rounded-full h-3 w-3 bg-red-500";
                statusPing.classList.remove('bg-green-400');
                statusPing.classList.add('bg-red-400');
                statusText.innerText = "Offline";
                statusText.className = "text-sm font-bold text-red-600";
            }
        }
    } catch (e) {
        statusDot.className = "relative inline-flex rounded-full h-3 w-3 bg-yellow-500";
        statusPing.classList.remove('bg-green-400', 'bg-red-400', 'bg-gray-400');
        statusPing.classList.add('bg-yellow-400');
        statusText.innerText = "Error";
        statusText.className = "text-sm font-bold text-yellow-600";
    }
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
        // Validate ThingSpeak channel exists
        const tsCheck = await fetch(`https://api.thingspeak.com/channels/${id}/feeds/last.json`);
        if (tsCheck.status === 404) throw new Error("Channel ID does not exist.");
        const tsData = await tsCheck.json();
        if (tsData === "-1") throw new Error("Channel ID is invalid or private.");

        // Try to add device (must be registered in admin panel first)
        const res = await fetch('/api/devices', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ id, name, owner: email })
        });
        const data = await res.json();
        if (data.success) {
            showNotification("Device added to your account", "success");
            toggleAddDeviceModal();
            renderDeviceList();
            document.getElementById('new-device-name').value = '';
            document.getElementById('new-device-id').value = '';
        } else { 
            showNotification(data.message, "error"); 
        }
    } catch (error) { 
        showNotification("Error: " + error.message, "error"); 
    } 
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
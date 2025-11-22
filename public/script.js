// 1. Mobile Menu Toggle
function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenu) {
        mobileMenu.classList.toggle('hidden');
    }
}

// 2. Clock Logic
function updateClock() {
    const now = new Date();
    const clockElement = document.getElementById('clock');
    if(clockElement) {
        clockElement.innerText = now.toLocaleTimeString();
    }
}
setInterval(updateClock, 1000);
document.addEventListener("DOMContentLoaded", updateClock);

// 3. REAL SYSTEM STATUS CHECK
async function checkSystemStatus() {
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    
    // Only run this if we are on the dashboard (elements exist)
    if(!statusDot || !statusText) return;

    try {
        // Fetch the last entry from your ThingSpeak Channel
        const response = await fetch('https://api.thingspeak.com/channels/3175602/feeds/last.json');
        const data = await response.json();
        
        // CASE: Channel is empty (New channel, no data yet)
        if (data === "-1" || !data.created_at) {
            statusDot.className = "w-2 h-2 bg-gray-500 rounded-full";
            statusText.innerText = "No Data Yet";
            statusText.className = "text-gray-400 font-bold";
            return;
        }

        // CASE: Check time difference
        const lastUpdate = new Date(data.created_at);
        const now = new Date();
        // Difference in minutes
        const diffMinutes = (now - lastUpdate) / 1000 / 60;

        if (diffMinutes < 2) {
            // Online (Data received in last 2 mins)
            statusDot.className = "w-2 h-2 bg-green-500 rounded-full animate-pulse";
            statusText.innerText = "System Online";
            statusText.className = "text-green-400 font-bold";
        } else {
            // Offline (No data for > 2 mins)
            statusDot.className = "w-2 h-2 bg-red-500 rounded-full";
            statusText.innerText = "System Offline";
            statusText.className = "text-red-400 font-bold";
        }
    } catch (error) {
        // Network error or API blocked
        console.error("Status Check Failed:", error);
        statusDot.className = "w-2 h-2 bg-yellow-500 rounded-full";
        statusText.innerText = "Connection Error";
        statusText.className = "text-yellow-500 font-bold";
    }
}

// Run status check immediately and then every 15 seconds
document.addEventListener("DOMContentLoaded", checkSystemStatus);
setInterval(checkSystemStatus, 15000);


// 4. LOGIN LOGIC
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('error-msg');
    const loginBtn = document.getElementById('login-btn');

    if(!email || !password) {
        alert("Please enter both email and password.");
        return;
    }

    loginBtn.innerText = "Verifying...";
    loginBtn.disabled = true;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem('eps_user_logged_in', 'true');
            localStorage.setItem('eps_user_name', data.name);
            window.location.href = 'dashboard.html';
        } else {
            errorMsg.innerText = data.message;
            errorMsg.classList.remove('hidden');
            loginBtn.innerText = "Login";
            loginBtn.disabled = false;
        }
    } catch (error) {
        console.error("Error:", error);
        errorMsg.innerText = "Server connection failed. Is Node running?";
        errorMsg.classList.remove('hidden');
        loginBtn.innerText = "Login";
        loginBtn.disabled = false;
    }
}

function handleLogout() {
    localStorage.removeItem('eps_user_logged_in');
    localStorage.removeItem('eps_user_name');
    window.location.href = 'index.html';
}

// 5. CHECK AUTH STATE (Runs on every page load)
document.addEventListener("DOMContentLoaded", function() {
    const isLoggedIn = localStorage.getItem('eps_user_logged_in');
    const userName = localStorage.getItem('eps_user_name');
    
    const navLogin = document.getElementById('nav-btn-login');
    const navDash = document.getElementById('nav-btn-dashboard');

    if(isLoggedIn === 'true') {
        if(navLogin) navLogin.classList.add('hidden');
        if(navDash) navDash.classList.remove('hidden');
        
        const welcomeMsg = document.getElementById('user-welcome');
        if(welcomeMsg && userName) welcomeMsg.innerText = userName;
    } else {
        // Redirect to login if trying to access dashboard while logged out
        if(window.location.pathname.includes('dashboard.html')) {
             window.location.href = 'login.html';
        }
    }
});
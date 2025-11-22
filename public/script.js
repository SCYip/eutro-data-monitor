// ... existing code (Mobile Menu & Clock) ...

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

// --- NEW LOGIN LOGIC CONNECTED TO BACKEND ---

async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('error-msg');
    const loginBtn = document.getElementById('login-btn');

    // Simple validation
    if(!email || !password) {
        alert("Please enter both email and password.");
        return;
    }

    // Loading State
    loginBtn.innerText = "Verifying...";
    loginBtn.disabled = true;

    try {
        // Send data to our Node.js Backend
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
            // Save session
            localStorage.setItem('eps_user_logged_in', 'true');
            localStorage.setItem('eps_user_name', data.name);
            
            // Redirect
            window.location.href = 'dashboard.html';
        } else {
            // Show error from server
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

// Logout Logic
function handleLogout() {
    localStorage.removeItem('eps_user_logged_in');
    localStorage.removeItem('eps_user_name');
    window.location.href = 'index.html'; // Go back to home
}

// Check Auth State on Load
document.addEventListener("DOMContentLoaded", function() {
    const isLoggedIn = localStorage.getItem('eps_user_logged_in');
    const userName = localStorage.getItem('eps_user_name');
    
    // Nav Buttons
    const navLogin = document.getElementById('nav-btn-login');
    const navDash = document.getElementById('nav-btn-dashboard');

    if(isLoggedIn === 'true') {
        if(navLogin) navLogin.classList.add('hidden');
        if(navDash) navDash.classList.remove('hidden');
        
        // If on dashboard, show user name
        const welcomeMsg = document.getElementById('user-welcome');
        if(welcomeMsg && userName) welcomeMsg.innerText = `Welcome, ${userName}`;
    } else {
        // If NOT logged in, protect dashboard
        if(window.location.pathname.includes('dashboard.html')) {
             window.location.href = 'login.html';
        }
    }
});
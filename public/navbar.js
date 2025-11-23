document.addEventListener("DOMContentLoaded", function() {
    const placeholder = document.getElementById("navbar-placeholder");
    if (!placeholder) return;

    fetch("navbar.html")
        .then(response => response.text())
        .then(html => {
            placeholder.innerHTML = html;
            highlightActiveLink();
            checkAuthStatus();
            setupNavbarEvents();
        })
        .catch(err => console.error("Error loading navbar:", err));
});

function highlightActiveLink() {
    const path = window.location.pathname;
    const p = path === "/" ? "index.html" : path.substring(1);
    
    const links = document.querySelectorAll(".nav-link");
    links.forEach(link => {
        const href = link.getAttribute("href");
        if (href === p) {
            link.classList.add("text-blue-600", "font-bold", "border-b-2", "border-blue-600");
            link.classList.remove("text-gray-500", "font-medium");
        } else {
            link.classList.add("text-gray-500", "font-medium");
            link.classList.remove("text-blue-600", "font-bold", "border-b-2", "border-blue-600");
        }
    });
}

function checkAuthStatus() {
    const loggedIn = localStorage.getItem('eps_user_logged_in');
    const role = localStorage.getItem('eps_user_role');
    const name = localStorage.getItem('eps_user_name');
    
    const navGroupLoggedIn = document.getElementById('nav-group-logged-in');
    const navGroupLoggedOut = document.getElementById('nav-group-logged-out');
    const adminLink = document.getElementById('nav-admin-link');
    const navUserInitial = document.getElementById('nav-user-initial');
    const navBtnLogin = document.getElementById('nav-btn-login');
    const navBtnDashboard = document.getElementById('nav-btn-dashboard');

    if(loggedIn === 'true') {
        // Show logged in group, hide logged out group
        if(navGroupLoggedOut) navGroupLoggedOut.classList.add('hidden');
        if(navGroupLoggedIn) navGroupLoggedIn.classList.remove('hidden');
        if(navBtnLogin) navBtnLogin.classList.add('hidden');
        if(navBtnDashboard) navBtnDashboard.classList.remove('hidden');
        
        // Show admin link if user is admin
        if(adminLink && role === 'admin') {
            adminLink.classList.remove('hidden');
            adminLink.classList.add('flex');
        } else if(adminLink) {
            adminLink.classList.add('hidden');
        }
        
        // Update user initial
        if(navUserInitial && name) {
            navUserInitial.innerText = name.charAt(0).toUpperCase();
        }
    } else {
        // Show logged out group, hide logged in group
        if(navGroupLoggedIn) navGroupLoggedIn.classList.add('hidden');
        if(navGroupLoggedOut) navGroupLoggedOut.classList.remove('hidden');
        if(navBtnLogin) navBtnLogin.classList.remove('hidden');
        if(navBtnDashboard) navBtnDashboard.classList.add('hidden');
        if(adminLink) adminLink.classList.add('hidden');
    }
}

function setupNavbarEvents() {
    // Mobile menu toggle
    const btn = document.getElementById("mobile-menu-btn");
    const menu = document.getElementById("mobile-menu");
    if(btn && menu) {
        btn.addEventListener("click", () => menu.classList.toggle("hidden"));
    }

    // Logout button
    const logoutBtn = document.getElementById("btn-logout-nav");
    if(logoutBtn) {
        logoutBtn.addEventListener("click", function() {
            if (typeof handleLogout === "function") {
                handleLogout();
            } else {
                // Fallback logout function
                localStorage.clear();
                window.location.href = 'index.html';
            }
        });
    }
}

// ==========================
// Simple Script for About and Contact Pages
// ==========================

// Theme toggle functionality
document.addEventListener('DOMContentLoaded', () => {
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('light-theme');
            const isLight = document.body.classList.contains('light-theme');
            localStorage.setItem('theme', isLight ? 'light' : 'dark');
            showNotification(`Switched to ${isLight ? 'light' : 'dark'} theme`, 'info');
            
            // Update icon
            const icon = themeToggle.querySelector('i');
            if (icon) {
                icon.className = isLight ? 'fas fa-sun' : 'fas fa-moon';
            }
        });
    }
    
    // Initialize theme from localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        if (themeToggle) {
            const icon = themeToggle.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-sun';
            }
        }
    }
    
    // Logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            // Redirect to home page
            window.location.href = 'index.html';
        });
    }
});

// Notification system for these pages
function showNotification(message, type = 'info') {
    // Create notification toast if it doesn't exist
    let toast = document.getElementById('notificationToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'notificationToast';
        toast.className = 'fixed top-20 right-4 bg-gray-800/90 backdrop-blur-lg border border-gray-700 rounded-xl p-4 shadow-2xl z-50 transform transition-transform duration-300 translate-x-full';
        toast.innerHTML = `
            <div class="flex items-center">
                <i id="toastIcon" class="mr-3 text-lg"></i>
                <span id="toastMessage" class="font-medium"></span>
            </div>
        `;
        document.body.appendChild(toast);
    }
    
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = document.getElementById('toastIcon');
    
    // Set message and icon based on type
    toastMessage.textContent = message;
    
    switch(type) {
        case 'success':
            toastIcon.className = 'fas fa-check-circle text-green-500 mr-3 text-lg';
            toast.classList.remove('bg-red-900/90', 'bg-yellow-900/90');
            toast.classList.add('bg-green-900/90');
            break;
        case 'warning':
            toastIcon.className = 'fas fa-exclamation-triangle text-yellow-500 mr-3 text-lg';
            toast.classList.remove('bg-red-900/90', 'bg-green-900/90');
            toast.classList.add('bg-yellow-900/90');
            break;
        case 'error':
            toastIcon.className = 'fas fa-exclamation-circle text-red-500 mr-3 text-lg';
            toast.classList.remove('bg-green-900/90', 'bg-yellow-900/90');
            toast.classList.add('bg-red-900/90');
            break;
        default:
            toastIcon.className = 'fas fa-info-circle text-blue-500 mr-3 text-lg';
            toast.classList.remove('bg-red-900/90', 'bg-green-900/90', 'bg-yellow-900/90');
    }
    
    // Show toast with enhanced animation
    toast.classList.remove('translate-x-full', 'hide');
    toast.classList.add('show');
    
    // Add glow effect
    toast.style.boxShadow = '0 0 25px ' + (type === 'success' ? 'rgba(0, 204, 102, 0.5)' : 
                                            type === 'warning' ? 'rgba(255, 153, 0, 0.5)' : 
                                            type === 'error' ? 'rgba(255, 77, 77, 0.5)' : 
                                            'rgba(0, 119, 255, 0.5)');
    
    // Scroll to notification only for error or warning types
    if (type === 'error' || type === 'warning') {
        toast.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    // Auto hide after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        toast.classList.add('hide');
        setTimeout(() => {
            toast.classList.remove('hide');
            toast.classList.add('translate-x-full');
        }, 300);
    }, 3000);
}
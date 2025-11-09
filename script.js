// ==========================
// Modern Password Manager - All-in-One Script
// ==========================

// ==========================
// Helper Functions
// ==========================
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2) + Math.random().toString(36).substr(2);
}

// Generate unique password by ensuring it doesn't already exist in the database
function generateUniquePassword(length, options = {}) {
    let password;
    let attempts = 0;
    const maxAttempts = 100; // Prevent infinite loop
    
    do {
        password = generateRandomPassword(length, options);
        attempts++;
        
        // Check if this password already exists in the database
        const existingPassword = passwordDatabase.find(entry => entry.password === password);
        if (!existingPassword || attempts >= maxAttempts) {
            break;
        }
    } while (attempts < maxAttempts);
    
    return password;
}

// Generate unique memorable password
function generateUniqueMemorablePassword(wordCount, options = {}) {
    let password;
    let attempts = 0;
    const maxAttempts = 100; // Prevent infinite loop
    
    do {
        password = generateMemorablePassword(wordCount, options);
        attempts++;
        
        // Check if this password already exists in the database
        const existingPassword = passwordDatabase.find(entry => entry.password === password);
        if (!existingPassword || attempts >= maxAttempts) {
            break;
        }
    } while (attempts < maxAttempts);
    
    return password;
}

// Generate unique PIN
function generateUniquePIN(length) {
    let pin;
    let attempts = 0;
    const maxAttempts = 100; // Prevent infinite loop
    
    do {
        pin = generatePIN(length);
        attempts++;
        
        // Check if this PIN already exists in the database
        const existingPassword = passwordDatabase.find(entry => entry.password === pin);
        if (!existingPassword || attempts >= maxAttempts) {
            break;
        }
    } while (attempts < maxAttempts);
    
    return pin;
}

// ==========================
// Encryption System
// ==========================
class PasswordEncryption {
    // PBKDF2 key derivation with configurable iterations
    static async deriveKey(password, salt, iterations = 150000) {
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveKey']
        );
        
        return await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: iterations,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }

    // Encrypt data using AES-GCM
    static async encrypt(data, password) {
        try {
            const salt = crypto.getRandomValues(new Uint8Array(16));
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const key = await this.deriveKey(password, salt);
            const encoder = new TextEncoder();
            const encodedData = encoder.encode(JSON.stringify(data));
            
            const encryptedData = await crypto.subtle.encrypt(
                {
                    name: "AES-GCM",
                    iv: iv
                },
                key,
                encodedData
            );

            // Return encrypted package
            return {
                version: 1,
                salt: btoa(String.fromCharCode(...salt)),
                iv: btoa(String.fromCharCode(...iv)),
                ciphertext: btoa(String.fromCharCode(...new Uint8Array(encryptedData))),
                iterations: 150000
            };
        } catch (error) {
            console.error('Encryption failed:', error);
            throw new Error('Failed to encrypt data');
        }
    }

    // Decrypt data using AES-GCM
    static async decrypt(encryptedPackage, password) {
        try {
            // Validate package structure
            if (!encryptedPackage || !encryptedPackage.version || !encryptedPackage.salt || 
                !encryptedPackage.iv || !encryptedPackage.ciphertext || !encryptedPackage.iterations) {
                throw new Error('Invalid encrypted package format');
            }
            
            const salt = Uint8Array.from(atob(encryptedPackage.salt), c => c.charCodeAt(0));
            const iv = Uint8Array.from(atob(encryptedPackage.iv), c => c.charCodeAt(0));
            const encryptedData = Uint8Array.from(atob(encryptedPackage.ciphertext), c => c.charCodeAt(0));
            const iterations = encryptedPackage.iterations;
            
            const key = await this.deriveKey(password, salt, iterations);

            const decryptedData = await crypto.subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv: iv
                },
                key,
                encryptedData
            );

            const decoder = new TextDecoder();
            return JSON.parse(decoder.decode(decryptedData));
        } catch (error) {
            console.error('Decryption failed:', error);
            throw new Error('Failed to decrypt data - incorrect password or corrupted file');
        }
    }
}

// ==========================
// Notification System
// ==========================
function showNotification(message, type = 'info') {
    const toast = document.getElementById('notificationToast');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = document.getElementById('toastIcon');
    
    // Create toast if it doesn't exist
    if (!toast) {
        const newToast = document.createElement('div');
        newToast.id = 'notificationToast';
        newToast.className = 'fixed top-20 right-4 bg-gray-800/90 backdrop-blur-lg border border-gray-700 rounded-xl p-4 shadow-2xl z-50 transform transition-transform duration-300 translate-x-full';
        newToast.innerHTML = `
            <div class="flex items-center">
                <i id="toastIcon" class="mr-3 text-lg"></i>
                <span id="toastMessage" class="font-medium"></span>
            </div>
        `;
        document.body.appendChild(newToast);
        
        // Update references
        toast = newToast;
        toastMessage = document.getElementById('toastMessage');
        toastIcon = document.getElementById('toastIcon');
    }
    
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
    
    // Add glow effect
    toast.style.boxShadow = '0 0 25px ' + (type === 'success' ? 'rgba(0, 204, 102, 0.5)' : 
                                            type === 'warning' ? 'rgba(255, 153, 0, 0.5)' : 
                                            type === 'error' ? 'rgba(255, 77, 77, 0.5)' : 
                                            'rgba(0, 119, 255, 0.5)');
    
    // Show toast with enhanced animation
    toast.classList.remove('hide');
    toast.classList.add('show');
    toast.style.animation = 'slideInNotification 0.4s cubic-bezier(0.25, 0.8, 0.25, 1) forwards';
    
    // Scroll to notification only for error or warning types
    if (type === 'error' || type === 'warning') {
        toast.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    // Auto hide after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOutNotification 0.4s cubic-bezier(0.25, 0.8, 0.25, 1) forwards';
        setTimeout(() => {
            toast.classList.remove('show');
            toast.classList.add('hide');
        }, 400);
    }, 3000);
}

// ==========================
// Advanced Password Generators
// ==========================

// Random Password Generator with customizable options
function generateRandomPassword(length, options = {}) {
    const {
        uppercase = true,
        lowercase = true,
        numbers = true,
        symbols = true
    } = options;
    
    let charset = '';
    if (uppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (lowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (numbers) charset += '0123456789';
    if (symbols) charset += '!@#$%^&*()()_+-=[]{}|;:,.<>?';
    
    if (!charset) return ''; // No character types selected
    
    let password = '';
    for (let i = 0; i < length; i++) {
        password += charset.charAt(getRandomInt(0, charset.length - 1));
    }
    return password;
}

// Memorable Password Generator (based on word patterns)
function generateMemorablePassword(wordCount, options = {}) {
    const {
        capitalize = true,
        addNumbers = false
    } = options;
    
    // Common words for memorable passwords
    const words = [
        'apple', 'brave', 'chair', 'dance', 'eagle', 'flame', 'grape', 'house',
        'island', 'juice', 'knife', 'lemon', 'magic', 'night', 'ocean', 'piano',
        'queen', 'river', 'stone', 'tiger', 'uncle', 'voice', 'water', 'xenon',
        'youth', 'zebra', 'cloud', 'dream', 'earth', 'frost', 'glass', 'heart',
        'image', 'jewel', 'kite', 'light', 'money', 'noise', 'peace', 'quiet',
        'rain', 'snow', 'time', 'unity', 'value', 'world', 'yacht', 'zone'
    ];
    
    let password = '';
    for (let i = 0; i < wordCount; i++) {
        let word = words[getRandomInt(0, words.length - 1)];
        if (capitalize && i === 0) {
            word = word.charAt(0).toUpperCase() + word.slice(1);
        }
        password += word;
        
        // Add a number after each word except the last one
        if (addNumbers && i < wordCount - 1) {
            password += getRandomInt(0, 9);
        }
    }
    
    return password;
}

// PIN Generator
function generatePIN(length) {
    let pin = '';
    for (let i = 0; i < length; i++) {
        pin += getRandomInt(0, 9);
    }
    return pin;
}

// ==========================
// Password Strength Calculator
// ==========================
function calculateStrength(password) {
    let score = 0;
    const checks = {
        length: false,
        uppercase: false,
        lowercase: false,
        numbers: false,
        symbols: false,
        variety: false
    };
    
    if (!password) return { score: 0, checks, label: 'None', color: '#666' };
    
    // Length check (minimum 8 characters)
    if (password.length >= 8) {
        score += 1;
        checks.length = true;
    }
    
    // Length bonus (12+ characters)
    if (password.length >= 12) score += 1;
    
    // Character variety checks
    if (/[A-Z]/.test(password)) {
        score += 1;
        checks.uppercase = true;
    }
    
    if (/[a-z]/.test(password)) {
        score += 1;
        checks.lowercase = true;
    }
    
    if (/[0-9]/.test(password)) {
        score += 1;
        checks.numbers = true;
    }
    
    if (/[^A-Za-z0-9]/.test(password)) {
        score += 1;
        checks.symbols = true;
    }
    
    // Variety bonus (all character types present)
    if (checks.uppercase && checks.lowercase && checks.numbers && checks.symbols) {
        score += 1;
        checks.variety = true;
    }
    
    // Determine strength label and color
    let label, color;
    if (score <= 2) {
        label = 'Very Weak';
        color = '#ff4d4d';
    } else if (score <= 4) {
        label = 'Weak';
        color = '#ff9900';
    } else if (score <= 6) {
        label = 'Medium';
        color = '#ffcc00';
    } else if (score <= 8) {
        label = 'Strong';
        color = '#66cc66';
    } else {
        label = 'Very Strong';
        color = '#00cc66';
    }
    
    return { score, checks, label, color };
}

function updateStrengthMeter(password) {
    const strength = calculateStrength(password);
    const strengthMeter = document.getElementById('strengthMeter');
    const strengthText = document.getElementById('strengthText');
    
    if (strengthMeter && strengthText) {
        // Update meter width and color
        strengthMeter.style.width = (strength.score * 15) + '%';
        strengthMeter.style.background = strength.color;
        strengthText.textContent = strength.label;
        strengthText.style.color = strength.color;
    }
    
    return strength;
}

// ==========================
// Password Management Functions
// ==========================

// Password database with encryption
let passwordDatabase = [];
const ENCRYPTION_KEY = "PassVaultMasterKey2025"; // In a real app, this would be user-provided

// ==========================
// Secure LocalStorage Encryption Functions
// ==========================

// Generate a secure encryption key for localStorage using browser fingerprinting
function generateLocalStorageKey() {
    // Create a unique identifier based on browser characteristics
    const fingerprint = [
        navigator.userAgent,
        navigator.language,
        navigator.platform,
        screen.width,
        screen.height,
        screen.colorDepth,
        new Date().getTimezoneOffset(),
        navigator.hardwareConcurrency || 'unknown'
    ].join('|');
    
    // Hash the fingerprint to create a key
    return btoa(fingerprint).substring(0, 32); // Use first 32 chars as key
}

// Encrypt data for localStorage storage
async function encryptForLocalStorage(data) {
    try {
        const keyString = generateLocalStorageKey();
        const encoder = new TextEncoder();
        const keyData = encoder.encode(keyString);
        
        // Import key
        const key = await crypto.subtle.importKey(
            'raw',
            keyData,
            'AES-GCM',
            false,
            ['encrypt']
        );
        
        // Generate IV
        const iv = crypto.getRandomValues(new Uint8Array(12));
        
        // Encode data
        const encodedData = encoder.encode(JSON.stringify(data));
        
        // Encrypt data
        const encryptedData = await crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            key,
            encodedData
        );
        
        // Return encrypted package
        return {
            iv: Array.from(iv),
            data: Array.from(new Uint8Array(encryptedData))
        };
    } catch (error) {
        console.error('Encryption failed:', error);
        throw new Error('Failed to encrypt data for localStorage');
    }
}

// Decrypt data from localStorage
async function decryptFromLocalStorage(encryptedPackage) {
    try {
        const keyString = generateLocalStorageKey();
        const encoder = new TextEncoder();
        const keyData = encoder.encode(keyString);
        
        // Import key
        const key = await crypto.subtle.importKey(
            'raw',
            keyData,
            'AES-GCM',
            false,
            ['decrypt']
        );
        
        // Extract IV and data
        const iv = new Uint8Array(encryptedPackage.iv);
        const encryptedData = new Uint8Array(encryptedPackage.data);
        
        // Decrypt data
        const decryptedData = await crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            key,
            encryptedData
        );
        
        // Decode and parse data
        const decoder = new TextDecoder();
        return JSON.parse(decoder.decode(decryptedData));
    } catch (error) {
        console.error('Decryption failed:', error);
        throw new Error('Failed to decrypt data from localStorage');
    }
}

// Save password database to localStorage
async function savePasswordDatabase() {
    try {
        const encryptedData = await encryptForLocalStorage(passwordDatabase);
        localStorage.setItem('passvault_local_data', JSON.stringify(encryptedData));
        return true;
    } catch (error) {
        console.error('Failed to save password database:', error);
        return false;
    }
}

// Load password database from localStorage
async function loadPasswordDatabase() {
    try {
        const encryptedData = localStorage.getItem('passvault_local_data');
        if (encryptedData) {
            const parsedData = JSON.parse(encryptedData);
            const decryptedData = await decryptFromLocalStorage(parsedData);
            return decryptedData;
        }
        return [];
    } catch (error) {
        console.error('Failed to load password database:', error);
        return [];
    }
}

// Initialize database
async function initDatabase() {
    try {
        // First try to load from the new secure localStorage system
        const loadedData = await loadPasswordDatabase();
        if (loadedData && loadedData.length > 0) {
            passwordDatabase = loadedData;
            return;
        }
        
        // Fall back to the old system if new system has no data
        const encryptedData = localStorage.getItem('encryptedPasswords');
        if (encryptedData) {
            const decryptedData = await PasswordEncryption.decrypt(encryptedData, ENCRYPTION_KEY);
            passwordDatabase = decryptedData;
            
            // Migrate data to new system
            await savePasswordDatabase();
        } else {
            passwordDatabase = [];
        }
    } catch (error) {
        console.error('Failed to initialize database:', error);
        passwordDatabase = [];
    }
}

// Save passwords to localStorage with encryption
async function savePasswords() {
    try {
        // Save to new secure localStorage system
        const saveResult = await savePasswordDatabase();
        
        // Also save to old system for backward compatibility
        const encryptedData = await PasswordEncryption.encrypt(passwordDatabase, ENCRYPTION_KEY);
        localStorage.setItem('encryptedPasswords', encryptedData);
        
        if (!saveResult) {
            showNotification('Failed to save passwords to secure storage.', 'error');
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Failed to save passwords:', error);
        showNotification('Failed to save passwords. Please try again.', 'error');
        return false;
    }
}

// Get password expiration status
function getPasswordExpirationStatus(createdDate) {
    const created = new Date(createdDate);
    const expirationDate = new Date(created);
    expirationDate.setDate(expirationDate.getDate() + 30); // 30-day expiration
    
    const now = new Date();
    const timeDiff = expirationDate.getTime() - now.getTime();
    const daysUntilExpiration = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    if (daysUntilExpiration <= 0) {
        return { status: 'expired', days: Math.abs(daysUntilExpiration) };
    } else if (daysUntilExpiration <= 5) {
        return { status: 'expiring-soon', days: daysUntilExpiration };
    } else {
        return { status: 'valid', days: daysUntilExpiration };
    }
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) {
        return 'Invalid Date';
    }
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Format expiration date (30 days after creation)
function formatExpirationDate(createdDate) {
    const created = new Date(createdDate);
    // Check if date is valid
    if (isNaN(created.getTime())) {
        return 'Invalid Date';
    }
    const expirationDate = new Date(created);
    expirationDate.setDate(expirationDate.getDate() + 30);
    
    return expirationDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Render password table
async function renderTable() {
    const tableBody = document.querySelector('#passwordTable tbody');
    if (!tableBody) return;
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    // Add rows for each password
    passwordDatabase.forEach((password, index) => {
        const expiration = getPasswordExpirationStatus(password.createdAt);
        const row = document.createElement('tr');
        
        // Add expiration class for styling
        if (expiration.status === 'expired') {
            row.classList.add('expired-row');
        } else if (expiration.status === 'expiring-soon') {
            row.classList.add('expiring-soon-row');
        }
        
        // Add warning icon for expired passwords
        let expirationCellContent = formatExpirationDate(password.createdAt);
        if (expiration.status === 'expired') {
            expirationCellContent += ' <i class="fas fa-exclamation-triangle text-red-500 ml-2"></i>';
        } else if (expiration.status === 'expiring-soon') {
            expirationCellContent += ' <i class="fas fa-exclamation-circle text-yellow-500 ml-2"></i>';
        }
        
        row.innerHTML = `
            <td class="py-4 px-5 font-medium">${password.site || 'N/A'}</td>
            <td class="py-4 px-5">${password.username || 'N/A'}</td>
            <td class="py-4 px-5 font-mono text-sm">
                <span class="password-text">${'*'.repeat(password.password.length)}</span>
                <button class="ml-2 text-cyan-400 hover:text-cyan-300 toggle-password" data-index="${index}" data-visible="false">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="ml-2 text-cyan-400 hover:text-cyan-300 copy-password" data-index="${index}">
                    <i class="far fa-copy"></i>
                </button>
            </td>
            <td class="py-4 px-5">${formatDate(password.createdAt)}</td>
            <td class="py-4 px-5">${expirationCellContent}</td>
            <td class="py-4 px-5">
                <button class="text-blue-400 hover:text-blue-300 edit-password mr-2" data-index="${index}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="text-red-400 hover:text-red-300 delete-password" data-index="${index}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
    
    // Add event listeners for copy, delete, edit, and toggle buttons
    document.querySelectorAll('.copy-password').forEach(button => {
        button.addEventListener('click', async (e) => {
            const index = e.currentTarget.getAttribute('data-index');
            await copyPasswordToClipboard(passwordDatabase[index].password, e.currentTarget);
        });
    });
    
    document.querySelectorAll('.delete-password').forEach(button => {
        button.addEventListener('click', (e) => {
            const index = e.currentTarget.getAttribute('data-index');
            deletePassword(index, e);
        });
    });
    
    document.querySelectorAll('.edit-password').forEach(button => {
        button.addEventListener('click', (e) => {
            const index = e.currentTarget.getAttribute('data-index');
            editPassword(index, e);
        });
    });
    
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', (e) => {
            const index = e.currentTarget.getAttribute('data-index');
            const isVisible = e.currentTarget.getAttribute('data-visible') === 'true';
            togglePasswordVisibility(index, !isVisible, e.currentTarget);
        });
    });
    
    // Check for expiring passwords and show banner if needed
    checkForExpiringPasswords();
}

// Copy password to clipboard with visual feedback
async function copyPasswordToClipboard(password, button) {
    try {
        await navigator.clipboard.writeText(password);
        
        // Show visual feedback with checkmark
        const originalHTML = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check text-green-500"></i>';
        button.style.transform = 'scale(1.2)';
        button.style.transition = 'all 0.3s ease';
        
        setTimeout(() => {
            button.innerHTML = originalHTML;
            button.style.transform = 'scale(1)';
        }, 1500);
        
        showNotification('Password copied to clipboard!', 'success');
    } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = password;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        // Show visual feedback with checkmark
        const originalHTML = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check text-green-500"></i>';
        button.style.transform = 'scale(1.2)';
        button.style.transition = 'all 0.3s ease';
        
        setTimeout(() => {
            button.innerHTML = originalHTML;
            button.style.transform = 'scale(1)';
        }, 1500);
        
        showNotification('Password copied to clipboard!', 'success');
    }
}

// Delete password
function deletePassword(index, event) {
    showDeleteConfirmation(index, event);
}

// Show delete confirmation modal in visible area
function showDeleteConfirmation(index) {
    const passwordEntry = passwordDatabase[index];
    
    // Create confirmation modal
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-gray-900/90 backdrop-blur-lg flex items-center justify-center z-50';
    modal.style.zIndex = '1000';
    modal.style.overflow = 'hidden';
    modal.innerHTML = `
        <div class="bg-gray-800/90 backdrop-blur-xl rounded-3xl border border-red-500/30 p-8 max-w-md w-full mx-4 neon-modal delete-confirmation-modal" style="transform: scale(0.8); opacity: 0; transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);">
            <div class="text-center">
                <div class="mx-auto bg-red-500/20 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                    <i class="fas fa-exclamation-triangle text-red-500 text-3xl"></i>
                </div>
                
                <h2 class="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-red-600">Confirm Delete</h2>
                
                <p class="text-gray-300 mb-2">Site: <span class="font-bold">${passwordEntry.site || 'N/A'}</span></p>
                <p class="text-gray-300 mb-6">Username: <span class="font-bold">${passwordEntry.username || 'N/A'}</span></p>
                
                <p class="text-gray-400 mb-8">Are you sure you want to delete this password? This action cannot be undone.</p>
                
                <div class="flex gap-4">
                    <button id="cancelDelete" class="flex-1 py-3 rounded-xl font-bold bg-gray-700/50 hover:bg-gray-600/50 transition-all border border-gray-600/50 neon-button-glow-subtle">
                        Cancel
                    </button>
                    <button id="confirmDelete" class="flex-1 py-3 rounded-xl font-bold bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 transition-all border border-red-400/30 neon-button-glow-subtle">
                        Delete
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Animate modal entrance
    setTimeout(() => {
        const modalContent = modal.querySelector('.neon-modal');
        modalContent.style.transform = 'scale(1)';
        modalContent.style.opacity = '1';
    }, 10);
    
    // Ensure modal is centered in viewport
    const modalContent = modal.querySelector('.neon-modal');
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    // Position modal in center of viewport
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    
    // Prevent modal from exceeding viewport size
    if (modalContent.scrollHeight > viewportHeight * 0.9) {
        modalContent.style.maxHeight = `${viewportHeight * 0.9}px`;
    }
    
    if (modalContent.scrollWidth > viewportWidth * 0.9) {
        modalContent.style.maxWidth = `${viewportWidth * 0.9}px`;
    }
    
    // Scroll to modal
    modal.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Add event listeners
    modal.querySelector('#cancelDelete').addEventListener('click', () => {
        const modalContent = modal.querySelector('.neon-modal');
        modalContent.style.transform = 'scale(0.8)';
        modalContent.style.opacity = '0';
        setTimeout(() => {
            modal.remove();
        }, 300);
    });
    
    modal.querySelector('#confirmDelete').addEventListener('click', async () => {
        passwordDatabase.splice(index, 1);
        const saveResult = await savePasswords();
        renderTable();
        
        // Animate modal close
        const modalContent = modal.querySelector('.neon-modal');
        modalContent.style.transform = 'scale(0.8)';
        modalContent.style.opacity = '0';
        setTimeout(() => {
            modal.remove();
            if (saveResult) {
                showNotification(' Password deleted successfully!', 'success');
            } else {
                showNotification(' Failed to delete password!', 'error');
            }
        }, 300);
    });
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            const modalContent = modal.querySelector('.neon-modal');
            modalContent.style.transform = 'scale(0.8)';
            modalContent.style.opacity = '0';
            setTimeout(() => {
                modal.remove();
            }, 300);
        }
    });
}

// Edit password
function editPassword(index, event) {
    const passwordEntry = passwordDatabase[index];
    
    // Create edit modal
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-gray-900/90 backdrop-blur-lg flex items-center justify-center z-50';
    modal.style.zIndex = '1000';
    modal.style.overflow = 'hidden';
    modal.innerHTML = `
        <div class="bg-gray-800/90 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-8 max-w-md w-full mx-4 neon-modal" style="transform: scale(0.8); opacity: 0; transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600">Update Password</h2>
                <button class="close-modal text-gray-400 hover:text-white">
                    <i class="fas fa-times text-2xl"></i>
                </button>
            </div>
            
            <div class="space-y-6">
                <div>
                    <label class="block text-gray-300 mb-2">Site Name</label>
                    <input type="text" id="editSite" value="${passwordEntry.site || ''}" class="w-full bg-gray-700/50 border border-gray-600/50 rounded-xl px-4 py-3 neon-input">
                </div>
                
                <div>
                    <label class="block text-gray-300 mb-2">Username</label>
                    <input type="text" id="editUsername" value="${passwordEntry.username || ''}" class="w-full bg-gray-700/50 border border-gray-600/50 rounded-xl px-4 py-3 neon-input">
                </div>
                
                <div>
                    <label class="block text-gray-300 mb-2">Password</label>
                    <input type="text" id="editPassword" value="${passwordEntry.password || ''}" class="w-full bg-gray-700/50 border border-gray-600/50 rounded-xl px-4 py-3 neon-input">
                </div>
                
                <div class="flex gap-4">
                    <button id="cancelEdit" class="flex-1 py-3 rounded-xl font-bold bg-gray-700/50 hover:bg-gray-600/50 transition-all border border-gray-600/50 neon-button-glow-subtle">
                        Cancel
                    </button>
                    <button id="saveEdit" class="flex-1 py-3 rounded-xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 transition-all border border-green-400/30 neon-button-glow-subtle">
                        Update Password
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Animate modal entrance
    setTimeout(() => {
        const modalContent = modal.querySelector('.neon-modal');
        modalContent.style.transform = 'scale(1)';
        modalContent.style.opacity = '1';
    }, 10);
    
    // Ensure modal is centered in viewport
    const modalContent = modal.querySelector('.neon-modal');
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    // Position modal in center of viewport
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    
    // Prevent modal from exceeding viewport size
    if (modalContent.scrollHeight > viewportHeight * 0.9) {
        modalContent.style.maxHeight = `${viewportHeight * 0.9}px`;
    }
    
    if (modalContent.scrollWidth > viewportWidth * 0.9) {
        modalContent.style.maxWidth = `${viewportWidth * 0.9}px`;
    }
    
    // Scroll to modal
    modal.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Add event listeners
    const closeModal = () => {
        const modalContent = modal.querySelector('.neon-modal');
        modalContent.style.transform = 'scale(0.8)';
        modalContent.style.opacity = '0';
        setTimeout(() => {
            modal.remove();
        }, 300);
    };
    
    modal.querySelector('.close-modal').addEventListener('click', closeModal);
    
    modal.querySelector('#cancelEdit').addEventListener('click', closeModal);
    
    modal.querySelector('#saveEdit').addEventListener('click', async () => {
        const site = document.getElementById('editSite').value;
        const username = document.getElementById('editUsername').value;
        const password = document.getElementById('editPassword').value;
        
        if (site && username && password) {
            // Update the password with a new expiration date
            passwordDatabase[index] = {
                ...passwordDatabase[index],
                site: site,
                username: username,
                password: password,
                // Assign new creation date (which serves as the new expiration baseline)
                createdAt: new Date().toISOString()
            };
            
            // Save passwords and show appropriate success or error message
            const saveResult = await savePasswords();
            if (saveResult) {
                showNotification(' Password saved successfully!', 'success');
            } else {
                showNotification(' Failed to save password!', 'error');
            }
            
            renderTable();
            
            // Animate modal close
            const modalContent = modal.querySelector('.neon-modal');
            modalContent.style.transform = 'scale(0.8)';
            modalContent.style.opacity = '0';
            setTimeout(() => {
                modal.remove();
            }, 300);
        } else {
            showNotification('Please fill in all fields!', 'error');
        }
    });
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            const modalContent = modal.querySelector('.neon-modal');
            modalContent.style.transform = 'scale(0.8)';
            modalContent.style.opacity = '0';
            setTimeout(() => {
                modal.remove();
            }, 300);
        }
    });
}

// Toggle password visibility
function togglePasswordVisibility(index, isVisible, button) {
    const passwordText = button.closest('td').querySelector('.password-text');
    const password = passwordDatabase[index].password;
    
    if (isVisible) {
        passwordText.textContent = password;
        button.innerHTML = '<i class="fas fa-eye-slash"></i>';
        button.setAttribute('data-visible', 'true');
    } else {
        passwordText.textContent = '*'.repeat(password.length);
        button.innerHTML = '<i class="fas fa-eye"></i>';
        button.setAttribute('data-visible', 'false');
    }
}

// Save password to database with 30-day expiration
async function savePasswordToDatabase(site, username, password) {
    // Check if entry already exists
    const existingIndex = passwordDatabase.findIndex(entry => 
        entry.site === site && entry.username === username);
    
    if (existingIndex !== -1) {
        // Update existing entry
        if (confirm(`A password for ${site} with username ${username} already exists. Do you want to update it?`)) {
            // When updating a password, remove any existing warnings and assign a new expiration date
            passwordDatabase[existingIndex] = {
                ...passwordDatabase[existingIndex],
                site: site,
                username: username,
                password: password,
                // Assign new creation date (which serves as the new expiration baseline)
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            showNotification('Password updated successfully with new expiration date!', 'success');
        } else {
            return;
        }
    } else {
        // Add new entry with creation date for expiration tracking
        const passwordEntry = {
            id: generateUniqueId(),
            site: site,
            username: username,
            password: password,
            createdAt: new Date().toISOString()
        };
        
        passwordDatabase.push(passwordEntry);
    }
    
    // Save passwords and show appropriate success or error message
    const saveResult = await savePasswords();
    if (saveResult) {
        showNotification(' Password saved successfully!', 'success');
    } else {
        showNotification(' Failed to save password!', 'error');
    }
    
    // Re-render table to update expiration dates and remove any warnings
    renderTable();
}

// Export passwords with encryption
async function exportPasswords() {
    if (passwordDatabase.length === 0) {
        showNotification('No passwords to export!', 'warning');
        return;
    }
    
    // Show modal for master code
    showMasterCodeModal('Encrypt', async (masterCode) => {
        if (!masterCode) {
            showNotification('Export cancelled - no master code provided', 'warning');
            return;
        }
        
        try {
            // Encrypt the password database
            const encryptedData = await PasswordEncryption.encrypt(passwordDatabase, masterCode);
            const dataStr = JSON.stringify(encryptedData, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
            
            const exportFileDefaultName = 'passvault-passwords-encrypted.json';
            
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            document.body.appendChild(linkElement);
            linkElement.click();
            document.body.removeChild(linkElement);
            
            showNotification('Passwords exported and encrypted successfully!', 'success');
        } catch (error) {
            showNotification('Error exporting passwords: ' + error.message, 'error');
        }
    });
}

// Import passwords
async function importPasswords(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Check file type
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        showNotification('Please select a valid JSON file!', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const fileContent = JSON.parse(e.target.result);
            
            // Check if it's an encrypted file
            if (fileContent.version && fileContent.salt && fileContent.iv && fileContent.ciphertext) {
                // Handle encrypted file - show modal for master code
                showMasterCodeModal('Decrypt', async (masterCode) => {
                    if (!masterCode) {
                        showNotification('Import cancelled - no master code provided', 'warning');
                        return;
                    }
                    
                    try {
                        const decryptedPasswords = await PasswordEncryption.decrypt(fileContent, masterCode);
                        if (Array.isArray(decryptedPasswords)) {
                            // Show import confirmation
                            showImportConfirmation(decryptedPasswords);
                        } else {
                            showNotification('Invalid decrypted file format!', 'error');
                        }
                    } catch (error) {
                        showNotification('Decryption failed: ' + error.message, 'error');
                        return;
                    }
                });
            } else if (Array.isArray(fileContent)) {
                // Handle unencrypted file (legacy support)
                showImportConfirmation(fileContent);
            } else {
                showNotification('Invalid file format!', 'error');
            }
        } catch (error) {
            showNotification('Error importing passwords: ' + error.message, 'error');
        }
    };
    reader.readAsText(file);
}

// Show import confirmation in visible area
function showImportConfirmation(importedPasswords) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-gray-900/90 backdrop-blur-lg flex items-center justify-center z-50';
    modal.style.zIndex = '1000';
    modal.innerHTML = `
        <div class="bg-gray-800/90 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-8 max-w-md w-full mx-4 neon-modal" style="transform: scale(0.8); opacity: 0; transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);">
            <div class="text-center">
                <div class="mx-auto bg-blue-500/20 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                    <i class="fas fa-file-import text-blue-500 text-3xl"></i>
                </div>
                
                <h2 class="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-600">Import Passwords</h2>
                
                <p class="text-gray-300 mb-2">Found <span class="font-bold">${importedPasswords.length}</span> passwords in the file</p>
                
                <p class="text-gray-400 mb-8">This will merge with your existing passwords. Do you want to continue?</p>
                
                <div class="flex gap-4">
                    <button id="cancelImport" class="flex-1 py-3 rounded-xl font-bold bg-gray-700/50 hover:bg-gray-600/50 transition-all border border-gray-600/50 neon-button-glow-subtle">
                        Cancel
                    </button>
                    <button id="confirmImport" class="flex-1 py-3 rounded-xl font-bold bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 transition-all border border-blue-400/30 neon-button-glow-subtle">
                        Import
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Animate modal entrance
    setTimeout(() => {
        const modalContent = modal.querySelector('.neon-modal');
        modalContent.style.transform = 'scale(1)';
        modalContent.style.opacity = '1';
    }, 10);
    
    // Ensure modal is centered in viewport
    const modalContent = modal.querySelector('.neon-modal');
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    // Position modal in center of viewport
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    
    // Prevent modal from exceeding viewport size
    if (modalContent.scrollHeight > viewportHeight * 0.9) {
        modalContent.style.maxHeight = `${viewportHeight * 0.9}px`;
    }
    
    if (modalContent.scrollWidth > viewportWidth * 0.9) {
        modalContent.style.maxWidth = `${viewportWidth * 0.9}px`;
    }
    
    // Scroll to modal
    modal.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Add event listeners
    const closeModal = () => {
        const modalContent = modal.querySelector('.neon-modal');
        modalContent.style.transform = 'scale(0.8)';
        modalContent.style.opacity = '0';
        setTimeout(() => {
            modal.remove();
        }, 300);
    };
    
    modal.querySelector('#cancelImport').addEventListener('click', closeModal);
    
    modal.querySelector('#confirmImport').addEventListener('click', async () => {
        // Merge imported passwords with existing ones
        // Check for duplicates based on site and username
        importedPasswords.forEach(importedPassword => {
            const existingIndex = passwordDatabase.findIndex(existing => 
                existing.site === importedPassword.site && 
                existing.username === importedPassword.username);
            
            if (existingIndex !== -1) {
                // Do not overwrite existing passwords - keep them intact
                // Simply skip duplicates to preserve existing data, notifications, and expiration dates
                console.log(`Skipping duplicate password for ${importedPassword.site} with username ${importedPassword.username}`);
            } else {
                // Add new password only if it doesn't already exist
                passwordDatabase.push({
                    ...importedPassword,
                    id: importedPassword.id || generateUniqueId(),
                    createdAt: importedPassword.createdAt || new Date().toISOString()
                });
            }
        });
        
        const saveResult = await savePasswords();
        renderTable();
        
        // Animate modal close
        const modalContent = modal.querySelector('.neon-modal');
        modalContent.style.transform = 'scale(0.8)';
        modalContent.style.opacity = '0';
        setTimeout(() => {
            modal.remove();
            if (saveResult) {
                showNotification(' New passwords imported and appended successfully!', 'success');
            } else {
                showNotification(' Failed to import passwords!', 'error');
            }
        }, 300);
    });
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            const modalContent = modal.querySelector('.neon-modal');
            modalContent.style.transform = 'scale(0.8)';
            modalContent.style.opacity = '0';
            setTimeout(() => {
                modal.remove();
            }, 300);
        }
    });
}

// Check for expiring passwords and show banner
function checkForExpiringPasswords() {
    const expiringPasswords = passwordDatabase.filter(password => {
        const expiration = getPasswordExpirationStatus(password.createdAt);
        return expiration.status === 'expiring-soon' || expiration.status === 'expired';
    });
    
    // Show banner if there are expiring passwords
    const banner = document.getElementById('expirationBanner');
    const message = document.getElementById('expirationMessage');
    
    if (expiringPasswords.length > 0) {
        banner.classList.remove('hidden');
        if (expiringPasswords.length === 1) {
            message.textContent = '1 password needs to be updated!';
        } else {
            message.textContent = `${expiringPasswords.length} passwords need to be updated!`;
        }
    } else {
        banner.classList.add('hidden');
    }
}

// Cleanup unused elements
function cleanupUnusedElements() {
    // Remove any orphaned elements
    const modals = document.querySelectorAll('.neon-modal');
    modals.forEach(modal => {
        if (!modal.parentElement) {
            modal.remove();
        }
    });
}

// Setup real-time password strength checking
function setupPasswordStrengthCheck() {
    const passwordDisplay = document.getElementById('passwordDisplay');
    if (!passwordDisplay) return;
    
    // Create a MutationObserver to watch for changes in the password display
    const observer = new MutationObserver(() => {
        const passwordText = passwordDisplay.textContent.trim();
        if (passwordText && passwordText !== 'Your generated password will appear here') {
            updateStrengthMeter(passwordText);
        }
    });
    
    observer.observe(passwordDisplay, { childList: true, subtree: true, characterData: true });
}

// ==========================
// UI Event Handlers
// ==========================

// Tab switching
function setupTabSwitching() {
    const tabs = document.querySelectorAll('.tab-btn');
    const sections = document.querySelectorAll('.option-section');
    const passwordDisplay = document.getElementById('passwordDisplay');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs and sections
            tabs.forEach(t => t.classList.remove('active'));
            sections.forEach(s => s.classList.add('hidden'));
            
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Show corresponding section
            const sectionId = tab.id.replace('Tab', 'Options');
            const section = document.getElementById(sectionId);
            if (section) {
                section.classList.remove('hidden');
            }
            
            // Clear the password display when switching modes
            if (passwordDisplay) {
                passwordDisplay.innerHTML = '<span class="text-gray-500">Your generated password will appear here</span>';
                
                // Reset password strength meter
                const strengthMeter = document.getElementById('strengthMeter');
                const strengthText = document.getElementById('strengthText');
                if (strengthMeter) {
                    strengthMeter.style.width = '0%';
                    strengthMeter.style.background = 'linear-gradient(90deg, #ff4d4d, #ffcc00, #00ff88)';
                }
                if (strengthText) {
                    strengthText.textContent = 'None';
                    strengthText.className = 'font-bold';
                }
            }
        });
    });
}

// Slider value updates
function setupSliderUpdates() {
    // Random password length
    const randomLengthSlider = document.getElementById('randomLengthSlider');
    const randomLengthInput = document.getElementById('randomLength');
    const randomLengthValue = document.getElementById('randomLengthValue');
    
    if (randomLengthSlider && randomLengthInput && randomLengthValue) {
        randomLengthSlider.addEventListener('input', () => {
            randomLengthInput.value = randomLengthSlider.value;
            randomLengthValue.textContent = randomLengthSlider.value;
        });
        
        randomLengthInput.addEventListener('input', () => {
            let value = parseInt(randomLengthInput.value);
            if (isNaN(value)) value = 16;
            if (value < 4) value = 4;
            if (value > 128) value = 128;
            randomLengthSlider.value = value;
            randomLengthValue.textContent = value;
        });
    }
    
    // Memorable password length
    const memorableLengthSlider = document.getElementById('memorableLengthSlider');
    const memorableLengthInput = document.getElementById('memorableLength');
    const memorableLengthValue = document.getElementById('memorableLengthValue');
    
    if (memorableLengthSlider && memorableLengthInput && memorableLengthValue) {
        memorableLengthSlider.addEventListener('input', () => {
            memorableLengthInput.value = memorableLengthSlider.value;
            memorableLengthValue.textContent = memorableLengthSlider.value;
        });
        
        memorableLengthInput.addEventListener('input', () => {
            let value = parseInt(memorableLengthInput.value);
            if (isNaN(value)) value = 4;
            if (value < 2) value = 2;
            if (value > 10) value = 10;
            memorableLengthSlider.value = value;
            memorableLengthValue.textContent = value;
        });
    }
    
    // PIN length
    const pinLengthSlider = document.getElementById('pinLengthSlider');
    const pinLengthInput = document.getElementById('pinLength');
    const pinLengthValue = document.getElementById('pinLengthValue');
    
    if (pinLengthSlider && pinLengthInput && pinLengthValue) {
        pinLengthSlider.addEventListener('input', () => {
            pinLengthInput.value = pinLengthSlider.value;
            pinLengthValue.textContent = pinLengthSlider.value;
        });
        
        pinLengthInput.addEventListener('input', () => {
            let value = parseInt(pinLengthInput.value);
            if (isNaN(value)) value = 6;
            if (value < 3) value = 3;
            if (value > 12) value = 12;
            pinLengthSlider.value = value;
            pinLengthValue.textContent = value;
        });
    }
}

// Generate password
function setupPasswordGeneration() {
    const generateBtn = document.getElementById('generateBtn');
    const passwordDisplay = document.getElementById('passwordDisplay');
    
    if (generateBtn && passwordDisplay) {
        generateBtn.addEventListener('click', () => {
            let password = '';
            
            // Check which tab is active
            const randomTab = document.getElementById('randomTab');
            const memorableTab = document.getElementById('memorableTab');
            const pinTab = document.getElementById('pinTab');
            
            if (randomTab && randomTab.classList.contains('active')) {
                // Generate random password
                const length = parseInt(document.getElementById('randomLength').value);
                const includeUppercase = document.getElementById('includeUppercase').checked;
                const includeLowercase = document.getElementById('includeLowercase').checked;
                const includeNumbers = document.getElementById('includeNumbers').checked;
                const includeSymbols = document.getElementById('includeSymbols').checked;
                
                password = generateUniquePassword(length, {
                    uppercase: includeUppercase,
                    lowercase: includeLowercase,
                    numbers: includeNumbers,
                    symbols: includeSymbols
                });
            } else if (memorableTab && memorableTab.classList.contains('active')) {
                // Generate memorable password
                const wordCount = parseInt(document.getElementById('memorableLength').value);
                const capitalizeWords = document.getElementById('capitalizeWords').checked;
                const addNumbers = document.getElementById('addNumbers').checked;
                
                password = generateUniqueMemorablePassword(wordCount, {
                    capitalize: capitalizeWords,
                    addNumbers: addNumbers
                });
            } else if (pinTab && pinTab.classList.contains('active')) {
                // Generate PIN
                const pinLength = parseInt(document.getElementById('pinLength').value);
                password = generateUniquePIN(pinLength);
            }
            
            // Display password
            if (password) {
                passwordDisplay.innerHTML = `<span class="text-gray-100">${password}</span>`;
            }
        });
    }
}

// Copy password to clipboard
function setupCopyPassword() {
    const copyBtn = document.getElementById('copyBtn');
    const passwordDisplay = document.getElementById('passwordDisplay');
    
    if (copyBtn && passwordDisplay) {
        copyBtn.addEventListener('click', async () => {
            const passwordText = passwordDisplay.textContent.trim();
            if (passwordText && passwordText !== 'Your generated password will appear here') {
                try {
                    await navigator.clipboard.writeText(passwordText);
                    
                    // Show visual feedback with checkmark
                    const originalHTML = copyBtn.innerHTML;
                    copyBtn.innerHTML = '<i class="fas fa-check mr-3"></i>Copy';
                    copyBtn.style.transform = 'scale(1.05)';
                    copyBtn.style.transition = 'all 0.3s ease';
                    
                    setTimeout(() => {
                        copyBtn.innerHTML = originalHTML;
                        copyBtn.style.transform = 'scale(1)';
                    }, 1500);
                    
                    showNotification('Password copied to clipboard!', 'success');
                } catch (err) {
                    // Fallback for older browsers
                    const textArea = document.createElement('textarea');
                    textArea.value = passwordText;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    
                    // Show visual feedback with checkmark
                    const originalHTML = copyBtn.innerHTML;
                    copyBtn.innerHTML = '<i class="fas fa-check mr-3"></i>Copy';
                    copyBtn.style.transform = 'scale(1.05)';
                    copyBtn.style.transition = 'all 0.3s ease';
                    
                    setTimeout(() => {
                        copyBtn.innerHTML = originalHTML;
                        copyBtn.style.transform = 'scale(1)';
                    }, 1500);
                    
                    showNotification('Password copied to clipboard!', 'success');
                }
            } else {
                showNotification('Generate a password first!', 'warning');
            }
        });
    }
}

// Save password
function setupSavePassword() {
    const saveBtn = document.getElementById('saveBtn');
    const passwordDisplay = document.getElementById('passwordDisplay');
    
    if (saveBtn && passwordDisplay) {
        saveBtn.addEventListener('click', () => {
            const passwordText = passwordDisplay.textContent.trim();
            if (passwordText && passwordText !== 'Your generated password will appear here') {
                // Show modal to get site and username
                showSavePasswordModal(passwordText);
            } else {
                showNotification('Generate a password first!', 'warning');
            }
        });
    }
}

// Show save password modal in visible area
function showSavePasswordModal(password) {
    // Create save modal
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-gray-900/90 backdrop-blur-lg flex items-center justify-center z-50';
    modal.style.zIndex = '1000';
    modal.style.overflow = 'hidden';
    modal.innerHTML = `
        <div class="bg-gray-800/90 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-8 max-w-md w-full mx-4 neon-modal" style="transform: scale(0.8); opacity: 0; transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600">Save Password</h2>
                <button class="close-modal text-gray-400 hover:text-white">
                    <i class="fas fa-times text-2xl"></i>
                </button>
            </div>
            
            <div class="space-y-6">
                <div>
                    <label class="block text-gray-300 mb-2">Site Name</label>
                    <input type="text" id="siteName" placeholder="e.g., facebook.com" class="w-full bg-gray-700/50 border border-gray-600/50 rounded-xl px-4 py-3 neon-input">
                </div>
                
                <div>
                    <label class="block text-gray-300 mb-2">Username</label>
                    <input type="text" id="username" placeholder="e.g., user@example.com" class="w-full bg-gray-700/50 border border-gray-600/50 rounded-xl px-4 py-3 neon-input">
                </div>
                
                <div class="flex gap-4">
                    <button id="cancelSave" class="flex-1 py-3 rounded-xl font-bold bg-gray-700/50 hover:bg-gray-600/50 transition-all border border-gray-600/50 neon-button-glow-subtle">
                        Cancel
                    </button>
                    <button id="savePassword" class="flex-1 py-3 rounded-xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 transition-all border border-green-400/30 neon-button-glow-subtle">
                        Save
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Animate modal entrance
    setTimeout(() => {
        const modalContent = modal.querySelector('.neon-modal');
        modalContent.style.transform = 'scale(1)';
        modalContent.style.opacity = '1';
    }, 10);
    
    // Ensure modal is centered in viewport
    const modalContent = modal.querySelector('.neon-modal');
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    // Position modal in center of viewport
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    
    // Prevent modal from exceeding viewport size
    if (modalContent.scrollHeight > viewportHeight * 0.9) {
        modalContent.style.maxHeight = `${viewportHeight * 0.9}px`;
    }
    
    if (modalContent.scrollWidth > viewportWidth * 0.9) {
        modalContent.style.maxWidth = `${viewportWidth * 0.9}px`;
    }
    
    // Scroll to modal
    modal.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Add event listeners
    const closeModal = () => {
        const modalContent = modal.querySelector('.neon-modal');
        modalContent.style.transform = 'scale(0.8)';
        modalContent.style.opacity = '0';
        setTimeout(() => {
            modal.remove();
        }, 300);
    };
    
    modal.querySelector('.close-modal').addEventListener('click', closeModal);
    
    modal.querySelector('#cancelSave').addEventListener('click', closeModal);
    
    modal.querySelector('#savePassword').addEventListener('click', async () => {
        const site = document.getElementById('siteName').value;
        const username = document.getElementById('username').value;
        
        if (site && username) {
            await savePasswordToDatabase(site, username, password);
            
            // Animate modal close
            const modalContent = modal.querySelector('.neon-modal');
            modalContent.style.transform = 'scale(0.8)';
            modalContent.style.opacity = '0';
            setTimeout(() => {
                modal.remove();
            }, 300);
        } else {
            showNotification('Please fill in all fields!', 'error');
        }
    });
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            const modalContent = modal.querySelector('.neon-modal');
            modalContent.style.transform = 'scale(0.8)';
            modalContent.style.opacity = '0';
            setTimeout(() => {
                modal.remove();
            }, 300);
        }
    });
    
    // Focus on first input
    setTimeout(() => {
        document.getElementById('siteName').focus();
    }, 300);
}

// Export passwords
function setupExportPasswords() {
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportPasswords);
    }
}

// Import passwords
function setupImportPasswords() {
    const importBtn = document.getElementById('importBtn');
    if (importBtn) {
        // Create hidden file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
        
        fileInput.addEventListener('change', importPasswords);
        
        importBtn.addEventListener('click', () => {
            fileInput.click();
        });
    }
}

// Theme toggle
function setupThemeToggle() {
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
}

// Logout functionality
function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            // Redirect to home page
            window.location.href = 'index.html';
        });
    }
}

// View expiring passwords
function setupViewExpiringPasswords() {
    const viewExpiringBtn = document.getElementById('viewExpiringBtn');
    if (viewExpiringBtn) {
        viewExpiringBtn.addEventListener('click', () => {
            // Scroll to password table
            const passwordTable = document.getElementById('passwordTable');
            if (passwordTable) {
                passwordTable.scrollIntoView({ behavior: 'smooth' });
                
                // Highlight expiring rows
                const rows = document.querySelectorAll('tr.expired-row, tr.expiring-soon-row');
                rows.forEach(row => {
                    row.style.animation = 'pulseGlow 1s infinite';
                    setTimeout(() => {
                        row.style.animation = '';
                    }, 3000);
                });
            }
        });
    }
}

// Show master code modal for encryption
function showMasterCodeModal(title, callback) {
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-gray-900/90 backdrop-blur-lg flex items-center justify-center z-50';
    modal.style.zIndex = '1000';
    modal.innerHTML = `
        <div class="bg-gray-800/90 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-8 max-w-md w-full mx-4 neon-modal" style="transform: scale(0.8); opacity: 0; transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);">
            <div class="text-center">
                <div class="mx-auto bg-blue-500/20 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                    <i class="fas fa-lock text-blue-500 text-3xl"></i>
                </div>
                
                <h2 class="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-600">Enter Master Code 🔐</h2>
                
                <p class="text-gray-300 mb-6">Please enter your master code to ${title.toLowerCase()}</p>
                
                <div class="mb-6 relative">
                    <input type="password" id="masterCodeInput" placeholder="Enter master code" class="w-full bg-gray-700/50 border border-gray-600/50 rounded-xl px-4 py-3 neon-input text-center">
                    <button id="togglePasswordVisibility" class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200 focus:outline-none">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
                
                <div class="flex gap-4">
                    <button id="cancelMasterCode" class="flex-1 py-3 rounded-xl font-bold bg-gray-700/50 hover:bg-gray-600/50 transition-all border border-gray-600/50 neon-button-glow-subtle">
                        Cancel
                    </button>
                    <button id="confirmMasterCode" class="flex-1 py-3 rounded-xl font-bold bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 transition-all border border-blue-400/30 neon-button-glow-subtle">
                        ${title}
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Animate modal entrance
    setTimeout(() => {
        const modalContent = modal.querySelector('.neon-modal');
        modalContent.style.transform = 'scale(1)';
        modalContent.style.opacity = '1';
    }, 10);
    
    // Ensure modal is centered in viewport
    const modalContent = modal.querySelector('.neon-modal');
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    // Position modal in center of viewport
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    
    // Prevent modal from exceeding viewport size
    if (modalContent.scrollHeight > viewportHeight * 0.9) {
        modalContent.style.maxHeight = `${viewportHeight * 0.9}px`;
    }
    
    if (modalContent.scrollWidth > viewportWidth * 0.9) {
        modalContent.style.maxWidth = `${viewportWidth * 0.9}px`;
    }
    
    // Scroll to modal
    modal.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Focus on input field
    const inputField = modal.querySelector('#masterCodeInput');
    setTimeout(() => {
        inputField.focus();
    }, 300);
    
    // Add password visibility toggle functionality
    const toggleButton = modal.querySelector('#togglePasswordVisibility');
    const eyeIcon = toggleButton.querySelector('i');
    
    toggleButton.addEventListener('click', () => {
        if (inputField.type === 'password') {
            inputField.type = 'text';
            eyeIcon.className = 'fas fa-eye-slash';
        } else {
            inputField.type = 'password';
            eyeIcon.className = 'fas fa-eye';
        }
    });
    
    // Add event listeners
    const closeModal = () => {
        const modalContent = modal.querySelector('.neon-modal');
        modalContent.style.transform = 'scale(0.8)';
        modalContent.style.opacity = '0';
        setTimeout(() => {
            modal.remove();
        }, 300);
    };
    
    modal.querySelector('#cancelMasterCode').addEventListener('click', () => {
        closeModal();
        callback(null); // Return null when cancelled
    });
    
    modal.querySelector('#confirmMasterCode').addEventListener('click', () => {
        const masterCode = inputField.value;
        if (masterCode && masterCode.length >= 6) {
            closeModal();
            callback(masterCode);
        } else {
            showNotification('Master code must be at least 6 characters long', 'error');
        }
    });
    
    // Handle Enter key press
    inputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const masterCode = inputField.value;
            if (masterCode && masterCode.length >= 6) {
                closeModal();
                callback(masterCode);
            } else {
                showNotification('Master code must be at least 6 characters long', 'error');
            }
        }
    });
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            const modalContent = modal.querySelector('.neon-modal');
            modalContent.style.transform = 'scale(0.8)';
            modalContent.style.opacity = '0';
            setTimeout(() => {
                modal.remove();
            }, 300);
            callback(null); // Return null when cancelled
        }
    });
}

// ==========================
// Initialize Application
// ==========================
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize database
    await initDatabase();
    
    // Render password table
    await renderTable();
    
    // Set initial slider values
    document.getElementById('randomLengthValue').textContent = document.getElementById('randomLength').value;
    document.getElementById('memorableLengthValue').textContent = document.getElementById('memorableLength').value;
    document.getElementById('pinLengthValue').textContent = document.getElementById('pinLength').value;
    
    // Check for expiring passwords on load
    checkForExpiringPasswords();
    
    // Setup real-time password strength checking
    setupPasswordStrengthCheck();
    
    // Setup UI event handlers
    setupTabSwitching();
    setupSliderUpdates();
    setupPasswordGeneration();
    setupCopyPassword();
    setupSavePassword();
    setupExportPasswords();
    setupImportPasswords();
    setupThemeToggle();
    setupLogout();
    setupViewExpiringPasswords();
    
    // Cleanup unused elements
    cleanupUnusedElements();
    // Modern web application enhancements
    console.log('Modern Password Manager initialized');
});







  const menuToggle = document.getElementById("menuToggle");
  const navbar = document.getElementById("navbar");

  menuToggle.addEventListener("click", () => {
    navbar.classList.toggle("show");
  });



  



  
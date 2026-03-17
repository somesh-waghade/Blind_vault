const API_URL = 'http://localhost:5000/api';

// UI Elements
const authView = document.getElementById('auth-view');
const vaultView = document.getElementById('vault-view');
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const authBtn = document.getElementById('auth-btn');
const authHint = document.getElementById('auth-hint');
const statusMsg = document.getElementById('status-msg');

let currentMode = 'login'; // 'login' or 'register'
let derivedKey = null; // Stored in memory only
let loggedInUserId = null; // Stored for sync

// Helper to get salt (in real app, this should be unique per user and fetched from DB)
const FIXED_SALT = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);

// Toggle Views
tabLogin.addEventListener('click', () => {
    currentMode = 'login';
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    authBtn.innerText = 'Log In';
    authHint.innerText = 'Enter your master password to unlock.';
});

tabRegister.addEventListener('click', () => {
    currentMode = 'register';
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    authBtn.innerText = 'Create Account';
    authHint.innerText = 'Choose a strong master password. It cannot be recovered!';
});

// Handle Auth
authBtn.addEventListener('click', async () => {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (!username || !password) {
        alert('Please fill in all fields');
        return;
    }

    // Derive key locally immediately
    try {
        statusMsg.innerText = 'Deriving secure key...';
        derivedKey = await CryptoModule.deriveKey(password, FIXED_SALT);
    } catch (e) {
        console.error(e);
        alert('Security error during key derivation');
        return;
    }

    if (currentMode === 'register') {
        registerUser(username, password);
    } else {
        loginUser(username, password);
    }
});

async function registerUser(username, password) {
    statusMsg.innerText = 'Registering...';
    
    // TODO: Generate actual ZKP public signals from password
    const mockPublicSignals = ["0x123...", "0x456..."];

    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, publicSignals: mockPublicSignals })
        });

        const data = await response.json();
        if (response.ok) {
            alert('Success! You can now log in.');
            tabLogin.click();
        } else {
            alert(data.msg || 'Registration failed');
        }
    } catch (err) {
        console.error(err);
        alert('Could not connect to backend');
    } finally {
        statusMsg.innerText = 'Securely store your passwords';
    }
}

async function loginUser(username, password) {
    statusMsg.innerText = 'Logging in...';

    // TODO: Generate actual ZKP proof
    const mockProof = { pi_a: [], pi_b: [], pi_c: [] };
    const mockPublicSignals = ["0x123...", "0x456..."];

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, proof: mockProof, publicSignals: mockPublicSignals })
        });

        const data = await response.json();
        if (response.ok) {
            // Switch to Vault View
            authView.classList.add('hidden');
            vaultView.classList.remove('hidden');
            statusMsg.innerText = `Welcome, ${username}! 🔓`;
            
            // Fetch and decrypt vault
            fetchVault(data.userId);
        } else {
            alert(data.msg || 'Login failed');
            derivedKey = null; // Clear key on failure
        }
    } catch (err) {
        console.error(err);
        alert('Could not connect to backend');
        derivedKey = null;
    } finally {
        if (authView.classList.contains('hidden')) {
            // Already logged in
        } else {
            statusMsg.innerText = 'Securely store your passwords';
        }
    }
}

async function fetchVault(userId) {
    try {
        const response = await fetch(`${API_URL}/vault/${userId}`);
        const data = await response.json();
        
        if (response.ok && data.encryptedData) {
            const { ciphertext, iv } = JSON.parse(data.encryptedData);
            const decrypted = await CryptoModule.decrypt(ciphertext, iv, derivedKey);
            const credentials = JSON.parse(decrypted);
            displayVault(credentials);
        }
    } catch (e) {
        console.error('Vault fetch/decrypt error:', e);
    }
}

function displayVault(credentials) {
    const list = document.getElementById('credentials-list');
    list.innerHTML = '';
    if (credentials.length === 0) {
        list.innerHTML = '<p class="empty-msg">No credentials stored yet.</p>';
        return;
    }
    credentials.forEach(cred => {
        const div = document.createElement('div');
        div.className = 'credential-item';
        div.innerHTML = `<strong>${cred.site}</strong>: ${cred.username} (Password hidden)`;
        list.appendChild(div);
    });
}

// Add Credential Logic
document.getElementById('add-btn').addEventListener('click', async () => {
    const site = prompt('Enter website name:');
    const username = prompt('Enter username:');
    const password = prompt('Enter password:');

    if (!site || !username || !password) return;

    statusMsg.innerText = 'Encrypting & Syncing...';

    try {
        // 1. Get current vault
        const response = await fetch(`${API_URL}/vault/${loggedInUserId}`);
        let credentials = [];
        if (response.ok) {
            const data = await response.json();
            if (data.encryptedData) {
                const { ciphertext, iv } = JSON.parse(data.encryptedData);
                const decrypted = await CryptoModule.decrypt(ciphertext, iv, derivedKey);
                credentials = JSON.parse(decrypted);
            }
        }

        // 2. Add new item
        credentials.push({ site, username, password });

        // 3. Encrypt whole vault
        const { ciphertext, iv } = await CryptoModule.encrypt(JSON.stringify(credentials), derivedKey);
        
        // 4. Send to server
        const syncResponse = await fetch(`${API_URL}/vault`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                userId: loggedInUserId, 
                encryptedData: JSON.stringify({ ciphertext, iv }) 
            })
        });

        if (syncResponse.ok) {
            alert('Vault updated successfully!');
            displayVault(credentials);
        } else {
            alert('Sync failed');
        }

    } catch (e) {
        console.error('Add credential error:', e);
        alert('Encryption error');
    } finally {
        statusMsg.innerText = `Welcome! 🔓`;
    }
});

// Lock logic
document.getElementById('lock-btn').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'LOCK' });
    vaultView.classList.add('hidden');
    authView.classList.remove('hidden');
    statusMsg.innerText = 'Securely store your passwords';
    document.getElementById('password').value = '';
    derivedKey = null;
    loggedInUserId = null;
});

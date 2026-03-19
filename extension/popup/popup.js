const API_URL = 'http://localhost:5000/api';

// UI Elements
const authView = document.getElementById('auth-view');
const vaultView = document.getElementById('vault-view');
const settingsView = document.getElementById('settings-view');
const navVault = document.getElementById('nav-vault');
const navSettings = document.getElementById('nav-settings');
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const authBtn = document.getElementById('auth-btn');
const authHint = document.getElementById('auth-hint');
const statusMsg = document.getElementById('status-msg');

let currentMode = 'login'; // 'login' or 'register'
let derivedKey = null; // Stored in memory only
let loggedInUserId = null; // Stored for API calls
let loggedInUsername = null; // Stored for profile display
let allCredentials = []; // Cache for filtering

// Toast System
function showToast(message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
}

// Copy to Clipboard
async function copyToClipboard(text, label) {
    try {
        await navigator.clipboard.writeText(text);
        showToast(`${label} copied!`);
    } catch (err) {
        showToast('Failed to copy');
    }
}

// Helper to get salt (in real app, this should be unique per user and fetched from DB)
const FIXED_SALT = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);

// Navigation logic
navVault.addEventListener('click', () => {
    if (!loggedInUserId) return;
    vaultView.classList.remove('hidden');
    settingsView.classList.add('hidden');
    navVault.classList.add('active');
    navSettings.classList.remove('active');
});

navSettings.addEventListener('click', () => {
    if (!loggedInUserId) return;
    settingsView.classList.remove('hidden');
    vaultView.classList.add('hidden');
    navSettings.classList.add('active');
    navVault.classList.remove('active');
    
    // Update profile info
    document.getElementById('profile-username').innerText = loggedInUsername;
});

// Toggle Auth Views
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

    loggedInUsername = username; // Temporarily store

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
    try {
        // Generate public signal (hash of password)
        const passwordHash = await hashPassword(password);
        const publicSignals = [passwordHash.toString()];

        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, publicSignals })
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

    try {
        // 1. Generate numeric hash for the circuit
        const passwordHash = await hashPassword(password);
        
        // 2. Generate Proof
        statusMsg.innerText = 'Generating Zero-Knowledge Proof...';
        const { proof, publicSignals } = await generateProof(password, passwordHash);
        
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, proof, publicSignals })
        });

        const data = await response.json();
        if (response.ok) {
            // Switch to Vault View
            loggedInUserId = data.userId;
            authView.classList.add('hidden');
            vaultView.classList.remove('hidden');
            statusMsg.innerText = `Welcome, ${username}! 🔓`;
            
            // Fetch and decrypt vault
            const jwk = await CryptoModule.exportKey(derivedKey);
            fetchVault(data.userId, jwk);
        } else {
            alert(data.msg || 'Login failed');
            derivedKey = null; // Clear key on failure
        }
    } catch (err) {
        console.error('ZKP Error:', err);
        alert(err.message || 'Verification failed');
        derivedKey = null;
    } finally {
        if (authView.classList.contains('hidden')) {
            // Logged in
        } else {
            statusMsg.innerText = 'Securely store your passwords';
        }
    }
}

async function hashPassword(password) {
    // Custom linear hash for the demo (must match auth.circom)
    const p = BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");
    
    // Map string to a field element (BigInt)
    const encoder = new TextEncoder();
    const bytes = encoder.encode(password);
    const passwordNum = BigInt('0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')) % p;

    // Linear Hash: H(x) = (x * 123456789 + 987654321) mod p
    return (passwordNum * 123456789n + 987654321n) % p;
}

async function generateProof(password, passwordHash) {
    if (!window.snarkjs) throw new Error('snarkjs not loaded');
    
    // We need to pass the SAME numeric password used for hashing
    const encoder = new TextEncoder();
    const bytes = encoder.encode(password);
    const passwordNum = BigInt('0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')) % BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");

    const inputs = {
        password: passwordNum.toString(),
        passwordHash: passwordHash.toString()
    };

    const wasmPath = chrome.runtime.getURL('assets/zkp/auth.wasm');
    const zkeyPath = chrome.runtime.getURL('assets/zkp/auth_final.zkey');

    return await window.snarkjs.groth16.fullProve(inputs, wasmPath, zkeyPath);
}

async function fetchVault(userId, jwk) {
    try {
        const response = await fetch(`${API_URL}/vault/${userId}`);
        const data = await response.json();
        
        if (response.ok && data.encryptedData) {
            const { ciphertext, iv } = JSON.parse(data.encryptedData);
            const decrypted = await CryptoModule.decrypt(ciphertext, iv, derivedKey);
            const credentials = JSON.parse(decrypted);

            // SYNC WITH BACKGROUND
            chrome.runtime.sendMessage({
                type: 'SET_SESSION',
                vault: credentials,
                userId: userId,
                keyJWK: jwk
            });

            displayVault(credentials);
        }
    } catch (e) {
        console.error('Vault fetch/decrypt error:', e);
    }
}

function displayVault(credentials) {
    allCredentials = credentials; // Update cache
    renderList(credentials);
}

function renderList(listToRender) {
    const list = document.getElementById('credentials-list');
    list.innerHTML = '';
    
    if (listToRender.length === 0) {
        list.innerHTML = '<p class="empty-msg">No matches found.</p>';
        return;
    }

    listToRender.forEach(cred => {
        const div = document.createElement('div');
        div.className = 'credential-item';
        div.innerHTML = `
            <div class="cred-info">
                <div class="site">${cred.site}</div>
                <div class="user">${cred.username}</div>
            </div>
            <button class="copy-btn">Copy</button>
        `;
        
        div.querySelector('.copy-btn').addEventListener('click', () => {
            copyToClipboard(cred.password, 'Password');
        });

        list.appendChild(div);
    });
}

// Search Logic
document.getElementById('vault-search').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = allCredentials.filter(cred => 
        cred.site.toLowerCase().includes(query) || 
        cred.username.toLowerCase().includes(query)
    );
    renderList(filtered);
});

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

// Lock/Logout logic
function performLock() {
    chrome.runtime.sendMessage({ type: 'LOCK' });
    vaultView.classList.add('hidden');
    settingsView.classList.add('hidden');
    authView.classList.remove('hidden');
    statusMsg.innerText = 'Securely store your passwords';
    document.getElementById('password').value = '';
    derivedKey = null;
    loggedInUserId = null;
    loggedInUsername = null;
    navVault.classList.add('active');
    navSettings.classList.remove('active');
}

document.getElementById('lock-btn').addEventListener('click', performLock);
document.getElementById('logout-btn').addEventListener('click', performLock);

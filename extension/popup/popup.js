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
        } else {
            alert(data.msg || 'Login failed');
        }
    } catch (err) {
        console.error(err);
        alert('Could not connect to backend');
    } finally {
        if (authView.classList.contains('hidden')) {
            // Already logged in
        } else {
            statusMsg.innerText = 'Securely store your passwords';
        }
    }
}

// Lock logic
document.getElementById('lock-btn').addEventListener('click', () => {
    vaultView.classList.add('hidden');
    authView.classList.remove('hidden');
    statusMsg.innerText = 'Securely store your passwords';
    document.getElementById('password').value = '';
});

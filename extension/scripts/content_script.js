console.log('BlindVault Content Script Loaded');

// Global Theme State
let currentTheme = 'dark';
chrome.storage.local.get(['bv_theme'], (res) => {
    if (res.bv_theme) currentTheme = res.bv_theme;
});
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.bv_theme) {
        currentTheme = changes.bv_theme.newValue;
        const unlock = document.getElementById('bv-quick-unlock');
        if (unlock) unlock.shadowRoot.querySelector('.mini-prompt').className = `mini-prompt ${currentTheme}-theme`;
        
        const save = document.getElementById('bv-save-prompt');
        if (save) save.shadowRoot.querySelector('.prompt').className = `prompt ${currentTheme}-theme`;
    }
});

function detectAndFill(specificField = null) {
    const passwordFields = document.querySelectorAll('input[type="password"]');
    if (passwordFields.length === 0) return;

    const host = window.location.hostname;
    
    try {
        chrome.runtime.sendMessage({ type: 'GET_CREDENTIALS', host: host }, (response) => {
            if (chrome.runtime.lastError) return;

            if (response && response.error === 'Locked') {
                const target = specificField || passwordFields[0];
                showQuickUnlockPrompt(target, host);
                return;
            }

            if (response && response.credentials && response.credentials.length > 0) {
                console.log('BlindVault: Matching credentials found in vault');
                const cred = response.credentials[0];
                fillForm(cred, passwordFields);
            } else {
                console.log('BlindVault: No matches for', host);
            }
        });
    } catch (e) {
        console.warn('BlindVault: Context invalidated');
    }
}

function fillForm(cred, passwordFields) {
    passwordFields.forEach((passField) => {
        // 1. Fill Password
        if (!passField.value) {
            passField.value = cred.password;
            passField.dispatchEvent(new Event('input', { bubbles: true }));
            passField.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // 2. Find Username (more aggressive)
        const container = passField.closest('form') || document;
        const userField = container.querySelector('input[type="text"], input[type="email"], input[name*="user"], input[name*="login"], input[id*="user"], input[id*="login"]');
        
        if (userField && !userField.value) {
            userField.value = cred.username;
            userField.dispatchEvent(new Event('input', { bubbles: true }));
            userField.dispatchEvent(new Event('change', { bubbles: true }));
        }
    });
}

function showQuickUnlockPrompt(targetField, host) {
    if (document.getElementById('bv-quick-unlock')) return;

    const container = document.createElement('div');
    container.id = 'bv-quick-unlock';
    
    // Position near the field
    const rect = targetField.getBoundingClientRect();
    
    // Safety check for viewport bounds
    let top = rect.bottom + 10;
    if (top + 150 > window.innerHeight) top = rect.top - 160;

    Object.assign(container.style, {
        position: 'fixed',
        top: `${top}px`,
        left: `${rect.left}px`,
        width: '240px',
        height: '150px',
        zIndex: '2147483647',
        display: 'block',
        visibility: 'visible',
        opacity: '1',
        pointerEvents: 'auto'
    });

    const shadow = container.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
        <style>
            .mini-prompt {
                --bg: #1e1e1e;
                --text: #ffffff;
                --border: #f6851b;
                --input-bg: #2a2a2a;
                --input-border: #444;
                --cancel: #888;
                
                font-family: 'Inter', system-ui, sans-serif;
                background: var(--bg);
                border: 2px solid var(--border);
                border-radius: 12px;
                padding: 12px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.6);
                color: var(--text);
                animation: bvSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                transition: background 0.3s, color 0.3s;
            }
            .light-theme {
                --bg: #ffffff;
                --text: #212529;
                --input-bg: #f8f9fa;
                --input-border: #dee2e6;
                --cancel: #6c757d;
                box-shadow: 0 8px 32px rgba(0,0,0,0.15);
            }
            @keyframes bvSlideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            .title { font-size: 11px; font-weight: bold; color: #f6851b; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }
            input {
                width: 100%;
                background: var(--input-bg);
                border: 1px solid var(--input-border);
                border-radius: 6px;
                color: var(--text);
                font-size: 14px;
                padding: 8px;
                box-sizing: border-box;
                margin-bottom: 10px;
                outline: none;
                box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
                transition: all 0.2s;
            }
            input:focus { border-color: #f6851b; box-shadow: 0 0 0 2px rgba(246, 133, 27, 0.2); }
            button {
                width: 100%;
                background: #f6851b;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 10px;
                font-weight: 700;
                cursor: pointer;
                font-size: 13px;
                transition: all 0.2s;
            }
            button:hover { background: #e27612; transform: translateY(-1px); }
            button:active { transform: translateY(0); }
            .cancel { font-size: 10px; color: var(--cancel); text-align: center; margin-top: 8px; cursor: pointer; transition: color 0.2s; }
            .cancel:hover { color: #f6851b; }
        </style>
        <div class="mini-prompt ${currentTheme}-theme">
            <div class="title">BlindVault Unlock</div>
            <input type="password" id="bv-pass" placeholder="Master Password" autofocus>
            <button id="bv-unlock-btn">Unlock & Autofill</button>
            <div class="cancel" id="bv-cancel">Dismiss</div>
        </div>
    `;

    document.body.appendChild(container);

    const input = shadow.getElementById('bv-pass');
    const btn = shadow.getElementById('bv-unlock-btn');

    const handleUnlock = () => {
        const password = input.value;
        if (!password) return;
        
        btn.innerText = 'Verifying...';
        btn.disabled = true;

        chrome.runtime.sendMessage({ type: 'QUICK_UNLOCK', password, host }, (response) => {
            if (response && response.success) {
                container.remove();
                if (response.credentials && response.credentials.length > 0) {
                    fillForm(response.credentials[0], document.querySelectorAll('input[type="password"]'));
                }
            } else {
                btn.innerText = 'Wrong Password';
                btn.style.background = '#dc2626';
                btn.disabled = false;
                setTimeout(() => {
                    btn.innerText = 'Unlock & Autofill';
                    btn.style.background = '#f6851b';
                }, 2000);
            }
        });
    };

    btn.onclick = handleUnlock;
    input.onkeydown = (e) => { if (e.key === 'Enter') handleUnlock(); };
    shadow.getElementById('bv-cancel').onclick = () => container.remove();
    
    // Robust focus
    input.focus();
    setTimeout(() => input.focus(), 100);
    setTimeout(() => input.focus(), 500);
}

// Track form submissions for password capture
function trackFormSubmissions() {
    // 1. Traditional Form Submit
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        if (form.dataset.bvListener) return;
        form.dataset.bvListener = 'true';
        console.log('BlindVault: Monitoring form', form);

        form.addEventListener('submit', () => {
            console.log('BlindVault: Form submit detected');
            captureAndPrompt(form);
        });
    });

    // 2. Button Click Fallback (for AJAX/SPA logins)
    const buttons = document.querySelectorAll('button, input[type="submit"], input[type="button"]');
    buttons.forEach(btn => {
        if (btn.dataset.bvListener) return;
        btn.dataset.bvListener = 'true';
        
        const text = btn.innerText.toLowerCase();
        if (text.includes('log') || text.includes('sign') || text.includes('submit')) {
            btn.addEventListener('click', () => {
                console.log('BlindVault: Submit button click detected');
                const form = btn.closest('form') || document;
                captureAndPrompt(form);
            });
        }
    });
}

function captureAndPrompt(root) {
    const passwordField = root.querySelector('input[type="password"]');
    const userField = root.querySelector('input[type="text"], input[type="email"], input[name*="user"], input[name*="email"], input[id*="user"]');
    
    if (passwordField && passwordField.value) {
        const username = userField ? userField.value : 'Unknown User';
        const password = passwordField.value;
        const site = window.location.hostname;

        console.log('BlindVault: Credentials harvested from', site);
        
        // Save to temporary storage in case of redirect
        chrome.storage.local.set({ 
            bv_pending_save: { site, username, password, timestamp: Date.now() } 
        }, () => {
            showSavePrompt(site, username, password);
        });
    } else {
        console.log('BlindVault: No password found in submission');
    }
}

function showSavePrompt(site, username, password) {
    // Check if prompt already exists
    if (document.getElementById('bv-save-prompt')) return;

    const container = document.createElement('div');
    container.id = 'bv-save-prompt';
    
    // Modern Side-Docked Style for the container
    Object.assign(container.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        width: '280px',
        zIndex: '2147483647',
        animation: 'bvSlideIn 0.4s ease-out'
    });

    const shadow = container.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
        <style>
            @keyframes bvSlideIn { from { transform: translateX(300px); } to { transform: translateX(0); } }
            .prompt {
                --bg: #1e1e1e;
                --text: #ffffff;
                --border: #333;
                --sub: #a0a0a0;
                --cancel-bg: #333;
                --cancel-text: #a0a0a0;
                
                font-family: 'Inter', system-ui, -apple-system, sans-serif;
                font-size: 14px;
                color: var(--text);
                background-color: var(--bg);
                border: 1px solid var(--border);
                border-radius: 12px;
                padding: 16px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.5);
                display: block;
                transition: background 0.3s, color 0.3s;
            }
            .light-theme {
                --bg: #ffffff;
                --text: #212529;
                --border: #dee2e6;
                --sub: #6c757d;
                --cancel-bg: #f1f3f5;
                --cancel-text: #495057;
                box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            }
            .title { font-weight: bold; color: #f6851b; margin-bottom: 4px; }
            .subtitle { font-size: 12px; margin-bottom: 12px; color: var(--sub); transition: color 0.3s; }
            .btn-group { display: flex; gap: 8px; }
            button { border: none; padding: 6px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s; }
            button:hover { opacity: 0.9; transform: translateY(-1px); }
            .save-btn { background: #f6851b; color: white; }
            .cancel-btn { background: var(--cancel-bg); color: var(--cancel-text); }
        </style>
        <div class="prompt ${currentTheme}-theme">
            <div class="title">Save to BlindVault?</div>
            <div class="subtitle">Do you want to save the password for <b>${site}</b>?</div>
            <div class="btn-group">
                <button class="save-btn" id="save">Save</button>
                <button class="cancel-btn" id="cancel">Never</button>
            </div>
        </div>
    `;

    document.body.appendChild(container);

    shadow.getElementById('save').onclick = () => {
        chrome.runtime.sendMessage({ 
            type: 'SAVE_NEW_CREDENTIAL', 
            credential: { site, username, password } 
        }, (response) => {
            container.remove();
            if (response && response.success) {
                console.log('BlindVault: Credential saved successfully');
            }
        });
    };

    shadow.getElementById('cancel').onclick = () => {
        container.remove();
    };
}

// Run on load and periodically
window.addEventListener('load', () => {
    // Only track submissions automatically. detectAndFill is now user-action driven
    trackFormSubmissions();
    
    // Check for pending saves from previous page load
    chrome.storage.local.get(['bv_pending_save'], (result) => {
        if (result.bv_pending_save) {
            const { site, username, password, timestamp } = result.bv_pending_save;
            // Check if it's recent (within 1 minute)
            if (Date.now() - timestamp < 60000) {
                console.log('BlindVault: Restoring pending save prompt');
                showSavePrompt(site, username, password);
            }
            chrome.storage.local.remove('bv_pending_save');
        }
    });

    // Add interaction listeners for On-Demand Autofill
    document.addEventListener('focusin', (e) => {
        if (e.target.tagName === 'INPUT' && (e.target.type === 'password' || e.target.type === 'text' || e.target.type === 'email')) {
            // Only trigger if it looks like a login field or we are in a form
            if (e.target.type === 'password' || e.target.name?.includes('user') || e.target.id?.includes('user')) {
                detectAndFill(e.target);
            }
        }
    });
});

const bvInterval = setInterval(() => {
    try {
        if (!chrome.runtime?.id) {
            console.log('BlindVault: Cleaning up orphaned script...');
            clearInterval(bvInterval);
            return;
        }
        // Only track submissions automatically. 
        // detectAndFill is now user-action driven for better UX.
        trackFormSubmissions();
    } catch (e) {
        clearInterval(bvInterval);
    }
}, 3000);

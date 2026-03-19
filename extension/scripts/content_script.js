console.log('BlindVault Content Script Loaded');

function detectAndFill() {
    const passwordFields = document.querySelectorAll('input[type="password"]');
    if (passwordFields.length === 0) return;

    const host = window.location.hostname;
    console.log('BlindVault: Checking for credentials for:', host);
    
    try {
        chrome.runtime.sendMessage({ type: 'GET_CREDENTIALS', host: host }, (response) => {
            if (chrome.runtime.lastError) {
                console.warn('BlindVault: Context invalidated. Please refresh the page.');
                return;
            }

            if (response && response.credentials && response.credentials.length > 0) {
                console.log('BlindVault: Found matching credentials:', response.credentials.length);
                const cred = response.credentials[0]; // Take first match
                
                passwordFields.forEach(passField => {
                    const form = passField.closest('form');
                    if (form) {
                        const userField = form.querySelector('input[type="text"], input[type="email"]');
                        if (userField && !userField.value) userField.value = cred.username;
                        if (!passField.value) passField.value = cred.password;
                    }
                });
            } else {
                console.log('BlindVault: No credentials found for this site.');
            }
        });
    } catch (e) {
        console.warn('BlindVault: Extension context invalidated. Please refresh the page.');
    }
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
                font-family: 'Inter', system-ui, -apple-system, sans-serif;
                font-size: 14px;
                color: white;
                background-color: #1e1e1e;
                border: 1px solid #333;
                border-radius: 12px;
                padding: 16px;
                boxShadow: 0 4px 20px rgba(0,0,0,0.5);
                display: block;
            }
            .title { font-weight: bold; color: #f6851b; margin-bottom: 4px; }
            .subtitle { font-size: 12px; margin-bottom: 12px; color: #a0a0a0; }
            .btn-group { display: flex; gap: 8px; }
            button { border: none; padding: 6px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; transition: opacity 0.2s; }
            button:hover { opacity: 0.9; }
            .save-btn { background: #f6851b; color: white; }
            .cancel-btn { background: #333; color: #a0a0a0; }
        </style>
        <div class="prompt">
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
    detectAndFill();
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
});

setInterval(() => {
    detectAndFill();
    trackFormSubmissions();
}, 3000);

console.log('BlindVault Content Script Loaded');

function detectAndFill() {
    const passwordFields = document.querySelectorAll('input[type="password"]');
    if (passwordFields.length === 0) return;

    const host = window.location.hostname;
    
    chrome.runtime.sendMessage({ type: 'GET_CREDENTIALS', host: host }, (response) => {
        if (response && response.credentials && response.credentials.length > 0) {
            const cred = response.credentials[0]; // Take first match
            
            passwordFields.forEach(passField => {
                const form = passField.closest('form');
                if (form) {
                    const userField = form.querySelector('input[type="text"], input[type="email"]');
                    if (userField) userField.value = cred.username;
                    passField.value = cred.password;
                    console.log('BlindVault: Autofilled credentials for', host);
                }
            });
        }
    });
}

// Run on load and periodically (for dynamic forms)
window.addEventListener('load', detectAndFill);
setInterval(detectAndFill, 3000); 

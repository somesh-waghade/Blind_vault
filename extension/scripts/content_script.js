// Track form submissions for password capture
function trackFormSubmissions() {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        if (form.dataset.bvListener) return;
        form.dataset.bvListener = 'true';

        form.addEventListener('submit', () => {
            const passwordField = form.querySelector('input[type="password"]');
            const userField = form.querySelector('input[type="text"], input[type="email"], input[name*="user"], input[name*="email"]');
            
            if (passwordField && passwordField.value) {
                const username = userField ? userField.value : 'Unknown User';
                const password = passwordField.value;
                const site = window.location.hostname;

                // Optimization: Briefly delay to see if form actually submits
                setTimeout(() => {
                    showSavePrompt(site, username, password);
                }, 500);
            }
        });
    });
}

function showSavePrompt(site, username, password) {
    // Check if prompt already exists
    if (document.getElementById('bv-save-prompt')) return;

    const prompt = document.createElement('div');
    prompt.id = 'bv-save-prompt';
    prompt.innerHTML = `
        <div style="font-family: 'Inter', sans-serif; font-size: 14px; color: white;">
            <div style="font-weight: bold; color: #f6851b; margin-bottom: 4px;">Save to BlindVault?</div>
            <div style="font-size: 12px; margin-bottom: 12px; color: #a0a0a0;">Do you want to save the password for <b>${site}</b>?</div>
            <div style="display: flex; gap: 8px;">
                <button id="bv-save-confirm" style="background: #f6851b; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: 600;">Save</button>
                <button id="bv-save-cancel" style="background: #333; color: #a0a0a0; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">Never</button>
            </div>
        </div>
    `;

    // Modern Side-Docked Style
    Object.assign(prompt.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        width: '240px',
        backgroundColor: '#1e1e1e',
        border: '1px solid #333',
        borderRadius: '12px',
        padding: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        zIndex: '999999',
        animation: 'bvSlideIn 0.4s ease-out'
    });

    // Simple Animation
    const style = document.createElement('style');
    style.innerHTML = `@keyframes bvSlideIn { from { transform: translateX(300px); } to { transform: translateX(0); } }`;
    document.head.appendChild(style);

    document.body.appendChild(prompt);

    document.getElementById('bv-save-confirm').onclick = () => {
        chrome.runtime.sendMessage({ 
            type: 'SAVE_NEW_CREDENTIAL', 
            credential: { site, username, password } 
        }, (response) => {
            prompt.remove();
            if (response && response.success) {
                console.log('BlindVault: Credential saved successfully');
            }
        });
    };

    document.getElementById('bv-save-cancel').onclick = () => {
        prompt.remove();
    };
}

// Run on load and periodically
window.addEventListener('load', () => {
    detectAndFill();
    trackFormSubmissions();
});

setInterval(() => {
    detectAndFill();
    trackFormSubmissions();
}, 3000);

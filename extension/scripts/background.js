importScripts('crypto.js');

// In-memory state (lost when browser/extension restarts)
let sessionStore = {
    vault: null,
    userId: null,
    derivedKey: null
};

chrome.runtime.onInstalled.addListener(() => {
  console.log('BlindVault Extension Installed');
  // Configure side panel to open on action click
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));
});

const API_URL = 'http://localhost:5000/api';

// Helper to ensure session is loaded from storage (fixes MV3 service worker termination)
async function ensureSession() {
    if (sessionStore.userId && sessionStore.derivedKey) return true;

    return new Promise((resolve) => {
        chrome.storage.session.get(['userId', 'keyJWK', 'vault'], async (result) => {
            if (result.userId && result.keyJWK) {
                console.log('BlindVault: Restoring session from storage...');
                sessionStore.userId = result.userId;
                sessionStore.vault = result.vault || [];
                try {
                    sessionStore.derivedKey = await CryptoModule.importKey(result.keyJWK);
                    resolve(true);
                } catch (e) {
                    console.error('BlindVault: Failed to restore key:', e);
                    resolve(false);
                }
            } else {
                resolve(false);
            }
        });
    });
}

// Listen for messages from Popup and Content Scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('BlindVault: Received message:', request.type);

  if (request.type === 'SAVE_NEW_CREDENTIAL') {
      ensureSession().then(async (isActive) => {
          if (!isActive) {
              console.error('BlindVault: Save failed - No active session (UserId or Key missing)');
              sendResponse({ success: false, error: 'Locked' });
              return;
          }

          const { site, username, password } = request.credential;
          console.log('BlindVault: Save request for:', site);
          console.log('BlindVault: Current vault size:', sessionStore.vault ? sessionStore.vault.length : 0);
          
          // Update in-memory vault
          if (!sessionStore.vault) sessionStore.vault = [];
          sessionStore.vault.push({ site, username, password });

          // Encrypt and Sync
          console.log('BlindVault: Starting encryption...');
          CryptoModule.encrypt(JSON.stringify(sessionStore.vault), sessionStore.derivedKey)
              .then(({ ciphertext, iv }) => {
                  console.log('BlindVault: Encryption complete. Syncing to server...');
                  return fetch(`${API_URL}/vault`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ 
                          userId: sessionStore.userId, 
                          encryptedData: JSON.stringify({ ciphertext, iv }) 
                      })
                  });
              })
              .then(res => {
                  if (res.ok) {
                      console.log('BlindVault: Sync successful (HTTP 200)');
                      sendResponse({ success: true });
                  } else {
                      console.error('BlindVault: Sync failed (HTTP', res.status, ')');
                      sendResponse({ success: false });
                  }
              })
              .catch(err => {
                  console.error('BlindVault: Fatal save error:', err);
                  sendResponse({ success: false });
              });
      });
      return true; // Async
  }

  if (request.type === 'SET_SESSION') {
    sessionStore.vault = request.vault;
    sessionStore.userId = request.userId;
    
    // Persist for service worker restarts
    chrome.storage.session.set({ 
        userId: request.userId, 
        keyJWK: request.keyJWK, 
        vault: request.vault 
    });

    CryptoModule.importKey(request.keyJWK).then(key => {
        sessionStore.derivedKey = key;
        console.log('Session state updated with secure key');
    });
    sendResponse({ success: true });
  }

  if (request.type === 'GET_CREDENTIALS') {
    const host = request.host;
    ensureSession().then(isActive => {
        if (!isActive || !sessionStore.vault) {
            sendResponse({ credentials: null });
            return;
        }
        const matches = sessionStore.vault.filter(cred => 
            cred.site.toLowerCase().includes(host.toLowerCase())
        );
        sendResponse({ credentials: matches });
    });
    return true; // Async
  }

  if (request.type === 'LOCK') {
    sessionStore = { vault: null, userId: null, derivedKey: null };
    chrome.storage.session.clear();
    sendResponse({ success: true });
  }

  return true; // Keep message channel open for async response
});

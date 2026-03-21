importScripts('config.js', 'crypto.js');

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

const API_URL = CONFIG.API_URL;

// Helper to ensure session is loaded from storage (fixes MV3 service worker termination)
async function ensureSession() {
    if (sessionStore.userId && sessionStore.derivedKey) return true;

    return new Promise((resolve) => {
        console.log('BlindVault: Checking session storage...');
        chrome.storage.session.get(['userId', 'keyJWK', 'vault'], async (result) => {
            console.log('BlindVault: Storage result:', result.userId ? 'UserId found' : 'UserId NOT found', result.keyJWK ? 'Key found' : 'Key NOT found');
            if (result.userId && result.keyJWK) {
                console.log('BlindVault: Restoring session from storage...');
                sessionStore.userId = result.userId;
                sessionStore.vault = result.vault || [];
                try {
                    sessionStore.derivedKey = await CryptoModule.importKey(result.keyJWK);
                    console.log('BlindVault: Key re-imported successfully');
                    resolve(true);
                } catch (e) {
                    console.error('BlindVault: Failed to restore key:', e);
                    resolve(false);
                }
            } else {
                console.warn('BlindVault: No session data in storage. Please log in again.');
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
          
          // Check for existing to prevent duplicates
          const existingIndex = sessionStore.vault.findIndex(c => 
              c.site === site && c.username === username
          );

          if (existingIndex >= 0) {
              console.log('BlindVault: Updating existing credential');
              sessionStore.vault[existingIndex].password = password;
          } else {
              console.log('BlindVault: Adding new credential');
              sessionStore.vault.push({ site, username, password });
          }

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
                      
                      // Broadcast update to Popup/Sidebar if open
                      chrome.runtime.sendMessage({ 
                          type: 'VAULT_UPDATED', 
                          vault: sessionStore.vault 
                      }).catch(() => {}); // Ignore if no listener (popup closed)

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
    console.log('BlindVault: Setting session for user:', request.userId);
    sessionStore.vault = request.vault;
    sessionStore.userId = request.userId;
    
    // Persist for service worker restarts
    chrome.storage.session.set({ 
        userId: request.userId, 
        keyJWK: request.keyJWK, 
        vault: request.vault 
    }, () => {
        console.log('BlindVault: Session saved to storage.session');
    });

    CryptoModule.importKey(request.keyJWK).then(key => {
        sessionStore.derivedKey = key;
        console.log('BlindVault: Session state updated with secure key');
    });
    sendResponse({ success: true });
  }

  if (request.type === 'GET_CREDENTIALS') {
    const host = request.host;
    console.log('BlindVault: Searching credentials for host:', host);
    
    // 1. Check if session even exists (derivedKey in memory or keyJWK in session)
    ensureSession().then(isActive => {
        if (!isActive) {
            console.log('BlindVault: No active session. Skipping autofill.');
            sendResponse({ credentials: null, error: 'LoggedOut' });
            return;
        }

        // 2. Session exists, check if UI is unlocked
        chrome.storage.session.get(['ui_unlocked'], (res) => {
            if (!res.ui_unlocked) {
                console.warn('BlindVault: Vault UI is locked. Prompting for quick unlock.');
                sendResponse({ credentials: null, error: 'Locked' });
                return;
            }

            // 3. Fully active and unlocked
            if (!sessionStore.vault) {
                sendResponse({ credentials: null });
                return;
            }

            const matches = sessionStore.vault.filter(cred => 
                host.toLowerCase().includes(cred.site.toLowerCase()) ||
                cred.site.toLowerCase().includes(host.toLowerCase())
            );
            console.log('BlindVault: Found', matches.length, 'matches for', host);
            sendResponse({ credentials: matches });
        });
    });
    return true; // Async
  }

  if (request.type === 'LOCK') {
    sessionStore = { vault: null, userId: null, derivedKey: null };
    // DO NOT clear session storage for "Soft LOCK" in background (popup does it)
    sendResponse({ success: true });
  }

  if (request.type === 'HARD_LOGOUT') {
    sessionStore = { vault: null, userId: null, derivedKey: null };
    chrome.storage.session.clear();
    sendResponse({ success: true });
  }

  if (request.type === 'QUICK_UNLOCK') {
    const { password, host } = request;
    console.log('BlindVault: Quick Unlock requested for', host);

    // 1. Derive key and check ZKP in background
    (async () => {
        try {
            // Re-use logic from popup.js
            const encoder = new TextEncoder();
            const bytes = encoder.encode(password);
            const passwordNum = BigInt('0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')) % BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");
            
            // To verify, we need the stored hash. Let's get it from the session storage
            chrome.storage.session.get(['userId', 'vault'], async (res) => {
                if (!res.userId) {
                    sendResponse({ success: false, error: 'No Session' });
                    return;
                }

                // In a real app, we would fetch the user's passwordHash from the server
                // But for "Quick Unlock", we can just try to derive the same key we already have!
                // If it matches what we have in sessionStore, it's valid.
                
                // OR better: Ask server for verification
                // Let's keep it simple: derive key and if it imports correctly, we are good.
                // Wait, we don't know the salt... FIXED_SALT is 1..16
                const FIXED_SALT = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
                const key = await CryptoModule.deriveKey(password, FIXED_SALT);
                const keyJWK = await CryptoModule.exportKey(key);
                
                // Compare with stored session key
                chrome.storage.session.get(['keyJWK'], (stored) => {
                    if (stored.keyJWK && stored.keyJWK.k === keyJWK.k) {
                        console.log('BlindVault: Quick Unlock successful (One-Time)');
                        
                        // NOTE: We intentionally DO NOT set { ui_unlocked: true } here anymore.
                        // Quick Unlock is isolated and only fills the current page one time.
                        // The main vault UI remains locked.
                        
                        // Return matches immediately
                        const matches = sessionStore.vault ? sessionStore.vault.filter(cred => 
                            host.toLowerCase().includes(cred.site.toLowerCase()) ||
                            cred.site.toLowerCase().includes(host.toLowerCase())
                        ) : [];
                        
                        sendResponse({ success: true, credentials: matches });
                    } else {
                        console.warn('BlindVault: Quick Unlock failed - Incorrect password');
                        sendResponse({ success: false, error: 'Incorrect Password' });
                    }
                });
            });
        } catch (e) {
            console.error('BlindVault: Quick Unlock error:', e);
            sendResponse({ success: false, error: e.message });
        }
    })();
    return true; // Async
  }

  return true; // Keep message channel open for async response
});

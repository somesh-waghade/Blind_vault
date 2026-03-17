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

importScripts('crypto.js');

const API_URL = 'http://localhost:5000/api';

// Listen for messages from Popup and Content Scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SAVE_NEW_CREDENTIAL') {
      if (!sessionStore.userId || !sessionStore.derivedKey) {
          console.warn('Save failed: No active session');
          sendResponse({ success: false, error: 'Locked' });
          return;
      }

      const { site, username, password } = request.credential;
      
      // Update in-memory vault
      if (!sessionStore.vault) sessionStore.vault = [];
      sessionStore.vault.push({ site, username, password });

      // Encrypt and Sync
      CryptoModule.encrypt(JSON.stringify(sessionStore.vault), sessionStore.derivedKey)
          .then(({ ciphertext, iv }) => {
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
                  console.log('Sync successful');
                  sendResponse({ success: true });
              } else {
                  sendResponse({ success: false });
              }
          })
          .catch(err => {
              console.error('Save error:', err);
              sendResponse({ success: false });
          });

      return true; // Async
  }

  if (request.type === 'SET_SESSION') {
    sessionStore.vault = request.vault;
    sessionStore.userId = request.userId;
    sessionStore.derivedKey = request.derivedKey;
    console.log('Session state updated');
    sendResponse({ success: true });
  }

  if (request.type === 'GET_CREDENTIALS') {
    const host = request.host;
    if (!sessionStore.vault) {
        sendResponse({ credentials: null });
        return;
    }
    // Find matching credentials for the domain
    const matches = sessionStore.vault.filter(cred => 
        cred.site.toLowerCase().includes(host.toLowerCase())
    );
    sendResponse({ credentials: matches });
  }

  if (request.type === 'LOCK') {
    sessionStore = { vault: null, userId: null, derivedKey: null };
    sendResponse({ success: true });
  }

  return true; // Keep message channel open for async response
});

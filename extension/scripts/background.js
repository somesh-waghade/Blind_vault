// In-memory state (lost when browser/extension restarts)
let sessionStore = {
    vault: null,
    userId: null
};

chrome.runtime.onInstalled.addListener(() => {
  console.log('BlindVault Extension Installed');
  // Configure side panel to open on action click
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));
});

// Listen for messages from Popup and Content Scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SET_SESSION') {
    sessionStore.vault = request.vault;
    sessionStore.userId = request.userId;
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
    sessionStore = { vault: null, userId: null };
    sendResponse({ success: true });
  }

  return true; // Keep message channel open for async response
});

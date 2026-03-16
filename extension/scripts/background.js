chrome.runtime.onInstalled.addListener(() => {
  console.log('BlindVault Extension Installed');
});

// Listener for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "ping") {
    sendResponse({ status: "alive" });
  }
});

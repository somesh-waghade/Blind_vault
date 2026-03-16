# BlindVault 🛡️

**BlindVault** is a privacy-preserving password manager that uses **Zero-Knowledge Proofs (ZKP)** and **AES-256 encryption** to ensure your credentials never leave your browser in an unencrypted state. The server is "blind"—it stores your vault but never sees your master password.

## 🚀 Key Features
- **ZKP Authentication:** Log in without ever sending your master password to the server.
- **Zero-Knowledge Storage:** Everything is encrypted client-side using the Web Crypto API.
- **Auto-Fill:** Detected login forms are automatically filled for ease of use.
- **Secure Sync:** Your encrypted vault is synced to the cloud, accessible only by you.

## 🛠️ Technology Stack
- **Frontend:** Chrome Extension (Manifest V3, Vanilla JS)
- **Backend:** Node.js, Express, MongoDB
- **ZKP:** Circom, SnarkJS
- **Cryptography:** Web Crypto API (AES-GCM)

## 📂 Project Structure
- `/extension`: The Chrome extension code.
- `/backend`: The Node.js API server.
- `/zkp-circuits`: Circom circuits and proving keys.

## 🏁 Getting Started
### Prerequisites
- Node.js (v16+)
- MongoDB (Local or Atlas)
- Chrome Browser

### Installation
1. Clone the repository.
2. Install backend dependencies: `cd backend && npm install`.
3. Load the extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `/extension` folder.

---
*Built with ❤️ for privacy.*

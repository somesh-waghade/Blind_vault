# Interview Study Guide 🎓

Use these notes to prepare for your project presentation or technical interviews.

## The Elevator Pitch
> "I built **BlindVault**, a privacy-preserving password manager implemented as a Chrome Extension. The core innovation is that it uses **Zero-Knowledge Proofs (ZKP)** for authentication, meaning the server verifies the user's identity without ever receiving or storing their master password. Additionally, all vault data is encrypted on the client-side using **AES-GCM**, ensuring that the backend server is completely 'blind' to user credentials. This architecture prevents data recovery even in the event of a full database breach."

## Likely Interview Questions

### Q1: Why use ZKP instead of a simple hashed password?
**Answer:** While hashing is standard, an attacker with access to a database of hashes can perform offline brute-force or rainbow table attacks. By using ZKP, we never store the password or its direct hash on the server. The user proves knowledge through a circuit, which adds a significantly higher layer of cryptographic protection and privacy.

### Q2: How do you handle key management?
**Answer:** We follow a **stateless key management** approach. The encryption keys are derived on-the-fly from the user's master password using PBKDF2/Web Crypto API. They are kept only in the transient memory of the extension's background script while the vault is "unlocked" and are purged immediately after.

### Q3: What were the biggest technical challenges?
**Answer:**
1. **ZKP in the Browser:** Optimizing `snarkjs` to run efficiently within a browser extension environment.
2. **Manifest V3 Migration:** Moving background logic to a Service Worker, which lacks access to the DOM and has a limited execution lifetime.
3. **Local Crypto:** Ensuring secure entropy using the browser's native `crypto.getRandomValues()` for salts and IVs.

### Q4: If the user forgets their master password, can you recover it?
**Answer:** **No.** This is a trade-off of the "Zero-Knowledge" architecture. Since we don't store the password or the encryption key, there is no "Forgot Password" backdoor. This is a deliberate security choice to ensure maximum privacy.

### Q5: How did you securely implement the floating "Quick Unlock" prompt on webpages?
**Answer:** Injecting UI directly into untrusted web pages is dangerous because the site's JavaScript could read the inputs. I mitigated this by rendering the prompt inside an isolated **Shadow DOM** created from the extension's protected Content Script context. This creates a hard boundary that host-page scripts cannot pierce, preventing XSS attacks from stealing the master password natively typed into the page.

### Q6: How does the extension auto-save passwords without forcing the user to log in every 5 seconds?
**Answer:** I engineered a **Soft Lock** session model. When a user "locks" the vault, the frontend UI is hidden and requires the master password to unlock. However, the background Service Worker retains the symmetric encryption key securely inside `chrome.storage.session` (which lives only in RAM and dies with the browser process). This allows the extension to silently capture and encrypt *new* credentials while browsing, without exposing the existing vault data to the UI or demanding constant re-authentication.

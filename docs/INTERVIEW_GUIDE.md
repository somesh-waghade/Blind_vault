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

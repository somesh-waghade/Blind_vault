# Security Deep Dive 🔐

This document explains the core security mechanisms behind **BlindVault**.

## 1. Zero-Knowledge Authentication (ZKP)
The most unique feature of BlindVault is that you can log in to the server without ever sending your password.

### How it works:
- **Registration:** When you sign up, the extension hashes your master password and generates a set of "Public Signals". Only these signals are sent to the server.
- **Login:** To log in, the extension creates a **ZK-SNARK proof**. This proof mathematically says: *"I know the password that matches those Public Signals, but I'm not going to tell you what it is."*
- **Verification:** The server uses the project's **Verifying Key** to check if the proof is valid. If it is, the server knows you are the owner without ever seeing your password.

## 2. Client-Side Encryption (AES-GCM)
Even if an attacker hacks the database, they cannot see your saved passwords.

### Key Derivation (PBKDF2):
We use the **Web Crypto API** to turn your human-readable master password into a strong 256-bit cryptographic key using the PBKDF2 algorithm. This happens purely inside the browser.

### Data Privacy:
- **AES-GCM 256:** This is the industry standard for symmetric encryption.
- Your credentials (URL, username, password) are bundled into a JSON object, encrypted into a "blob" of ciphertext, and then sent to the server.
- The server sees garbage text; only the extension (with your master password) can turn it back into real passwords.

## 3. Threat Model & Mitigations

| Threat | Mitigation |
| :--- | :--- |
| **Server Database Leak** | Attacker only gets encrypted blobs; passwords remain safe. |
| **Network Interception** | Sensitive data is encrypted before transit; ZKP prevents password sniffing. |
| **Dictionary Attack** | PBKDF2 with high iteration counts makes cracking the master password slow and difficult. |
| **Evil Server Admin** | Admin cannot decrypt your data as they lack your master password. |

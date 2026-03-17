# API Reference 📡

The BlindVault backend is a RESTful API built with Node.js and Express.

**Base URL:** `http://localhost:5000` (Local Development)

---

## 1. Authentication

### Register User
`POST /api/auth/register`

- **Body:**
  ```json
  {
    "username": "somesh",
    "publicSignals": ["hash1", "hash2", "..."]
  }
  ```
- **Response (201 Created):**
  ```json
  { "msg": "User registered successfully" }
  ```

### Verify Login (ZKP)
`POST /api/auth/login`

- **Body:**
  ```json
  {
    "username": "somesh",
    "proof": { ... },
    "publicSignals": [ ... ]
  }
  ```
- **Response (200 OK):**
  ```json
  { 
    "msg": "Proof received! Verification pending implementation.",
    "userId": "640..." 
  }
  ```

---

## 2. Vault Management

### Get Encrypted Vault
`GET /api/vault/:userId`

- **Response (200 OK):**
  ```json
  {
    "userId": "640...",
    "encryptedData": "v2.aes.ciphertext...",
    "updatedAt": "2023-..."
  }
  ```

### Sync Vault
`POST /api/vault`

- **Body:**
  ```json
  {
    "userId": "640...",
    "encryptedData": "v2.aes.ciphertext..."
  }
  ```
- **Response (200 OK):**
  ```json
  { "msg": "Vault synced successfully" }
  ```

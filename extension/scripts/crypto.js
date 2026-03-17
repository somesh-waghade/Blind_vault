/**
 * Crypto Module for BlindVault
 * Uses Web Crypto API for secure key derivation and encryption.
 */

const CryptoModule = {
    /**
     * Derives a cryptographic key from a master password.
     * @param {string} password - The master password.
     * @param {Uint8Array} salt - A unique salt for PBKDF2.
     * @returns {Promise<CryptoKey>} - The derived AES-GCM key.
     */
    async deriveKey(password, salt) {
        const encoder = new TextEncoder();
        const baseKey = await crypto.subtle.importKey(
            "raw",
            encoder.encode(password),
            "PBKDF2",
            false,
            ["deriveKey"]
        );

        return await crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: salt,
                iterations: 100000,
                hash: "SHA-256",
            },
            baseKey,
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );
    },

    /**
     * Encrypts data using AES-GCM.
     * @param {string} data - Plaintext data to encrypt.
     * @param {CryptoKey} key - The derived AES key.
     * @returns {Promise<{ciphertext: string, iv: string}>}
     */
    async encrypt(data, key) {
        const encoder = new TextEncoder();
        const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV
        const ciphertext = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            key,
            encoder.encode(data)
        );

        return {
            ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
            iv: btoa(String.fromCharCode(...iv))
        };
    },

    /**
     * Decrypts AES-GCM ciphertext.
     * @param {string} ciphertextBase64 - Base64 encoded ciphertext.
     * @param {string} ivBase64 - Base64 encoded IV.
     * @param {CryptoKey} key - The derived AES key.
     * @returns {Promise<string>} - The decrypted plaintext.
     */
    async decrypt(ciphertextBase64, ivBase64, key) {
        const decoder = new TextDecoder();
        const ciphertext = new Uint8Array(atob(ciphertextBase64).split("").map(c => c.charCodeAt(0)));
        const iv = new Uint8Array(atob(ivBase64).split("").map(c => c.charCodeAt(0)));

        const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            key,
            ciphertext
        );

        return decoder.decode(decrypted);
    }
};

// Export for use in popup/background
if (typeof window !== 'undefined') {
    window.CryptoModule = CryptoModule;
}

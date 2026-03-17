# ZKP Circuits 🧩

This directory will store the **Circom** circuits and **SnarkJS** keys for the Zero-Knowledge Proof authentication.

## 📝 Planned Circuits
1.  **auth.circom:** A circuit that proves the user knows the pre-image of a hash (their master password) without revealing it.
2.  **poseidon_hash:** Using the Poseidon hash function for ZK-efficiency.

## 🔑 Keys and Parameters
- `pot12_final.ptau`: Powers of Tau setup.
- `auth_0001.zkey`: Proving key for the auth circuit.
- `verification_key.json`: Public verification key for the backend server.

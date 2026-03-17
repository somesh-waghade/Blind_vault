#!/bin/bash

# This script helps compile the circuit and perform the trusted setup.
# Requirements: circom and snarkjs (npm install -g snarkjs)

CIRCUIT_NAME="auth"

echo "--- Compiling Circuit ---"
circom circuits/${CIRCUIT_NAME}.circom --r1cs --wasm --sym -o .

echo "--- Generating Witness ---"
# Note: In a real flow, the extension will generate this using the compiled WASM.

echo "--- Trusted Setup (Powers of Tau) ---"
if [ ! -f "pot12_final.ptau" ]; then
    echo "Downloading Powers of Tau file..."
    curl -L https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_12.ptau -o pot12_final.ptau
fi

echo "--- Generating ZKey ---"
snarkjs groth16 setup ${CIRCUIT_NAME}.r1cs pot12_final.ptau ${CIRCUIT_NAME}_0000.zkey
snarkjs zkey contribute ${CIRCUIT_NAME}_0000.zkey ${CIRCUIT_NAME}_final.zkey --name="First Contribution" -v -e="some random text"

echo "--- Exporting Verification Key ---"
snarkjs zkey export verificationkey ${CIRCUIT_NAME}_final.zkey verification_key.json

echo "Done! Copy verification_key.json to your backend/src/config/ folder."

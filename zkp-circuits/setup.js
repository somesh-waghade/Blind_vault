const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Node script to compile ZKP circuits and generate keys.
 * Requirement: npm install -g snarkjs (and circom must be in your PATH)
 */

const CIRCUIT_NAME = 'auth';
const CIRCUIT_DIR = path.join(__dirname, 'circuits');
const BUILD_DIR = path.join(__dirname, 'build');

if (!fs.existsSync(BUILD_DIR)) {
    fs.mkdirSync(BUILD_DIR);
}

function run(cmd) {
    console.log(`Running: ${cmd}`);
    try {
        execSync(cmd, { stdio: 'inherit', cwd: __dirname });
    } catch (e) {
        console.error(`Error executing command: ${cmd}`);
        process.exit(1);
    }
}

console.log('--- Compiling Circuit ---');
run(`circom circuits/${CIRCUIT_NAME}.circom --r1cs --wasm --sym -o build`);

console.log('--- Trusted Setup (Powers of Tau) ---');
const ptauPath = path.join(__dirname, 'pot12_final.ptau');
if (!fs.existsSync(ptauPath)) {
    console.log('Please download pot12_final.ptau and place it in the zkp-circuits folder.');
    console.log('URL: https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_12.ptau');
} else {
    console.log('--- Generating ZKey ---');
    run(`snarkjs groth16 setup build/${CIRCUIT_NAME}.r1cs pot12_final.ptau build/${CIRCUIT_NAME}_0000.zkey`);
    // Note: Entropy input is interactive in snarkjs cli, this might hang if not automated
    console.log('For the следующими steps, please run these manually in your terminal for entropy input:');
    console.log(`snarkjs zkey contribute build/${CIRCUIT_NAME}_0000.zkey build/${CIRCUIT_NAME}_final.zkey --name="First Contribution" -v`);
    console.log(`snarkjs zkey export verificationkey build/${CIRCUIT_NAME}_final.zkey build/verification_key.json`);
}

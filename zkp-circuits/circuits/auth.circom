pragma circom 2.0.0;

// include "../node_modules/circomlib/circuits/poseidon.circom";

template Auth() {
    // Private input: the master password (pre-image)
    signal input password;
    
    // Public input: the expected hash of the password
    signal input passwordHash;

    // Output: 1 if proof is valid (mostly for testing, signals are public by default)
    // signal output isValid;

    // Simple custom hash constraint for the demo
    // (In production, this would be Poseidon or MiMC)
    password * 123456789 + 987654321 === passwordHash;
}

component main {public [passwordHash]} = Auth();

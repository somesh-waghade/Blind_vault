pragma circom 2.0.0;

include "../../node_modules/circomlib/circuits/poseidon.circom";

template Auth() {
    // Private input: the master password (pre-image)
    signal input password;
    
    // Public input: the expected hash of the password
    signal input passwordHash;

    // Output: 1 if proof is valid (mostly for testing, signals are public by default)
    // signal output isValid;

    // Instantiate Poseidon hasher with 1 input
    component hasher = Poseidon(1);
    
    hasher.inputs[0] <== password;

    // Constraint: The hash of the input password must match the public passwordHash
    hasher.out === passwordHash;
}

component main {public [passwordHash]} = Auth();

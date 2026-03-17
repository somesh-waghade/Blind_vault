# BlindVault ZKP Setup for Windows

$CIRCUIT_NAME = "auth"

Write-Host "--- Compiling Circuit ---" -ForegroundColor Cyan
if (!(Get-Command circom -ErrorAction SilentlyContinue)) {
    Write-Host "circom not found! Attempting to download circom.exe..." -ForegroundColor Yellow
    $circomUrl = "https://github.com/iden3/circom/releases/latest/download/circom-windows-amd64.exe"
    Invoke-WebRequest -Uri $circomUrl -OutFile ".\circom.exe"
    Write-Host "circom.exe downloaded to local folder." -ForegroundColor Green
    $CIRCOM_CMD = ".\circom.exe"
} else {
    $CIRCOM_CMD = "circom"
}

& $CIRCOM_CMD circuits/$CIRCUIT_NAME.circom --r1cs --wasm --sym -o .

Write-Host "--- Trusted Setup (Powers of Tau) ---" -ForegroundColor Cyan
if (!(Test-Path "pot12_final.ptau")) {
    Write-Host "Downloading Powers of Tau file..."
    Invoke-WebRequest -Uri https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_12.ptau -OutFile pot12_final.ptau
}

Write-Host "--- Generating ZKey ---" -ForegroundColor Cyan
# Using npx directly via node to avoid ExecutionPolicy blocks
$npx = "C:\Program Files\nodejs\node_modules\npm\bin\npx-cli.js"
node $npx snarkjs groth16 setup "$CIRCUIT_NAME.r1cs" pot12_final.ptau "$($CIRCUIT_NAME)_0000.zkey"
node $npx snarkjs zkey contribute "$($CIRCUIT_NAME)_0000.zkey" "$($CIRCUIT_NAME)_final.zkey" --name="First Contribution" -v -e="some random text"

Write-Host "--- Exporting Verification Key ---" -ForegroundColor Cyan
node $npx snarkjs zkey export verificationkey "$($CIRCUIT_NAME)_final.zkey" verification_key.json

Write-Host "`nDone! 🛡️" -ForegroundColor Green
Write-Host "Copy 'verification_key.json' to 'backend/src/config/'"
Write-Host "Copy 'auth_js/auth.wasm' and 'auth_final.zkey' to 'extension/assets/zkp/'"

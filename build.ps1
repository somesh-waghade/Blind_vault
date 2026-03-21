# Run this script in PowerShell to package the extension for the Chrome Web Store

$ExtensionDir = ".\extension"
$ZipFile = ".\blindvault-v1.0.0.zip"

if (Test-Path $ZipFile) {
    Remove-Item $ZipFile
}

Write-Host "Packaging BlindVault Extension..." -ForegroundColor Cyan
Compress-Archive -Path "$ExtensionDir\*" -DestinationPath $ZipFile
Write-Host "Success! Created $ZipFile" -ForegroundColor Green
Write-Host "You can now upload this .zip file to the Chrome Web Store Developer Dashboard." -ForegroundColor Yellow

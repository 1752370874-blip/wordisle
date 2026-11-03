# Create or reuse a self-signed code-signing certificate for local trust.
# Usage:  powershell -ExecutionPolicy Bypass -File make-cert.ps1
$ErrorActionPreference = 'Stop'

$cert = Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert -ErrorAction SilentlyContinue |
  Where-Object { $_.Subject -like '*WordMaster*' } |
  Select-Object -First 1

if (-not $cert) {
  $cert = New-SelfSignedCertificate `
    -Type CodeSigningCert `
    -Subject 'CN=WordMaster, O=WordMaster, C=CN' `
    -CertStoreLocation Cert:\CurrentUser\My `
    -KeyUsage DigitalSignature `
    -TextExtension @('2.5.29.37={text}1.3.6.1.5.5.7.3.3') `
    -NotAfter (Get-Date).AddYears(5) `
    -FriendlyName 'WordMaster Code Signing (self-signed)'
  Write-Host 'Created a new self-signed code signing certificate.'
} else {
  Write-Host 'Reusing the existing code signing certificate.'
}

$cerPath = Join-Path $PSScriptRoot 'build-res\WordMaster-CodeSigning.cer'
Export-Certificate -Cert $cert -FilePath $cerPath -Force | Out-Null

Write-Host ''
Write-Host ("Thumbprint : " + $cert.Thumbprint)
Write-Host ("Valid until: " + $cert.NotAfter)
Write-Host ("Public cert: " + $cerPath)
Write-Host ''
Write-Host 'This certificate is self-signed: Windows only trusts it after you import the .cer'
Write-Host 'into your own Trusted Root store. Run trust-cert.bat once (or the certutil commands below).'
Write-Host ''
Write-Host ('certutil -addstore -user Root "' + $cerPath + '"')
Write-Host ('certutil -addstore -user TrustedPublisher "' + $cerPath + '"')

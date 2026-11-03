# Sign files with a code-signing certificate.
#
# Self-signed (default): uses the WordMaster certificate in your personal store.
#   powershell -ExecutionPolicy Bypass -File sign.ps1 -Path "dist\WordMaster-Setup-3.0.0.exe"
#
# CA-issued certificate: import the .pfx into your personal store first, then pass its thumbprint
# (recommended, keeps the password out of command lines):
#   powershell -ExecutionPolicy Bypass -File sign.ps1 -Path "dist\WordMaster-Setup-3.0.0.exe" -Thumbprint <THUMBPRINT>
# Or sign straight from a .pfx:
#   powershell -ExecutionPolicy Bypass -File sign.ps1 -Path "..." -PfxPath "C:\path\cert.pfx" -PfxPassword "******"
param(
  [Parameter(Mandatory = $true)][string[]]$Path,
  [string]$Thumbprint = '',
  [string]$PfxPath = '',
  [string]$PfxPassword = '',
  [string]$TimestampUrl = 'http://timestamp.digicert.com'
)
$ErrorActionPreference = 'Stop'

$signtool = Get-ChildItem 'C:\Program Files (x86)\Windows Kits\10\bin' -Recurse -Filter 'signtool.exe' -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -like '*\x64\signtool.exe' } |
  Sort-Object FullName -Descending |
  Select-Object -First 1
if (-not $signtool) { throw 'signtool.exe not found. Install the Windows SDK (Signing Tools).' }

if (-not $Thumbprint -and -not $PfxPath) {
  $cert = Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert -ErrorAction SilentlyContinue |
    Where-Object { $_.Subject -like '*WordMaster*' } |
    Select-Object -First 1
  if (-not $cert) { throw 'No signing certificate found. Run make-cert.ps1 first, or pass -PfxPath.' }
  $Thumbprint = $cert.Thumbprint
}

$signArgs = @('sign', '/fd', 'SHA256', '/tr', $TimestampUrl, '/td', 'SHA256')
if ($Thumbprint) {
  $signArgs += @('/sha1', $Thumbprint)
} else {
  $signArgs += @('/f', $PfxPath)
  if ($PfxPassword) { $signArgs += @('/p', $PfxPassword) }
}

foreach ($file in $Path) {
  if (-not (Test-Path $file)) { throw "File not found: $file" }
  $out = & $signtool.FullName @signArgs $file 2>&1
  if ($LASTEXITCODE -ne 0) { throw ("signtool failed for " + $file + ": " + ($out -join ' ')) }
  $sig = Get-AuthenticodeSignature $file
  Write-Host ("{0}  ->  {1}  ({2})" -f (Split-Path $file -Leaf), $sig.Status, $sig.SignerCertificate.Subject)
  if ($sig.Status -ne 'Valid') { throw ("signature not valid for " + $file + ": " + $sig.Status) }
}

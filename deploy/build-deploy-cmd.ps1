# Build WordIsle-OneClick-Deploy.cmd: embed deploy.ps1 as Base64 into a single .cmd
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$ps1 = Get-Content -LiteralPath (Join-Path $here 'deploy.ps1') -Raw -Encoding UTF8
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($ps1))
$cmd = @"
@echo off
chcp 65001 >nul
title WordIsle One-Click Deploy
powershell -NoProfile -ExecutionPolicy Bypass -Command "`$b=[IO.File]::ReadAllText('%~f0');`$i=`$b.LastIndexOf('::BASE64::');`$s=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String(`$b.Substring(`$i+10).Trim()));`$p=Join-Path `$env:TEMP 'WordIsle-OneClick-Deploy.ps1';[IO.File]::WriteAllText(`$p,`$s,(New-Object Text.UTF8Encoding `$true));& `$p -LauncherDir (Split-Path '%~f0' -Parent)"
echo.
pause
exit /b
::BASE64::
$b64
"@
$cmd = $cmd -replace "`r?`n", "`r`n"
$out = Join-Path $here 'WordIsle-OneClick-Deploy.cmd'
[IO.File]::WriteAllText($out, $cmd, (New-Object Text.UTF8Encoding $false))
Write-Output ("OK " + $out + " " + [math]::Round((Get-Item $out).Length/1KB,1) + " KB")

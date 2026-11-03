@echo off
chcp 65001 >nul
title WordMaster - trust self-signed certificate
cd /d "%~dp0"
echo Importing WordMaster self-signed code-signing certificate...
certutil -addstore -user Root "build-res\WordMaster-CodeSigning.cer"
certutil -addstore -user TrustedPublisher "build-res\WordMaster-CodeSigning.cer"
echo.
echo Done. The installer and app signed by this certificate will show a valid signature on this account.
echo Note: a self-signed certificate is only trusted on machines where you import it. For public releases buy a CA code-signing certificate.
pause

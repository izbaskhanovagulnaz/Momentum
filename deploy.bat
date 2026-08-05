@echo off
setlocal
cd /d "%~dp0"
title Momentum Universal Goals Deploy
echo [1/3] Installing dependencies...
call npm install --no-audit --no-fund
if errorlevel 1 goto failed
echo [2/3] Building...
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMddHHmmssfff"') do set BUILD_VERSION=%%i
echo {"version":"%BUILD_VERSION%"}> public\version.json
call npm run build
if errorlevel 1 goto failed
echo [3/3] Deploying to Firebase...
call npx firebase-tools deploy --only hosting,firestore:rules,firestore:indexes
if errorlevel 1 goto failed
echo.
echo DEPLOY COMPLETE
echo https://my-planner-5be93.web.app
pause
exit /b 0
:failed
echo.
echo DEPLOY FAILED. Send a screenshot of the first error above.
pause
exit /b 1

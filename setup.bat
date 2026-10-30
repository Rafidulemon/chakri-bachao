@echo off
echo Installing dependencies for Chakri Bachao...
call npm install
if errorlevel 1 (echo npm install failed. Is Node.js 20+ installed? & pause & exit /b 1)
if not exist .env copy .env.example .env >nul
echo Starting the game at http://localhost:5173 ...
call npm run dev

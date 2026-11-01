@echo off
title Lanzador AuraGrid
echo ========================================================
echo    AuraGrid // Next-Gen Bento Desktop HUD & Ecosystem
echo ========================================================

echo Cerrando instancias anteriores...
taskkill /F /IM AuraGrid.exe >nul 2>&1
taskkill /F /IM CubeWorld.exe >nul 2>&1

if exist "%~dp0dist\CubeWorld-win32-x64\AuraGrid.exe" (
    echo Iniciando ejecutable nativo AuraGrid...
    start "" "%~dp0dist\CubeWorld-win32-x64\AuraGrid.exe"
    exit /b 0
)

if exist "%~dp0dist\CubeWorld-win32-x64\CubeWorld.exe" (
    echo Iniciando ejecutable nativo...
    start "" "%~dp0dist\CubeWorld-win32-x64\CubeWorld.exe"
    exit /b 0
)

if exist "%~dp0AuraGrid.exe" (
    echo Iniciando ejecutable local AuraGrid...
    start "" "%~dp0AuraGrid.exe"
    exit /b 0
)

echo Buscando runtime de Electron / Node.js...
where electron >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Iniciando mediante Electron...
    start "" electron "%~dp0."
    exit /b 0
)

where npx >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Iniciando mediante npx electron...
    start "" npx electron "%~dp0."
    exit /b 0
)

echo.
echo [INFO] Para ejecutar AuraGrid desde el codigo fuente se requiere Node.js (v18+).
echo 1. Descarga el paquete portable .zip listo para usar desde:
echo    https://github.com/AceRevo/AuraGrid/releases
echo 2. O instala Node.js (https://nodejs.org) y ejecuta 'npm start'.
echo.
pause
exit /b 1

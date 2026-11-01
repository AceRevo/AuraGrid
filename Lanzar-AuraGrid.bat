@echo off
title Lanzador AuraGrid
echo Cerrando instancias anteriores...
taskkill /F /IM AuraGrid.exe >nul 2>&1
taskkill /F /IM CubeWorld.exe >nul 2>&1
taskkill /F /IM electron.exe >nul 2>&1

echo Iniciando AuraGrid Desktop System (Version Nativa DirectComposition)...
start "" "%~dp0dist\CubeWorld-win32-x64\CubeWorld.exe"
exit /b 0

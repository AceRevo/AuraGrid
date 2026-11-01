@echo off
title Lanzador CubeWorld
echo Cerrando instancias anteriores...
taskkill /F /IM CubeWidgets.exe >nul 2>&1
taskkill /F /IM CubeWorld.exe >nul 2>&1
taskkill /F /IM electron.exe >nul 2>&1

echo Iniciando CubeWorld Desktop System (Version Nativa DirectComposition)...
start "" "%~dp0dist\CubeWorld-win32-x64\CubeWorld.exe"
exit /b 0

@echo off
title Project Tracking Tool (PTT)
echo ========================================================
echo   Launching Project Tracking Tool (PTT)...
echo ========================================================
echo.

where electron >nul 2>nul
if %errorlevel% equ 0 (
  npm run electron
) else (
  npm run electron:dev
)

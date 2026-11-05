@echo off
title Server Localhost SDIT ANNISA
echo ======================================================
echo    Menjalankan Server Localhost SDIT ANNISA (Port 8080)
echo ======================================================
echo Buka di browser: http://localhost:8080
echo Tekan Ctrl+C untuk menghentikan server.
echo.
C:\newappraporsd2025\php\php.exe -S 127.0.0.1:8080 -t "%~dp0"
pause


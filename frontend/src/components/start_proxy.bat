@echo off
REM Windows batch script om CORS proxy te starten

echo ========================================
echo   PBL CORS Proxy Server
echo ========================================
echo.

REM Check of Python geinstalleerd is
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is niet gevonden!
    echo.
    echo Installeer Python van: https://www.python.org/downloads/
    echo Of gebruik: py cors_proxy.py
    pause
    exit /b 1
)

echo Python gevonden!
echo.

REM Installeer dependencies als nodig
echo Controleren dependencies...
python -m pip install flask flask-cors requests --quiet
if errorlevel 1 (
    echo.
    echo WARNING: Kon niet alle dependencies installeren
    echo Probeer handmatig: pip install flask flask-cors requests
    echo.
)

echo.
echo Starting proxy server...
echo.
echo ========================================
echo   Server beschikbaar op:
echo   http://localhost:5001
echo.
echo   Test met:
echo   http://localhost:5001/health
echo ========================================
echo.

REM Start de proxy
python cors_proxy.py

pause
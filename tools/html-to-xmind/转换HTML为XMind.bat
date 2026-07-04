@echo off
chcp 65001 >nul
setlocal

rem === HTML -> XMind converter (standalone) ===
rem Usage:
rem   - Drag one or more .html files onto this .bat
rem   - Or double-click it to convert every .html in this folder

set "SCRIPT_DIR=%~dp0"

where py >nul 2>nul
if %errorlevel%==0 (
    set "PY=py"
) else (
    where python >nul 2>nul
    if %errorlevel%==0 (
        set "PY=python"
    ) else (
        echo [ERROR] Python not found. Install it from https://www.python.org/ and check "Add to PATH".
        pause
        exit /b 1
    )
)

%PY% "%SCRIPT_DIR%html2xmind.py" %*

echo.
pause
endlocal

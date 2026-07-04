@echo off
chcp 65001 >nul
setlocal

rem === XMind -> HTML viewer converter (standalone) ===
rem Usage:
rem   - Drag one or more .xmind files onto this .bat
rem   - Or double-click it to convert every .xmind in this folder

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

%PY% "%SCRIPT_DIR%xmind2html.py" %*

echo.
pause
endlocal

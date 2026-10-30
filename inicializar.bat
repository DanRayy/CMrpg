@echo off
setlocal
chcp 65001 >nul 2>&1
cd /d "%~dp0"
call "%~dp0iniciar_servidor.bat" %*
if %errorlevel% neq 0 (
    echo.
    echo O processo encerrou com erro (codigo %errorlevel%).
    pause
)

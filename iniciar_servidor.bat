@echo off
chcp 65001 >nul
cd /d "%~dp0"
title CMrpg - Servidor Local

where python >nul 2>&1
if errorlevel 1 (
    echo ============================================================
    echo [ERRO] Python nao foi encontrado no sistema!
    echo Instale o Python 3.10+ e marque a opcao "Add Python to PATH".
    echo Download: https://www.python.org/downloads/
    echo ============================================================
    pause
    exit /b 1
)

python launcher.py %*
if errorlevel 1 (
    echo.
    echo O inicializador encerrou com erro.
    pause
)

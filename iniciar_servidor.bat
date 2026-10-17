@echo off
chcp 65001 >nul 2>&1
title CMrpg - Servidor Local (Radmin VPN)
cd /d "%~dp0"

echo ============================================================
echo               CMrpg - Inicializador do Servidor
echo ============================================================
echo.

:: 1. Verificar regra do Firewall do Windows ("CMrpg Server")
echo [1/4] Verificando regra "CMrpg Server" no Firewall do Windows...
netsh advfirewall firewall show rule name="CMrpg Server" >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Regra nao encontrada. Solicitando permissao de Administrador ^(UAC^) para liberar a porta 8000...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process netsh -ArgumentList 'advfirewall firewall add rule name=\"CMrpg Server\" dir=in action=allow protocol=TCP localport=8000 profile=any' -Verb RunAs -Wait"
    netsh advfirewall firewall show rule name="CMrpg Server" >nul 2>&1
    if %errorlevel% equ 0 (
        echo [OK] Porta 8000 liberada com sucesso no Firewall ^(profile=any^).
    ) else (
        echo [AVISO] Nao foi possivel confirmar a regra do Firewall. Caso os jogadores nao consigam conectar, execute este script como Administrador.
    )
) else (
    echo [OK] Regra "CMrpg Server" ja configurada no Firewall.
)
echo.

:: 2. Verificar/Criar ambiente virtual Python (venv)
echo [2/4] Verificando ambiente virtual Python ^(venv^)...
if not exist "venv\Scripts\activate.bat" (
    echo Criando ambiente virtual venv...
    python -m venv venv
    if %errorlevel% neq 0 (
        echo [ERRO] Falha ao criar o ambiente virtual. Verifique se o Python 3.10+ esta instalado e no PATH.
        pause
        exit /b 1
    )
    echo [OK] Ambiente virtual criado com sucesso.
) else (
    echo [OK] Ambiente virtual encontrado.
)
echo.

:: 3. Ativar venv e instalar/atualizar dependencias
echo [3/4] Ativando venv e verificando dependencias ^(requirements.txt^)...
call "venv\Scripts\activate.bat"
python -m pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao instalar dependencias do requirements.txt.
    pause
    exit /b 1
)
echo [OK] Dependencias instaladas e atualizadas.
echo.

:: 4. Exibir enderecos IPv4 (destacando Radmin VPN 26.x.x.x) e iniciar Uvicorn
echo ============================================================
echo                 ENDERECOS IP DA SUA MAQUINA
echo ============================================================
ipconfig | findstr /i "IPv4"
echo ------------------------------------------------------------
echo DICA RADMIN VPN: Procure pelo IP iniciado em 26.x.x.x acima!
echo Envie para os jogadores o link:
echo.
echo     http://SEU_IP_RADMIN:8000
echo     ^(Exemplo: http://26.10.20.30:8000^)
echo.
echo Acesso local do Mestre: http://localhost:8000
echo ============================================================
echo.

echo [4/4] Abrindo navegador em http://localhost:8000 e iniciando Uvicorn...
start "" "http://localhost:8000"

uvicorn main:app --host 0.0.0.0 --port 8000
pause

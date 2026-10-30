@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul 2>&1
title CMrpg - Servidor Local (Radmin VPN)
cd /d "%~dp0"

:: ============================================================
:: 0. MENU INICIAL E ESCOLHA DE INICIALIZACAO
:: ============================================================
set "MENU_CHOICE=1"

if exist "%~dp0scripts\launcher_menu.ps1" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\launcher_menu.ps1"
    if !errorlevel! equ 2 (
        set "MENU_CHOICE=2"
    ) else (
        set "MENU_CHOICE=1"
    )
) else (
    echo ============================================================
    echo                CMrpg - Inicializador do Servidor            
    echo ============================================================
    echo.
    echo   [1] Iniciar Servidor (Direto)
    echo   [2] Instalar atualizacoes do GitHub e iniciar
    echo.
    echo ============================================================
    where choice >nul 2>&1
    if !errorlevel! equ 0 (
        choice /c 12 /n /t 5 /d 1 /m "Escolha uma opcao [1 ou 2] (Auto-iniciar em 5s): "
        if !errorlevel! equ 2 set "MENU_CHOICE=2"
    ) else (
        set /p "MENU_CHOICE=Escolha uma opcao [1 ou 2] (Padrao 1): "
        if not "!MENU_CHOICE!"=="2" set "MENU_CHOICE=1"
    )
)

echo.
echo ============================================================
echo                CMrpg - Inicializador do Servidor            
echo ============================================================
echo.

if "!MENU_CHOICE!"=="1" (
    echo [1/5] Iniciando direto ^(atualizacao ignorada pelo usuario^)...
    goto :after_update
)

:: ============================================================
:: 1. BAIXAR E INSTALAR ATUALIZACOES DO GITHUB
:: ============================================================
echo [1/5] Buscando e instalando atualizacoes do GitHub...

where git >nul 2>&1
if %errorlevel% neq 0 goto :no_git
if not exist .git goto :no_git

echo [i] Conectando ao repositorio remoto via Git...
git -c http.timeout=5 fetch --all --tags >nul 2>&1
if %errorlevel% neq 0 (
    echo [AVISO] Nao foi possivel conectar ao GitHub ^(offline ou tempo esgotado^). Continuando com a versao local...
    goto :after_update
)

:: Backup preventivo do state.json antes do git pull
if exist "state.json" copy /y "state.json" "state.backup.json" >nul 2>&1

echo [!] Baixando e aplicando atualizacoes da branch principal...
git pull origin main
if %errorlevel% equ 0 (
    echo [OK] Arquivos atualizados com sucesso!
) else (
    echo [AVISO] Conflito local detectado. Sincronizando arquivos do sistema preservando dados...
    git fetch origin main >nul 2>&1
    git checkout origin/main -- static main.py rules_engine.py requirements.txt >nul 2>&1
    echo [OK] Arquivos principais sincronizados.
)

if exist "state.backup.json" (
    if not exist "state.json" copy /y "state.backup.json" "state.json" >nul 2>&1
    del /q "state.backup.json" >nul 2>&1
)
goto :after_update

:no_git
echo [i] Git nao detectado ou pasta sem .git. Baixando atualizacoes via PowerShell...
powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; try { Write-Host '[i] Baixando pacote mais recente do GitHub...'; Invoke-WebRequest -Uri 'https://github.com/DanRayy/CMrpg/archive/refs/heads/main.zip' -OutFile 'update.zip' -TimeoutSec 20; Expand-Archive -Path 'update.zip' -DestinationPath 'update_temp' -Force; Get-ChildItem -Path 'update_temp\CMrpg-main\*' | ForEach-Object { if ($_.Name -ne 'state.json' -and $_.Name -ne '.git') { Copy-Item -Path $_.FullName -Destination '.' -Recurse -Force } }; Remove-Item -Path 'update_temp','update.zip' -Recurse -Force; Write-Host '[OK] Arquivos atualizados com sucesso via GitHub!' } catch { Write-Host ('[AVISO] Falha ao atualizar via GitHub (' + $_.Exception.Message + '). Continuando com versao local...') }"

:after_update
echo.

:: ============================================================
:: 2. VERIFICAR REGRA DO FIREWALL DO WINDOWS ("CMrpg Server")
:: ============================================================
echo [2/5] Verificando regra "CMrpg Server" no Firewall do Windows...
netsh advfirewall firewall show rule name="CMrpg Server" >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Regra nao encontrada. Solicitando permissao de Administrador ^(UAC^) para liberar a porta 8000...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process netsh -ArgumentList 'advfirewall firewall add rule name=\"CMrpg Server\" dir=in action=allow protocol=TCP localport=8000 profile=any' -Verb RunAs -Wait" >nul 2>&1
    netsh advfirewall firewall show rule name="CMrpg Server" >nul 2>&1
    if %errorlevel% equ 0 (
        echo [OK] Porta 8000 liberada com sucesso no Firewall ^(profile=any^).
    ) else (
        echo [AVISO] Nao foi possivel confirmar a regra do Firewall. Execute como Administrador se necessario.
    )
) else (
    echo [OK] Regra "CMrpg Server" ja configurada no Firewall.
)
echo.

:: ============================================================
:: 3. VERIFICAR / CRIAR AMBIENTE VIRTUAL PYTHON (venv)
:: ============================================================
echo [3/5] Verificando ambiente virtual Python ^(venv^)...

set "PYTHON_CMD="
where python >nul 2>&1 && set "PYTHON_CMD=python"
if not defined PYTHON_CMD (
    where py >nul 2>&1 && set "PYTHON_CMD=py"
)

if not defined PYTHON_CMD (
    echo.
    echo ============================================================
    echo [ERRO] Python nao foi encontrado no sistema!
    echo ============================================================
    echo Baixe e instale o Python 3.10+ em: https://www.python.org/
    echo IMPORTANTE: Marque a opcao "Add python.exe to PATH" durante a instalacao!
    echo.
    pause
    exit /b 1
)

if not exist "venv\Scripts\activate.bat" (
    echo Criando ambiente virtual venv...
    !PYTHON_CMD! -m venv venv
    if %errorlevel% neq 0 (
        echo.
        echo [ERRO] Falha ao criar o ambiente virtual venv.
        pause
        exit /b 1
    )
    echo [OK] Ambiente virtual criado com sucesso.
) else (
    echo [OK] Ambiente virtual encontrado.
)
echo.

:: ============================================================
:: 4. ATIVAR VENV E INSTALAR / ATUALIZAR DEPENDENCIAS
:: ============================================================
echo [4/5] Ativando venv e verificando dependencias...
call "venv\Scripts\activate.bat"
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao ativar ambiente virtual em venv\Scripts\activate.bat.
    pause
    exit /b 1
)

set "DEPS_OK=0"
if "!MENU_CHOICE!"=="1" (
    python -c "import fastapi, uvicorn" >nul 2>&1
    if !errorlevel! equ 0 set "DEPS_OK=1"
)

if "!DEPS_OK!"=="1" (
    echo [OK] Dependencias essenciais verificadas ^(inicializacao rapida^).
) else (
    echo [i] Instalando/atualizando pacotes ^(requirements.txt^)...
    python -m pip install --upgrade pip --quiet
    pip install -r requirements.txt --quiet
    if !errorlevel! neq 0 (
        echo [AVISO] Falha na atualizacao via pip. Tentando prosseguir com pacotes locais...
    ) else (
        echo [OK] Dependencias instaladas e atualizadas.
    )
)
echo.

:: ============================================================
:: 5. EXIBIR ENDERECOS IPV4 E INICIAR SERVIDOR UVICORN
:: ============================================================
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

echo [5/5] Abrindo navegador em http://localhost:8000 e iniciando Uvicorn...
start "" "http://localhost:8000"

python -m uvicorn main:app --host 0.0.0.0 --port 8000
if %errorlevel% neq 0 (
    echo.
    echo ============================================================
    echo [ERRO] O servidor encerrou inesperadamente ^(codigo %errorlevel%^).
    echo Possiveis causas:
    echo  - A porta 8000 ja pode estar aberta em outra janela.
    echo  - Erro na inicializacao ^(verifique as mensagens acima^).
    echo ============================================================
    pause
    exit /b %errorlevel%
)

pause

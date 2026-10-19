@echo off
chcp 65001 >nul 2>&1
title CMrpg - Servidor Local (Radmin VPN)
cd /d "%~dp0"

echo ============================================================
echo               CMrpg - Inicializador do Servidor
echo ============================================================
echo.

:: 1. Verificar e baixar atualizacoes do GitHub (apenas arquivos alterados)
echo [1/5] Verificando atualizacoes no GitHub ^(DanRayy/CMrpg^)...
if "%~1"=="--no-update" (
    echo [i] Verificacao de atualizacoes ignorada ^(--no-update^).
    goto :after_update
)

where git >nul 2>&1
if %errorlevel% neq 0 goto :no_git
if not exist .git goto :no_git

echo [i] Conectando ao repositorio remoto via Git...
git -c http.timeout=5 fetch origin main >nul 2>&1
if %errorlevel% neq 0 (
    echo [AVISO] Nao foi possivel conectar ao GitHub ^(offline ou tempo esgotado^). Continuando com a versao local...
    goto :after_update
)

set "LOCAL_HASH="
set "REMOTE_HASH="
for /f %%a in ('git rev-parse HEAD 2^>nul') do set "LOCAL_HASH=%%a"
for /f %%b in ('git rev-parse origin/main 2^>nul') do set "REMOTE_HASH=%%b"

if not defined LOCAL_HASH goto :no_git
if not defined REMOTE_HASH goto :no_git

if not "%LOCAL_HASH%"=="%REMOTE_HASH%" (
    echo [!] Novas atualizacoes encontradas no GitHub!
    echo [!] Baixando e substituindo apenas os arquivos alterados...
    git pull origin main
    if %errorlevel% equ 0 (
        echo [OK] Arquivos atualizados com sucesso para a versao mais recente.
    ) else (
        echo [AVISO] Nao foi possivel mesclar automaticamente. Mantendo arquivos locais.
    )
) else (
    echo [OK] O CMrpg ja esta na versao mais recente do GitHub.
)
goto :after_update

:no_git
echo [i] Git nao detectado ou pasta sem .git. Verificando atualizacoes via Python...
python -c "import urllib.request, json, os; repo = 'DanRayy/CMrpg'; ver_file = '.github_version'; url = f'https://api.github.com/repos/{repo}/commits/main'; req = urllib.request.Request(url, headers={'User-Agent': 'CMrpg-Launcher'}); exec(\"try:\n    with urllib.request.urlopen(req, timeout=5) as resp:\n        data = json.loads(resp.read().decode('utf-8'))\n    remote_sha = data.get('sha', '')\n    local_sha = ''\n    if os.path.exists(ver_file):\n        with open(ver_file, 'r', encoding='utf-8') as f: local_sha = f.read().strip()\n    if local_sha != remote_sha:\n        print(f'[!] Nova versao encontrada ({remote_sha[:7]}). Baixando arquivos alterados...')\n        for f_info in data.get('files', []):\n            fname = f_info.get('filename')\n            if not fname or fname == 'state.json': continue\n            raw_url = f'https://raw.githubusercontent.com/{repo}/main/{fname}'\n            print(f' -> Atualizando: {fname}')\n            os.makedirs(os.path.dirname(fname) or '.', exist_ok=True)\n            with urllib.request.urlopen(urllib.request.Request(raw_url, headers={'User-Agent': 'CMrpg-Launcher'}), timeout=10) as in_f, open(fname, 'wb') as out_f:\n                out_f.write(in_f.read())\n        with open(ver_file, 'w', encoding='utf-8') as f: f.write(remote_sha)\n        print('[OK] Arquivos atualizados com sucesso via GitHub.')\n    else:\n        print(f'[OK] O CMrpg ja esta na versao mais recente ({remote_sha[:7]}).')\nexcept Exception as e:\n    print(f'[AVISO] Nao foi possivel verificar atualizacoes no GitHub ({e}). Continuando com versao local...')\")" 2>nul

:after_update
echo.

:: 2. Verificar regra do Firewall do Windows ("CMrpg Server")
echo [2/5] Verificando regra "CMrpg Server" no Firewall do Windows...
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

:: 3. Verificar/Criar ambiente virtual Python (venv)
echo [3/5] Verificando ambiente virtual Python ^(venv^)...
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

:: 4. Ativar venv e instalar/atualizar dependencias
echo [4/5] Ativando venv e verificando dependencias ^(requirements.txt^)...
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

:: 5. Exibir enderecos IPv4 (destacando Radmin VPN 26.x.x.x) e iniciar Uvicorn
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

uvicorn main:app --host 0.0.0.0 --port 8000
pause

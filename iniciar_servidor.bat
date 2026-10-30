@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul 2>&1
title CMrpg - Servidor Local (Radmin VPN)
cd /d "%~dp0"

:: ============================================================
:: 0. VERIFICAR ULTIMA RELEASE NO GITHUB
:: ============================================================
set "MENU_CHOICE=1"
set "LATEST_RELEASE=Verificando..."

for /f "usebackq tokens=1,2 delims=|" %%A in (`powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ErrorActionPreference = 'SilentlyContinue';" ^
    "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12;" ^
    "$repo = 'DanRayy/CMrpg';" ^
    "$headers = @{ 'User-Agent' = 'CMrpg-Launcher' };" ^
    "$latest = $null;" ^
    "try { $rel = Invoke-RestMethod -Uri \"https://api.github.com/repos/$repo/releases/latest\" -Headers $headers -TimeoutSec 5; $latest = $rel.tag_name } catch {}" ^
    "if (-not $latest) { try { $tags = Invoke-RestMethod -Uri \"https://api.github.com/repos/$repo/tags\" -Headers $headers -TimeoutSec 5; if ($tags -and $tags.Count -gt 0) { $latest = $tags[0].name } } catch {} }" ^
    "if (-not $latest) { $latest = 'Indisponivel (Offline ou sem Release)' };" ^
    "$options = @('Iniciar', \"Instalar atualizacoes e iniciar [Ultima Release no GitHub: $latest]\");" ^
    "$selected = 0;" ^
    "[Console]::CursorVisible = $false;" ^
    "while ($true) {" ^
    "    Clear-Host;" ^
    "    Write-Host '============================================================' -ForegroundColor DarkYellow;" ^
    "    Write-Host '               CMrpg - Inicializador do Servidor            ' -ForegroundColor Yellow;" ^
    "    Write-Host '============================================================' -ForegroundColor DarkYellow;" ^
    "    Write-Host '';" ^
    "    Write-Host '  Use as setas [CIMA / BAIXO] para navegar e [ENTER] para confirmar:' -ForegroundColor Gray;" ^
    "    Write-Host '';" ^
    "    for ($i = 0; $i -lt $options.Count; $i++) {" ^
    "        if ($i -eq $selected) {" ^
    "            Write-Host \"  > $($options[$i])  \" -ForegroundColor Black -BackgroundColor Yellow;" ^
    "        } else {" ^
    "            Write-Host \"    $($options[$i])  \" -ForegroundColor White;" ^
    "        }" ^
    "    }" ^
    "    Write-Host '';" ^
    "    Write-Host '============================================================' -ForegroundColor DarkYellow;" ^
    "    $key = [Console]::ReadKey($true).Key;" ^
    "    if ($key -eq 'UpArrow') { if ($selected -gt 0) { $selected-- } else { $selected = $options.Count - 1 } }" ^
    "    elseif ($key -eq 'DownArrow') { if ($selected -lt ($options.Count - 1)) { $selected++ } else { $selected = 0 } }" ^
    "    elseif ($key -eq 'Enter') { break }" ^
    "}" ^
    "[Console]::CursorVisible = $true;" ^
    "Clear-Host;" ^
    "[Console]::Out.WriteLine(\"$($selected + 1)|$latest\");"`) do (
    set "MENU_CHOICE=%%A"
    set "LATEST_RELEASE=%%B"
)

echo ============================================================
echo                CMrpg - Inicializador do Servidor
echo ============================================================
echo.

if "%MENU_CHOICE%"=="1" (
    echo [1/5] Iniciando direto ^(atualizacao ignorada pelo usuario^)...
    goto :after_update
)

:: ============================================================
:: 1. BAIXAR E INSTALAR ATUALIZACOES DO GITHUB
:: ============================================================
echo [1/5] Buscando e instalando atualizacoes do GitHub ^(Ultima Release: %LATEST_RELEASE%^)...

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
echo [i] Git nao detectado ou pasta sem .git. Baixando atualizacoes via Python...
python -c "import urllib.request, json, os, zipfile, io, shutil; repo = 'DanRayy/CMrpg'; headers = {'User-Agent': 'CMrpg-Launcher'}; url = f'https://api.github.com/repos/{repo}/zipball/main'; req = urllib.request.Request(url, headers=headers); exec(\"try:\n    print('[i] Baixando pacote mais recente do GitHub...')\n    with urllib.request.urlopen(req, timeout=15) as resp:\n        z = zipfile.ZipFile(io.BytesIO(resp.read()))\n        root_dir = z.namelist()[0].split('/')[0]\n        for member in z.namelist():\n            rel_path = member[len(root_dir)+1:]\n            if not rel_path or rel_path == 'state.json' or rel_path.startswith('.git'): continue\n            if member.endswith('/'):\n                os.makedirs(rel_path, exist_ok=True)\n            else:\n                os.makedirs(os.path.dirname(rel_path) or '.', exist_ok=True)\n                with z.open(member) as src, open(rel_path, 'wb') as dst:\n                    shutil.copyfileobj(src, dst)\n    print('[OK] Todos os arquivos foram atualizados com sucesso via GitHub!')\nexcept Exception as e:\n    print(f'[AVISO] Falha ao atualizar via GitHub ({e}). Continuando com versao local...')\")"

:after_update
echo.

:: ============================================================
:: 2. VERIFICAR REGRA DO FIREWALL DO WINDOWS ("CMrpg Server")
:: ============================================================
echo [2/5] Verificando regra "CMrpg Server" no Firewall do Windows...
netsh advfirewall firewall show rule name="CMrpg Server" >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Regra nao encontrada. Solicitando permissao de Administrador ^(UAC^) para liberar a porta 8000...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process netsh -ArgumentList 'advfirewall firewall add rule name=\"CMrpg Server\" dir=in action=allow protocol=TCP localport=8000 profile=any' -Verb RunAs -Wait"
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

:: ============================================================
:: 4. ATIVAR VENV E INSTALAR / ATUALIZAR DEPENDENCIAS
:: ============================================================
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

uvicorn main:app --host 0.0.0.0 --port 8000
pause

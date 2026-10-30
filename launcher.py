#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CMrpg - Inicializador do Servidor e Auto-Update
Desenvolvido com a Standard Library do Python (sem dependencias externas).
"""

import os
import sys
import json
import urllib.request
import zipfile
import io
import shutil
import subprocess
import webbrowser
import time

if os.name == "nt":
    import msvcrt
    import ctypes

# ---------------------------------------------------------------------------
# Cores e Estilos ANSI
# ---------------------------------------------------------------------------
RESET = "\033[0m"
BOLD = "\033[1m"
DIM = "\033[2m"
YELLOW = "\033[93m"
DARK_YELLOW = "\033[33m"
GREEN = "\033[92m"
CYAN = "\033[96m"
WHITE = "\033[97m"
RED = "\033[91m"
GRAY = "\033[90m"
SELECTED_BG = "\033[30;43m\033[1m"


def setup_console():
    """Habilita o suporte a sequencias ANSI e define o titulo no console do Windows."""
    if os.name == "nt":
        os.system("")
        try:
            kernel32 = ctypes.windll.kernel32
            h_out = kernel32.GetStdHandle(-11)  # STD_OUTPUT_HANDLE
            mode = ctypes.c_ulong()
            kernel32.GetConsoleMode(h_out, ctypes.byref(mode))
            kernel32.SetConsoleMode(h_out, mode.value | 0x0004)  # ENABLE_VIRTUAL_TERMINAL_PROCESSING
        except Exception:
            pass
        try:
            ctypes.windll.kernel32.SetConsoleTitleW("CMrpg - Servidor Local (Radmin VPN)")
        except Exception:
            pass


def get_latest_github_release(repo="DanRayy/CMrpg", timeout=5):
    """Consulta a API do GitHub e extrai apenas a tag da ultima versao disponivel."""
    headers = {"User-Agent": "CMrpg-Launcher"}

    # 1. Tentar endpoint de releases/latest
    try:
        url = f"https://api.github.com/repos/{repo}/releases/latest"
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            tag = data.get("tag_name")
            if tag:
                return str(tag)
    except Exception:
        pass

    # 2. Fallback para tags
    try:
        url = f"https://api.github.com/repos/{repo}/tags"
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            tags = json.loads(resp.read().decode("utf-8"))
            if isinstance(tags, list) and len(tags) > 0:
                tag = tags[0].get("name")
                if tag:
                    return str(tag)
    except Exception:
        pass

    return "Indisponivel (Offline ou sem Release)"


def render_menu(options, selected_index):
    """Renderiza a interface do menu interativo no terminal com ANSI."""
    sys.stdout.write("\033[2J\033[H")
    banner = f"""{DARK_YELLOW}============================================================{RESET}
{YELLOW}{BOLD}               CMrpg - Inicializador do Servidor            {RESET}
{DARK_YELLOW}============================================================{RESET}

{GRAY}  Use as setas [CIMA / BAIXO] para navegar e [ENTER] para confirmar:{RESET}
"""
    sys.stdout.write(banner + "\n")
    for i, opt in enumerate(options):
        if i == selected_index:
            sys.stdout.write(f"  {SELECTED_BG}  > {opt}  {RESET}\n")
        else:
            sys.stdout.write(f"    {WHITE}{opt}  {RESET}\n")
    sys.stdout.write(f"\n{DARK_YELLOW}============================================================{RESET}\n")
    sys.stdout.flush()


def select_menu_option(latest_release):
    """Gerencia a navegacao interativa pelas setas (msvcrt) e teclas numericas."""
    options = [
        "Iniciar",
        f"Instalar atualizacoes e iniciar [Ultima Release no GitHub: {latest_release}]",
    ]

    # Fallback caso a entrada nao seja um TTY interativo
    if not sys.stdin.isatty() or os.name != "nt":
        return 0

    selected = 0
    sys.stdout.write("\033[?25l")  # Oculta cursor
    sys.stdout.flush()

    try:
        while True:
            render_menu(options, selected)
            try:
                key = msvcrt.getch()
            except Exception:
                break

            if key in (b"\x00", b"\xe0"):
                key2 = msvcrt.getch()
                if key2 == b"H":  # Seta para cima
                    selected = (selected - 1) if selected > 0 else (len(options) - 1)
                elif key2 == b"P":  # Seta para baixo
                    selected = (selected + 1) if selected < (len(options) - 1) else 0
            elif key in (b"\r", b"\n"):  # Enter
                break
            elif key == b"1":
                selected = 0
                break
            elif key == b"2":
                selected = 1
                break
            elif key == b"\x03":  # Ctrl+C
                sys.exit(0)
    finally:
        sys.stdout.write("\033[?25h")  # Restaura cursor
        sys.stdout.flush()

    sys.stdout.write("\033[2J\033[H")
    sys.stdout.flush()
    return selected


def update_project(root_dir, repo="DanRayy/CMrpg"):
    """
    Atualiza os arquivos do projeto via Git ou Zipball da API do GitHub,
    garantindo protecao absoluta do state.json local.
    """
    print(f"{CYAN}[1/5] Preparando atualizacao de arquivos do GitHub...{RESET}")

    # 1. Protecao absoluta do state.json
    state_path = os.path.join(root_dir, "state.json")
    state_backup = None
    if os.path.exists(state_path):
        try:
            with open(state_path, "rb") as f:
                state_backup = f.read()
            # Backup preventivo em disco
            with open(os.path.join(root_dir, "state.backup.json"), "wb") as f:
                f.write(state_backup)
        except Exception as e:
            print(f"{YELLOW}[AVISO] Nao foi possivel criar backup preventivo do state.json: {e}{RESET}")

    updated = False
    has_git = os.path.isdir(os.path.join(root_dir, ".git")) and (shutil.which("git") is not None)

    # 2. Tentativa via Git
    if has_git:
        print(f"{CYAN}[i] Conectando ao repositorio remoto via Git...{RESET}")
        try:
            fetch_res = subprocess.run(
                ["git", "-c", "http.timeout=5", "fetch", "--all", "--tags"],
                cwd=root_dir,
                capture_output=True,
                text=True,
            )
            if fetch_res.returncode == 0:
                pull_res = subprocess.run(
                    ["git", "pull", "origin", "main"],
                    cwd=root_dir,
                    capture_output=True,
                    text=True,
                )
                if pull_res.returncode == 0:
                    print(f"{GREEN}[OK] Arquivos atualizados com sucesso via Git!{RESET}")
                    updated = True
                else:
                    print(f"{YELLOW}[AVISO] Conflito detectado no pull. Sincronizando arquivos do sistema...{RESET}")
                    co_res = subprocess.run(
                        ["git", "checkout", "origin/main", "--", "static", "main.py", "rules_engine.py", "requirements.txt", "iniciar_servidor.bat", "launcher.py"],
                        cwd=root_dir,
                        capture_output=True,
                        text=True,
                    )
                    if co_res.returncode == 0:
                        print(f"{GREEN}[OK] Arquivos principais sincronizados com a branch main.{RESET}")
                        updated = True
        except Exception as e:
            print(f"{YELLOW}[AVISO] Falha ao atualizar via Git ({e}). Tentando download direto...{RESET}")

    # 3. Fallback: Download direto do Zipball via GitHub API
    if not updated:
        print(f"{CYAN}[i] Baixando pacote mais recente do GitHub (zipball/main)...{RESET}")
        try:
            url = f"https://api.github.com/repos/{repo}/zipball/main"
            req = urllib.request.Request(url, headers={"User-Agent": "CMrpg-Launcher"})
            with urllib.request.urlopen(req, timeout=20) as resp:
                z = zipfile.ZipFile(io.BytesIO(resp.read()))
                root_in_zip = z.namelist()[0].split("/")[0]

                for member in z.namelist():
                    rel = member[len(root_in_zip) + 1 :]
                    if not rel or rel == "state.json" or rel.startswith(".git") or rel.startswith("venv"):
                        continue
                    if member.endswith("/"):
                        os.makedirs(os.path.join(root_dir, rel), exist_ok=True)
                    else:
                        dest = os.path.join(root_dir, rel)
                        os.makedirs(os.path.dirname(dest) or ".", exist_ok=True)
                        with z.open(member) as src, open(dest, "wb") as dst:
                            shutil.copyfileobj(src, dst)
            print(f"{GREEN}[OK] Arquivos atualizados com sucesso via pacote do GitHub!{RESET}")
            updated = True
        except Exception as e:
            print(f"{YELLOW}[AVISO] Nao foi possivel baixar pacote do GitHub ({e}). Continuando com versao local...{RESET}")

    # 4. Assegurar restauracao intacta do state.json
    if state_backup is not None:
        try:
            with open(state_path, "wb") as f:
                f.write(state_backup)
        except Exception as e:
            print(f"{RED}[ERRO] Falha ao restaurar state.json da memoria: {e}{RESET}")

    # Limpeza do arquivo temporario de backup
    temp_backup = os.path.join(root_dir, "state.backup.json")
    if os.path.exists(temp_backup):
        try:
            os.remove(temp_backup)
        except Exception:
            pass


def check_and_configure_firewall():
    """Verifica e solicita liberacao da porta 8000 no Firewall do Windows caso necessario."""
    print(f"\n{CYAN}[2/5] Verificando regra 'CMrpg Server' no Firewall do Windows...{RESET}")
    try:
        check = subprocess.run(
            ["netsh", "advfirewall", "firewall", "show", "rule", "name=CMrpg Server"],
            capture_output=True,
            text=True,
        )
        if check.returncode != 0:
            print(f"{YELLOW}[!] Regra nao encontrada. Solicitando permissao de Administrador (UAC) para liberar porta 8000...{RESET}")
            ps_script = (
                "Start-Process netsh -ArgumentList 'advfirewall firewall add rule "
                "name=\"CMrpg Server\" dir=in action=allow protocol=TCP localport=8000 profile=any' "
                "-Verb RunAs -Wait"
            )
            subprocess.run(
                ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps_script],
                capture_output=True,
            )
            check_again = subprocess.run(
                ["netsh", "advfirewall", "firewall", "show", "rule", "name=CMrpg Server"],
                capture_output=True,
                text=True,
            )
            if check_again.returncode == 0:
                print(f"{GREEN}[OK] Porta 8000 liberada com sucesso no Firewall.{RESET}")
            else:
                print(f"{YELLOW}[AVISO] Nao foi possivel confirmar a regra do Firewall. Execute como Administrador se necessario.{RESET}")
        else:
            print(f"{GREEN}[OK] Regra 'CMrpg Server' ja configurada no Firewall.{RESET}")
    except Exception as e:
        print(f"{YELLOW}[AVISO] Falha ao verificar firewall ({e}). Continuando...{RESET}")


def is_venv_valid(venv_python, venv_dir):
    """
    Verifica se o ambiente virtual realmente funciona e pertence a esta maquina.
    Detecta se foi copiado de outro computador ou se o caminho do Python base mudou.
    """
    if not os.path.isfile(venv_python):
        return False

    # 1. Checagem do pyvenv.cfg
    cfg_path = os.path.join(venv_dir, "pyvenv.cfg")
    if os.path.isfile(cfg_path):
        try:
            with open(cfg_path, "r", encoding="utf-8", errors="ignore") as f:
                for line in f:
                    stripped = line.strip()
                    if stripped.startswith("home"):
                        parts = stripped.split("=", 1)
                        if len(parts) > 1:
                            home_path = parts[1].strip()
                            if not os.path.isdir(home_path):
                                return False
        except Exception:
            pass

    # 2. Teste real de execucao do binario Python do venv
    try:
        test_proc = subprocess.run(
            [venv_python, "-c", "import sys; sys.exit(0)"],
            capture_output=True,
            timeout=5,
        )
        if test_proc.returncode != 0:
            return False
        stderr_text = (test_proc.stderr or b"").decode("utf-8", errors="ignore")
        if "No Python at" in stderr_text:
            return False
        return True
    except Exception:
        return False


def ensure_venv_and_dependencies(root_dir, selected_option):
    """Garante que o ambiente virtual venv exista, funcione nesta maquina e as dependencias estejam prontas."""
    print(f"\n{CYAN}[3/5] Verificando ambiente virtual Python (venv)...{RESET}")
    venv_dir = os.path.join(root_dir, "venv")
    venv_python = os.path.join(venv_dir, "Scripts", "python.exe")

    need_create = False
    if not is_venv_valid(venv_python, venv_dir):
        need_create = True
        if os.path.exists(venv_dir):
            print(f"{YELLOW}[!] Ambiente virtual venv invalido ou copiado de outro PC detectado.{RESET}")
            print(f"{CYAN}[i] Recriando ambiente virtual limpo especifico para esta maquina...{RESET}")
            try:
                shutil.rmtree(venv_dir, ignore_errors=True)
            except Exception as e:
                print(f"{YELLOW}[AVISO] Nao foi possivel excluir pasta venv antiga: {e}{RESET}")

    if need_create:
        print(f"{YELLOW}Criando ambiente virtual venv...{RESET}")
        try:
            subprocess.run([sys.executable, "-m", "venv", "venv"], cwd=root_dir, check=True)
            if not is_venv_valid(venv_python, venv_dir):
                print(f"{RED}[ERRO] Falha ao validar o ambiente virtual recem-criado.{RESET}")
                sys.exit(1)
            print(f"{GREEN}[OK] Ambiente virtual criado e validado com sucesso.{RESET}")
        except Exception as e:
            print(f"{RED}[ERRO] Falha ao criar o ambiente virtual: {e}{RESET}")
            sys.exit(1)
    else:
        print(f"{GREEN}[OK] Ambiente virtual encontrado e verificado.{RESET}")

    print(f"\n{CYAN}[4/5] Verificando dependencias (requirements.txt)...{RESET}")
    req_file = os.path.join(root_dir, "requirements.txt")

    # Se o venv acabou de ser recriado OU selecionou atualizar (1), roda pip obrigatoriamente
    # Se escolheu 'Iniciar' direto e o venv ja existia valido, faz checagem rapida
    if selected_option == 0 and not need_create:
        quick_check = subprocess.run([venv_python, "-c", "import fastapi, uvicorn"], capture_output=True)
        if quick_check.returncode == 0:
            print(f"{GREEN}[OK] Dependencias verificadas (inicializacao rapida).{RESET}")
            return venv_python

    if os.path.exists(req_file):
        print(f"{CYAN}[i] Instalando/atualizando dependencias com pip...{RESET}")
        try:
            pip_res = subprocess.run([venv_python, "-m", "pip", "install", "-r", req_file, "--quiet"], cwd=root_dir)
            if pip_res.returncode == 0:
                print(f"{GREEN}[OK] Dependencias instaladas e atualizadas.{RESET}")
            else:
                fallback_check = subprocess.run([venv_python, "-c", "import fastapi, uvicorn"], capture_output=True)
                if fallback_check.returncode == 0:
                    print(f"{YELLOW}[AVISO] Falha ao atualizar via pip (possivelmente offline). Continuando com pacotes instalados.{RESET}")
                else:
                    print(f"{RED}[ERRO] Falha ao instalar dependencias do requirements.txt.{RESET}")
                    sys.exit(1)
        except Exception as e:
            print(f"{YELLOW}[AVISO] Erro ao executar pip ({e}).{RESET}")

    return venv_python


def display_network_ips():
    """Obtem e exibe os enderecos IPv4 da maquina, destacando o IP do Radmin VPN."""
    print(f"\n{DARK_YELLOW}============================================================{RESET}")
    print(f"{YELLOW}{BOLD}                 ENDERECOS IP DA SUA MAQUINA                {RESET}")
    print(f"{DARK_YELLOW}============================================================{RESET}")

    ips = []
    try:
        res = subprocess.run(["ipconfig"], capture_output=True, text=True, errors="replace")
        for line in res.stdout.splitlines():
            if "IPv4" in line:
                parts = line.split(":")
                if len(parts) > 1:
                    clean_ip = parts[-1].strip().replace("(Preferred)", "").strip()
                    if clean_ip and clean_ip not in ips:
                        ips.append(clean_ip)
    except Exception:
        pass

    radmin_ip = None
    for ip in ips:
        if ip.startswith("26."):
            radmin_ip = ip
            print(f"   {GREEN}{BOLD}IPv4 (Radmin VPN): {ip}{RESET}  {GREEN}<-- [RADMIN VPN DETECTADO]{RESET}")
        else:
            print(f"   {WHITE}IPv4: {ip}{RESET}")

    print(f"{DARK_YELLOW}------------------------------------------------------------{RESET}")
    if radmin_ip:
        print(f"{YELLOW}{BOLD}DICA RADMIN VPN:{RESET} Envie para os jogadores o link:")
        print(f"\n    {GREEN}{BOLD}http://{radmin_ip}:8000{RESET}\n")
    else:
        print(f"{YELLOW}{BOLD}DICA RADMIN VPN:{RESET} Procure pelo IP iniciado em 26.x.x.x acima!")
        print("Envie para os jogadores o link:")
        print(f"\n    {GREEN}{BOLD}http://SEU_IP_RADMIN:8000{RESET}")
        print(f"    {GRAY}(Exemplo: http://26.10.20.30:8000){RESET}\n")

    print(f"{CYAN}Acesso local do Mestre: {WHITE}{BOLD}http://localhost:8000{RESET}")
    print(f"{DARK_YELLOW}============================================================{RESET}\n")


def main():
    root_dir = os.path.abspath(os.path.dirname(__file__))
    os.chdir(root_dir)
    setup_console()

    # A. Verificacao automatica da ultima release no GitHub
    latest_release = get_latest_github_release()

    # B. Menu Interativo (Navegavel pelas setas + Cores ANSI)
    selected_option = select_menu_option(latest_release)

    print(f"{DARK_YELLOW}============================================================{RESET}")
    print(f"{YELLOW}{BOLD}               CMrpg - Inicializador do Servidor            {RESET}")
    print(f"{DARK_YELLOW}============================================================{RESET}\n")

    # C. Atualizacao de arquivos caso a Opcao 2 tenha sido escolhida
    if selected_option == 1:
        update_project(root_dir)
    else:
        print(f"{CYAN}[1/5] Iniciando direto (atualizacao ignorada pelo usuario)...{RESET}")

    # D. Preparacao do Ambiente e Servidor
    check_and_configure_firewall()
    venv_python = ensure_venv_and_dependencies(root_dir, selected_option)
    display_network_ips()

    # Abrir navegador e iniciar Uvicorn
    if "--dry-run" in sys.argv:
        print(f"{GREEN}[DRY-RUN] Teste concluido com sucesso! Uvicorn seria iniciado aqui.{RESET}")
        return

    print(f"{CYAN}[5/5] Abrindo navegador em http://localhost:8000 e iniciando Uvicorn...{RESET}")
    try:
        webbrowser.open("http://localhost:8000")
    except Exception:
        pass

    uvicorn_cmd = [venv_python, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
    try:
        proc = subprocess.run(uvicorn_cmd, cwd=root_dir)
        if proc.returncode != 0:
            print(f"\n{RED}[ERRO] O servidor encerrou inesperadamente (codigo {proc.returncode}).{RESET}")
            print(f"{GRAY}Possiveis causas:\n - A porta 8000 ja pode estar sendo usada por outro processo.\n - Erro na inicializacao do FastAPI.{RESET}")
            sys.exit(proc.returncode)
    except KeyboardInterrupt:
        print(f"\n{YELLOW}[i] Servidor finalizado pelo usuario.{RESET}")
        sys.exit(0)


if __name__ == "__main__":
    main()

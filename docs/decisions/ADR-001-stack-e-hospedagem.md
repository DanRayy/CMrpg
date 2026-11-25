# ADR-001: Stack Tecnológica Local (FastAPI + Uvicorn + WebSockets + Radmin VPN)

- **Status:** Aceito (Em Produção)

## Contexto

O **CMrpg** foi concebido originalmente com foco em hospedagem em nuvem, mas evoluiu para um servidor de mesa de RPG autossuficiente, leve, de custo zero e latência mínima para grupos de amigos jogando juntos em rede privada virtual (**Radmin VPN**, faixa `26.x.x.x`) ou LAN. A prioridade é inicializar o servidor em segundos no Windows sem exigir bancos de dados externos, build steps complexos ou serviços pagos de terceiros.

## Decisão

Adotar a seguinte stack monolítica local:
- **Runtime & Backend:** **Python 3.10+** com **FastAPI**, **Uvicorn**, **WebSockets** nativos e **Pydantic** (`requirements.txt`).
- **Inicializador Automatizado (`iniciar_servidor.bat` + `launcher.py`):** escrito exclusivamente com a *Standard Library* do Python, encarregado de verificar atualizações no GitHub, configurar regra de Firewall (`CMrpg Server` na porta `8000`), provisionar/validar o ambiente virtual `venv/`, listar o IP Radmin VPN, rotacionar backups em `backups/` e iniciar `uvicorn main:app --host 0.0.0.0 --port 8000`.
- **Frontend Estático Servido pelo Próprio Backend:** HTML5 (`static/index.html`), CSS customizado (`static/styles.css`), Tailwind CSS via CDN, Iconify Web Component (`2.1.0`) e módulos JavaScript Vanilla ES6+ (`static/js/01` a `06` + `05b-mesa-board.js`), servidos diretamente via `StaticFiles` na rota `/` e `/static`.
- **Motores Dedicados no Backend:** `rules_engine.py` (atributos, modificadores, resistências, pipeline de dano, XP) e `table_engine.py` (geometria AABB da Mesa).

## Consequências

- **Positivas:** zero custo de infraestrutura, zero limite de conexões ou cota mensal, execução offline/LAN imediata e implantação em qualquer PC Windows com um duplo clique em `iniciar_servidor.bat`.
- **Negativas:** a campanha fica hospedada localmente na máquina do Mestre enquanto o servidor estiver aberto.

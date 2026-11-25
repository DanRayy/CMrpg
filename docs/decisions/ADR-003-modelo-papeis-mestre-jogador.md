# ADR-003: Modelo de Papéis (Host = Mestre vs. Jogadores por IP) e 32 Permissões Granulares

- **Status:** Aceito (Em Produção)

## Contexto

Em sessões via Radmin VPN / LAN, exigir contas, cadastros ou senhas adicionaria atrito desnecessário antes de iniciar a partida. Ao mesmo tempo, o Mestre precisa de autoridade absoluta garantida pelo servidor e de flexibilidade para delegar funções específicas (como Sub-Mestre) a jogadores de confiança.

## Decisão

1. **Identificação Automática por IP (`main.py`):**
   - O servidor detecta todos os IPs locais da máquina hospedeira (`get_host_ips`). Qualquer conexão vinda desses IPs recebe `id = "host_master"`, `role = "MESTRE"` e todas as permissões habilitadas (`master_full_permissions()`).
   - Qualquer outro IP conectado via HTTP ou `/ws` recebe `id = "ip_<IP>"`, `role = "JOGADOR"` e o preset padrão `JOGADOR_COMUM`.
   - O Host pode ativar o modo **Simular Jogador** na UI sem perder sua autoridade real no backend.
2. **32 Permissões Granulares em 7 Categorias (`PERMISSION_CATEGORIES`):**
   - `Personagens & Fichas` (7), `Combate, Turnos & Acúmulos` (7), `Itens, Inventário & Ouro` (5), `Loja, Mercadores & Escrow` (3), `Bestiário & Invocação` (4), `Missões & Sistema` (5) e `Árvore de Habilidades` (1 — `manageSkillTrees`).
   - Presets padrão (`MESTRE_TOTAL`, `JOGADOR_COMUM`, `SUB_MESTRE`, `ESPECTADOR`, `PERSONALIZADO`) e suporte a **Presets Customizados** persistidos em `state.customPermissionPresets`.
3. **Validação Server-Side:**
   - O endpoint WebSocket valida as permissões do remetente antes de persistir alterações restritas (`itemsCatalog`, `bestiary`, `skillTrees`, `classes`, `races`, invocação/despacho de inimigos, ativação de batalha, avanço de turno, geração de cargas e `undo`/`redo`).

## Consequências

- **Positivas:** entrada instantânea pelo link `http://<IP_RADMIN>:8000` sem login; controle fino de permissões por IP com apelidos persistidos.
- **Negativas:** qualquer aba aberta diretamente na máquina Host herda identidade de Mestre no servidor (contornável visualmente via modo *Simular Jogador*).

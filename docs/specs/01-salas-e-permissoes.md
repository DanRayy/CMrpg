# Especificação 01: Salas, Rede Local (Radmin VPN), Cursores e Permissões

## 1. Arquitetura Local / LAN via Radmin VPN

O **CMrpg** opera em arquitetura local/LAN hospedada diretamente na máquina do Mestre (Host), sem dependência de bancos externos, nuvem ou autenticação por terceiros.

- **Servidor HTTP + WebSocket:** FastAPI + Uvicorn escutando em `0.0.0.0:8000` (porta TCP `8000`).
- **Detecção de Rede (`get_host_ips` em `main.py`):**
  - Coleta endereços locais (`127.0.0.1`, `::1`, `localhost`), resultados de `socket.getaddrinfo` e saída do comando `ipconfig`.
  - Prioriza automaticamente o IP da interface **Radmin VPN** (faixa `26.x.x.x`), usando IP de LAN como fallback ou `127.0.0.1`.
  - Gera o link de convite `http://<preferred_ip>:8000` exibido na aba **Visão Geral** (`#overview-invite-url`) com botão de cópia rápida (`#btn-copy-invite-link`).

---

## 2. Inicialização Automatizada (`iniciar_servidor.bat` + `launcher.py`)

O fluxo de inicialização no Windows foi projetado para rodar com apenas um duplo clique, utilizando exclusivamente a *Standard Library* do Python em `launcher.py`:

1. **`iniciar_servidor.bat`:**
   - Configura console UTF-8 (`chcp 65001`), ajusta o diretório de trabalho e valida se `python` (3.10+) está disponível no `PATH`.
   - Invoca `python launcher.py %*`.
2. **`launcher.py`:**
   - **Verificação de Release (`get_latest_github_release`):** consulta a API do GitHub (`DanRayy/CMrpg` em `/releases/latest` com fallback para `/tags`).
   - **Menu Interativo ANSI (`select_menu_option`):** navegação via setas/Enter ou teclas `1`/`2` com duas opções:
     - `Iniciar`
     - `Instalar atualizacoes e iniciar` (atualiza via `git fetch/pull/checkout` ou fallback via zipball da API do GitHub, preservando integralmente o `state.json` em memória e em backup preventivo `state.backup.json`).
   - **Firewall do Windows (`check_and_configure_firewall`):** verifica a existência da regra `"CMrpg Server"` via `netsh advfirewall`; se ausente, solicita elevação UAC para liberar TCP entrada na porta `8000`.
   - **Ambiente Virtual (`ensure_venv_and_dependencies`):** valida `venv/Scripts/python.exe` (incluindo detecção de `venv` copiado de outro PC via `pyvenv.cfg` e teste de execução), recria se inválido e instala dependências de `requirements.txt` (`fastapi`, `uvicorn`, `websockets`, `pydantic`).
   - **Exibição de IPs (`display_network_ips`):** lista os endereços IPv4 da máquina destacando o IP Radmin VPN (`26.x.x.x`).
   - **Backup Automático Rotativo (`create_and_rotate_state_backup`):** antes de subir o Uvicorn, cria cópia de `state.json` em `backups/state_YYYY-MM-DD_HH-MM-SS.json` apenas se houver alterações em relação ao último backup salvo, mantendo no máximo **15 backups** mais recentes.
   - **Abertura e Execução:** abre `http://localhost:8000` no navegador padrão e inicia `uvicorn main:app --host 0.0.0.0 --port 8000` (suporta `--dry-run` para validação sem subir o servidor).

---

## 3. Detecção Automática de Host (Mestre), Simulação e Apelidos por IP

- **Autoridade Automática por IP (`is_client_host_master`):**
  - Qualquer requisição HTTP (`/api/whoami`, `/api/state`) ou conexão WebSocket (`/ws`) vinda de um IP pertencente à máquina Host (`127.0.0.1`, `::1`, `localhost`, IP Radmin ou LAN local) recebe automaticamente identidade `host_master` com cargo `MESTRE` e todas as permissões habilitadas (`master_full_permissions()`).
  - Qualquer outro IP conectado recebe automaticamente identidade `ip_<IP>` com cargo `JOGADOR` e preset padrão `JOGADOR_COMUM` (caso ainda não exista na lista de membros).
- **Modo Simular Jogador (`#btn-role-badge`):**
  - Na barra superior, o Host vê o selo `MODO MESTRE`. Ao clicar nele, alterna a simulação local de interface (`state.simulatePlayerMode`) para visualizar e testar restrições de `JOGADOR` sem perder a identidade real de Host no servidor.
- **Apelidos por IP e Pré-Cadastro:**
  - Na aba **Visão Geral**, o painel de IPs conectados ao vivo (`#live-connected-ips-list`) exibe todas as conexões WebSocket ativas por IP e contagem de abas abertas (`connectionsCount`).
  - O Mestre pode editar o apelido (`nickname`), ícone/avatar e personagem vinculado (`characterId`) de qualquer membro ou pré-cadastrar um IP antes mesmo da conexão (`#btn-add-member`).
  - Cada jogador também pode configurar seu próprio perfil via botão `Perfil` (`#btn-open-profile`) no rodapé da sidebar.

---

## 4. Cursores Colaborativos em Tempo Real

O sistema exibe cursores remotos em tempo real sobre a interface (`#multiplayer-cursors-layer`) e indicadores de presença por aba na sidebar (`.sidebar-cursors-dots`):

- **Transporte Leve em Memória:** eventos `cursor_move` e `cursor_disconnect` usam `ws_manager.broadcast_except(...)`, sem gravação em disco (`state.json`). No cliente, o envio possui throttle de **40 ms** (~25 FPS), interpolação suave e expiração após **30 segundos** de inatividade.
- **Coordenadas Contextuais:** envia `activeTab`, `region`, `modalId`, coordenadas proporcionais (`relX`, `relY`, `vw`, `vh`) e coordenadas de mundo (`wx`, `wy`) quando na aba **Mesa**.
- **Cor Permanente de 10 Cores (Jogadores):** `assign_permanent_cursor_color` atribui e persiste para cada IP uma cor fixa e distinta dentre a paleta de 10 cores (`CURSOR_COLOR_PALETTE`):
  1. `#FF595E` — Vermelho Coral
  2. `#3B82F6` — Azul Neon
  3. `#10B981` — Verde Esmeralda
  4. `#F59E0B` — Amarelo Ouro
  5. `#A855F7` — Roxo
  6. `#06B6D4` — Ciano
  7. `#F97316` — Laranja
  8. `#EC4899` — Rosa Choque
  9. `#84CC16` — Lima
  10. `#818CF8` — Lavanda
- **Transição RGB Contínua (Exclusivo do Mestre):** o `host_master` recebe `cursorColor: "RGB_CHROMA"`, renderizando seta, ponto e badge com animação linear contínua de 6 segundos (`rgb-smooth-*` em `styles.css`).

---

## 5. Sistema Completo das 32 Permissões Granulares (7 Categorias)

O controle de acesso combina as chaves canônicas em `main.py` e `01-core-state.js` (`PERMISSION_CATEGORIES`), organizadas em **7 categorias** totalizando **32 permissões**:

### Categoria 1: Personagens & Fichas (7)
| Chave | Nome | Descrição |
| :--- | :--- | :--- |
| `char_manage_own` | Gerenciar Própria Ficha | Editar atributos, talentos, habilidades e usar inventário do próprio personagem. |
| `char_view_others` | Visualizar Outros Personagens | Abrir e inspecionar fichas de outros jogadores em modo somente leitura. |
| `char_create` | Criar Novos Personagens | Criar novas fichas de personagens na mesa através do botão `＋ CRIAR`. |
| `char_edit_others` | Editar Fichas de Outros | Alterar atributos, talentos, habilidades e dados de fichas de outros jogadores. |
| `char_delete` | Excluir Personagens | Excluir fichas de personagens da mesa permanentemente. |
| `char_reorder` | Reordenar Fichas | Mudar a ordem dos cards de personagens na lista arrastando pelo cabeçalho. |
| `char_grant_xp` | Distribuir XP / Nível em Lote | Conceder experiência e alterar níveis e pontos de atributos de personagens. |

### Categoria 2: Combate, Turnos & Acúmulos (7)
| Chave | Nome | Descrição |
| :--- | :--- | :--- |
| `combat_advance_own_turn` | Avançar Próprio Turno | Avançar o turno da batalha quando for a vez do próprio personagem. |
| `combat_manage_battle` | Iniciar / Encerrar Batalha | Iniciar novas batalhas e encerrar batalhas ativas na mesa. |
| `combat_edit_order` | Editar Ordem de Batalha | Alterar a fila de iniciativa e posições dos combatentes na sidebar. |
| `combat_advance_any_turn` | Avançar Qualquer Turno | Forçar o avanço de turno de qualquer participante ou inimigo. |
| `combat_manage_charges` | Controlar Cargas de Batalha | Adicionar, gastar ou resetar o contador de Cargas de batalha. |
| `combat_apply_damage_others` | Ações Rápidas nos Cards | Usar os 5 botões inferiores dos cards (Dano/Vida/Armadura/Mana/Resetar) em si, aliados e inimigos. |
| `combat_manage_accumulations_others` | Gerenciar Acúmulos / Buffs de Terceiros | Alterar acúmulos, buffs e debuffs de outros personagens e inimigos. |

### Categoria 3: Itens, Inventário & Ouro (5)
| Chave | Nome | Descrição |
| :--- | :--- | :--- |
| `inventory_view_others` | Visualizar Outros Inventários | Abrir mochilas de outros jogadores em modo somente leitura. |
| `inventory_transfer_any` | Transferir Itens entre Inventários | Mover e transferir itens de qualquer ficha para outra ficha da mesa. |
| `inventory_edit_others` | Modificar Inventários de Outros | Adicionar, remover livremente ou equipar itens de outros jogadores. |
| `item_manage_catalog` | Gerenciar Catálogo de Itens | Criar, editar e excluir itens do compêndio geral da sala. |
| `gold_manage` | Gerenciar Ouro Global | Alterar livremente o saldo de moedas de ouro do cofre compartilhado. |

### Categoria 4: Loja, Mercadores & Escrow (3)
| Chave | Nome | Descrição |
| :--- | :--- | :--- |
| `shop_buy_sell` | Comprar e Vender na Loja | Comprar produtos dos mercadores e solicitar vendas para o Escrow. |
| `shop_manage_npcs` | Gerenciar Mercadores (NPCs) | Criar mercadores, definir estoque, preços e tipos de moeda. |
| `shop_approve_escrow` | Aprovar Vendas no Escrow | Avaliar e aprovar ou recusar solicitações de venda de jogadores. |

### Categoria 5: Bestiário & Invocação (4)
| Chave | Nome | Descrição |
| :--- | :--- | :--- |
| `bestiary_view_revealed` | Ver Bestas Reveladas | Ver fichas e dados de criaturas reveladas pelo Mestre. |
| `bestiary_view_hidden` | Ver Bestas Ocultas | Acessar informações completas de monstros não revelados aos jogadores. |
| `bestiary_manage` | Gerenciar Bestiário | Criar, editar e excluir criaturas do Bestiário. |
| `bestiary_summon` | Trazer Inimigos para Mesa | Puxar monstros do Bestiário para o combate e dispensá-los. |

### Categoria 6: Missões & Sistema (5)
| Chave | Nome | Descrição |
| :--- | :--- | :--- |
| `mission_accept` | Aceitar Missões | Aceitar missões disponíveis no mural com o próprio personagem. |
| `mission_manage` | Gerenciar Mural de Missões | Criar, editar e remover missões do mural. |
| `mission_approve` | Aprovar Conclusão de Missões | Validar missões concluídas e distribuir recompensas. |
| `system_undo_redo` | Desfazer / Refazer (Undo/Redo) | Usar o histórico temporal para reverter mutações do estado. |
| `system_view_audit_log` | Ver Histórico de Auditoria | Consultar o log completo de ações dos participantes. |

### Categoria 7: Árvore de Habilidades (1)
| Chave | Nome | Descrição |
| :--- | :--- | :--- |
| `manageSkillTrees` | Gerenciar Árvores de Habilidades | Controle total para criar, editar, duplicar, ocultar, reordenar e excluir Árvores de Habilidades, Classes, Subclasses e Raças. *(Aliases de retrocompatibilidade: `skill_tree_manage` e `canManageSkillTrees`.)* |

---

## 6. Presets Padrão, Presets Customizados e Enforcement no Servidor

- **Presets Padrão (`PRESET_DEFINITIONS` / `default_permissions`):**
  - **`MESTRE_TOTAL`:** exclusivo do Host; todas as 32 permissões em `true`.
  - **`JOGADOR_COMUM`:** gerencia a própria ficha (`char_manage_own`), cria fichas (`char_create`), visualiza outras fichas/inventários (`char_view_others`, `inventory_view_others`), transfere itens (`inventory_transfer_any`), avança o próprio turno (`combat_advance_own_turn`), controla cargas (`combat_manage_charges`), usa ações rápidas nos cards (`combat_apply_damage_others`), compra/vende na loja (`shop_buy_sell`), vê bestas reveladas (`bestiary_view_revealed`), aceita missões (`mission_accept`) e visualiza auditoria (`system_view_audit_log`). Demais permissões em `false`.
  - **`SUB_MESTRE`:** herda todas as permissões de jogador e ativa edição de outras fichas (`char_edit_others`), XP em lote (`char_grant_xp`), gestão completa de batalha/ordem/turnos/acúmulos (`combat_manage_battle`, `combat_edit_order`, `combat_advance_any_turn`, `combat_manage_accumulations_others`), edição de inventários (`inventory_edit_others`), gestão de mercadores e escrow (`shop_manage_npcs`, `shop_approve_escrow`), invocação de inimigos (`bestiary_summon`), gestão/aprovação de missões (`mission_manage`, `mission_approve`) e gestão de árvores (`manageSkillTrees`). Mantém bloqueados `char_delete`, `char_reorder`, `item_manage_catalog`, `gold_manage`, `bestiary_view_hidden`, `bestiary_manage` e `system_undo_redo`.
  - **`ESPECTADOR`:** apenas visualização (`char_view_others`, `inventory_view_others`, `bestiary_view_revealed`); todas as ações de criação, combate, loja e sistema ficam desativadas.
  - **`PERSONALIZADO`:** selecionado automaticamente por `detectMatchingPreset` quando a combinação marcada nos switches não coincide com nenhum preset padrão ou customizado.
- **Presets Customizados (`state.customPermissionPresets`):**
  - No modal de configuração do membro (`modal-member`), o Mestre pode salvar qualquer combinação das 32 permissões como um preset nomeado (`modal-save-custom-preset`), aplicá-lo rapidamente a outros IPs via dropdown e excluí-lo quando não for mais necessário.
- **Validação Server-Side (`main.py`):**
  - Em mensagens WebSocket `update_state`, `undo` e `redo`, o servidor verifica o IP real e as permissões do membro antes de aceitar mutações em `skillTrees`, `classes`, `races`, `itemsCatalog`, `bestiary`, invocação/despacho de inimigos (`bestiary_summon`), ativação/encerramento de batalha (`combat_manage_battle`), avanço de turno (`combat_advance_any_turn` / `combat_advance_own_turn`), geração de cargas e reversão temporal (`system_undo_redo`).

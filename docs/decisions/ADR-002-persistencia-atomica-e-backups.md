# ADR-002: Persistência Atômica em `state.json` com Debounce e Backups Rotativos

- **Status:** Aceito (Em Produção)

## Contexto

Com a eliminação de bancos de dados externos, o estado completo da campanha (sala, membros, fichas, catálogo, mercadores, batalha, missões, bestiário, árvores, classes, raças, posições da Mesa, auditoria e pilhas de Undo/Redo) precisa ser persistido localmente no disco sem risco de corrupção por quedas de energia, encerramento abrupto ou concorrência de escrita no Windows (`WinError 5` / `PermissionError`).

## Decisão

Implementar no `StateManager` (`main.py`) um pipeline de persistência atômica em arquivo único (`state.json`):
1. **Escrita Atômica Física (`_write_state_atomic_sync`):**
   - Serializa o JSON formatado (`ensure_ascii=False, indent=2`) para `state.json.tmp`.
   - Executa `f.flush()` e `os.fsync(f.fileno())` antes de fechar o descritor.
   - Substitui `state.json` via `os.replace` com até **3 tentativas** e intervalo de **`0.05s`** para contornar bloqueios transitórios do sistema de arquivos no Windows.
2. **Debounce Assíncrono em Segundo Plano (`SAVE_DEBOUNCE_SECONDS = 0.3`):**
   - Mutações atualizam o estado em memória RAM imediatamente (permitindo broadcast WebSocket em `0 ms`) e agendam a gravação em disco via `asyncio.to_thread` protegida por `save_lock`.
   - O hook `lifespan` do FastAPI garante `flush_pending_save(force=True)` no encerramento do servidor.
3. **Backups Rotativos (`backups/`) e Auto-Recuperação:**
   - Na inicialização (`launcher.py`), `create_and_rotate_state_backup` salva `backups/state_YYYY-MM-DD_HH-MM-SS.json` caso o conteúdo tenha mudado desde o último backup, mantendo no máximo **15 arquivos** mais recentes.
   - Se `state.json` estiver vazio ou corrompido no startup, `StateManager._try_restore_from_latest_backup()` recupera automaticamente o backup JSON válido mais recente de `backups/`.

## Consequências

- **Positivas:** alta velocidade de resposta em tempo real (sem I/O síncrono bloqueando o loop do WebSocket), portabilidade total da campanha em um único JSON e resiliência contra corrupção de disco.
- **Negativas:** o estado inteiro da campanha deve caber confortavelmente em memória RAM (adequado para campanhas de RPG de mesa).

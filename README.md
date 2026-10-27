# CMrpg — Mesa de RPG & Combate em Tempo Real

O **CMrpg** é uma aplicação web completa para gerenciamento de mesas de RPG de mesa, combate tático em tempo real, fichas dinâmicas, controle de inventário e regras sincronizadas via WebSockets.

Desenvolvido para proporcionar uma experiência fluida de *Dark Fantasy Medieval*, o sistema atende tanto ao Mestre da mesa quanto aos Jogadores, permitindo sessões colaborativas locais ou remotas via rede virtual.

---

## • Principais Funcionalidades

### • Combate Tático e Fila de Turnos
- **Iniciativa Dinâmica:** Ordenação automática e reordenável por Drag & Drop.
- **Pipeline de Dano:** Aplicação rápida ou tática com cálculo automático de resistências (Física, Mágica e Elementais: Fogo, Gelo, Raio, Luz e Trevas).
- **Acúmulos e Condições:** Gerenciamento de status como **Chamas** (dano progressivo no fim do turno) e **Congelamento** (perda de turno e imunidade temporária).

### • Fichas de Personagens e Bestiário
- **Atributos Canônicos:** Força, Destreza, Constituição, Inteligência, Sabedoria e Carisma com recálculo automático de atributos derivados.
- **Barras Dinâmicas:** Vida, Armadura (com suporte a dano direto e overflow) e Mana.
- **Painel de 7 Resistências:** Exibição clara e harmonizada nas fichas de heróis e monstros do bestiário.
- **Habilidades & Magias:** Gerenciamento com slots de Habilidade Passiva, Ativa e Suprema.

### • Sistema de Buffs e Nerfs Avançado
- **Edição em Tempo Real:** Edite efeitos já aplicados sem precisar recriá-los.
- **Modificadores Múltiplos:** Altere múltiplos atributos no mesmo efeito, com valores fixos (+X) ou percentuais (+X%).
- **Efeitos Permanentes:** Suporte a status permanentes que não decaem com a passagem de turnos nem se perdem em resets de combate.
- **Interruptores Rápidos (Toggle):** Ative ou desative temporariamente qualquer efeito com um clique.

### • Bloco de Notas & Diário da Ficha
- **Persistência Segura por ID Único:** Cada página possui identificador próprio imutável, prevenindo embaralhamento de anotações.
- **Autosave Isolado:** Sincronização automática a cada digitação e antes de trocar ou fechar abas.
- **Validação de Nomes:** Modal para criação de novas páginas com checagem automática de nomes duplicados.
- **Editor Flutuante:** Menus suspensos de cor e realce sobrepostos sem barras de rolagem internas.

### • Economia, Inventário e Missões
- **Inventário Dedicado 3x:** Organização por slots, abas de consumíveis, equipamentos e itens-chave.
- **Loja e Escrow:** Comércio entre jogadores e mercadores com sistema de custódia segura.
- **Quests:** Painel de missões com concessão de recompensas individuais ou em lote.

### • Multiplayer Colaborativo
- **Cursores em Tempo Real:** Visualização dos cursores dos jogadores na tela (estilo Figma/Miro).
- **Controle de Acesso:** Permissões granulares para Mestre (Host) e Jogadores com histórico de ações (Undo/Redo).
- **Arquitetura Frontend Modular:** Código cliente estruturado em módulos independentes em `static/js/`.

---

## 🌐 Como Usar com o Radmin VPN

O CMrpg já possui inicialização automatizada no Windows através do script [`iniciar_servidor.bat`](file:///C:/Users/dan-pc/Documents/dev/Python/CMrpg/iniciar_servidor.bat).

### Passo a Passo para o Mestre (Host)

1. Baixe e instale o [Radmin VPN](https://www.radmin-vpn.com/br/) (gratuito).
2. Abra o Radmin VPN e crie uma rede privada (ex: *Mesa-CMrpg* com uma senha).
3. Execute o arquivo **`iniciar_servidor.bat`** na raiz do projeto:
   - O inicializador verifica atualizações do GitHub automaticamente.
   - Libera a porta `8000` no Firewall do Windows.
   - Prepara o ambiente virtual Python (`venv`) e instala as dependências.
   - Exibe o seu **IPv4 do Radmin VPN** (começando com `26.x.x.x`).
4. O navegador abrirá automaticamente em `http://localhost:8000` (seu acesso local de Mestre).
5. Envie o seu link do Radmin para os jogadores (ex: `http://26.XX.XX.XX:8000`).

### Passo a Passo para os Jogadores

1. Baixe e instale o Radmin VPN.
2. Entre na rede criada pelo Mestre (*Rede -> Entrar em rede existente*).
3. Abra qualquer navegador (Chrome, Edge, Firefox) e acesse o link informado pelo Mestre:
   ```text
   http://26.XX.XX.XX:8000
   ```
4. Pronto! O jogador já estará conectado à mesa com sincronização em tempo real.

---

## ??? Por que usar o RadminVPN?

A maioria dos provedores residenciais de internet utiliza **CGNAT** (*Carrier-Grade NAT*). Isso significa que:

- O roteador da sua casa **não possui um endereço IPv4 público exclusivo**, impossibilitando que amigos fora da sua casa se conectem ao seu computador apenas usando seu IP de internet normal.
- Fazer "redirecionamento de portas" (*Port Forwarding*) no roteador é um processo complexo, falha em conexões sob CGNAT e pode expor sua rede doméstica a riscos desnecessários.

### Vantagens do Radmin VPN no CMrpg:
1. **Rede Local Virtual Segura (VLAN):** Cria um túnel criptografado ponto a ponto direto entre você e seus jogadores como se todos estivessem conectados no mesmo cabo de rede.
2. **Supera CGNAT e Bloqueios:** Não exige abrir portas no modem/roteador nem contratar IP fixo com a operadora.
3. **Identificação Precisa:** Permite que o servidor do CMrpg identifique cada jogador com precisão pelo IP `26.x.x.x`, gerenciando quem é o Mestre e quem são os jogadores sem necessidade de login complexo.
4. **Baixa Latência:** Comunicação direta ideal para a atualização instantânea dos WebSockets e cursores multiplayer.

---

## • Execução Manual (Sem .bat)

Caso prefira rodar manualmente pelo terminal ou em Linux/macOS:

```bash
# 1. Criar e ativar o ambiente virtual
python -m venv venv
# No Windows:
venv\Scripts\activate
# No Linux/macOS:
source venv/bin/activate

# 2. Instalar dependências
pip install -r requirements.txt

# 3. Iniciar o servidor Uvicorn
uvicorn main:app --host 0.0.0.0 --port 8000
```
Acesse `http://localhost:8000` no navegador.

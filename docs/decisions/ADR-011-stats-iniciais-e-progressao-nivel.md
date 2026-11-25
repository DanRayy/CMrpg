# ADR-011: Atributos Iniciais (Point Buy), Curva de XP, Raças e Subclasses Nv.15+

- **Status:** Aceito (Em Produção)

## Contexto

As regras de criação de personagem e progressão de campanha do CMrpg exigem equilíbrio na distribuição inicial dos 5 atributos, transparência em rolagens passivas e uma curva de XP exponencial suave combinada com desbloqueio de vocações avançadas (Subclasses e Herança) no Nível 15+.

## Decisão

1. **Point Buy Canônico (`validate_point_buy` em `rules_engine.py`):**
   - 5 atributos (`FORCA`, `DESTREZA`, `INTELIGENCIA`, `SABEDORIA`, `LABIA`) iniciam em `8`, com `+17` pontos livres (`57` pontos totais).
   - **Regra do 1 Ponto:** no máximo `1` atributo pode cair para `7`, elevando o teto individual de `18` para `19`.
2. **Modificadores e Sucesso Automático Passivo:**
   - Tabela de modificadores de `-5` (`<= 1`) até `+7` (`>= 20`).
   - Sucesso automático passivo em **`DC 5`** (`15–16`), **`DC 8`** (`17–18`) e **`DC 11`** (`>= 19`).
3. **Curva Exponencial de XP (`calculate_xp_required_for_level`):**
   - Nível `1 → 2` = `80 XP`, crescendo **`+8%` composto por nível** (`apply_rounding(req * 1.08)`).
   - Cada nível ganho concede **`+2 Pontos de Talento` (`skillPoints`)**.
4. **Raças Base e Subclasses no Nível 15+:**
   - 5 Raças Base pré-cadastradas (`Dragão`, `Humano`, `Elfo`, `Orc`, `Xituiara`) + suporte a Sub-raças e bônus inicial de Pontos de Talento.
   - Subclasses desbloqueiam exclusivamente em **`level >= 15`**, permitindo configurar Herança Opcional (1 efeito substituído + 1 habilidade `TALENTO`/`ATIVA`/`PASSIVA` de outra classe base) e troca segura com reset e devolução de 100% dos pontos gastos.

## Consequências

- **Positivas:** progressão clara de poder em campanhas longas e personalização profunda sem perda de pontos ao reconfigurar vocação.
- **Negativas:** exige recálculo completo de derivados após qualquer mudança de nível, raça ou classe.

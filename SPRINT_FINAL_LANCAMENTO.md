# Sprint Final para Lançamento

**Data:** 17/02/2026
**Objetivo:** Deixar o Vizzu pronto para receber os primeiros usuários pagantes.

---

## Tarefas por Prioridade

### #1 — Bug Costas no Look Composer
- **Status:** Pendente
- **Prioridade:** Critica
- **Tempo estimado:** 1-2h
- **Descrição:** Imagens de costas saindo completamente diferentes do produto (logo, cores, fontes erradas). A frente sai perfeita mas as costas perdem fidelidade total ao produto original.
- **Ação:** Analisar workflow N8N de geração de costas, verificar quais imagens de referência estão sendo enviadas ao Gemini, ajustar prompt e inputs.
- **Dependência:** Kaique precisa mostrar exemplos no N8N (execution IDs ou prints).

---

### #2 — Marca D'água no Plano Free
- **Status:** Pendente
- **Prioridade:** Critica
- **Tempo estimado:** 1h
- **Descrição:** Imagens geradas no plano gratuito precisam ter marca d'água do Vizzu para incentivar upgrade para plano pago.
- **Ação:** Aplicar overlay com logo/texto "Vizzu" semitransparente nas imagens antes de entregar ao usuário free. Imagens do plano pago saem limpas.

---

### #3 — Termo de Aceite / Contrato
- **Status:** Pendente
- **Prioridade:** Critica
- **Tempo estimado:** 30min
- **Descrição:** Modal obrigatório no primeiro acesso com termos de uso e politica de privacidade. Usuario precisa aceitar antes de usar a plataforma.
- **Ação:** Criar modal fullscreen com checkbox + botao "Aceitar e Continuar". Salvar aceite no Supabase (data, versao do termo, IP).

---

### #4 — Modal Completar Perfil (pos-login Google)
- **Status:** Pendente
- **Prioridade:** Alta
- **Descrição:** Usuarios que fazem login via Google nao fornecem WhatsApp, nome da loja e outros dados essenciais. Bloquear acesso ao produto ate completar perfil.
- **Tempo estimado:** 45min
- **Ação:** Apos login Google, verificar se perfil esta completo. Se nao, exibir modal obrigatorio pedindo: WhatsApp, nome da loja, segmento. Salvar no Supabase.

---

### #5 — Captura UTM no Cadastro (Atribuicao de Marketing)
- **Status:** Pendente
- **Prioridade:** Alta
- **Tempo estimado:** 30min
- **Descrição:** Saber de onde cada usuario veio (Instagram, Google Ads, indicacao, etc.) para medir ROI de marketing.
- **Ação:** Capturar parametros `utm_source`, `utm_medium`, `utm_campaign` e `utm_content` da URL ao entrar no site. Persistir em localStorage e salvar na tabela de usuarios no momento do cadastro.

---

### #6 — Robo de Vendas (Widget)
- **Status:** Pendente
- **Prioridade:** Media
- **Tempo estimado:** 15min
- **Descrição:** Widget de chat/WhatsApp para receber visitantes e tirar duvidas em tempo real. Aumenta conversao.
- **Ação:** Escolher ferramenta (Tidio, Crisp, ou widget WhatsApp simples) e colar script no index.html.

---

## Resumo

| # | Tarefa | Tempo | Prioridade |
|---|--------|-------|------------|
| 1 | Bug costas Look Composer | 1-2h | Critica |
| 2 | Marca d'agua plano free | 1h | Critica |
| 3 | Termo de aceite | 30min | Critica |
| 4 | Modal completar perfil | 45min | Alta |
| 5 | Captura UTM | 30min | Alta |
| 6 | Robo de vendas | 15min | Media |

**Tempo total estimado: ~4-5h**

---

## Backlog pos-lancamento
- Reusar looks ja criados no Look Composer
- Still Criativo com fundo de looks
- Vizzu Spaces (playground livre)
- Geracao de video
- PWA nas App Store / Play Store
- Push notifications

---

*Documento criado em 17/02/2026 — Sprint executada por Kaique + Claude*

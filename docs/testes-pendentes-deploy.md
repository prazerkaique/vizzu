# Mudanças pendentes de deploy (Vercel instável 03/02/2026)

Todos os commits estão no GitHub (`main`). Falta deploy na Vercel.

---

## SISTEMA DE REPORTS — Próximos Passos Manuais

**Commit:** `a09a99e` — O código frontend está 100% pronto e deployado.
Para funcionar, são necessários 3 passos manuais na ordem abaixo:

### Passo 1: Rodar SQL no Supabase
Abrir o **SQL Editor** no Supabase e colar o conteúdo de:
`supabase/migrations/create_generation_reports.sql`

Isso cria a tabela `generation_reports` com RLS (users leem/criam seus próprios reports).

### Passo 2: Configurar domínio `report.vizzu.pro` na Vercel
1. No painel da Vercel → Settings → Domains
2. Adicionar `report.vizzu.pro`
3. No DNS (Cloudflare ou onde estiver):
   - **Tipo:** CNAME
   - **Nome:** `report`
   - **Valor:** `cname.vercel-dns.com`
4. Esperar propagação (~5 min)
5. Testar: acessar `report.vizzu.pro` → deve pedir login Google

### Passo 3: Criar 3 Webhooks no N8N

#### 3a. `POST /vizzu/report-notification` (WhatsApp pro admin)
**Input:**
```json
{
  "report_id": "uuid",
  "user_name": "João Silva",
  "user_email": "joao@email.com",
  "generation_type": "product-studio",
  "product_name": "Camisa Azul",
  "generated_image_url": "https://...",
  "original_image_url": "https://...",
  "observation": "Braço distorcido",
  "admin_panel_url": "https://report.vizzu.pro"
}
```
**Ação:** Envia WhatsApp para o admin com as infos + link
**Response:** `{ "success": true }`

#### 3b. `POST /vizzu/admin-reports` (admin lista reports)
**Input:**
```json
{ "admin_email": "kaiquelearner@gmail.com" }
```
**Ação:**
1. Validar que `admin_email === 'kaiquelearner@gmail.com'`
2. Query `generation_reports` com **service_role** (bypassa RLS):
   `SELECT * FROM generation_reports ORDER BY created_at DESC`
3. Retornar lista
**Response:** `{ "success": true, "reports": [...] }`

#### 3c. `POST /vizzu/review-report` (aprovar/negar)
**Input:**
```json
{
  "report_id": "uuid",
  "admin_email": "kaiquelearner@gmail.com",
  "action": "approve",
  "admin_notes": "Opcional"
}
```
**Ação:**
1. Validar `admin_email`
2. Se `action === 'approve'`:
   - Buscar `user_id` do report
   - Chamar RPC `add_credits(user_id, 1)`
   - UPDATE report: `status = 'approved'`, `reviewed_at = NOW()`, `reviewed_by = admin_email`
3. Se `action === 'deny'`:
   - UPDATE report: `status = 'denied'`, `reviewed_at = NOW()`, `reviewed_by = admin_email`
**Response:** `{ "success": true, "credits_added": 1 }` (ou sem `credits_added` se deny)

### Teste rápido após setup
1. Abrir o app → gerar uma imagem em qualquer módulo
2. Na tela de resultado, clicar no botão **Report** (amber/flag)
3. Escrever 10+ caracteres → Enviar
4. Verificar no Supabase: tabela `generation_reports` deve ter 1 row
5. Acessar `report.vizzu.pro` → fazer login → report deve aparecer
6. Clicar Aprovar → verificar que crédito voltou

---

## 1. Fullpiece bloqueia dois slots (Provador)
**Commit:** `ca2073b`

**Teste:**
- Abrir o Provador ou Look Composer
- Selecionar um item da categoria Vestido, Macacão ou Jardineira
- Verificar que o slot **top** e **bottom** são preenchidos com o mesmo item
- O slot bottom deve aparecer travado com ícone de link
- Remover o item de qualquer slot → ambos devem limpar
- Selecionar uma camiseta normal → deve ocupar só o slot top

---

## 2. Loading do Provador ~2 minutos
**Commit:** `ca2073b`

**Teste:**
- Iniciar uma geração no Provador
- O progresso deve levar ~2 minutos para chegar a 100%
- As frases devem trocar a cada ~11 segundos

---

## 3. Barra minimizada não fechava ao clicar
**Commit:** `9fce66e`

**Teste:**
- Iniciar uma geração (Provador, Still, etc.)
- Minimizar a geração
- Arrastar a barra minimizada para outro lugar
- Clicar na barra → deve restaurar/maximizar (não fechar)
- Repetir 3-4 vezes para garantir que não falha

---

## 4. Créditos reais no Provador (mobile/PWA)
**Commit:** `90afd94`

**Teste:**
- Abrir o Provador no **mobile ou PWA**
- No header deve mostrar o saldo real de créditos com ícone de moeda
- Não deve mostrar "1 cred." hardcoded
- Gastar um crédito → número deve atualizar

---

## 5. Still Criativo no Dashboard
**Commit:** `90afd94`

**Teste:**
- Gerar um Still Criativo com sucesso
- Ir ao Dashboard
- Em "Últimas Criações" deve aparecer a imagem com badge **"Still"** (cor âmbar)
- Clicar nela → deve navegar para a página **Creative Still**

---

## 6. Provador no Dashboard
**Commit:** `90afd94`

**Teste:**
- Gerar um look no Provador com sucesso
- **Fechar o app e abrir novamente** (sem abrir o Provador)
- Ir ao Dashboard
- Em "Últimas Criações" deve aparecer o look com badge **"Provador"**
- Clicar → deve navegar para o Provador

---

## 7. Toggle Mensal/Anual funcionando
**Commit:** `90afd94`

**Teste:**
- Ir em **Settings > Planos & Créditos**
- Clicar no toggle Mensal/Anual
- Os preços dos planos devem mudar imediatamente
- Mudar de volta → preços voltam
- O estado deve persistir enquanto estiver na página

---

## 8. CTAs de Downgrade
**Commit:** `90afd94`

**Teste:**
- Estar logado com um plano superior (ex: Pro ou Premier)
- Ir em **Settings > Planos & Créditos**
- Planos **inferiores** ao atual devem mostrar **"Fazer downgrade"**
- Planos **superiores** devem mostrar o CTA normal (ex: "Escolher Premier")
- O plano atual deve mostrar **"Plano atual"** (desabilitado)

---

## 9. Toast de pagamento + fallback PWA
**Commit:** `08f3635`

**Teste:**
- Clicar em qualquer CTA de plano ou compra de créditos
- Deve aparecer toast **"Preparando pagamento..."** imediatamente
- No **browser**: deve abrir o Stripe em nova aba
- No **PWA**: se nova aba não abrir, deve redirecionar na mesma aba

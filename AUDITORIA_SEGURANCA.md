# Auditoria de Seguranca — Vizzu
**Data**: 22 de fevereiro de 2026
**Escopo**: Analise completa do codigo-fonte (frontend React + Shopify Gateway + configs)

---

## Resumo Executivo

| Severidade | Qtd | Status |
|------------|-----|--------|
| CRITICO | 6 | Corrigir IMEDIATAMENTE |
| ALTO | 6 | Corrigir esta semana |
| MEDIO | 7 | Corrigir em 2 semanas |
| BAIXO | 4 | Nice to have |

**Nivel de risco geral: ALTO** — Existem credenciais expostas e falhas que permitem bypass de controles criticos.

---

## CRITICO (Corrigir imediatamente)

### C1. Credenciais expostas nos arquivos .env

**Arquivos**: `.env`, `shopify-gateway/.env`

Tokens e chaves em texto puro que dao acesso total a infraestrutura:

| Credencial | Arquivo | Risco |
|-----------|---------|-------|
| `VERCEL_TOKEN` | `.env` | Deploy de codigo malicioso em producao |
| `SHOPIFY_API_SECRET` | `shopify-gateway/.env` | Acesso a API Shopify de todos os lojistas |
| `SUPABASE_SERVICE_ROLE_KEY` | `shopify-gateway/.env` | Bypass total de RLS — acesso a TODOS os dados |
| `DATABASE_URL` (postgres) | `shopify-gateway/.env` | Acesso direto ao banco de dados |
| `ENCRYPTION_KEY` (AES-256) | `shopify-gateway/.env` | Descriptografar todos os tokens Shopify |

**Acao imediata**:
1. Revogar o Vercel Token em https://vercel.com/account/tokens
2. Rotacionar Shopify API Secret no painel Shopify
3. Rotacionar Supabase Service Role Key em Dashboard > Settings > API
4. Gerar nova ENCRYPTION_KEY e re-criptografar tokens existentes
5. Verificar se `.env` esta no git history — se sim, limpar com `git filter-repo`

---

### C2. Senha do painel Master armazenada em sessionStorage

**Arquivo**: `src/pages/MasterPage.tsx` (linhas 67, 107-108)

```typescript
sessionStorage.setItem('vizzu_master_pw', password);  // texto puro!
```

Qualquer script JS na pagina (XSS, extensao maliciosa) pode ler a senha do Master. Visivel no DevTools.

**Correcao**:
- Nao armazenar a senha — usar token JWT temporario retornado pelo RPC
- Implementar rate limiting no `master_verify_password` (5 tentativas, lockout 15min)
- Adicionar 2FA (TOTP) para acesso Master

---

### C3. Admin hardcoded por email (sem verificacao server-side)

**Arquivo**: `src/pages/AdminReportsPage.tsx` (linha 16)

```typescript
const ADMIN_EMAIL = 'kaiquelearner@gmail.com';  // Check apenas no frontend!
```

Qualquer pessoa que conseguir autenticar com esse email (ou spoofar) tem acesso admin. O check eh puramente frontend — nao existe verificacao no backend.

**Correcao**:
- Criar tabela `admin_roles` com RLS
- Verificar role via RPC `SECURITY DEFINER` no backend
- Todas as acoes admin devem ser validadas server-side

---

### C4. Race condition em creditos — geracao gratis possivel

**Arquivo**: `src/hooks/useCredits.ts` (linhas 237-254, 349-403)

```typescript
catch (e: any) {
  setLocalData(prev => ({ ...prev, credits: prev.credits + amount }));
  return true;  // Retorna sucesso mesmo com erro!
}
```

Problemas:
- Se a rede falha apos debitar, os creditos sao "devolvidos" localmente mas a geracao pode ter rodado
- 2 requests simultaneos leem o mesmo saldo — ambos debitam, mas so 1 deveria passar
- Update otimista sem confirmacao do servidor

**Correcao**:
- Remover update otimista para operacoes de credito
- Usar `SELECT ... FOR UPDATE` no RPC de debito (lock pessimista)
- So atualizar state local APOS confirmacao do servidor

---

### C5. Onboarding e Termos burlados via localStorage

**Arquivos**: `src/hooks/useOnboardingProfile.ts` (linha 25), `src/hooks/useTermsAcceptance.ts` (linha 25)

```typescript
if (localStorage.getItem(LS_KEY) === userId) {
  setHasCompleted(true);  // Confia cegamente no localStorage
  return;
}
```

Usuario pode abrir DevTools > Application > localStorage e setar essas keys para pular onboarding e aceite de termos.

**Correcao**:
- Sempre validar no Supabase (source of truth), usar localStorage apenas como cache de performance
- Se localStorage diz "completo" mas Supabase diz "nao", resetar localStorage

---

### C6. Token Shopify armazenado em texto puro E criptografado

**Arquivo**: `shopify-gateway/app/routes/api.connect-vizzu.tsx` (linhas 93-94)

```typescript
access_token_encrypted: encrypt(session.accessToken),
access_token_plain: session.accessToken,  // POR QUE?!
```

Ambas as versoes (criptografada E texto puro) sao salvas no banco. A criptografia eh inutil se o texto puro esta ao lado.

**Correcao**:
- Remover `access_token_plain` do banco e do codigo
- Armazenar APENAS a versao criptografada
- Descriptografar em memoria apenas quando necessario

---

## ALTO (Corrigir esta semana)

### A1. URLs de webhooks N8N hardcoded e expostas

**Arquivos**: `src/lib/api/studio.ts`, `src/components/CreativeStill/CreativeStillEditor.tsx`, `vite.config.ts`

URLs como `https://n8nwebhook.brainia.store/webhook/vizzu/...` estao hardcoded no bundle JS. Qualquer pessoa pode:
- Ver as URLs no DevTools > Network
- Chamar os webhooks diretamente sem o frontend
- Disparar geracoes, enviar WhatsApp, exportar pra Shopify

**Correcao**:
- Usar variaveis de ambiente (`VITE_N8N_WEBHOOK_URL`)
- Idealmente: proxy via backend que assina requests com HMAC
- Rate limiting por IP nos webhooks

---

### A2. Endpoint de debug ativo em producao

**Arquivo**: `shopify-gateway/app/routes/api.debug-product.tsx`

```typescript
// REMOVER APOS DEBUG  <-- comentario no proprio arquivo
```

Endpoint sem autenticacao que retorna dados de produtos de qualquer loja Shopify.

**Correcao**: Deletar o arquivo imediatamente.

---

### A3. Sem rate limiting no painel Master

**Arquivo**: `src/pages/MasterPage.tsx` (linhas 98-118)

Tentativas de senha ilimitadas. Brute force possivel.

**Correcao**:
- Rate limit no RPC: max 5 tentativas/minuto
- Lockout exponencial apos falhas
- Logar todas as tentativas com IP e timestamp

---

### A4. Supabase project ID hardcoded no codigo

**Arquivos**: `ProductStudioEditor.tsx`, `CreativeStillEditor.tsx`, `ModelsPage.tsx`

```typescript
const publicUrl = `https://dbdqiqehuapcicejnzyd.supabase.co/storage/v1/...`;
```

Facilita reconhecimento e ataques direcionados.

**Correcao**: Usar `import.meta.env.VITE_SUPABASE_URL` em vez de hardcodar.

---

### A5. Sem CSRF protection nos requests ao N8N

**Arquivos**: `src/lib/api/studio.ts`, `billing.ts`, `shopify.ts`

Nenhum token CSRF. Ataque possivel: pagina maliciosa faz POST para os webhooks usando o browser da vitima.

**Correcao**: Adicionar header `X-CSRF-Token` validado pelo backend.

---

### A6. Token refresh nao tratado explicitamente

**Arquivo**: `src/contexts/AuthContext.tsx` (linhas 51-79)

Se o token JWT expira durante uma geracao, o request falha silenciosamente. Nenhum retry ou aviso ao usuario.

**Correcao**:
- Chamar `supabase.auth.refreshSession()` antes de operacoes criticas
- Mostrar modal "Sessao expirada" em vez de falha silenciosa

---

## MEDIO (Corrigir em 2 semanas)

### M1. Sem headers de seguranca (CSP, X-Frame-Options)

**Arquivo**: `vercel.json`

Nenhum header de seguranca configurado. Vulneravel a:
- XSS (sem Content-Security-Policy)
- Clickjacking (sem X-Frame-Options)
- MIME sniffing (sem X-Content-Type-Options)

**Correcao**: Adicionar em `vercel.json`:
```json
{
  "headers": [{
    "source": "/(.*)",
    "headers": [
      { "key": "X-Frame-Options", "value": "SAMEORIGIN" },
      { "key": "X-Content-Type-Options", "value": "nosniff" },
      { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
      { "key": "X-XSS-Protection", "value": "1; mode=block" }
    ]
  }]
}
```

---

### M2. Sem validacao de input no Master panel

**Arquivo**: `src/pages/MasterPage.tsx` (linhas 220-240)

`field` e `value` passados direto ao RPC sem validacao. Possivel setar creditos negativos, planos invalidos etc.

**Correcao**: Validar frontend + backend (whitelist de fields e ranges de values).

---

### M3. Dados sensiveis no localStorage nao limpos no logout

**Arquivo**: `src/contexts/AuthContext.tsx` (linhas 109-114)

Keys que ficam apos logout: `vizzu_company_settings`, `vizzu_clients`, `vizzu_history`, `vizzu_onboarding_completed`.

**Correcao**: Limpar TODAS as keys `vizzu_*` no logout.

---

### M4. Sem rate limiting nos endpoints de geracao

**Arquivo**: `src/lib/api/studio.ts`

Usuario pode spam requests de geracao > sobrecarregar N8N > custo descontrolado.

**Correcao**: Rate limit client-side (ja tem lock de geracao) + server-side nos webhooks.

---

### M5. Hash do Shopify connect sem validacao

**Arquivo**: `src/components/ShopifyConnectHandler.tsx` (linhas 32-49)

Parametro `shop` nao validado. Formato esperado: `^[a-zA-Z0-9-]+\.myshopify\.com$`.

**Correcao**: Validar regex do shop + verificar HMAC antes de prosseguir.

---

### M6. TypeScript strict mode desabilitado

**Arquivo**: `tsconfig.json`

```json
"strict": false
```

Permite tipos `any` implicitos, null operations inseguras, codigo morto.

**Correcao**: Habilitar `"strict": true` gradualmente.

---

### M7. ProductsContext engole erros silenciosamente

**Arquivo**: `src/contexts/ProductsContext.tsx` (linhas 216-219)

Erro no carregamento nao limpa o state — produtos stale ficam na tela.

**Correcao**: Limpar `setProducts([])` em caso de erro + mostrar retry.

---

## BAIXO (Nice to have)

### B1. Sem audit logging de operacoes sensíveis
Geracoes, billing, acoes admin nao sao logadas. Criar tabela `audit_logs`.

### B2. Error messages expoe detalhes internos
`humanizeApiError()` ainda revela tipos de erro (503, 429, safety).

### B3. Flag de debug persiste em producao
`localStorage.getItem('vizzu-debug-slow')` em MasterPage.tsx.

### B4. Sem Subresource Integrity (SRI) em assets CDN
Assets externos podem ser comprometidos sem SRI hashes.

---

## Pontos Positivos (ja esta correto)

- Service Role Key NAO exposta no frontend
- Sem `dangerouslySetInnerHTML`, `innerHTML` ou `eval()` — sem XSS direto
- Source maps desabilitados em producao
- BroadcastChannel para sync cross-tab (seguro)
- CORS no Shopify gateway restrito a `vizzu.pro`
- Creditos debitados via RPC (nao UPDATE direto)

---

## Plano de Acao Priorizado

### Hoje (antes de dormir)
1. Revogar Vercel Token
2. Verificar se `.env` files estao no git history

### Amanha
3. Rotacionar: Shopify Secret, Supabase Service Role, Encryption Key
4. Deletar `api.debug-product.tsx`
5. Remover `access_token_plain` do banco

### Esta semana
6. Fix sessionStorage da senha Master (usar JWT)
7. Fix race condition de creditos (lock pessimista)
8. Adicionar headers de seguranca no vercel.json
9. Rate limiting no Master

### Proximas 2 semanas
10. Mover URLs N8N para env vars
11. Cleanup localStorage no logout
12. Validacao de inputs no Master panel
13. Audit logging

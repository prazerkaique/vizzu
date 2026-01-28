# Segurança do Sistema de Créditos - TODO

> **Status:** Pendente
> **Prioridade:** Alta
> **Data:** 2026-01-25

---

## Problemas Identificados

### 1. Endpoints n8n sem autenticação
Os webhooks do n8n aceitam qualquer requisição. Qualquer pessoa que descubra a URL pode usar sem autenticação:
```
POST https://seu-n8n.com/vizzu/modelo-ia-v2
POST https://seu-n8n.com/vizzu/studio/generate
POST https://seu-n8n.com/vizzu/cenario-criativo
POST https://seu-n8n.com/vizzu/provador
POST https://seu-n8n.com/vizzu/generate-model-images
```

### 2. Créditos não são verificados no backend
Os workflows de geração:
- NÃO verificam se o usuário existe
- NÃO verificam se tem créditos suficientes ANTES de processar
- NÃO deduzem créditos após o uso

### 3. Verificação apenas no frontend
A verificação de créditos (`checkCreditsAndShowModal` em `App.tsx`) acontece só no frontend - pode ser bypassada com DevTools ou chamadas diretas à API.

---

## Solução Recomendada

### Fluxo Seguro para cada Workflow n8n

```
[Webhook]
    ↓
[1. Validar Autenticação]
    - Extrair token JWT do header Authorization
    - Verificar assinatura com SUPABASE_JWT_SECRET
    - Extrair user_id do token (sub claim)
    ↓
[2. Verificar Créditos]
    - SELECT balance FROM user_credits WHERE user_id = ?
    - Se balance < custo → responder 402 Payment Required
    ↓
[3. Reservar Créditos (Atômico)]
    - UPDATE user_credits
      SET balance = balance - custo
      WHERE user_id = ? AND balance >= custo
    - Se affected_rows = 0 → race condition, responder 402
    ↓
[4. Processar Geração]
    - Chamar Flux/Replicate/Gemini
    ↓
[5. Em caso de ERRO na geração]
    - Devolver créditos: UPDATE user_credits SET balance = balance + custo
    - Registrar transação de refund
    ↓
[6. Registrar Transação]
    - INSERT INTO credit_transactions (user_id, type, amount, balance_after, description, reference_id)
    ↓
[Respond Success com credits_remaining]
```

### Código de Validação JWT para n8n (Node Code)

```javascript
// Validar JWT do Supabase
const jwt = require('jsonwebtoken');

const authHeader = $input.first().json.headers?.authorization;
if (!authHeader || !authHeader.startsWith('Bearer ')) {
  throw new Error('UNAUTHORIZED: Missing or invalid Authorization header');
}

const token = authHeader.replace('Bearer ', '');
const SUPABASE_JWT_SECRET = $env.SUPABASE_JWT_SECRET;

try {
  const decoded = jwt.verify(token, SUPABASE_JWT_SECRET);
  const userId = decoded.sub;

  // Verificar se userId do token bate com userId do body
  if (userId !== $json.body.userId) {
    throw new Error('FORBIDDEN: User ID mismatch');
  }

  return { userId, ...decoded };
} catch (err) {
  throw new Error('UNAUTHORIZED: Invalid token - ' + err.message);
}
```

### Query Atômica de Dedução de Créditos

```sql
-- Deduzir créditos de forma atômica (evita race conditions)
UPDATE user_credits
SET balance = balance - $custo,
    lifetime_used = lifetime_used + $custo,
    updated_at = NOW()
WHERE user_id = $userId
  AND balance >= $custo
RETURNING balance;

-- Se RETURNING retornar vazio, significa que:
-- 1. Usuário não existe, OU
-- 2. Saldo insuficiente
-- → Rejeitar com erro 402
```

---

## Custos por Operação

| Operação | Créditos |
|----------|----------|
| Studio Ready | 1 |
| Product Studio (por ângulo) | 1 |
| Cenário Criativo | 2 |
| Modelo IA (describe) | 1 |
| Modelo IA (composer) | 2 |
| Provador | 3 |
| Gerar Modelo Salvo | 0 (custo é ao usar) |

---

## Mudanças no Frontend

Após implementar segurança no backend, o frontend precisa:

1. **Enviar token JWT** em todas as requisições:
```typescript
const response = await fetch(url, {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`
  },
  body: JSON.stringify(data)
});
```

2. **Tratar erro 402** (Payment Required):
```typescript
if (response.status === 402) {
  // Mostrar modal de créditos insuficientes
  showCreditExhaustedModal();
}
```

---

## Checklist de Implementação

- [ ] Adicionar validação JWT em todos os workflows de geração
- [ ] Implementar verificação de créditos ANTES de processar
- [ ] Implementar dedução atômica de créditos
- [ ] Implementar rollback em caso de falha na geração
- [ ] Registrar todas as transações em credit_transactions
- [ ] Atualizar frontend para enviar token JWT
- [ ] Atualizar frontend para tratar erro 402
- [ ] Adicionar rate limiting por usuário
- [ ] Testar cenários de race condition
- [ ] Testar cenários de falha de geração

---

## Workflows que precisam ser atualizados

1. `/vizzu/modelo-ia-v2` - Modelo IA
2. `/vizzu/studio/generate` - Product Studio
3. `/vizzu/studio-ready` - Studio Ready
4. `/vizzu/cenario-criativo` - Cenário Criativo
5. `/vizzu/provador` - Provador Virtual
6. `/vizzu/refine` - Refinar Imagem

---

## Referências

- [Supabase JWT Verification](https://supabase.com/docs/guides/auth/jwts)
- [n8n Code Node](https://docs.n8n.io/code/builtin/code-node/)
- Arquivo: `docs/billing-integration.md` - Schema do banco de dados

# Vizzu — Observações & Melhorias Futuras

Documento vivo com tudo que é paliativo hoje e precisa evoluir conforme o app escala.
Atualizado em: 2026-02-01

---

## URGENTE (fazer antes de ter clientes pagantes)

### 1. Segurança — Chaves de API expostas no client
- **Gemini API Key** está no código do front-end (`VITE_GEMINI_API_KEY`). Qualquer pessoa pode abrir o DevTools e ver a chave.
- **URLs do n8n** (webhooks) são visíveis no bundle. Alguém poderia chamar os endpoints diretamente.
- **Solução**: Mover chamadas de IA para o backend (n8n já faz isso parcialmente). A chave do Gemini nunca deve estar no front.
- **Nota**: A chave ANON do Supabase no front é normal (é projetada para ser pública), MAS depende de RLS estar ativo.

### 2. Segurança — Row Level Security (RLS) do Supabase
- O código filtra dados por `user_id` no front-end, mas se o RLS não estiver habilitado nas tabelas do Supabase, qualquer usuário autenticado pode ver os dados de outros.
- **Verificar**: Supabase Dashboard → cada tabela → RLS deve estar ON com policy tipo `auth.uid() = user_id`.
- **Tabelas críticas**: `products`, `product_images`, `clients`, `client_looks`, `generations`, `credit_transactions`.

### 3. Error Boundary — App crasha inteiro
- Hoje se qualquer componente React der erro, a tela fica em branco.
- **Solução**: Adicionar um `<ErrorBoundary>` no `main.tsx` que mostra uma tela de "algo deu errado" com botão de recarregar.

---

## IMPORTANTE (fazer quando começar a ter usuários)

### 4. Monitoramento de erros — Sem visibilidade
- Erros vão para `console.error` e ninguém vê em produção.
- **Solução**: Integrar Sentry (gratuito até 5K eventos/mês). Captura erros automaticamente e avisa por email.
- **Impacto**: Sem isso, não tem como saber se o app está quebrando para os clientes.

### 5. Retry em chamadas de API
- Se a internet piscar durante geração de imagem, o processo falha sem tentar de novo.
- **Solução**: Implementar retry com exponential backoff (espera 1s, 2s, 4s antes de desistir).
- **Onde**: `src/lib/api/studio.ts` — todas as chamadas `fetch()`.

### 6. Rate limiting — Spam de gerações
- Um usuário pode clicar 100 vezes no botão de gerar e disparar 100 chamadas simultâneas.
- **Solução client-side**: Debounce + desabilitar botão durante processamento (parcialmente feito).
- **Solução backend**: Rate limit por user_id no n8n ou API gateway.

### 7. Thumbnails — Hoje é client-side (paliativo)
- O sistema atual gera thumbnails no browser via Canvas e cacheia no IndexedDB.
- **Funciona bem** para o cenário atual, mas na primeira visita ainda baixa a imagem original.
- **Evolução**: Migrar para Supabase Image Transformations (plano Pro $25/mês) — redimensiona no servidor, serve via CDN, zero trabalho no client.
- **Migração será simples**: Só trocar a implementação interna do `getImageUrl()` em `src/utils/imageUrl.ts`.

### 8. Polling → WebSocket
- A verificação de status de geração de imagem usa polling (pergunta a cada 3s se terminou).
- Com poucos usuários, funciona. Com 100+ usuários simultâneos, sobrecarrega o banco.
- **Evolução**: Supabase Realtime (WebSocket) para receber notificação quando a geração termina.

### 9. Testes automatizados — Zero cobertura
- Nenhum teste unitário ou de integração existe.
- **Risco**: Cada mudança pode quebrar algo sem ninguém perceber.
- **Mínimo viável**: Testes para hooks críticos (`useCredits`, `useAuth`) + testes de API mocking.
- **Ferramentas**: Vitest (já integrado com Vite) + Testing Library.

---

## BOM TER (melhorias de qualidade)

### 10. Code splitting mais agressivo
- Hoje só 4 componentes pesados são lazy-loaded (ProductStudio, LookComposer, Provador, CreativeStill).
- As páginas DashboardPage, ProductsPage, ClientsPage, ModelsPage, SettingsPage carregam todas no bundle inicial.
- **Solução**: Lazy-load todas as páginas. Reduz o bundle inicial.

### 11. Contextos grandes demais
- `GenerationContext` tem 20+ estados. Quando um progresso de geração muda, todos os componentes que usam qualquer parte do contexto re-renderizam.
- **Evolução**: Dividir em contextos menores (GenerationStatusContext, MinimizedModalsContext) ou migrar para Zustand.

### 12. Créditos como Context
- Hoje `useCredits` é um hook e os valores são passados via props por vários níveis.
- **Evolução**: Mover para um `CreditsContext` para evitar prop drilling.

### 13. Validação de inputs
- Nomes de produto, dados de cliente, etc. não são sanitizados antes de enviar ao backend.
- **Risco**: XSS armazenado se alguém colocar `<script>` no nome do produto.
- **Solução**: Sanitizar inputs no front (DOMPurify) e validar no backend.

### 14. Analytics de uso
- Não tem tracking de quais features são mais usadas, onde usuários desistem, etc.
- **Solução**: PostHog (open source, self-hosted gratuito) ou Amplitude (free tier).
- **Impacto**: Sem dados, decisões de produto são baseadas em achismo.

### 15. PWA offline
- O Service Worker cacheia assets e imagens, mas o app não funciona offline de verdade.
- **Evolução**: Fila de operações offline que sincroniza quando volta a conexão.

### 16. Cache do Service Worker sem limite
- Todas as imagens do Supabase são cacheadas sem limite de tamanho.
- Com muitos produtos, pode encher o storage do dispositivo.
- **Solução**: Implementar LRU cache com limite (ex: 200MB max, remove mais antigos).

### 17. Indexes no banco de dados
- Verificar se existem indexes em: `products.user_id`, `product_images.product_id`, `client_looks.user_id`, `generations.user_id`.
- Sem indexes, queries ficam lentas conforme as tabelas crescem.

### 18. Acessibilidade (WCAG)
- Aria labels existem em alguns lugares mas não em todos.
- Navegação por teclado não foi verificada.
- **Evolução**: Audit com Lighthouse e corrigir issues de acessibilidade.

---

## Resumo por prioridade

| Prioridade | Item | Esforço |
|---|---|---|
| URGENTE | Chaves de API no front | Baixo |
| URGENTE | Verificar RLS Supabase | Baixo |
| URGENTE | Error Boundary | Baixo |
| IMPORTANTE | Sentry (monitoramento) | Baixo |
| IMPORTANTE | Retry em APIs | Médio |
| IMPORTANTE | Rate limiting | Médio |
| IMPORTANTE | Thumbnails → Supabase Pro | Baixo (migração) |
| IMPORTANTE | Polling → WebSocket | Médio |
| IMPORTANTE | Testes básicos | Alto |
| BOM TER | Code splitting | Baixo |
| BOM TER | Dividir contextos | Médio |
| BOM TER | Analytics | Baixo |
| BOM TER | Cache SW com limite | Médio |

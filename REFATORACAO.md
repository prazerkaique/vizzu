# Plano de Refatoracao do App.tsx

## PROGRESSO

| Passo | Descricao | Status |
|-------|-----------|--------|
| 1 | UIContext (theme, navigation, toast, sidebar) | Concluido |
| 2 | AuthContext (user, session, login/logout) | Concluido |
| 3 | HistoryContext (logs, persistencia) | Pendente |
| 4 | ProductsContext (CRUD, filtros, helpers) | Pendente |
| 5 | ClientsContext (CRUD, fotos, looks) | Pendente |
| 6 | GenerationContext (estados de geracao global) | Pendente |
| 7 | Extrair DashboardPage | Pendente |
| 8 | Extrair ProductsPage + modals | Pendente |
| 9 | Extrair ClientsPage + modals | Pendente |
| 10 | Extrair ModelsPage + wizard | Pendente |
| 11 | Extrair SettingsPage + abas | Pendente |
| 12 | Extrair CreateHubPage | Pendente |
| 13 | Extrair Layout (Sidebar, MobileNav, Header) | Pendente |
| 14 | Simplificar App.tsx final | Pendente |

**Branch**: `refactor/app-split`
**Backup**: branch `Correcoes` (estado pre-otimizacao)

> Para continuar em um novo chat: "Leia /workspaces/vizzu/REFATORACAO.md e veja o git log. Continue a refatoracao de onde parou."

---

## Estado Atual (Pre-Refatoracao)

**App.tsx**: 7.992 linhas, 117 useState, 0 Context, componente monolitico.

Tudo vive dentro de uma unica funcao `App()`:
- Autenticacao
- Navegacao (roteamento manual)
- CRUD de Produtos (35 estados, ~20 funcoes)
- CRUD de Clientes (18 estados, ~15 funcoes)
- Dashboard (rendering + stats)
- Settings (6 abas, ~10 estados)
- Modelos IA (12 estados, ~10 funcoes)
- Provador (17 estados, ~15 funcoes)
- Look Composer (4 estados de geracao)
- Product Studio (4 estados de geracao)
- Creative Still (0 estado, so props)
- Historico (2 estados, ~3 funcoes)
- Creditos (via hook useCredits)
- UI Global (tema, sidebar, toasts, modals, swipe)

---

## Arquitetura Alvo

```
App.tsx (~200 linhas)
  |-- Providers (Auth, Theme, Toast, Credits)
  |-- Layout (Sidebar + MobileNav + Header)
  |-- Router (renderiza pagina ativa)
       |-- DashboardPage
       |-- ProductsPage (inclui modals de criar/editar/detalhe)
       |-- ClientsPage (inclui modals de criar/editar/detalhe)
       |-- ModelsPage (inclui wizard de criar modelo)
       |-- SettingsPage (abas internas)
       |-- CreateHubPage (grid de ferramentas)
       |-- ProductStudio (ja separado, lazy)
       |-- Provador (ja separado, lazy)
       |-- LookComposer (ja separado, lazy)
       |-- CreativeStill (ja separado, lazy)
```

---

## Dependencias Entre Features (Mapa de Dados)

Estados compartilhados entre 2+ features:

| Estado | Usado por |
|--------|-----------|
| `products` | Dashboard, ProductsPage, ProductStudio, LookComposer, CreativeStill, Provador |
| `clients` | ClientsPage, Provador |
| `clientLooks` | ClientsPage, Provador, Dashboard |
| `savedModels` | ModelsPage, LookComposer |
| `userCredits` | Dashboard, todas as ferramentas de criacao, Settings |
| `currentPlan` | Dashboard, todas as ferramentas, Settings |
| `user` | Auth, todas as paginas (userId para Supabase) |
| `theme` | TODAS as paginas/componentes |
| `historyLogs` | Settings/History, Dashboard |
| `currentPage` | Navegacao, Sidebar, MobileNav |
| `toast` | Qualquer pagina pode disparar |
| `successNotification` | Qualquer pagina pode disparar |

---

## Estrategia: Contexts

Precisamos criar Contexts para os dados compartilhados:

### 1. AuthContext
- `user`, `isAuthenticated`
- `login()`, `logout()`
- Carrega sessao do Supabase no mount

### 2. ProductsContext
- `products`, `filteredProducts`
- `loadUserProducts()`, `saveProduct()`, `deleteProduct()`, `updateProduct()`
- `getProductDisplayImage()`, `isProductOptimized()`, `getOptimizedImages()`, `getOriginalImages()`
- Filtros: searchTerm, filterCategory, etc.

### 3. ClientsContext
- `clients`, `filteredClients`, `clientsWithProvador`
- `loadUserClients()`, `createClient()`, `deleteClient()`, `updateClient()`
- `uploadClientPhoto()`, `saveClientPhotoToDb()`, `getClientPhoto()`
- `clientLooks`, `loadClientLooks()`, `saveClientLook()`, `deleteClientLook()`

### 4. UIContext
- `theme`, `setTheme`
- `currentPage`, `navigateTo()`, `goBack()`
- `sidebarCollapsed`, `setSidebarCollapsed`
- `toast`, `showToast()`
- `successNotification`

### 5. HistoryContext
- `historyLogs`
- `addHistoryLog()`, `loadUserHistory()`

### 6. ModelsContext
- `savedModels`
- `saveModel()`, `deleteModel()`, `loadSavedModels()`
- Wizard state (newModel, step, etc.)

### 7. GenerationContext
- Estado de geracao global (para as barrinhas flutuantes minimizadas)
- `isGeneratingProductStudio`, `isGeneratingProvador`, `isGeneratingLookComposer`
- `productStudioMinimized`, `provadorMinimized`, `lookComposerMinimized`
- Progress e loading text de cada

O hook `useCredits` ja existe e funciona bem - nao precisa virar Context.

---

## Passos da Refatoracao (Ordem de Execucao)

Cada passo eh independente e pode ser commitado separadamente.
Apos cada passo, o app deve continuar funcionando normalmente.

### Passo 1: Criar UIContext
**Risco: Baixo** | **Impacto: Alto**

Extrair do App.tsx:
- `theme`, `setTheme` (linha 384)
- `currentPage`, `navigateTo()`, `goBack()` (linhas 188-214)
- `pageHistory` (linha 192)
- `sidebarCollapsed`, `setSidebarCollapsed` (linha 218)
- `toast`, `showToast()`, `toastTimerRef` (linhas 248, 1399-1405)
- `successNotification`, `setSuccessNotification` (linha 232)
- `showVideoTutorial` (linha 325)

Criar: `src/contexts/UIContext.tsx`

Apos: todas as paginas usam `useUI()` em vez de receber props.

### Passo 2: Criar AuthContext
**Risco: Baixo** | **Impacto: Medio**

Extrair do App.tsx:
- `user`, `setUser` (linha 186)
- `isAuthenticated`, `setIsAuthenticated` (linha 185)
- useEffect de auth session + onAuthStateChange (linhas 1148-1219)
- `handleLogout()` (linhas 2910-2915)

Criar: `src/contexts/AuthContext.tsx`

Apos: `useAuth()` disponivel em qualquer componente.

### Passo 3: Criar HistoryContext
**Risco: Baixo** | **Impacto: Baixo**

Extrair do App.tsx:
- `historyLogs`, `setHistoryLogs` (linhas 281-287)
- `handleAddHistoryLog()` (linhas 3268-3287)
- `saveHistoryToSupabase()` (linhas 1105-1128)
- `loadUserHistory()` (linhas 1059-1103)
- useEffect de persistir no localStorage (linha 629)

Criar: `src/contexts/HistoryContext.tsx`

### Passo 4: Criar ProductsContext
**Risco: Medio** | **Impacto: Alto**

Extrair do App.tsx:
- `products`, `setProducts` (linha 187)
- `filteredProducts` (useMemo, linha 726)
- Todos os filtros: searchTerm, filterCategoryGroup, filterCategory, filterColor, filterCollection (linhas 237-242)
- `visibleProductsCount` (linha 243)
- `selectedProducts`, bulk operations (linhas 244-245)
- `loadUserProducts()` (linhas 769-912)
- `handleUpdateProduct()` (linha 1314)
- `handleDeleteProduct()` (linhas 1469-1508)
- `handleDeleteSelectedProducts()` (linhas 1511-1554)
- `handleCreateProduct()` (linhas 1927-1992)
- Funcoes helper: `getProductDisplayImage`, `isProductOptimized`, `getOptimizedImages`, `getOriginalImages` (linhas 1323-1397)
- `productForCreation`, `lastCreatedProductId` (linhas 247, 234)

Criar: `src/contexts/ProductsContext.tsx`

### Passo 5: Criar ClientsContext
**Risco: Medio** | **Impacto: Alto**

Extrair do App.tsx:
- `clients`, `setClients` (linhas 258-280)
- `filteredClients`, `clientsWithProvador` (useMemo)
- `clientLooks`, `clientDetailLooks` (linhas 320, 290)
- `loadUserClients()` (linhas 915-999)
- `saveClientToSupabase()` (linhas 1003-1037)
- `deleteClientFromSupabase()` (linhas 1040-1053)
- `handleCreateClient()` (linhas 2167-2261)
- `handleDeleteClient()` (linhas 2263-2276)
- `uploadClientPhoto()` (linhas 2081-2121)
- `saveClientPhotoToDb()` (linhas 2124-2144)
- `loadClientLooks()`, `saveClientLook()`, `deleteClientLook()` (linhas 2375-2502)
- `getClientPhoto()` (linhas 2278-2285)
- useEffect de persistir no localStorage (linhas 614-626)

Criar: `src/contexts/ClientsContext.tsx`

### Passo 6: Criar GenerationContext
**Risco: Medio** | **Impacto: Medio**

Extrair do App.tsx:
- Estados de geracao: `isGeneratingProductStudio`, `productStudioMinimized`, `productStudioProgress`, `productStudioLoadingText` (linhas 328-331)
- Idem para LookComposer (linhas 334-337)
- Idem para Provador (linhas 310-313)
- `minimizedBarPos`, `dragRef`, `handleDragStart`, `getMinimizedPos`, `handleMinimizedClick` (linhas 340-382)
- `minimizedModals` (linha 545)

Criar: `src/contexts/GenerationContext.tsx`

### Passo 7: Extrair DashboardPage
**Risco: Baixo** | **Impacto: Alto**

Mover JSX do Dashboard (linhas 3749-4067) para:
`src/pages/DashboardPage.tsx`

Usa: `useProducts()`, `useClients()`, `useUI()`, `useCredits()`

### Passo 8: Extrair ProductsPage
**Risco: Medio** | **Impacto: Alto**

Mover JSX de Products (linhas 4656-4837) + modals de criar/editar/detalhe para:
`src/pages/ProductsPage.tsx`

Inclui:
- Grid de produtos
- Modal criar produto (linhas ~6200-6500)
- Modal detalhe produto (linhas ~6500-6700)
- Modal editar produto
- BulkImport modal
- Logica de long-press, selecao, filtros

### Passo 9: Extrair ClientsPage
**Risco: Medio** | **Impacto: Alto**

Mover JSX de Clients (linhas 4839-4942) + modals para:
`src/pages/ClientsPage.tsx`

Inclui:
- Lista de clientes
- Modal criar cliente (linhas ~5600-5700)
- Modal detalhe cliente (linhas ~5700-5900)
- Modal WhatsApp look
- Modal editar cliente

### Passo 10: Extrair ModelsPage
**Risco: Baixo** | **Impacto: Medio**

Mover JSX de Models (linhas 4425-4654) + wizard + detail modal para:
`src/pages/ModelsPage.tsx`

### Passo 11: Extrair SettingsPage
**Risco: Baixo** | **Impacto: Medio**

Mover JSX de Settings (linhas 4944-7656) para:
`src/pages/SettingsPage.tsx`

Pode ser subdividido em componentes por aba:
- ProfileTab, AppearanceTab, CompanyTab, PlanTab, IntegrationsTab, HistoryTab

### Passo 12: Extrair CreateHubPage
**Risco: Baixo** | **Impacto: Baixo**

Mover JSX do hub de criacao (linhas 4070-4280) para:
`src/pages/CreateHubPage.tsx`

### Passo 13: Extrair Layout (Sidebar + MobileNav + Header)
**Risco: Baixo** | **Impacto: Medio**

Mover para:
- `src/components/Layout/Sidebar.tsx` (linhas 3523-3714)
- `src/components/Layout/MobileHeader.tsx` (linhas 3717-3744)
- `src/components/Layout/MobileBottomNav.tsx` (linhas 5593-5625)
- `src/components/Layout/MinimizedBars.tsx` (linhas 7860-7969)
- `src/components/Layout/index.tsx` (combina tudo)

### Passo 14: Simplificar App.tsx
**Risco: Baixo** | **Impacto: Final**

App.tsx final fica:
```tsx
function App() {
  return (
    <AuthProvider>
      <UIProvider>
        <ProductsProvider>
          <ClientsProvider>
            <HistoryProvider>
              <GenerationProvider>
                <Layout>
                  <PageRouter />
                </Layout>
              </GenerationProvider>
            </HistoryProvider>
          </ClientsProvider>
        </ProductsProvider>
      </UIProvider>
    </AuthProvider>
  );
}
```

---

## Regras de Seguranca

1. **Um passo por vez** — commit apos cada passo, testar antes de avancar
2. **Nao mudar logica** — apenas mover codigo, sem refatorar comportamento
3. **Manter backward compatibility** — se algo quebrar, reverter o passo
4. **Branch separado** — trabalhar em branch `refactor/contexts` ou similar
5. **Testar fluxos criticos apos cada passo**:
   - Login/logout
   - Criar produto com foto
   - Criar cliente com foto
   - Gerar imagem no Product Studio
   - Gerar look no Provador
   - Navegar entre paginas
   - Tema dark/light
   - Creditos (verificar saldo)

---

## Estrutura Final de Pastas

```
src/
  contexts/
    AuthContext.tsx
    UIContext.tsx
    ProductsContext.tsx
    ClientsContext.tsx
    HistoryContext.tsx
    GenerationContext.tsx
  pages/
    DashboardPage.tsx
    ProductsPage.tsx
    ClientsPage.tsx
    ModelsPage.tsx
    SettingsPage.tsx
    CreateHubPage.tsx
  components/
    Layout/
      index.tsx
      Sidebar.tsx
      MobileHeader.tsx
      MobileBottomNav.tsx
      MinimizedBars.tsx
    ProductStudio/  (ja existe)
    LookComposer/   (ja existe)
    CreativeStill/  (ja existe)
    Provador/       (ja existe)
    ...outros componentes existentes
  hooks/
    useCredits.ts   (ja existe)
    useDebounce.ts  (ja existe)
  services/
    supabaseClient.ts (ja existe)
  lib/
    api/
      billing.ts    (ja existe)
      studio.ts     (ja existe)
  types.ts          (ja existe)
  App.tsx            (~200 linhas)
  main.tsx
```

---

## Estimativa de Complexidade por Passo

| Passo | O que | Risco | Dependencias |
|-------|-------|-------|-------------|
| 1 | UIContext | Baixo | Nenhuma |
| 2 | AuthContext | Baixo | Nenhuma |
| 3 | HistoryContext | Baixo | AuthContext (userId) |
| 4 | ProductsContext | Medio | AuthContext (userId) |
| 5 | ClientsContext | Medio | AuthContext (userId) |
| 6 | GenerationContext | Medio | Nenhuma |
| 7 | DashboardPage | Baixo | Contexts 1-5 |
| 8 | ProductsPage | Medio | ProductsContext |
| 9 | ClientsPage | Medio | ClientsContext |
| 10 | ModelsPage | Baixo | AuthContext |
| 11 | SettingsPage | Baixo | Todos os contexts |
| 12 | CreateHubPage | Baixo | UIContext |
| 13 | Layout | Baixo | UIContext, GenerationContext |
| 14 | Simplificar App | Baixo | Todos acima |

---

## Notas

- Os 4 componentes lazy (ProductStudio, LookComposer, Provador, CreativeStill) ja estao bem separados. Eles recebem dados via props e callbacks. Apos os Contexts, eles podem ler direto dos Contexts em vez de receber props — mas isso eh opcional e pode ser feito depois.

- O `useCredits` hook ja esta bem feito e nao precisa virar Context. Os componentes que precisam de creditos ja recebem via props ou podem chamar o hook diretamente.

- A migracao dos Provador states (17 estados) eh a mais delicada porque eles sao usados tanto pelo componente VizzuProvadorWizard (via props) quanto por funcoes no App.tsx. Sera tratado no ClientsContext + GenerationContext.

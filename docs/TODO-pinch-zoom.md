# Pinch-to-Zoom — Problemas Pendentes

**Status:** Desktop funciona (scroll wheel), mobile NÃO funciona.

## O que foi feito

- Componente `src/components/ImageViewer/ZoomableImage.tsx` — touch events nativos com `{ passive: false }`
- Componente `src/components/ImageViewer/ImageViewer.tsx` — overlay fullscreen global
- Componente `src/components/ImageViewer/ImageViewerContext.tsx` — context com `openViewer()` / `closeViewer()`
- Provider conectado em `src/main.tsx`
- CSS body lock em `src/index.css`
- Integrado em: ProductStudioResult, LookComposerResult (ZoomableImage no modal), GenerationHistory, EditorModal (openViewer), CreativeStillResults, ProductsPage, ClientsPage

## O que NÃO funciona

- Pinch-to-zoom (dois dedos) no mobile/PWA
- Double-tap zoom no mobile/PWA
- Pan com um dedo quando com zoom no mobile/PWA

## Possíveis causas a investigar

1. **`touch-action: pan-y` no CSS global** — Em `src/index.css` linha ~163, `.overflow-y-auto` e `.overflow-auto` recebem `touch-action: pan-y` em mobile. Se algum container pai do ZoomableImage tiver essas classes, o `touch-action: none` inline pode ser sobrescrito.

2. **`-webkit-touch-callout: none` + `-webkit-user-select: none` globais** — Podem interferir com multi-touch no iOS Safari.

3. **Viewport `user-scalable=no`** — Em `index.html` linha 11. Embora o `touch-action: none` no container devesse ser suficiente, o iOS Safari pode ignorar touch events de pinça quando `user-scalable=no` está no viewport.

4. **Containers pai com `overflow: hidden/auto`** — O modal pai (ProductStudioResult etc.) ou o AppLayout podem estar capturando/consumindo touch events antes do ZoomableImage.

5. **`stopPropagation` nos wrappers** — Os modais de zoom existentes têm `onClick={e => e.stopPropagation()}` nos containers que envolvem o ZoomableImage. Verificar se isso afeta touch events.

6. **React StrictMode** — Em `src/main.tsx`, `<React.StrictMode>` faz efeitos rodarem 2x em dev. Os listeners nativos podem ser adicionados e removidos incorretamente.

7. **Service Worker cache** — `public/sw.js` cacheia JS/CSS. O usuário pode estar vendo código antigo mesmo após deploy. Verificar se `sw.js` cache bust está funcionando.

## Próximos passos sugeridos

1. **Depurar no dispositivo real** — Conectar iPhone/Android via Safari Web Inspector ou Chrome DevTools remoto. Verificar se os touch events chegam ao handler com `console.log` no `handleTouchStart`.

2. **Criar página de teste isolada** — Uma rota `/test-zoom` com apenas um `<ZoomableImage>` sem nenhum container pai, para eliminar interferência de CSS/layout.

3. **Testar sem PWA** — Abrir direto no Safari mobile (não no PWA standalone) para isolar se é problema do standalone mode.

4. **Considerar alternativa: CSS `zoom` ou `scale()`** — Em vez de transform via JS, usar CSS nativo com `overflow: scroll` e imagem maior que o container, permitindo zoom/scroll nativo.

5. **Considerar lib testada em produção** — `react-medium-image-zoom` ou `react-zoom-pan-pinch` já resolvem edge cases de iOS Safari. Pode valer a pena trocar a implementação custom.

## Arquivos relevantes

- `src/components/ImageViewer/ZoomableImage.tsx` — componente de gestos
- `src/components/ImageViewer/ImageViewer.tsx` — overlay fullscreen
- `src/components/ImageViewer/ImageViewerContext.tsx` — context
- `src/components/ImageViewer/index.ts` — barrel exports
- `src/utils/springAnimation.ts` — utility de animação (pode ser removida se não usada)
- `src/index.css` — CSS global (touch-action, body lock)
- `index.html` — viewport meta tag

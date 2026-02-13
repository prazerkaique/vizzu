import type { TourStop } from './FeatureTour';

// ═══════════════════════════════════════════════════════════════
// Tour Stops — Definição dos pontos de parada por feature
// Cada stop aponta para um data-tour="xxx" no JSX da feature
// ═══════════════════════════════════════════════════════════════

export const PRODUCTS_TOUR_STOPS: TourStop[] = [
  {
    target: 'products-add',
    title: 'Adicionar produto',
    description: 'Clique aqui para cadastrar seu primeiro produto. Adicione nome, categoria, cor e uma foto frontal de boa qualidade.',
    placement: 'bottom',
  },
  {
    target: 'products-import',
    title: 'Importar em lote',
    description: 'Tem muitos produtos? Importe vários de uma vez com o importador em lote.',
    placement: 'bottom',
  },
  {
    target: 'products-search',
    title: 'Buscar produtos',
    description: 'Encontre qualquer produto rapidamente pelo nome, SKU ou categoria.',
    placement: 'bottom',
  },
  {
    target: 'products-filters',
    title: 'Filtros',
    description: 'Filtre por categoria, cor ou coleção para organizar seu catálogo.',
    placement: 'bottom',
  },
  {
    target: 'products-card',
    title: 'Card do produto',
    description: 'Clique em qualquer produto para abrir o Hub 360° — lá você acessa todas as ferramentas de IA para aquele produto.',
    placement: 'top',
  },
];

export const PRODUCT_STUDIO_TOUR_STOPS: TourStop[] = [
  {
    target: 'studio-info-card',
    title: 'O que é o Product Studio?',
    description: 'O Product Studio gera automaticamente fotos profissionais em múltiplos ângulos com fundo cinza de estúdio.',
    placement: 'bottom',
  },
  {
    target: 'studio-search',
    title: 'Buscar produto',
    description: 'Encontre o produto que deseja fotografar pelo nome ou SKU.',
    placement: 'bottom',
  },
  {
    target: 'studio-filters',
    title: 'Filtros',
    description: 'Use filtros para encontrar rapidamente entre muitos produtos.',
    placement: 'bottom',
  },
  {
    target: 'studio-product-list',
    title: 'Selecionar produto',
    description: 'Clique no produto para selecioná-lo. Ele precisa ter uma foto frontal cadastrada.',
    placement: 'top',
  },
  {
    target: 'studio-optimized',
    title: 'Produtos otimizados',
    description: 'Após gerar, seus produtos otimizados aparecem aqui. Clique para ver todas as fotos, editar ou baixar.',
    placement: 'top',
  },
];

export const LOOK_COMPOSER_TOUR_STOPS: TourStop[] = [
  {
    target: 'look-new',
    title: 'Novo Look',
    description: 'Clique para criar um novo look. Você vai montar uma combinação de peças e ver em um modelo IA.',
    placement: 'bottom',
  },
  {
    target: 'look-gallery',
    title: 'Galeria de looks',
    description: 'Seus looks gerados aparecem aqui. Deslize entre frente e costas.',
    placement: 'top',
  },
  {
    target: 'look-with-products',
    title: 'Produtos com looks',
    description: 'Veja quais produtos já têm looks gerados e quantos.',
    placement: 'top',
  },
  {
    target: 'look-without-products',
    title: 'Produtos sem looks',
    description: 'Produtos que ainda não foram usados em nenhum look aparecem aqui.',
    placement: 'top',
  },
  {
    target: 'look-credits',
    title: 'Seus créditos',
    description: 'Cada look custa 1-2 créditos. Veja seu saldo aqui.',
    placement: 'bottom',
  },
];

export const CREATIVE_STILL_TOUR_STOPS: TourStop[] = [
  {
    target: 'still-search',
    title: 'Buscar produto',
    description: 'Encontre o produto principal para sua composição artística.',
    placement: 'bottom',
  },
  {
    target: 'still-filters',
    title: 'Filtros',
    description: 'Filtre por categoria, cor, coleção ou gênero.',
    placement: 'bottom',
  },
  {
    target: 'still-with-products',
    title: 'Produtos com stills',
    description: 'Produtos que já têm composições criativas aparecem aqui com galeria.',
    placement: 'top',
  },
  {
    target: 'still-without-products',
    title: 'Produtos sem stills',
    description: 'Selecione um produto sem stills para criar sua primeira composição.',
    placement: 'top',
  },
  {
    target: 'still-recent-gallery',
    title: 'Stills recentes',
    description: 'Suas composições mais recentes aparecem nesta galeria. Clique para ver detalhes.',
    placement: 'top',
  },
];

export const PROVADOR_TOUR_STOPS: TourStop[] = [
  {
    target: 'provador-steps',
    title: 'Os 4 passos',
    description: 'O Provador funciona em 4 passos: escolher cliente, foto, look e enviar pelo WhatsApp.',
    placement: 'bottom',
  },
  {
    target: 'provador-client-search',
    title: 'Buscar cliente',
    description: 'Encontre clientes rapidamente pelo nome ou WhatsApp.',
    placement: 'bottom',
  },
  {
    target: 'provador-client-list',
    title: 'Seus clientes',
    description: 'Selecione um cliente existente ou cadastre um novo com foto.',
    placement: 'top',
  },
  {
    target: 'provador-client-create',
    title: 'Criar cliente',
    description: 'Cadastre clientes com foto frontal para usar o Provador Virtual.',
    placement: 'top',
  },
];

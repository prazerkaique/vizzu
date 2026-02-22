import { useMemo, useState, useEffect } from 'react';
import { useUI, type Page } from '../contexts/UIContext';
import { useAuth } from '../contexts/AuthContext';
import { useProducts } from '../contexts/ProductsContext';
import { useClients } from '../contexts/ClientsContext';
import { useHistory } from '../contexts/HistoryContext';
import { useCredits } from '../hooks/useCredits';
import { OptimizedImage } from '../components/OptimizedImage';
import { OnboardingProgress } from '../components/onboarding/OnboardingProgress';
import { useOnboarding } from '../hooks/useOnboarding';
import { supabase } from '../services/supabaseClient';
import { PartnerDashboardCard } from '../components/PartnerProgram/PartnerDashboardCard';
import type { Product, Client } from '../types';

// ── 50 dicas rotativas (carrossel automático) ──
const TIPS = [
 // Fotografia de produto
 'Use luz natural difusa para fotografar seus produtos — evite flash direto que cria sombras duras.',
 'Fundo branco ou cinza claro dá mais liberdade para a IA gerar cenários criativos e remover fundo.',
 'Fotografe o produto de frente, centralizado e sem inclinação — a IA usa essa imagem como referência principal.',
 'Evite fotos com marcas d\'água, textos ou logos sobrepostos — a IA pode reproduzi-los na imagem gerada.',
 'Quanto melhor a resolução da foto original, melhor o resultado da IA. Use no mínimo 1000×1000px.',
 'Para roupas, use cabide invisível ou manequim — a IA consegue gerar o ghost mannequin a partir disso.',
 'Fotografe acessórios (bolsas, sapatos, relógios) em ângulo de 3/4 para mostrar profundidade.',
 'Evite reflexos em produtos metálicos ou com vidro — use luz indireta ou difusor.',
 'Para produtos pequenos (joias, cosméticos), use macro ou aproxime bastante para capturar detalhes.',
 'Tire mais de uma foto por produto — ângulos diferentes ajudam a IA a entender a peça completa.',

 // Vizzu Product Studio®
 'O Vizzu Product Studio® gera múltiplos ângulos automaticamente — cadastre uma boa foto frontal e deixe a IA fazer o resto.',
 'Cadastre a categoria correta dos produtos para que o Vizzu Product Studio® gere os ângulos mais adequados.',
 'No Vizzu Product Studio®, o ângulo frontal é a referência principal — garanta que seja a melhor foto do produto.',
 'O Vizzu Product Studio® funciona melhor com peças isoladas — evite fotos com vários produtos juntos.',
 'Após gerar no Vizzu Product Studio®, use o editor integrado para ajustes finos antes de baixar.',
 'O ghost mannequin do Vizzu Product Studio® funciona melhor com roupas em cabide ou manequim claro.',

 // Vizzu Look Composer®
 'No Vizzu Look Composer®, combine até 4 peças para criar looks completos com modelo IA.',
 'Para o Vizzu Look Composer®, selecione peças que combinam entre si — a IA monta o look no modelo escolhido.',
 'Crie modelos personalizados com características específicas para representar melhor seu público-alvo.',
 'No Vizzu Look Composer®, as observações do modelo (físico, cabelo, pele) influenciam diretamente o resultado.',
 'Use o Vizzu Look Composer® para criar lookbooks completos de coleção — ideal para catálogos sazonais.',
 'O Vizzu Look Composer® preserva fielmente as cores das peças — use fotos com cores bem definidas.',

 // Vizzu Still Criativo®
 'Use o Vizzu Still Criativo® para composições estilizadas — perfeito para redes sociais e campanhas.',
 'No Vizzu Still Criativo®, a estética "Flat Lay" funciona muito bem para acessórios e produtos pequenos.',
 'Experimente diferentes presets de iluminação no Vizzu Still Criativo® — cada um muda completamente o mood.',
 'O Vizzu Still Criativo® permite adicionar elementos decorativos à cena — flores, tecidos, objetos temáticos.',
 'Para campanhas sazonais, use o Vizzu Still Criativo® com mood e estação do ano definidos no template.',
 'Salve seus templates favoritos no Vizzu Still Criativo® para reutilizar em novos produtos rapidamente.',
 'No Vizzu Still Criativo®, a profundidade de campo controla o desfoque — use 30-50 para foco seletivo.',

 // Vizzu Provador®
 'O Vizzu Provador® funciona melhor com fotos corporais bem enquadradas — da cabeça aos pés.',
 'Para o Vizzu Provador®, peça ao cliente uma foto com roupa justa e neutra para melhor resultado.',
 'O Vizzu Provador® é ideal para vendas por WhatsApp — envie o resultado direto para o cliente.',
 'Fotos do cliente com boa iluminação e fundo limpo geram resultados mais realistas no Vizzu Provador®.',
 'Cadastre gênero do cliente corretamente — o Vizzu Provador® usa essa informação para ajustar o resultado.',

 // Download e formatos
 'Baixe suas imagens em diferentes tamanhos usando o sistema de download — são 6 presets otimizados para cada canal.',
 'Para e-commerce, use o preset "E-commerce" (2048px WebP) — balanceia qualidade e velocidade de carregamento.',
 'Para Instagram e redes sociais, use o preset "Redes Sociais" (1080px JPEG) — tamanho ideal para feed.',
 'O preset "Marketplaces" (1200px JPEG) é otimizado para Mercado Livre, Shopee e Amazon.',
 'Use o download em ZIP quando precisar baixar várias imagens de uma vez — economiza tempo.',
 'O formato WebP é até 30% menor que JPEG com mesma qualidade — ideal para sites e blogs.',
 'O preset "Original" mantém a resolução nativa em PNG — use para edição profissional ou impressão.',

 // Catálogo e organização
 'Preencha a descrição dos produtos com detalhes de material, textura e acabamento — a IA usa essas informações.',
 'Organize seus produtos por categoria para encontrar rapidamente na hora de gerar imagens.',
 'Produtos com nome descritivo facilitam a busca e organização — "Vestido Longo Floral" é melhor que "Prod 001".',
 'Use a cor do produto no cadastro para facilitar filtros e buscas no seu catálogo.',

 // E-commerce e marketing
 'Imagens profissionais aumentam em até 40% a taxa de conversão em e-commerce.',
 'Consistência visual no catálogo transmite profissionalismo — use o mesmo estilo em todas as fotos.',
 'Para anúncios pagos, use imagens com modelo vestindo o produto — geram mais clique que fotos isoladas.',
 'Crie variações de uma mesma foto para testes A/B — descubra qual estilo converte mais.',
 'Atualize as fotos dos produtos sazonalmente — looks de verão no verão, inverno no inverno.',
];

interface DashboardPageProps {
  setProductForCreation?: (p: Product | null) => void;
  onOpenClientDetail?: (client: Client) => void;
  /** Seta filtro de busca na galeria antes de navegar */
  onNavigateToGallery?: (productName: string) => void;
}

export function DashboardPage({ setProductForCreation, onOpenClientDetail, onNavigateToGallery }: DashboardPageProps) {
 const { theme, isV2, navigateTo, setSettingsTab } = useUI();
 const { user } = useAuth();
 const { products } = useProducts();
 const { clients, clientLooks } = useClients();
 const { historyLogs } = useHistory();
 const { userCredits, currentPlan } = useCredits({ userId: user?.id });
 const { isOnboardingActive } = useOnboarding();

 // Carrossel de dicas — troca a cada 10s
 const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * TIPS.length));

 useEffect(() => {
   const interval = setInterval(() => {
     setTipIndex(i => (i + 1) % TIPS.length);
   }, 10000);
   return () => clearInterval(interval);
 }, []);

 // Queries diretas para criações recentes (não dependem de contexto de outra página)
 const [recentStills, setRecentStills] = useState<{ id: string; imageUrl: string; name: string; date: string; productId?: string }[]>([]);
 const [recentProvadorLooks, setRecentProvadorLooks] = useState<{ id: string; imageUrl: string; clientId: string; date: string }[]>([]);
 const [totalStillsCount, setTotalStillsCount] = useState(0);

 useEffect(() => {
 if (!user?.id) return;

 // Creative Still generations (últimas 10 para exibição)
 supabase
 .from('creative_still_generations')
 .select('id, variation_urls, variation_1_url, variation_2_url, status, created_at, settings_snapshot, product_id')
 .eq('user_id', user.id)
 .eq('status', 'completed')
 .order('created_at', { ascending: false })
 .limit(10)
 .then(({ data }) => {
 if (data) {
 setRecentStills(data.map((g: any) => {
 const urls = g.variation_urls?.length ? g.variation_urls : [g.variation_1_url, g.variation_2_url].filter(Boolean);
 return {
 id: g.id,
 imageUrl: urls[0] || '',
 name: g.settings_snapshot?.product_name || 'Still Criativo',
 productId: g.product_id || undefined,
 date: g.created_at,
 };
 }).filter((s: any) => s.imageUrl));
 }
 });

 // Contagem total de Creative Stills (sem limit, para stats corretos)
 supabase
 .from('creative_still_generations')
 .select('id', { count: 'exact', head: true })
 .eq('user_id', user.id)
 .eq('status', 'completed')
 .then(({ count }) => {
 if (count !== null) setTotalStillsCount(count);
 });

 // Client looks (Provador) - direto do banco, sem depender do contexto
 supabase
 .from('client_looks')
 .select('id, image_url, client_id, created_at')
 .eq('user_id', user.id)
 .order('created_at', { ascending: false })
 .limit(10)
 .then(({ data }) => {
 if (data) {
 setRecentProvadorLooks(data.map((l: any) => ({
 id: l.id,
 imageUrl: l.image_url,
 clientId: l.client_id,
 date: l.created_at,
 })).filter((l: any) => l.imageUrl));
 }
 });
 }, [user?.id]);

 // ── Stats com contagem correta ──
 const dashboardStats = useMemo(() => {
 // Produtos com QUALQUER imagem gerada (PS, LC, CS, Cenário)
 const optimizedProducts = products.filter(p => {
 const gen = (p as any).generatedImages;
 if (!gen) return false;
 const hasPS = gen.productStudio?.some((s: any) => s.images?.length > 0);
 const hasLC = gen.modeloIA?.length > 0;
 const hasCenario = gen.cenarioCriativo?.length > 0;
 const hasLegacy = gen.studioReady?.[0]?.images?.front;
 return hasPS || hasLC || hasCenario || hasLegacy;
 }).length;

 // Total de imagens geradas (todas as features)
 const totalGenerations = products.reduce((total, p) => {
 const gen = (p as any).generatedImages;
 if (!gen) return total;
 const psCount = gen.productStudio?.reduce((s: number, sess: any) => s + (sess.images?.length || 0), 0) || 0;
 const lcCount = gen.modeloIA?.length || 0;
 const cenarioCount = gen.cenarioCriativo?.length || 0;
 const legacyCount = gen.studioReady?.[0]?.images?.front ? 1 : 0;
 return total + psCount + lcCount + cenarioCount + legacyCount;
 }, 0) + clientLooks.length + totalStillsCount;

 return { optimizedProducts, totalGenerations };
 }, [products, clientLooks, totalStillsCount]);

 // ── Nome do usuário com fallback inteligente ──
 const [genderState, setGenderState] = useState<'male' | 'female' | 'unknown'>('unknown');

 const userName = useMemo(() => {
   let resolvedName = 'usuário';
   try {
     const saved = localStorage.getItem('vizzu_company_settings');
     if (saved) {
       const parsed = JSON.parse(saved);
       if (parsed.userName) resolvedName = parsed.userName.split(' ')[0];
     }
   } catch { /* ignore */ }
   if (resolvedName === 'usuário') {
     const name = user?.name?.split(' ')[0];
     if (name && name !== 'Usuário') resolvedName = name;
     else if (user?.email) resolvedName = user.email.split('@')[0];
   }
   return resolvedName;
 }, [user]);

 // Detectar gênero via IA na primeira vez (contas antigas que não passaram pelo onboarding novo)
 useEffect(() => {
   try {
     const saved = localStorage.getItem('vizzu_company_settings');
     const parsed = saved ? JSON.parse(saved) : {};
     if (parsed.userGender) {
       setGenderState(parsed.userGender);
       return;
     }
   } catch { /* ignore */ }

   // Sem gênero salvo — detectar agora
   const nameToCheck = userName;
   if (!nameToCheck || nameToCheck === 'usuário') return;

   (async () => {
     try {
       const resp = await fetch(`https://api.genderize.io/?name=${encodeURIComponent(nameToCheck)}&country_id=BR`);
       const data = await resp.json();
       const detected: 'male' | 'female' | 'unknown' = (data.gender && data.probability > 0.85) ? data.gender : 'unknown';
       setGenderState(detected);
       // Salvar no localStorage pra não chamar de novo
       try {
         const existing = JSON.parse(localStorage.getItem('vizzu_company_settings') || '{}');
         localStorage.setItem('vizzu_company_settings', JSON.stringify({ ...existing, userGender: detected }));
       } catch { /* ignore */ }
     } catch { /* fallback unknown */ }
   })();
 }, [userName]);

 const greeting = genderState === 'female' ? 'Bem-vinda' : genderState === 'male' ? 'Bem-vindo' : 'Bem-vindo(a)';

 // ── Plano é o mais alto? ──
 const isTopPlan = currentPlan.id === 'enterprise' || currentPlan.id === 'premier';

 return (
 <div className={'flex-1 overflow-y-auto p-4 md:p-6 ' + (theme !== 'light' ? '' : 'bg-cream')}>
 <div className="max-w-5xl mx-auto">
 {/* Header com boas-vindas */}
 <div className="flex items-center justify-between mb-6">
 <div>
 <div className="flex items-center gap-2 mb-1">
 <h1 className={(isV2 ? 'text-3xl md:text-4xl font-extrabold tracking-tight leading-[1.1] text-gray-900' : 'text-xl font-extrabold ' + (theme !== 'light' ? 'text-white' : 'text-[#1A1A1A]'))}>Dashboard</h1>
 {!isV2 && <span className={'px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wide ' + (theme !== 'light' ? 'bg-neutral-800 text-neutral-400' : 'bg-[#373632] text-white')}>{currentPlan.name}</span>}
 </div>
 <p className={(theme !== 'light' ? 'text-neutral-400' : 'text-gray-500') + ' text-sm font-serif italic'}>
 {greeting}, <span className="font-medium">{userName}</span>
 </p>
 </div>
 <button
 onClick={() => navigateTo('create')}
 className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
 >
 <i className="fas fa-plus text-xs"></i>
 <span className="hidden md:inline">Novo Projeto</span>
 </button>
 </div>

 {/* COPILOTO ONBOARDING */}
 {isOnboardingActive && <OnboardingProgress theme={theme} />}

 {/* ÚLTIMAS CRIAÇÕES */}
 {(() => {
 // Combinar fontes de imagens geradas
 const recentCreations: { id: string; imageUrl: string; name: string; type: 'studio' | 'provador' | 'look' | 'still' | 'cenario'; date: string; productId?: string }[] = [];

 // Adicionar looks do Provador (query direta)
 recentProvadorLooks.forEach(look => {
 if (look.imageUrl) {
 const client = clients.find(c => c.id === look.clientId);
 recentCreations.push({
 id: look.id,
 imageUrl: look.imageUrl,
 name: client ? `${client.firstName}` : 'Provador',
 type: 'provador',
 date: look.date
 });
 }
 });

 // Adicionar Creative Still (query direta)
 recentStills.forEach(still => {
 recentCreations.push({
 id: `still-${still.id}`,
 imageUrl: still.imageUrl,
 name: still.name,
 type: 'still',
 productId: still.productId,
 date: still.date
 });
 });

 // Adicionar produtos com imagens geradas
 products.forEach(product => {
 const genImages = (product as any).generatedImages;

 // Vizzu Product Studio® (novo sistema)
 if (genImages?.productStudio?.length > 0) {
 genImages.productStudio.forEach((session: any) => {
 if (session.images?.length > 0) {
 const frontImg = session.images.find((img: any) => img.angle === 'front') || session.images[0];
 recentCreations.push({
 id: `studio-${product.id}-${session.id}`,
 imageUrl: frontImg.url,
 name: product.name,
 type: 'studio',
 productId: product.id,
 date: session.createdAt || frontImg.createdAt || new Date().toISOString()
 });
 }
 });
 }

 // Vizzu Look Composer®
 if (genImages?.modeloIA?.length > 0) {
 genImages.modeloIA.forEach((item: any) => {
 const imgUrl = item.images?.front || item.image_url || item.imageUrl;
 if (imgUrl) {
 recentCreations.push({
 id: `look-${product.id}-${item.id}`,
 imageUrl: imgUrl,
 name: product.name,
 type: 'look',
 productId: product.id,
 date: item.createdAt || item.created_at || new Date().toISOString()
 });
 }
 });
 }

 // Cenário Criativo
 if (genImages?.cenarioCriativo?.length > 0) {
 genImages.cenarioCriativo.forEach((item: any) => {
 const imgUrl = item.images?.front || item.image_url || item.imageUrl;
 if (imgUrl) {
 recentCreations.push({
 id: `cenario-${product.id}-${item.id}`,
 imageUrl: imgUrl,
 name: product.name,
 type: 'cenario',
 productId: product.id,
 date: item.createdAt || item.created_at || new Date().toISOString()
 });
 }
 });
 }

 // Product Studio (legado)
 if (genImages?.studioReady?.[0]?.images?.front) {
 recentCreations.push({
 id: `studio-legacy-${product.id}`,
 imageUrl: genImages.studioReady[0].images.front,
 name: product.name,
 type: 'studio',
 productId: product.id,
 date: genImages.studioReady[0].createdAt || new Date().toISOString()
 });
 }
 });

 // Ordenar por data (mais recente primeiro) e limitar a 4
 const sortedCreations = recentCreations
 .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
 .slice(0, 4);

 // Badge labels e navegação por tipo
 const badgeLabel: Record<string, string> = {
   studio: 'Product Studio',
   provador: 'Provador',
   still: 'Still Criativo',
   look: 'Look Composer',
   cenario: 'Cenário',
 };
 const featurePage: Record<string, string> = {
   studio: 'product-studio',
   provador: 'provador',
   still: 'creative-still',
   look: 'look-composer',
   cenario: 'studio',
 };
 const handleCreationClick = (creation: typeof recentCreations[0]) => {
   // Provador: abrir card do cliente
   if (creation.type === 'provador') {
     const look = recentProvadorLooks.find(l => l.id === creation.id);
     if (look && onOpenClientDetail) {
       const client = clients.find(c => c.id === look.clientId);
       if (client) { onOpenClientDetail(client); return; }
     }
     navigateTo('provador' as Page);
     return;
   }
   // Todos os demais: navegar para galeria filtrada pelo produto
   if (onNavigateToGallery && creation.name) {
     onNavigateToGallery(creation.name);
   } else {
     navigateTo('gallery' as Page);
   }
 };

 return (
 <div className={'rounded-2xl p-5 mb-4 ' + (theme !== 'light' ? 'bg-neutral-900/80 backdrop-blur-xl border border-neutral-800' : 'bg-white/80 backdrop-blur-xl border border-gray-200')}>
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-2">
 {!isV2 && <i className={'fas fa-sparkles text-sm text-[#FF6B6B]'}></i>}
 <h2 className={'text-sm font-semibold uppercase tracking-wide ' + (theme !== 'light' ? 'text-white' : 'text-gray-900')}>Últimas Criações</h2>
 </div>
 {sortedCreations.length > 0 && (
 <button
 onClick={() => navigateTo('gallery' as Page)}
 className={(theme !== 'light' ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-gray-700') + ' text-xs font-medium transition-colors'}
 >
 Ver todas <i className="fas fa-arrow-right ml-1"></i>
 </button>
 )}
 </div>

 <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
 {/* Criações recentes */}
 {sortedCreations.map((creation) => (
 <div
 key={creation.id}
 onClick={() => handleCreationClick(creation)}
 className={'flex-shrink-0 w-24 cursor-pointer group hover:opacity-80 transition-opacity'}
 >
 <div className={'w-24 h-24 rounded-xl overflow-hidden mb-2 relative ' + (theme !== 'light' ? 'bg-neutral-800' : 'bg-gray-100')}>
 <OptimizedImage src={creation.imageUrl} size="thumb" alt="" className="w-full h-full" />
 <div className="absolute bottom-1 right-1 flex items-center gap-0.5">
  {creation.imageUrl?.includes('/edit_') && (
   <div className="px-1 py-0.5 rounded text-[7px] font-medium bg-blue-500 text-white">
    Editado
   </div>
  )}
  <div className="px-1.5 py-0.5 rounded text-[8px] font-medium bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white">
   {badgeLabel[creation.type] || 'IA'}
  </div>
 </div>
 </div>
 <p className={(theme !== 'light' ? 'text-neutral-400' : 'text-gray-600') + ' text-[10px] truncate'}>{creation.name}</p>
 </div>
 ))}

 {/* Card + Nova Criação */}
 <div
 onClick={() => navigateTo('create')}
 className={'flex-shrink-0 w-24 cursor-pointer group'}
 >
 <div className={'w-24 h-24 rounded-xl flex items-center justify-center transition-all border-2 border-dashed ' + (theme !== 'light' ? 'bg-neutral-800/50 border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800' : 'bg-gray-50 border-gray-300 hover:border-[#373632]/30 hover:bg-gray-100')}>
 <div className="text-center">
 <div className={'w-10 h-10 mx-auto rounded-lg flex items-center justify-center mb-1 ' + (theme !== 'light' ? 'bg-neutral-800' : 'bg-[#373632]/10')}>
 <i className={'fas fa-plus ' + (theme !== 'light' ? 'text-neutral-400' : 'text-[#373632]/70')}></i>
 </div>
 </div>
 </div>
 <p className={(theme !== 'light' ? 'text-neutral-400' : 'text-gray-600') + ' text-[10px] text-center mt-2'}>Criar</p>
 </div>

 {/* Placeholder se não houver criações */}
 {sortedCreations.length === 0 && (
 <div className={'flex-1 flex items-center justify-center py-4 ' + (theme !== 'light' ? 'text-neutral-500' : 'text-gray-400')}>
 <div className="text-center">
 <i className="fas fa-wand-magic-sparkles text-2xl mb-2 opacity-50"></i>
 <p className="text-xs">Suas criações aparecerão aqui</p>
 </div>
 </div>
 )}
 </div>
 </div>
 );
 })()}

 {/* STATS GRID - 4 Cards (buttons para acessibilidade) */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
 {[
   { label: 'Produtos cadastrados', v2Label: 'PRODUTOS CADASTRADOS', value: products.length, icon: 'fa-box', color: 'text-[#FF6B6B]', onClick: () => navigateTo('products') },
   { label: 'Produtos com imagens IA', v2Label: 'COM IMAGENS IA', value: dashboardStats.optimizedProducts, icon: 'fa-wand-magic-sparkles', color: 'text-[#A855F7]', onClick: () => navigateTo('product-studio') },
   { label: 'Imagens geradas', v2Label: 'IMAGENS GERADAS', value: dashboardStats.totalGenerations, icon: 'fa-images', color: 'text-[#FF9F43]', onClick: () => { navigateTo('settings'); setSettingsTab('history'); } },
   { label: 'Clientes cadastrados', v2Label: 'CLIENTES', value: clients.length, icon: 'fa-users', color: 'text-[#4ADE80]', onClick: () => navigateTo('clients') },
 ].map((stat) => (
 <button key={stat.label} onClick={stat.onClick} className={'rounded-xl p-4 cursor-pointer transition-transform active:scale-95 hover:scale-[1.02] text-left ' + (theme !== 'light' ? 'bg-neutral-900/80 backdrop-blur-xl border border-neutral-800' : isV2 ? 'bg-white border border-gray-200' : 'bg-white/80 backdrop-blur-xl border border-gray-200')}>
 {!isV2 && (
 <div className="flex items-start justify-between mb-2">
 <i className={'fas ' + stat.icon + ' text-sm ' + stat.color}></i>
 <i className={'fas fa-arrow-right text-[8px] ' + (theme !== 'light' ? 'text-neutral-600' : 'text-gray-300')}></i>
 </div>
 )}
 <p className={(isV2 ? 'text-3xl font-extrabold text-gray-900' : 'text-xl font-bold ' + (theme !== 'light' ? 'text-white' : 'text-gray-900'))}>{stat.value}</p>
 <p className={(isV2 ? 'text-[10px] font-bold uppercase tracking-wider text-gray-500 mt-1' : (theme !== 'light' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]')}>{isV2 ? stat.v2Label : stat.label}</p>
 </button>
 ))}
 </div>

 {/* USO DE CRÉDITOS - Todas as categorias */}
 {(() => {
 const aiLogs = historyLogs.filter(log => log.method === 'ai' && log.status === 'success');
 const a = (s: string) => aiLogs.filter(log => log.action.toLowerCase().includes(s));
 const sum = (logs: typeof aiLogs) => logs.reduce((s, log) => s + (log.cost || 1), 0);

 const studioCount = sum(a('studio'));
 const lookCount = sum(a('look').concat(a('modelo')));
 const provadorCount = sum(a('provador'));
 const stillCount = sum(a('still').concat(a('creative')));
 const categorized = studioCount + lookCount + provadorCount + stillCount;
 const otherCount = sum(aiLogs) - categorized;
 const totalCredits = categorized + otherCount;

 const pct = (v: number) => totalCredits > 0 ? Math.round((v / totalCredits) * 100) : 0;

 const categories = [
   { label: 'Vizzu Product Studio®', count: studioCount, pct: pct(studioCount), gradient: isV2 ? 'from-[#FF6B6B] to-[#FF9F43]' : 'from-[#A855F7] to-indigo-500' },
   { label: 'Vizzu Look Composer®', count: lookCount, pct: pct(lookCount), gradient: isV2 ? 'from-[#FF6B6B] to-[#FF9F43]' : 'from-amber-500 to-[#FF9F43]' },
   { label: 'Vizzu Provador®', count: provadorCount, pct: pct(provadorCount), gradient: isV2 ? 'from-[#FF6B6B] to-[#FF9F43]' : 'from-[#FF6B6B] to-[#FF9F43]' },
   { label: 'Vizzu Still Criativo®', count: stillCount, pct: pct(stillCount), gradient: isV2 ? 'from-[#FF6B6B] to-[#FF9F43]' : 'from-emerald-500 to-teal-500' },
   ...(otherCount > 0 ? [{ label: 'Outros', count: otherCount, pct: pct(otherCount), gradient: 'from-gray-400 to-gray-500' }] : []),
 ];

 return (
 <div className={'rounded-2xl p-5 mb-4 ' + (theme !== 'light' ? 'bg-neutral-900/80 backdrop-blur-xl border border-neutral-800' : 'bg-white/80 backdrop-blur-xl border border-gray-200')}>
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-2">
 <i className={'fas fa-chart-bar text-sm ' + (isV2 ? 'text-[#FF6B6B]' : theme !== 'light' ? 'text-indigo-400' : 'text-indigo-500')}></i>
 <h2 className={'text-sm font-semibold uppercase tracking-wide ' + (theme !== 'light' ? 'text-white' : 'text-gray-900')}>Uso de Créditos</h2>
 </div>
 <span className={(theme !== 'light' ? 'text-neutral-500' : 'text-gray-400') + ' text-xs'}>{totalCredits} créditos usados</span>
 </div>

 {totalCredits === 0 ? (
 <div className={'text-center py-4 ' + (theme !== 'light' ? 'text-neutral-500' : 'text-gray-400')}>
 <i className="fas fa-chart-pie text-2xl mb-2 opacity-50"></i>
 <p className="text-xs">Nenhum crédito usado ainda</p>
 </div>
 ) : (
 <div className="space-y-3">
 {categories.map((cat) => (
 <div key={cat.label} className="flex items-center gap-3">
 <span className={(theme !== 'light' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs w-36 truncate'}>{cat.label}</span>
 <div className={'flex-1 h-2 rounded-full overflow-hidden ' + (theme !== 'light' ? 'bg-neutral-800' : 'bg-gray-200')}>
 <div className={`h-full rounded-full bg-gradient-to-r ${cat.gradient} transition-all`} style={{ width: `${cat.pct}%` }} />
 </div>
 <span className={(theme !== 'light' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs w-10 text-right'}>{cat.pct}%</span>
 </div>
 ))}
 </div>
 )}
 </div>
 );
 })()}

 {/* DICAS + PARCEIROS + PLANO - Grid 1:1:1 */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 {/* Carrossel de dicas */}
 <div className={'rounded-2xl p-5 relative overflow-hidden flex items-center min-h-[120px] ' + (theme !== 'light' ? 'bg-neutral-900/80 border border-neutral-800' : 'bg-[#efebe6] border border-[#e5e6ea]')}>
 <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#373632]/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/2"></div>
 <div className="relative flex items-center gap-4 w-full">
 <div className={'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ' + (theme !== 'light' ? 'bg-neutral-800' : 'bg-white/70')}>
 <i className="fas fa-lightbulb text-lg text-[#FF9F43]"></i>
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 mb-1">
 <h3 className={'text-sm font-semibold ' + (theme !== 'light' ? 'text-white' : 'text-gray-900')}>Dica</h3>
 <span className={(theme !== 'light' ? 'text-neutral-600' : 'text-gray-400') + ' text-[10px]'}>{tipIndex + 1}/{TIPS.length}</span>
 </div>
 <p className={(theme !== 'light' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs transition-opacity duration-300 line-clamp-3'}>
 {TIPS[tipIndex]}
 </p>
 </div>
 </div>
 </div>

 {/* Parceiros */}
 <PartnerDashboardCard />

 {/* Plano */}
 <div className={'rounded-2xl p-5 relative overflow-hidden flex items-center min-h-[120px] ' + (theme !== 'light' ? 'bg-neutral-900/80 border border-neutral-800' : 'bg-[#efebe6] border border-[#e5e6ea]')}>
 <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#FF6B6B]/10 to-[#FF9F43]/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
 <div className="relative flex flex-col w-full">
 <div className="flex items-center gap-3 mb-2">
 <div className={'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43]'}>
 <i className="fas fa-crown text-white"></i>
 </div>
 <div className="flex-1 min-w-0">
 <p className={(theme !== 'light' ? 'text-neutral-400' : 'text-[#373632]/60') + ' text-[10px] uppercase tracking-wide'}>Seu plano</p>
 <p className={(theme !== 'light' ? 'text-white' : 'text-[#373632]') + ' text-xl font-bold'}>{currentPlan.name}</p>
 </div>
 </div>
 <p className={(theme !== 'light' ? 'text-neutral-400' : 'text-[#373632]/60') + ' text-xs mb-2'}>{userCredits.toLocaleString()} créditos disponíveis</p>
 <button
 onClick={() => { navigateTo('settings'); setSettingsTab('plan'); }}
 className={'w-full py-2 rounded-lg font-medium text-xs transition-all flex items-center justify-center gap-1 ' + (theme !== 'light' ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20' : 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white hover:opacity-90')}
 >
 {isTopPlan ? 'Gerenciar plano' : 'Upgrade'} <i className="fas fa-arrow-right text-[10px]"></i>
 </button>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}

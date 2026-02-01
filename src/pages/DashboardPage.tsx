import { useMemo } from 'react';
import { useUI } from '../contexts/UIContext';
import { useAuth } from '../contexts/AuthContext';
import { useProducts } from '../contexts/ProductsContext';
import { useClients } from '../contexts/ClientsContext';
import { useHistory } from '../contexts/HistoryContext';
import { useCredits } from '../hooks/useCredits';

export function DashboardPage() {
 const { theme, navigateTo, setSettingsTab } = useUI();
 const { user } = useAuth();
 const { products } = useProducts();
 const { clients, clientLooks } = useClients();
 const { historyLogs } = useHistory();
 const { userCredits, currentPlan } = useCredits({ userId: user?.id });

 const dashboardStats = useMemo(() => {
 const optimizedProducts = products.filter(p => {
 const gen = (p as any).generatedImages;
 return gen?.productStudio?.some((s: any) => s.images?.length > 0);
 }).length;
 const looksGenerated = products.reduce((total, p) => {
 const gen = (p as any).generatedImages;
 const modeloIA = gen?.modeloIA?.length || 0;
 const cenario = gen?.cenarioCriativo?.length || 0;
 return total + modeloIA + cenario;
 }, 0) + clientLooks.length;
 return { optimizedProducts, looksGenerated };
 }, [products, clientLooks]);

 return (
 <div className={'flex-1 overflow-y-auto p-4 md:p-6 ' + (theme === 'dark' ? '' : 'bg-cream')}>
 <div className="max-w-5xl mx-auto">
 {/* Header com boas-vindas */}
 <div className="flex items-center justify-between mb-6">
 <div>
 <div className="flex items-center gap-2 mb-1">
 <h1 className={'text-xl font-extrabold ' + (theme === 'dark' ? 'text-white' : 'text-[#1A1A1A]')}>Dashboard</h1>
 <span className={'px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wide ' + (theme === 'dark' ? 'bg-neutral-800 text-neutral-400' : 'bg-[#373632] text-white')}>{currentPlan.name}</span>
 </div>
 <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' text-sm font-serif italic'}>
 Bem-vindo de volta, <span className="font-medium">{user?.name?.split(' ')[0] || 'usuário'}</span>
 </p>
 </div>
 <button
 onClick={() => navigateTo('create')}
 className="hidden md:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity "
 >
 <i className="fas fa-plus text-xs"></i>
 Novo Projeto
 </button>
 </div>

 {/* ÚLTIMAS CRIAÇÕES */}
 {(() => {
 // Combinar fontes de imagens geradas
 const recentCreations: { id: string; imageUrl: string; name: string; type: 'studio' | 'provador' | 'look'; date: string }[] = [];

 // Adicionar looks do Provador
 clientLooks.forEach(look => {
 if (look.imageUrl) {
 const client = clients.find(c => c.id === look.clientId);
 recentCreations.push({
 id: look.id,
 imageUrl: look.imageUrl,
 name: client ? `${client.firstName}` : 'Look',
 type: 'provador',
 date: look.createdAt
 });
 }
 });

 // Adicionar produtos com imagens geradas
 products.forEach(product => {
 const genImages = (product as any).generatedImages;

 // Product Studio (novo sistema)
 if (genImages?.productStudio?.length > 0) {
 genImages.productStudio.forEach((session: any) => {
 if (session.images?.length > 0) {
 // Pegar a primeira imagem da sessão (geralmente a frente)
 const frontImg = session.images.find((img: any) => img.angle === 'front') || session.images[0];
 recentCreations.push({
 id: `studio-${product.id}-${session.id}`,
 imageUrl: frontImg.url,
 name: product.name,
 type: 'studio',
 date: session.createdAt || frontImg.createdAt || new Date().toISOString()
 });
 }
 });
 }

 // Modelo IA / Look Composer
 if (genImages?.modeloIA?.length > 0) {
 genImages.modeloIA.forEach((item: any) => {
 if (item.image_url || item.imageUrl) {
 recentCreations.push({
 id: `look-${product.id}-${item.id}`,
 imageUrl: item.image_url || item.imageUrl,
 name: product.name,
 type: 'look',
 date: item.createdAt || item.created_at || new Date().toISOString()
 });
 }
 });
 }

 // Cenário Criativo
 if (genImages?.cenarioCriativo?.length > 0) {
 genImages.cenarioCriativo.forEach((item: any) => {
 if (item.image_url || item.imageUrl) {
 recentCreations.push({
 id: `cenario-${product.id}-${item.id}`,
 imageUrl: item.image_url || item.imageUrl,
 name: product.name,
 type: 'look',
 date: item.createdAt || item.created_at || new Date().toISOString()
 });
 }
 });
 }

 // Studio Ready (sistema legado)
 if (genImages?.studioReady?.[0]?.images?.front) {
 recentCreations.push({
 id: `studio-legacy-${product.id}`,
 imageUrl: genImages.studioReady[0].images.front,
 name: product.name,
 type: 'studio',
 date: genImages.studioReady[0].createdAt || new Date().toISOString()
 });
 }
 });

 // Ordenar por data (mais recente primeiro) e limitar a 4
 const sortedCreations = recentCreations
 .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
 .slice(0, 4);

 return (
 <div className={'rounded-2xl p-5 mb-4 ' + (theme === 'dark' ? 'bg-neutral-900/80 backdrop-blur-xl border border-neutral-800' : 'bg-white/80 backdrop-blur-xl border border-gray-200 ')}>
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-2">
 <i className={'fas fa-sparkles text-sm ' + (theme === 'dark' ? 'text-[#E91E8C]' : 'text-[#E91E8C]')}></i>
 <h2 className={'text-sm font-semibold uppercase tracking-wide ' + (theme === 'dark' ? 'text-white' : 'text-gray-900')}>Últimas Criações</h2>
 </div>
 {sortedCreations.length > 0 && (
 <button
 onClick={() => { navigateTo('settings'); setSettingsTab('history'); }}
 className={(theme === 'dark' ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-gray-700') + ' text-xs font-medium transition-colors'}
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
 onClick={() => {
 if (creation.type === 'studio') navigateTo('product-studio');
 else if (creation.type === 'provador') navigateTo('provador');
 else navigateTo('look-composer');
 }}
 className={'flex-shrink-0 w-24 cursor-pointer group ' + (theme === 'dark' ? 'hover:opacity-80' : 'hover:opacity-90') + ' transition-opacity'}
 >
 <div className={'w-24 h-24 rounded-xl overflow-hidden mb-2 relative ' + (theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100')}>
 <img src={creation.imageUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
 <div className={'absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[8px] font-medium ' +
 (creation.type === 'studio' ? 'bg-neutral-700 text-white' :
 creation.type === 'provador' ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white' :
 'bg-amber-500 text-white')}>
 {creation.type === 'studio' ? 'Studio' : creation.type === 'provador' ? 'Provador' : 'Look'}
 </div>
 </div>
 <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-[10px] truncate'}>{creation.name}</p>
 </div>
 ))}

 {/* Card + Nova Criação */}
 <div
 onClick={() => navigateTo('create')}
 className={'flex-shrink-0 w-24 cursor-pointer group'}
 >
 <div className={'w-24 h-24 rounded-xl flex items-center justify-center transition-all border-2 border-dashed ' + (theme === 'dark' ? 'bg-neutral-800/50 border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800' : 'bg-gray-50 border-gray-300 hover:border-[#373632]/30 hover:bg-gray-100')}>
 <div className="text-center">
 <div className={'w-10 h-10 mx-auto rounded-lg flex items-center justify-center mb-1 ' + (theme === 'dark' ? 'bg-neutral-800' : 'bg-[#373632]/10')}>
 <i className={'fas fa-plus ' + (theme === 'dark' ? 'text-neutral-400' : 'text-[#373632]/70')}></i>
 </div>
 </div>
 </div>
 <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-[10px] text-center mt-2'}>Criar</p>
 </div>

 {/* Placeholder se não houver criações */}
 {sortedCreations.length === 0 && (
 <div className={'flex-1 flex items-center justify-center py-4 ' + (theme === 'dark' ? 'text-neutral-500' : 'text-gray-400')}>
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

 {/* STATS GRID - 4 Cards */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
 {/* Produtos Cadastrados */}
 <div className={'rounded-xl p-4 ' + (theme === 'dark' ? 'bg-neutral-900/80 backdrop-blur-xl border border-neutral-800' : 'bg-white/80 backdrop-blur-xl border border-gray-200 ')}>
 <div className="flex items-start justify-between mb-2">
 <i className={'fas fa-box text-sm ' + (theme === 'dark' ? 'text-[#E91E8C]' : 'text-[#E91E8C]')}></i>
 </div>
 <p className={'text-xl font-bold ' + (theme === 'dark' ? 'text-white' : 'text-gray-900')}>{products.length}</p>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>Produtos cadastrados</p>
 </div>

 {/* Produtos Otimizados */}
 <div className={'rounded-xl p-4 ' + (theme === 'dark' ? 'bg-neutral-900/80 backdrop-blur-xl border border-neutral-800' : 'bg-white/80 backdrop-blur-xl border border-gray-200 ')}>
 <div className="flex items-start justify-between mb-2">
 <i className={'fas fa-wand-magic-sparkles text-sm ' + (theme === 'dark' ? 'text-[#A855F7]' : 'text-[#A855F7]')}></i>
 </div>
 <p className={'text-xl font-bold ' + (theme === 'dark' ? 'text-white' : 'text-gray-900')}>{dashboardStats.optimizedProducts}</p>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>Produtos otimizados</p>
 </div>

 {/* Looks Gerados */}
 <div className={'rounded-xl p-4 ' + (theme === 'dark' ? 'bg-neutral-900/80 backdrop-blur-xl border border-neutral-800' : 'bg-white/80 backdrop-blur-xl border border-gray-200 ')}>
 <div className="flex items-start justify-between mb-2">
 <i className={'fas fa-shirt text-sm ' + (theme === 'dark' ? 'text-[#FF9F43]' : 'text-[#FF9F43]')}></i>
 </div>
 <p className={'text-xl font-bold ' + (theme === 'dark' ? 'text-white' : 'text-gray-900')}>{dashboardStats.looksGenerated}</p>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>Looks gerados</p>
 </div>

 {/* Clientes Cadastrados */}
 <div className={'rounded-xl p-4 ' + (theme === 'dark' ? 'bg-neutral-900/80 backdrop-blur-xl border border-neutral-800' : 'bg-white/80 backdrop-blur-xl border border-gray-200 ')}>
 <div className="flex items-start justify-between mb-2">
 <i className={'fas fa-users text-sm ' + (theme === 'dark' ? 'text-[#4ADE80]' : 'text-[#4ADE80]')}></i>
 </div>
 <p className={'text-xl font-bold ' + (theme === 'dark' ? 'text-white' : 'text-gray-900')}>{clients.length}</p>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>Clientes cadastrados</p>
 </div>
 </div>

 {/* USO DE CRÉDITOS - Dados reais */}
 {(() => {
 const aiLogs = historyLogs.filter(log => log.method === 'ai' && log.status === 'success');
 const studioCount = aiLogs.filter(log => log.action.toLowerCase().includes('studio')).reduce((sum, log) => sum + (log.cost || 1), 0);
 const provadorCount = aiLogs.filter(log => log.action.toLowerCase().includes('provador')).reduce((sum, log) => sum + (log.cost || 1), 0);
 const lookCount = aiLogs.filter(log => log.action.toLowerCase().includes('look') || log.action.toLowerCase().includes('modelo')).reduce((sum, log) => sum + (log.cost || 1), 0);
 const totalCredits = studioCount + provadorCount + lookCount;
 const studioPercent = totalCredits > 0 ? Math.round((studioCount / totalCredits) * 100) : 0;
 const provadorPercent = totalCredits > 0 ? Math.round((provadorCount / totalCredits) * 100) : 0;
 const lookPercent = totalCredits > 0 ? Math.round((lookCount / totalCredits) * 100) : 0;

 return (
 <div className={'rounded-2xl p-5 mb-4 ' + (theme === 'dark' ? 'bg-neutral-900/80 backdrop-blur-xl border border-neutral-800' : 'bg-white/80 backdrop-blur-xl border border-gray-200 ')}>
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-2">
 <i className={'fas fa-chart-bar text-sm ' + (theme === 'dark' ? 'text-indigo-400' : 'text-indigo-500')}></i>
 <h2 className={'text-sm font-semibold uppercase tracking-wide ' + (theme === 'dark' ? 'text-white' : 'text-gray-900')}>Uso de Créditos</h2>
 </div>
 <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-400') + ' text-xs'}>{totalCredits} créditos usados</span>
 </div>

 {totalCredits === 0 ? (
 <div className={'text-center py-4 ' + (theme === 'dark' ? 'text-neutral-500' : 'text-gray-400')}>
 <i className="fas fa-chart-pie text-2xl mb-2 opacity-50"></i>
 <p className="text-xs">Nenhum crédito usado ainda</p>
 </div>
 ) : (
 <div className="space-y-3">
 <div className="flex items-center gap-3">
 <span className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs w-20'}>Studio</span>
 <div className={'flex-1 h-2 rounded-full overflow-hidden ' + (theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-200')}>
 <div className="h-full rounded-full bg-gradient-to-r from-[#A855F7] to-indigo-500 transition-all" style={{ width: `${studioPercent}%` }} />
 </div>
 <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs w-10 text-right'}>{studioPercent}%</span>
 </div>
 <div className="flex items-center gap-3">
 <span className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs w-20'}>Provador</span>
 <div className={'flex-1 h-2 rounded-full overflow-hidden ' + (theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-200')}>
 <div className="h-full rounded-full bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] transition-all" style={{ width: `${provadorPercent}%` }} />
 </div>
 <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs w-10 text-right'}>{provadorPercent}%</span>
 </div>
 <div className="flex items-center gap-3">
 <span className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs w-20'}>Look</span>
 <div className={'flex-1 h-2 rounded-full overflow-hidden ' + (theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-200')}>
 <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-[#FF9F43] transition-all" style={{ width: `${lookPercent}%` }} />
 </div>
 <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs w-10 text-right'}>{lookPercent}%</span>
 </div>
 </div>
 )}
 </div>
 );
 })()}

 {/* DICA DO DIA + PLANO - Grid 2:1 */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 {/* Dica do dia - 2 colunas */}
 <div className={'md:col-span-2 rounded-2xl p-5 relative overflow-hidden flex items-center min-h-[120px] ' + (theme === 'dark' ? 'bg-neutral-900/80 border border-neutral-800' : 'bg-[#efebe6] border border-[#e5e6ea]')}>
 <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#373632]/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/2"></div>
 <div className="relative flex items-center gap-4 w-full">
 <div className={'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ' + (theme === 'dark' ? 'bg-neutral-800' : 'bg-white/70')}>
 <i className={'fas fa-lightbulb text-lg ' + (theme === 'dark' ? 'text-neutral-400' : 'text-[#373632]/70')}></i>
 </div>
 <div className="flex-1 min-w-0">
 <h3 className={'text-sm font-semibold mb-1 ' + (theme === 'dark' ? 'text-white' : 'text-gray-900')}>Dica do dia</h3>
 <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-sm'}>
 Use fotos com boa iluminação e fundo neutro para melhores resultados nas gerações de IA. Quanto melhor a foto original, melhor o resultado final!
 </p>
 </div>
 </div>
 </div>

 {/* Plano - 1 coluna */}
 <div className={'md:col-span-1 rounded-2xl p-5 relative overflow-hidden flex items-center min-h-[120px] ' + (theme === 'dark' ? 'bg-neutral-900/80 border border-neutral-800' : 'bg-[#efebe6] border border-[#e5e6ea]')}>
 <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#FF6B6B]/10 to-[#FF9F43]/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
 <div className="relative flex flex-col w-full">
 <div className="flex items-center gap-3 mb-2">
 <div className={'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43]'}>
 <i className="fas fa-crown text-white"></i>
 </div>
 <div className="flex-1 min-w-0">
 <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-[#373632]/60') + ' text-[10px] uppercase tracking-wide'}>Seu plano</p>
 <p className={(theme === 'dark' ? 'text-white' : 'text-[#373632]') + ' text-xl font-bold'}>{currentPlan.name}</p>
 </div>
 </div>
 <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-[#373632]/60') + ' text-xs mb-2'}>{userCredits}/{currentPlan.limit} créditos</p>
 <button
 onClick={() => { navigateTo('settings'); setSettingsTab('plan'); }}
 className={'w-full py-2 rounded-lg font-medium text-xs transition-all flex items-center justify-center gap-1 ' + (theme === 'dark' ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20' : 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white hover:opacity-90')}
 >
 Upgrade <i className="fas fa-arrow-right text-[10px]"></i>
 </button>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}

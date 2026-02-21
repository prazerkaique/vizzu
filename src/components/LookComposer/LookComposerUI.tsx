import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Product, LookComposition } from '../../types';
import { BaseballCap, TShirt, Pants, Sneaker, Watch, Handbag } from '@phosphor-icons/react';
import heic2any from 'heic2any';
import { compressImage, formatFileSize } from '../../utils/imageCompression';
import { OptimizedImage } from '../OptimizedImage';
import type { VizzuTheme } from '../../contexts/UIContext';

interface Props {
 products: Product[];
 composition: LookComposition;
 onChange: (c: LookComposition) => void;
 collections?: string[];
 theme?: VizzuTheme;
 lockedSlots?: (keyof LookComposition)[];
 lockedMessage?: string;
 onImageUpload?: (slot: keyof LookComposition, image: string) => void;
}

// Categorias que ocupam tanto top quanto bottom (peças inteiras)
const FULLPIECE_CATEGORIES = [
 'Vestidos', 'Vestido', 'Macacão', 'Macacões', 'Macacao', 'Jardineira', 'Jardineiras',
 'Conjuntos', 'Conjunto', 'Pijamas', 'Pijama', 'Jumpsuit',
];

const isFullpieceCategory = (category: string): boolean => {
 return FULLPIECE_CATEGORIES.some(c => c.toLowerCase() === (category || '').toLowerCase());
};

// Mapeamento de slots para categorias de produtos (case-insensitive, singular e plural)
const SLOT_CATEGORY_MAP: Record<string, string[]> = {
 head: ['Bonés', 'Boné', 'Chapéus', 'Chapéu', 'Gorros', 'Gorro', 'Viseiras', 'Viseira', 'Tiaras', 'Tiara', 'Lenços', 'Lenço', 'Touca', 'Toucas', 'Boina', 'Turbante'],
 top: ['Camisetas', 'Camiseta', 'Blusas', 'Blusa', 'Regatas', 'Regata', 'Tops', 'Top', 'Camisas', 'Camisa', 'Jaquetas', 'Jaqueta', 'Casacos', 'Casaco', 'Blazers', 'Blazer', 'Moletons', 'Moletom', 'Bodies', 'Body', 'Cropped', 'Croppeds', 'Colete', 'Coletes', 'Suéter', 'Cardigan', 'Vestidos', 'Vestido', 'Macacão', 'Macacões', 'Conjuntos', 'Conjunto', 'Pijamas', 'Pijama'],
 bottom: ['Calças', 'Calça', 'Shorts', 'Short', 'Bermudas', 'Bermuda', 'Saias', 'Saia', 'Leggings', 'Legging', 'Shorts Fitness', 'Vestidos', 'Vestido', 'Macacão', 'Macacões', 'Conjuntos', 'Conjunto', 'Pijamas', 'Pijama', 'Jardineira', 'Jardineiras'],
 feet: ['Tênis', 'Sandálias', 'Sandália', 'Botas', 'Bota', 'Calçados', 'Calçado', 'Sapato', 'Sapatos', 'Chinelo', 'Chinelos', 'Sapatilha', 'Sapatilhas'],
 accessory1: ['Acessórios', 'Acessório', 'Bolsas', 'Bolsa', 'Pochetes', 'Pochete', 'Cintos', 'Cinto', 'Relógios', 'Relógio', 'Óculos', 'Bijuterias', 'Bijuteria', 'Mochila', 'Mochilas', 'Carteira', 'Carteiras', 'Gravatas', 'Gravata', 'Cachecóis', 'Cachecol'],
 accessory2: ['Acessórios', 'Acessório', 'Bolsas', 'Bolsa', 'Cintos', 'Cinto', 'Relógios', 'Relógio', 'Óculos', 'Bijuterias', 'Bijuteria', 'Colar', 'Colares', 'Brinco', 'Brincos', 'Pulseira', 'Pulseiras', 'Anel', 'Anéis', 'Meias', 'Meia'],
};

const SLOTS = [
 { id: 'head' as const, label: 'Cabeça', Icon: BaseballCap },
 { id: 'top' as const, label: 'Topo', Icon: TShirt },
 { id: 'bottom' as const, label: 'Baixo', Icon: Pants },
 { id: 'feet' as const, label: 'Pés', Icon: Sneaker },
 { id: 'accessory1' as const, label: 'Acess. 1', Icon: Watch },
 { id: 'accessory2' as const, label: 'Acess. 2', Icon: Handbag },
];

export const LookComposer: React.FC<Props> = ({ products, composition, onChange, collections = [], theme = 'dark', lockedSlots = [], lockedMessage = 'Peça principal', onImageUpload }) => {
 const [expandedSlot, setExpandedSlot] = useState<keyof LookComposition | null>(null);
 const [search, setSearch] = useState('');
 const [isSearchOpen, setIsSearchOpen] = useState(false);
 const [selectedCollection, setSelectedCollection] = useState<string>('');
 const [isDragging, setIsDragging] = useState<keyof LookComposition | null>(null);
 const searchInputRef = useRef<HTMLInputElement>(null);

 // Estados para long press e upload de imagem (mobile)
 const [showImageOptions, setShowImageOptions] = useState<keyof LookComposition | null>(null);
 const [isProcessingImage, setIsProcessingImage] = useState(false);
 const longPressTimer = useRef<NodeJS.Timeout | null>(null);
 const galleryInputRef = useRef<HTMLInputElement>(null);
 const cameraInputRef = useRef<HTMLInputElement>(null);
 const productsGridRef = useRef<HTMLDivElement>(null);

 // Função para obter a melhor imagem do produto (prioriza Product Studio otimizadas)
 const getOptimizedProductImage = (p: Product): string | undefined => {
 // Primeiro verifica se tem imagens otimizadas do Product Studio
 if (p.generatedImages?.productStudio?.length) {
 const lastSession = p.generatedImages.productStudio[p.generatedImages.productStudio.length - 1];
 if (lastSession.images?.length) {
 const frontImage = lastSession.images.find(img => img.angle === 'front');
 if (frontImage?.url) return frontImage.url;
 if (lastSession.images[0]?.url) return lastSession.images[0].url;
 }
 }
 // Fallback para imagem original
 if (p.originalImages?.front?.url) return p.originalImages.front.url;
 if (p.images?.[0]?.url) return p.images[0].url;
 if (p.images?.[0]?.base64) return p.images?.[0].base64;
 return undefined;
 };

 const productsWithImages = products.filter(p => {
 const hasImage = p.images?.length > 0 && (p.images[0]?.base64 || p.images[0]?.url);
 const hasOptimizedImage = p.generatedImages?.productStudio?.length &&
 p.generatedImages.productStudio[p.generatedImages.productStudio.length - 1]?.images?.length;
 return hasImage || hasOptimizedImage;
 });

 // Detectar se é mobile
 const isMobile = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

 // Auto-scroll para o topo quando abre o modal
 useEffect(() => {
 if (expandedSlot && productsGridRef.current) {
 productsGridRef.current.scrollTop = 0;
 }
 }, [expandedSlot]);

 // Produto principal ocupa só 1 slot de roupa (top OU bottom, mas não ambos)?
 // Ex: Camiseta (top) ou Calça (bottom) — NÃO pode ter vestido/macacão na composição
 // Ex: Pulseira (nenhum slot) ou Vestido (ambos) — pode ter peças inteiras
 const mainBlocksTop = lockedSlots.includes('top');
 const mainBlocksBottom = lockedSlots.includes('bottom');
 const mainBlocksSingleClothingSlot = (mainBlocksTop || mainBlocksBottom) && !(mainBlocksTop && mainBlocksBottom);

 // Filtra produtos por categoria do slot
 const getFilteredProducts = () => {
 let filtered = productsWithImages;

 // Filtrar por categoria do slot se estiver expandido
 if (expandedSlot) {
 const allowedCategories = SLOT_CATEGORY_MAP[expandedSlot] || [];
 if (allowedCategories.length > 0) {
 const allowed = allowedCategories.map(c => c.toLowerCase());
 filtered = filtered.filter(p => allowed.includes((p.category || '').toLowerCase()));
 }
 }

 // Se o produto principal ocupa 1 slot de roupa (top OU bottom), bloquear peças inteiras
 // (vestido na composição conflitaria com a camiseta/calça que já ocupa um dos slots)
 if (mainBlocksSingleClothingSlot) {
 filtered = filtered.filter(p => !isFullpieceCategory(p.category || ''));
 }

 // Filtrar por busca
 if (search) {
 filtered = filtered.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
 }

 // Filtrar por coleção
 if (selectedCollection) {
 filtered = filtered.filter(p => p.collection === selectedCollection);
 }

 return filtered;
 };

 const filtered = getFilteredProducts();

 // Extrair coleções únicas dos produtos se não fornecidas
 const availableCollections = collections.length > 0
 ? collections
 : [...new Set(productsWithImages.map(p => p.collection).filter(Boolean))] as string[];

 const selectProduct = (slot: keyof LookComposition, product: Product) => {
 // Usa imagem otimizada do Product Studio se disponível
 const img = getOptimizedProductImage(product);
 if (!img) return;

 const item = {
 image: img,
 name: product.name,
 sku: product.sku,
 productId: product.id,
 imageId: product.images[0]?.id
 };

 const newComposition = { ...composition, [slot]: item };

 // Peça inteira (vestido, macacão, conjunto): ocupa top + bottom
 if ((slot === 'top' || slot === 'bottom') && isFullpieceCategory(product.category || '')) {
 newComposition.top = item;
 newComposition.bottom = item;
 }

 onChange(newComposition);
 setExpandedSlot(null);
 setSearch('');
 setIsSearchOpen(false);
 };

 const removeSlot = (slot: keyof LookComposition, e: React.MouseEvent) => {
 e.stopPropagation();
 const c = { ...composition };

 // Se é um fullpiece (top e bottom são o mesmo item), limpar ambos
 if ((slot === 'top' || slot === 'bottom') && c.top && c.bottom && c.top.productId === c.bottom.productId && c.top.productId) {
 delete c.top;
 delete c.bottom;
 } else {
 delete c[slot];
 }

 onChange(c);
 };

 // Drag and Drop handlers
 const handleDragOver = useCallback((e: React.DragEvent, slot: keyof LookComposition) => {
 e.preventDefault();
 e.stopPropagation();
 setIsDragging(slot);
 }, []);

 const handleDragLeave = useCallback((e: React.DragEvent) => {
 e.preventDefault();
 e.stopPropagation();
 setIsDragging(null);
 }, []);

 const handleDrop = useCallback(async (e: React.DragEvent, slot: keyof LookComposition) => {
 e.preventDefault();
 e.stopPropagation();
 setIsDragging(null);

 // Verificar se há arquivos de imagem
 const files = e.dataTransfer.files;
 if (files && files.length > 0) {
 const file = files[0];
 if (file.type.startsWith('image/')) {
 const reader = new FileReader();
 reader.onload = (event) => {
 const base64 = event.target?.result as string;
 onChange({ ...composition, [slot]: { image: base64, name: file.name, sku: 'external' } });
 };
 reader.readAsDataURL(file);
 return;
 }
 }

 // Verificar se há URL de imagem (ex: arrastando do Google)
 const html = e.dataTransfer.getData('text/html');
 const imgSrcMatch = html.match(/<img[^>]+src="([^">]+)"/);
 if (imgSrcMatch && imgSrcMatch[1]) {
 const imageUrl = imgSrcMatch[1];
 onChange({ ...composition, [slot]: { image: imageUrl, name: 'Imagem externa', sku: 'external' } });
 return;
 }

 // Tentar pegar URL direta
 const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
 if (url && (url.match(/\.(jpg|jpeg|png|gif|webp)$/i) || url.includes('images'))) {
 onChange({ ...composition, [slot]: { image: url, name: 'Imagem externa', sku: 'external' } });
 }
 }, [composition, onChange]);

 // Long press handlers para mobile
 const handleTouchStart = useCallback((slot: keyof LookComposition) => {
 longPressTimer.current = setTimeout(() => {
 setShowImageOptions(slot);
 }, 500);
 }, []);

 const handleTouchEnd = useCallback(() => {
 if (longPressTimer.current) {
 clearTimeout(longPressTimer.current);
 longPressTimer.current = null;
 }
 }, []);

 // Processar imagem com conversao HEIC + compressão
 const processImageFile = async (file: File): Promise<string> => {
 try {
 let processedFile: File | Blob = file;

 if (file.type === 'image/heic' || file.type === 'image/heif' ||
 file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
 const convertedBlob = await heic2any({
 blob: file,
 toType: 'image/png',
 quality: 0.9
 });
 processedFile = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
 }

 // Comprimir imagem para reduzir consumo de banda
 const result = await compressImage(processedFile);

 if (result.wasCompressed && result.savings > 0) {
 console.info(`[Compressão] ${formatFileSize(result.originalSize)} → ${formatFileSize(result.compressedSize)} (${result.savings}% menor)`);
 }

 return result.base64;
 } catch (error) {
 throw error;
 }
 };

 // Handler para upload de imagem via galeria/camera
 const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file || !showImageOptions) return;

 setIsProcessingImage(true);
 try {
 const base64 = await processImageFile(file);
 onChange({
 ...composition,
 [showImageOptions]: {
 image: base64,
 name: file.name || 'Imagem do dispositivo',
 sku: 'external'
 }
 });

 if (onImageUpload) {
 onImageUpload(showImageOptions, base64);
 }
 } catch (error) {
 console.error('Erro ao processar imagem:', error);
 alert('Erro ao processar a imagem. Tente novamente.');
 } finally {
 setIsProcessingImage(false);
 setShowImageOptions(null);
 if (galleryInputRef.current) galleryInputRef.current.value = '';
 if (cameraInputRef.current) cameraInputRef.current.value = '';
 }
 };

 // Paste handler para colar imagens
 const handlePaste = useCallback(async (e: React.ClipboardEvent, slot: keyof LookComposition) => {
 const items = e.clipboardData.items;
 for (let i = 0; i < items.length; i++) {
 if (items[i].type.indexOf('image') !== -1) {
 const file = items[i].getAsFile();
 if (file) {
 const reader = new FileReader();
 reader.onload = (event) => {
 const base64 = event.target?.result as string;
 onChange({ ...composition, [slot]: { image: base64, name: 'Imagem colada', sku: 'external' } });
 };
 reader.readAsDataURL(file);
 return;
 }
 }
 }
 }, [composition, onChange]);

 const handleSlotClick = (slot: typeof SLOTS[0], item: any, isLocked: boolean) => {
 if (isLocked) return;
 if (item) {
 // Se já tem item, abre para trocar
 setExpandedSlot(expandedSlot === slot.id ? null : slot.id);
 } else {
 setExpandedSlot(expandedSlot === slot.id ? null : slot.id);
 }
 };

 return (
 <div className={(theme !== 'light' ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-gray-200 ') + ' rounded-lg border p-4'}>
 <div className="flex items-center justify-between mb-6">
 <h4 className={(theme !== 'light' ? 'text-neutral-400' : 'text-gray-600') + ' text-[10px] font-medium'}>
 <i className="fas fa-layer-group text-neutral-400 mr-1.5"></i>Composição de Look
 </h4>
 {Object.keys(composition).length > 0 && (
 <span className="text-[9px] font-medium text-neutral-400 bg-neutral-700/30 px-1.5 py-0.5 rounded-full">
 {Object.keys(composition).length} itens
 </span>
 )}
 </div>

 {/* Slots compactos em grid — garante visibilidade no mobile */}
 <div className="grid grid-cols-6 gap-1.5 pb-2">
 {SLOTS.map(slot => {
 const item = composition[slot.id];
 const isLocked = lockedSlots.includes(slot.id);
 const isExpanded = expandedSlot === slot.id;

 // Detecta se este slot é o "escravo" de uma peça inteira (fullpiece)
 // Bottom fica bloqueado quando top e bottom são o mesmo item (vestido/macacão)
 const isFullpiecePaired = slot.id === 'bottom' && composition.top && composition.bottom
 && composition.top.productId === composition.bottom.productId && !!composition.top.productId;

 return (
 <div
 key={slot.id}
 onClick={() => !isFullpiecePaired && handleSlotClick(slot, item, isLocked)}
 onDragOver={(e) => !isLocked && !isFullpiecePaired && handleDragOver(e, slot.id)}
 onDragLeave={handleDragLeave}
 onDrop={(e) => !isLocked && !isFullpiecePaired && handleDrop(e, slot.id)}
 onPaste={(e) => !isLocked && !isFullpiecePaired && handlePaste(e, slot.id)}
 onTouchStart={() => !isLocked && !isFullpiecePaired && !item && handleTouchStart(slot.id)}
 onTouchEnd={handleTouchEnd}
 onTouchMove={handleTouchEnd}
 tabIndex={isLocked || isFullpiecePaired ? -1 : 0}
 className={`h-16 rounded-lg border flex flex-col items-center justify-center relative overflow-hidden transition-all duration-200 ${
 isLocked || isFullpiecePaired
 ? 'cursor-not-allowed opacity-60 border-neutral-500/50 ' + (theme !== 'light' ? 'bg-neutral-800/30' : 'bg-neutral-800/30')
 : isDragging === slot.id
 ? 'border-neutral-500 bg-neutral-700/30 scale-110 cursor-pointer'
 : item
 ? 'border-neutral-500 cursor-pointer ' + (theme !== 'light' ? 'bg-neutral-900' : 'bg-neutral-800/30')
 : isExpanded
 ? 'border-neutral-500 bg-neutral-700/30 scale-105 cursor-pointer ring-2 ring-neutral-500/50'
 : 'cursor-pointer border-dashed ' + (theme !== 'light' ? 'border-neutral-600 bg-neutral-900/50 hover:border-neutral-500/50 hover:bg-neutral-800' : 'border-gray-300 bg-gray-50/50 hover:border-neutral-500/50')
 }`}
 >
 {isLocked ? (
 <>
 <i className={(theme !== 'light' ? 'text-neutral-400' : 'text-neutral-400') + ' fas fa-lock text-xs'}></i>
 <span className={(theme !== 'light' ? 'text-neutral-400' : 'text-neutral-400') + ' text-[6px] font-medium text-center px-0.5 mt-0.5'}>
 {lockedMessage}
 </span>
 </>
 ) : isFullpiecePaired && item ? (
 <>
 <OptimizedImage src={item.image} alt={item.name} className="w-full h-full p-0.5" size="thumb" objectFit="contain" />
 <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent text-white text-[6px] font-medium px-1 py-0.5 text-center truncate">
 <i className="fas fa-link mr-0.5"></i>{slot.label}
 </div>
 </>
 ) : item ? (
 <>
 <OptimizedImage src={item.image} alt={item.name} className="w-full h-full p-0.5" size="thumb" objectFit="contain" />
 <button
 onClick={(e) => removeSlot(slot.id, e)}
 className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white rounded-bl-lg flex items-center justify-center text-[8px]"
 >
 <i className="fas fa-times"></i>
 </button>
 {/* Badge F|B no slot preenchido */}
 {item.productId && (() => {
 const lp = products.find(p => p.id === item.productId);
 return lp?.originalImages?.back?.url ? (
 <div className="absolute top-0 left-0 bg-green-600/80 text-white text-[5px] font-bold px-0.5 rounded-br leading-none py-px">F|B</div>
 ) : (
 <div className="absolute top-0 left-0 bg-neutral-500/70 text-white text-[5px] font-bold px-0.5 rounded-br leading-none py-px">F</div>
 );
 })()}
 <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent text-white text-[6px] font-medium px-1 py-0.5 text-center truncate">
 {slot.label}
 </div>
 </>
 ) : (
 <>
 {isDragging === slot.id ? (
 <i className="fas fa-download text-neutral-400 text-sm animate-bounce"></i>
 ) : (
 <slot.Icon size={16} weight="light" className={isExpanded ? 'text-neutral-400' : (theme !== 'light' ? 'text-neutral-500' : 'text-gray-400')} />
 )}
 <span className={'text-[7px] font-medium mt-0.5 ' + (isDragging === slot.id || isExpanded ? 'text-neutral-400' : (theme !== 'light' ? 'text-neutral-500' : 'text-gray-500'))}>
 {isDragging === slot.id ? 'Soltar' : slot.label}
 </span>
 </>
 )}
 </div>
 );
 })}
 </div>

 {/* Modal expandido para selecionar produto */}
 {expandedSlot && (
 <div className={`mt-2 rounded-xl border overflow-hidden transition-all duration-300 animate-in slide-in-from-top-2 ${
 theme !== 'light' ? 'bg-neutral-900 border-neutral-500/30' : 'bg-white border-neutral-500/20 '
 }`}>
 {/* Header do modal */}
 <div className={`p-3 border-b ${theme !== 'light' ? 'border-neutral-800 bg-neutral-800/50' : 'border-neutral-500/10 bg-neutral-800/30'}`}>
 <div className="flex items-center justify-between mb-2">
 <div className="flex items-center gap-2">
 {(() => {
 const SlotIcon = SLOTS.find(s => s.id === expandedSlot)?.Icon || TShirt;
 return <SlotIcon size={20} weight="light" className="text-neutral-400" />;
 })()}
 <span className={`text-sm font-semibold ${theme !== 'light' ? 'text-white' : 'text-gray-900'}`}>
 {SLOTS.find(s => s.id === expandedSlot)?.label}
 </span>
 <span className={`text-xs px-2 py-0.5 rounded-full ${theme !== 'light' ? 'bg-neutral-700 text-neutral-400' : 'bg-gray-100 text-neutral-400'}`}>
 {filtered.length} produtos
 </span>
 </div>
 <button
 onClick={() => setExpandedSlot(null)}
 className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
 theme !== 'light' ? 'bg-neutral-700 text-neutral-400 hover:bg-neutral-600 hover:text-white' : 'bg-gray-100 text-neutral-400 hover:bg-neutral-700/30'
 }`}
 >
 <i className="fas fa-times text-xs"></i>
 </button>
 </div>

 {/* Filtros */}
 <div className="flex gap-2">
 {/* Busca */}
 {isSearchOpen ? (
 <div className="flex-1 relative">
 <i className={`fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] ${theme !== 'light' ? 'text-neutral-500' : 'text-gray-400'}`}></i>
 <input
 ref={searchInputRef}
 type="text"
 id="look-composer-search"
 name="lookComposerSearch"
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 placeholder="Buscar..."
 className={`w-full pl-7 pr-8 py-2 text-xs border rounded-lg ${
 theme !== 'light' ? 'bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500' : 'bg-white border-neutral-500/20 text-gray-900 placeholder-gray-400'
 }`}
 />
 <button
 onClick={() => { setSearch(''); setIsSearchOpen(false); }}
 className={`absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full flex items-center justify-center ${
 theme !== 'light' ? 'text-neutral-500 hover:text-white' : 'text-gray-400 hover:text-gray-600'
 }`}
 >
 <i className="fas fa-times text-[9px]"></i>
 </button>
 </div>
 ) : (
 <button
 onClick={() => { setIsSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 100); }}
 className={`px-3 py-2 rounded-lg border flex items-center gap-2 ${
 theme !== 'light' ? 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-500/50' : 'bg-white border-neutral-500/20 text-gray-500 hover:border-neutral-500/50'
 }`}
 >
 <i className="fas fa-search text-[10px]"></i>
 <span className="text-xs">Buscar</span>
 </button>
 )}

 {/* Filtro de coleção */}
 {availableCollections.length > 0 && (
 <select
 id="look-composer-collection"
 name="lookComposerCollection"
 value={selectedCollection}
 onChange={(e) => setSelectedCollection(e.target.value)}
 className={`px-2 py-2 text-xs border rounded-lg ${
 theme !== 'light' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-white border-neutral-500/20 text-gray-900'
 }`}
 >
 <option value="">Todas</option>
 {availableCollections.map(col => (
 <option key={col} value={col}>{col}</option>
 ))}
 </select>
 )}
 </div>
 </div>

 {/* Grid de produtos */}
 <div ref={productsGridRef} className="p-3 max-h-64 overflow-y-auto">
 {filtered.length > 0 ? (
 <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
 {filtered.map(p => (
 <div
 key={p.id}
 onClick={() => selectProduct(expandedSlot, p)}
 className={`aspect-square rounded-lg border overflow-hidden cursor-pointer relative group transition-all hover:scale-105 ${
 theme !== 'light' ? 'border-neutral-700 hover:border-neutral-500 bg-neutral-800' : 'border-gray-200 hover:border-neutral-500/50 bg-white'
 }`}
 >
 <OptimizedImage src={getOptimizedProductImage(p)} alt={p.name} className="w-full h-full p-1" size="thumb" objectFit="contain" />
 {/* Badge frente/costas */}
 {p.originalImages?.back?.url ? (
 <div className="absolute top-0.5 right-0.5 flex items-center gap-px bg-green-600/80 text-white text-[6px] font-bold px-1 py-px rounded leading-none" title="Frente + Costas">
 F|B
 </div>
 ) : (
 <div className="absolute top-0.5 right-0.5 flex items-center gap-px bg-neutral-500/70 text-white text-[6px] font-bold px-1 py-px rounded leading-none" title="Só frente">
 F
 </div>
 )}
 <div className={`absolute inset-x-0 bottom-0 text-white text-[8px] p-1 truncate transition-opacity ${
 theme !== 'light' ? 'bg-gradient-to-t from-black/90 to-transparent' : 'bg-gradient-to-t from-black/80 to-transparent'
 }`}>
 {p.name}
 </div>
 <div className="absolute inset-0 bg-neutral-800/300/0 group-hover:bg-neutral-800/30 transition-colors flex items-center justify-center">
 <i className="fas fa-plus text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity text-lg"></i>
 </div>
 </div>
 ))}
 </div>
 ) : (
 <div className={(theme !== 'light' ? 'text-neutral-500' : 'text-gray-400') + ' text-center py-8'}>
 <i className="fas fa-search text-2xl mb-2 opacity-50"></i>
 <p className="text-sm font-medium">Nenhum produto encontrado</p>
 <p className={`text-xs mt-1 ${theme !== 'light' ? 'text-neutral-600' : 'text-gray-500'}`}>
 Tente arrastar uma imagem do Google ou da galeria
 </p>
 </div>
 )}
 </div>

 {filtered.length > 0 && (
 <div className={`px-3 py-2 border-t text-center ${theme !== 'light' ? 'border-neutral-800 text-neutral-500' : 'border-neutral-500/10 text-gray-500'}`}>
 <span className="text-[10px]">{filtered.length} produto{filtered.length > 1 ? 's' : ''}</span>
 </div>
 )}
 </div>
 )}

 {/* Botão limpar */}
 {Object.keys(composition).length > 0 && !expandedSlot && (
 <button
 onClick={() => onChange({})}
 className="mt-2 text-[9px] text-red-500 hover:text-red-400 font-medium w-full text-right transition-colors"
 >
 <i className="fas fa-trash-alt mr-1"></i>Limpar tudo
 </button>
 )}

 {/* Modal de opcoes de imagem (mobile long press) */}
 {showImageOptions && (
 <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end justify-center" onClick={() => setShowImageOptions(null)}>
 <div
 className={`w-full max-w-md rounded-t-2xl overflow-hidden safe-area-bottom-sheet ${theme !== 'light' ? 'bg-neutral-900' : 'bg-white'}`}
 onClick={(e) => e.stopPropagation()}
 >
 <div className={`p-4 border-b ${theme !== 'light' ? 'border-neutral-800' : 'border-gray-100'}`}>
 <div className="flex items-center justify-between">
 <h4 className={`${theme !== 'light' ? 'text-white' : 'text-gray-900'} font-semibold text-sm`}>
 Adicionar Imagem
 </h4>
 <button
 onClick={() => setShowImageOptions(null)}
 className={`w-8 h-8 rounded-full flex items-center justify-center ${theme !== 'light' ? 'bg-neutral-800 text-neutral-400' : 'bg-gray-100 text-gray-500'}`}
 >
 <i className="fas fa-times text-sm"></i>
 </button>
 </div>
 <p className={`${theme !== 'light' ? 'text-neutral-500' : 'text-gray-500'} text-xs mt-1`}>
 Slot: {SLOTS.find(s => s.id === showImageOptions)?.label}
 </p>
 </div>

 <div className="p-4 space-y-3">
 <button
 onClick={() => cameraInputRef.current?.click()}
 disabled={isProcessingImage}
 className={`w-full p-4 rounded-xl flex items-center gap-4 transition-all ${
 theme !== 'light' ? 'bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600' : 'bg-gray-50 hover:bg-gray-100 active:bg-gray-200'
 }`}
 >
 <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] flex items-center justify-center flex-shrink-0">
 <i className="fas fa-camera text-white text-lg"></i>
 </div>
 <div className="text-left">
 <p className={`${theme !== 'light' ? 'text-white' : 'text-gray-900'} font-medium`}>Camera</p>
 <p className={`${theme !== 'light' ? 'text-neutral-500' : 'text-gray-500'} text-xs`}>Tirar foto agora</p>
 </div>
 </button>

 <button
 onClick={() => galleryInputRef.current?.click()}
 disabled={isProcessingImage}
 className={`w-full p-4 rounded-xl flex items-center gap-4 transition-all ${
 theme !== 'light' ? 'bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600' : 'bg-gray-50 hover:bg-gray-100 active:bg-gray-200'
 }`}
 >
 <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${theme !== 'light' ? 'bg-neutral-700' : 'bg-gray-200'}`}>
 <i className={`fas fa-images text-lg ${theme !== 'light' ? 'text-neutral-300' : 'text-gray-600'}`}></i>
 </div>
 <div className="text-left">
 <p className={`${theme !== 'light' ? 'text-white' : 'text-gray-900'} font-medium`}>Galeria</p>
 <p className={`${theme !== 'light' ? 'text-neutral-500' : 'text-gray-500'} text-xs`}>Escolher da galeria</p>
 </div>
 </button>

 {isProcessingImage && (
 <div className="flex items-center justify-center gap-2 py-3">
 <i className="fas fa-spinner fa-spin text-neutral-400"></i>
 <span className={`${theme !== 'light' ? 'text-neutral-400' : 'text-gray-500'} text-sm`}>Processando...</span>
 </div>
 )}
 </div>

 <div className={`p-4 border-t ${theme !== 'light' ? 'border-neutral-800' : 'border-gray-100'}`}>
 <button
 onClick={() => setShowImageOptions(null)}
 className={`w-full py-3 rounded-xl font-medium text-sm ${
 theme !== 'light' ? 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
 }`}
 >
 Cancelar
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Inputs de arquivo ocultos */}
 <input
 ref={galleryInputRef}
 id="look-composer-gallery"
 name="lookComposerGallery"
 type="file"
 accept="image/*,.heic,.heif"
 onChange={handleImageSelect}
 className="hidden"
 />
 <input
 ref={cameraInputRef}
 id="look-composer-camera"
 name="lookComposerCamera"
 type="file"
 accept="image/*,.heic,.heif"
 capture="environment"
 onChange={handleImageSelect}
 className="hidden"
 />
 </div>
 );
};

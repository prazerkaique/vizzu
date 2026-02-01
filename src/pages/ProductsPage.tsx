import { useState, useEffect, useRef, useMemo } from 'react';
import { useUI } from '../contexts/UIContext';
import { useAuth } from '../contexts/AuthContext';
import { useProducts } from '../contexts/ProductsContext';
import { useHistory } from '../contexts/HistoryContext';
import { useCredits } from '../hooks/useCredits';
import { useDebounce } from '../hooks/useDebounce';
import { BulkImportModal } from '../components/BulkImportModal';
import { analyzeProductImage } from '../lib/api/studio';
import { Product, HistoryLog, ProductAttributes, CATEGORY_ATTRIBUTES } from '../types';
import heic2any from 'heic2any';
import { compressImage, formatFileSize } from '../utils/imageCompression';

const CATEGORY_GROUPS = [
 { id: 'cabeca', label: 'Cabeça', items: ['Bonés', 'Chapéus', 'Tiaras', 'Lenços'] },
 { id: 'parte-de-cima', label: 'Parte de Cima', items: ['Camisetas', 'Blusas', 'Regatas', 'Tops', 'Camisas', 'Bodies', 'Jaquetas', 'Casacos', 'Blazers', 'Moletons'] },
 { id: 'parte-de-baixo', label: 'Parte de Baixo', items: ['Calças', 'Shorts', 'Bermudas', 'Saias', 'Leggings', 'Shorts Fitness'] },
 { id: 'pecas-inteiras', label: 'Peças Inteiras', items: ['Vestidos', 'Macacões', 'Jardineiras', 'Biquínis', 'Maiôs'] },
 { id: 'calcados', label: 'Calçados', items: ['Tênis', 'Sandálias', 'Botas', 'Sapatos', 'Chinelos'] },
 { id: 'acessorios', label: 'Acessórios', items: ['Bolsas', 'Cintos', 'Relógios', 'Óculos', 'Bijuterias', 'Mochilas', 'Outros Acessórios'] },
];
const CATEGORIES = CATEGORY_GROUPS.flatMap(g => g.items);
const getCategoryGroupBySubcategory = (subcategory: string) => CATEGORY_GROUPS.find(g => g.items.includes(subcategory));
const COLLECTIONS = ['Verão 2025', 'Inverno 2025', 'Básicos', 'Premium', 'Promoção'];
const COLORS = [
 'Preto', 'Branco', 'Cinza', 'Cinza Claro', 'Cinza Escuro', 'Chumbo',
 'Azul', 'Azul Marinho', 'Azul Royal', 'Azul Claro', 'Azul Bebê', 'Azul Petróleo', 'Azul Turquesa', 'Índigo',
 'Vermelho', 'Vermelho Escuro', 'Bordô', 'Vinho', 'Carmim', 'Terracota',
 'Verde', 'Verde Escuro', 'Verde Militar', 'Verde Musgo', 'Verde Menta', 'Verde Água', 'Verde Oliva', 'Verde Limão', 'Esmeralda',
 'Amarelo', 'Amarelo Ouro', 'Mostarda', 'Dourado',
 'Rosa', 'Rosa Claro', 'Rosa Pink', 'Rosa Chá', 'Magenta', 'Fúcsia', 'Rosê', 'Salmão', 'Coral',
 'Laranja', 'Laranja Escuro', 'Pêssego',
 'Roxo', 'Lilás', 'Lavanda', 'Violeta', 'Púrpura', 'Berinjela',
 'Marrom', 'Caramelo', 'Café', 'Chocolate', 'Ferrugem', 'Tabaco', 'Areia', 'Nude',
 'Bege', 'Creme', 'Off-White', 'Marfim', 'Prata',
 'Jeans Claro', 'Jeans Médio', 'Jeans Escuro', 'Jeans Black',
 'Estampado', 'Tie-Dye', 'Xadrez', 'Listrado', 'Floral', 'Animal Print', 'Camuflado', 'Multicolor'
];

interface ProductsPageProps {
  productForCreation: Product | null;
  setProductForCreation: (p: Product | null) => void;
}

export function ProductsPage({ productForCreation, setProductForCreation }: ProductsPageProps) {
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [showProductDetail, setShowProductDetail] = useState<Product | null>(null);
  const [showOptimizedImage, setShowOptimizedImage] = useState(true);
  const [selectedFrontImage, setSelectedFrontImage] = useState<string | null>(null);
  const [selectedBackImage, setSelectedBackImage] = useState<string | null>(null);
  const [selectedDetailImage, setSelectedDetailImage] = useState<string | null>(null);
  const [uploadTarget, setUploadTarget] = useState<'front' | 'back' | 'detail'>('front');
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [showPhotoSourcePicker, setShowPhotoSourcePicker] = useState<'front' | 'back' | 'detail' | null>(null);
  const [showConfirmNoDetail, setShowConfirmNoDetail] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [lastCreatedProductId, setLastCreatedProductId] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [filterCategoryGroup, setFilterCategoryGroup] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterColor, setFilterColor] = useState('');
  const [filterCollection, setFilterCollection] = useState('');
  const [visibleProductsCount, setVisibleProductsCount] = useState(20);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [showDeleteProductsModal, setShowDeleteProductsModal] = useState(false);
  const [deleteProductTarget, setDeleteProductTarget] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState({ name: '', brand: '', color: '', category: '', collection: '' });
  const [productAttributes, setProductAttributes] = useState<ProductAttributes>({});
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [detectedProducts, setDetectedProducts] = useState<Array<{ type: string; color: string; pattern: string; material?: string; gender?: string; suggestedName?: string; confidence: number }>>([]);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [longPressProductId, setLongPressProductId] = useState<string | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const { theme, navigateTo, setSettingsTab, successNotification, setSuccessNotification, showToast } = useUI();
  const { user } = useAuth();
  const { products, setProducts, loadUserProducts, deleteProduct: handleDeleteProduct, deleteSelectedProducts, isProductOptimized, getProductDisplayImage, getOptimizedImages, getOriginalImages } = useProducts();
  const { historyLogs, setHistoryLogs, addHistoryLog } = useHistory();
  const { userCredits, currentPlan } = useCredits({ userId: user?.id });

  const filteredProducts = useMemo(() => products
   .filter(product => {
   const matchesSearch = product.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) || product.sku.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
   const categoryGroup = getCategoryGroupBySubcategory(product.category);
   const matchesCategoryGroup = !filterCategoryGroup || categoryGroup?.id === filterCategoryGroup;
   const matchesCategory = !filterCategory || product.category === filterCategory;
   const matchesColor = !filterColor || product.color === filterColor;
   const matchesCollection = !filterCollection || product.collection === filterCollection;
   return matchesSearch && matchesCategoryGroup && matchesCategory && matchesColor && matchesCollection;
   })
   .sort((a, b) => {
   const dateA = new Date(a.createdAt || 0).getTime();
   const dateB = new Date(b.createdAt || 0).getTime();
   return dateB - dateA;
   }), [products, debouncedSearchTerm, filterCategoryGroup, filterCategory, filterColor, filterCollection]);

  useEffect(() => {
   setVisibleProductsCount(20);
  }, [debouncedSearchTerm, filterCategoryGroup, filterCategory, filterColor, filterCollection]);

  useEffect(() => {
   if (lastCreatedProductId && products.length > 0) {
   navigateTo('products');
   const timer = setTimeout(() => {
   const productElement = document.querySelector(`[data-product-id="${lastCreatedProductId}"]`);
   if (productElement) {
   productElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
   }
   setLastCreatedProductId(null);
   }, 300);
   return () => clearTimeout(timer);
   }
  }, [lastCreatedProductId, products]);

  useEffect(() => {
   const handleEsc = (e: KeyboardEvent) => {
   if (e.key === 'Escape') {
   if (showBulkImport) setShowBulkImport(false);
   else if (showCreateProduct) setShowCreateProduct(false);
   else if (showProductDetail) setShowProductDetail(null);
   else if (showPhotoSourcePicker) setShowPhotoSourcePicker(null);
   else if (showProductSelector) setShowProductSelector(false);
   else if (showDeleteProductsModal) { setShowDeleteProductsModal(false); setDeleteProductTarget(null); }
   }
   };
   window.addEventListener('keydown', handleEsc);
   return () => window.removeEventListener('keydown', handleEsc);
  }, [showBulkImport, showCreateProduct, showProductDetail, showPhotoSourcePicker, showProductSelector, showDeleteProductsModal]);

  const toggleProductSelection = (productId: string) => {
   setSelectedProducts(prev =>
   prev.includes(productId)
   ? prev.filter(id => id !== productId)
   : [...prev, productId]
   );
  };

  const handleProductTouchStart = (productId: string) => {
   setLongPressProductId(productId);
   longPressTimer.current = setTimeout(() => {
   toggleProductSelection(productId);
   setLongPressProductId(null);
   if (navigator.vibrate) navigator.vibrate(50);
   }, 500);
  };

  const handleProductTouchEnd = (productId: string) => {
   if (longPressTimer.current) {
   clearTimeout(longPressTimer.current);
   longPressTimer.current = null;
   }
   if (longPressProductId === productId) {
   setLongPressProductId(null);
   if (selectedProducts.length > 0) {
   toggleProductSelection(productId);
   } else {
   const product = products.find(p => p.id === productId);
   if (product) {
   setShowOptimizedImage(true);
   setShowProductDetail(product);
   }
   }
   }
  };

  const handleProductTouchMove = () => {
   if (longPressTimer.current) {
   clearTimeout(longPressTimer.current);
   longPressTimer.current = null;
   }
   setLongPressProductId(null);
  };

  const selectAllProducts = () => {
   if (selectedProducts.length === filteredProducts.length) {
   setSelectedProducts([]);
   } else {
   setSelectedProducts(filteredProducts.map(p => p.id));
   }
  };

  const processImageFile = async (file: File): Promise<string> => {
   try {
   let processedFile: File | Blob = file;
   if (file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
   const convertedBlob = await heic2any({
   blob: file,
   toType: 'image/png',
   quality: 0.9
   });
   processedFile = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
   }
   const result = await compressImage(processedFile);
   if (result.wasCompressed && result.savings > 0) {
   console.info(`[Compressão] ${formatFileSize(result.originalSize)} → ${formatFileSize(result.compressedSize)} (${result.savings}% menor)`);
   }
   return result.base64;
   } catch (error) {
   throw error;
   }
  };

  const handleFileSelect = (files: FileList, target: 'front' | 'back' = 'front') => {
   if (files.length > 0) {
   const file = files[0];
   const reader = new FileReader();
   reader.onload = () => {
   const base64 = reader.result as string;
   if (target === 'front') {
   setSelectedFrontImage(base64);
   analyzeProductImageWithAI(base64);
   } else {
   setSelectedBackImage(base64);
   }
   setShowCreateProduct(true);
   };
   reader.readAsDataURL(file);
   }
  };

  const handleImageDrop = (e: React.DragEvent<HTMLDivElement>, type: 'front' | 'back' | 'detail') => {
   e.preventDefault();
   e.stopPropagation();
   const file = e.dataTransfer.files[0];
   if (file && file.type.startsWith('image/')) {
   const reader = new FileReader();
   reader.onload = (event) => {
   const base64 = event.target?.result as string;
   if (type === 'front') {
   setSelectedFrontImage(base64);
   analyzeProductImageWithAI(base64);
   } else if (type === 'back') {
   setSelectedBackImage(base64);
   } else {
   setSelectedDetailImage(base64);
   }
   };
   reader.readAsDataURL(file);
   }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
   e.preventDefault();
   e.stopPropagation();
  };

  const analyzeProductImageWithAI = async (imageBase64: string) => {
   setIsAnalyzingImage(true);
   setDetectedProducts([]);
   try {
   const result = await analyzeProductImage({ imageBase64, userId: user?.id });
   if (result.success && result.products.length > 0) {
   const topProducts = result.products.slice(0, 3);
   if (topProducts.length === 1) {
   applyDetectedProduct(topProducts[0]);
   } else {
   setDetectedProducts(topProducts);
   setShowProductSelector(true);
   }
   }
   } catch (error) {
   console.error('Erro na análise de IA:', error);
   } finally {
   setIsAnalyzingImage(false);
   }
  };

  const applyDetectedProduct = (product: {
   type: string;
   color: string;
   pattern?: string;
   material?: string;
   gender?: string;
   brand?: string;
   fit?: string;
   suggestedName?: string;
   neckline?: string;
   sleeveLength?: string;
   waistHeight?: string;
   length?: string;
   heelType?: string;
   bootShaft?: string;
   bagSize?: string;
   hatStyle?: string;
   glassesShape?: string;
  }) => {
   const categoryMap: Record<string, string> = {
   'Boné': 'Bonés', 'Chapéu': 'Chapéus', 'Tiara': 'Tiaras', 'Lenço': 'Lenços',
   'Camiseta': 'Camisetas', 'Blusa': 'Blusas', 'Regata': 'Regatas', 'Top': 'Tops',
   'Camisa': 'Camisas', 'Body': 'Bodies', 'Jaqueta': 'Jaquetas', 'Casaco': 'Casacos',
   'Blazer': 'Blazers', 'Moletom': 'Moletons', 'Cropped': 'Tops', 'Suéter': 'Moletons',
   'Cardigan': 'Casacos', 'Colete': 'Casacos',
   'Calça': 'Calças', 'Shorts': 'Shorts', 'Bermuda': 'Bermudas', 'Saia': 'Saias',
   'Legging': 'Leggings', 'Short Fitness': 'Shorts Fitness',
   'Vestido': 'Vestidos', 'Macacão': 'Macacões', 'Jardineira': 'Jardineiras',
   'Biquíni': 'Biquínis', 'Maiô': 'Maiôs',
   'Tênis': 'Tênis', 'Sandália': 'Sandálias', 'Bota': 'Botas', 'Sapato': 'Calçados',
   'Chinelo': 'Sandálias', 'Sapatilha': 'Calçados',
   'Bolsa': 'Bolsas', 'Mochila': 'Bolsas', 'Cinto': 'Cintos', 'Relógio': 'Relógios',
   'Óculos': 'Óculos', 'Brinco': 'Bijuterias', 'Colar': 'Bijuterias', 'Pulseira': 'Bijuterias',
   'Anel': 'Bijuterias', 'Bijuteria': 'Bijuterias',
   };
   const categoryToPluralMap: Record<string, string> = { ...categoryMap };
   const fitToAttributeMap: Record<string, string> = {
   'Slim': 'slim', 'Regular': 'regular', 'Oversized': 'oversized', 'Skinny': 'skinny',
   'Loose': 'solta', 'Cropped': 'cropped', 'Longline': 'longline', 'Relaxed': 'relaxed',
   'Boxy': 'boxy', 'Justa': 'justa', 'Solta': 'solta', 'Amplo': 'amplo',
   'Justo': 'justo', 'Evasê': 'evase', 'Reto': 'reto', 'Reta': 'reta',
   'Wide Leg': 'wide-leg', 'Wide-leg': 'wide-leg', 'Flare': 'flare', 'Pantalona': 'pantalona',
   'Jogger': 'jogger', 'Cargo': 'cargo', 'Mom': 'mom', 'Godê': 'gode'
   };
   const lengthToAttributeMap: Record<string, string> = {
   'Curto': 'curto', 'Curta': 'curta', 'Regular': 'regular', 'Médio': 'medio',
   'Longo': 'longo', 'Longa': 'longa', 'Mini': 'mini', 'Midi': 'midi', 'Maxi': 'maxi',
   'Longline': 'longline', 'Cropped': 'cropped', 'Alongado': 'alongado'
   };
   const waistToAttributeMap: Record<string, string> = {
   'Baixa': 'baixa', 'Média': 'media', 'Alta': 'alta', 'Super Alta': 'super-alta'
   };

   const matchedCategory = categoryMap[product.type] || '';
   const pluralCategory = categoryToPluralMap[product.type] || '';

   setNewProduct(prev => ({
   ...prev,
   name: product.suggestedName || prev.name,
   color: product.color || prev.color,
   category: matchedCategory || prev.category,
   brand: product.brand || prev.brand
   }));

   const newAttributes: ProductAttributes = {};
   const categoryAttrs = pluralCategory ? CATEGORY_ATTRIBUTES[pluralCategory] : null;

   const applyAttribute = (attrId: string, value: string | undefined, valueMap?: Record<string, string>) => {
   if (!value || !categoryAttrs) return;
   const attr = categoryAttrs.find(a => a.id === attrId);
   if (!attr) return;
   const mappedValue = valueMap ? (valueMap[value] || value.toLowerCase()) : value.toLowerCase();
   const validOption = attr.options.find(opt =>
   opt.id === mappedValue ||
   opt.id.toLowerCase() === mappedValue.toLowerCase()
   );
   if (validOption) {
   newAttributes[attrId] = validOption.id;
   } else {
   const closeMatch = attr.options.find(opt =>
   opt.id.toLowerCase().includes(mappedValue.toLowerCase()) ||
   mappedValue.toLowerCase().includes(opt.id.toLowerCase())
   );
   if (closeMatch) {
   newAttributes[attrId] = closeMatch.id;
   }
   }
   };

   applyAttribute('caimento', product.fit, fitToAttributeMap);
   if (product.fit && pluralCategory === 'Calças') {
   applyAttribute('modelagem', product.fit, fitToAttributeMap);
   }
   applyAttribute('comprimento', product.length, lengthToAttributeMap);
   applyAttribute('cintura', product.waistHeight, waistToAttributeMap);
   if (product.heelType) applyAttribute('tipo', product.heelType);
   if (product.bootShaft) applyAttribute('cano', product.bootShaft);
   if (product.bagSize) applyAttribute('tamanho', product.bagSize);
   if (product.hatStyle) applyAttribute('modelo', product.hatStyle);
   if (product.glassesShape) applyAttribute('formato', product.glassesShape);

   if (!newAttributes.comprimento && categoryAttrs) {
   const comprimentoAttr = categoryAttrs.find(attr => attr.id === 'comprimento');
   if (comprimentoAttr && comprimentoAttr.options.length > 0) {
   const regularOption = comprimentoAttr.options.find(opt => opt.id === 'regular');
   newAttributes.comprimento = regularOption ? 'regular' : comprimentoAttr.options[0].id;
   }
   }

   if (Object.keys(newAttributes).length > 0) {
   setProductAttributes(newAttributes);
   }

   setShowProductSelector(false);
   setDetectedProducts([]);
  };

  const handleSelectDetectedProduct = (product: typeof detectedProducts[0]) => {
   applyDetectedProduct(product);
  };

  const handleCreateProduct = async () => {
   if (!selectedFrontImage || !newProduct.name || !newProduct.category) {
   alert('Preencha pelo menos o nome, categoria e adicione a foto de frente');
   return;
   }
   setIsCreatingProduct(true);
   try {
   const n8nUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;
   if (!n8nUrl) {
   throw new Error('URL do webhook não configurada');
   }
   const response = await fetch(`${n8nUrl}/vizzu/produto-importar`, {
   method: 'POST',
   headers: { 'Content-Type': 'application/json' },
   body: JSON.stringify({
   user_id: user?.id,
   sku: 'SKU-' + Date.now().toString().slice(-6),
   name: newProduct.name,
   brand: newProduct.brand || null,
   color: newProduct.color || null,
   category: newProduct.category,
   collection: newProduct.collection || null,
   attributes: Object.keys(productAttributes).length > 0 ? productAttributes : null,
   image_front_base64: selectedFrontImage,
   image_back_base64: selectedBackImage || null,
   image_detail_base64: selectedDetailImage || null
   })
   });
   const data = await response.json();
   if (data.success) {
   if (user?.id) {
   await loadUserProducts(user.id);
   }
   setShowCreateProduct(false);
   setSelectedFrontImage(null);
   setSelectedBackImage(null);
   setSelectedDetailImage(null);
   setNewProduct({ name: '', brand: '', color: '', category: '', collection: '' });
   setProductAttributes({});
   setSuccessNotification('Produto criado com sucesso!');
   setTimeout(() => setSuccessNotification(null), 3000);
   if (data.product?.id) {
   setLastCreatedProductId(data.product.id);
   }
   addHistoryLog('Produto criado', `"${newProduct.name}" foi adicionado ao catálogo`, 'success', [], 'manual', 0);
   } else {
   alert('Erro ao criar produto: ' + (data.error || 'Tente novamente'));
   }
   } catch (error) {
   console.error('Erro:', error);
   alert('Erro ao criar produto. Verifique sua conexão.');
   } finally {
   setIsCreatingProduct(false);
   }
  };

  const startEditProduct = (product: Product) => {
   setNewProduct({
   name: product.name || '',
   brand: product.brand || '',
   color: product.color || '',
   category: product.category || '',
   collection: product.collection || '',
   });
   setSelectedFrontImage(product.originalImages?.front?.url || null);
   setSelectedBackImage(product.originalImages?.back?.url || null);
   setSelectedDetailImage(product.originalImages?.detail?.url || null);
   setEditingProduct(product);
   setShowProductDetail(null);
   setShowCreateProduct(true);
  };

  const handleSaveEditedProduct = async () => {
   if (!editingProduct) return;
   if (!selectedFrontImage || !newProduct.name || !newProduct.category) {
   alert('Preencha pelo menos o nome, categoria e adicione a foto de frente');
   return;
   }
   setIsCreatingProduct(true);
   try {
   const n8nUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;
   if (!n8nUrl) {
   throw new Error('URL do webhook não configurada');
   }
   const frontImage = selectedFrontImage?.startsWith('data:') ? selectedFrontImage : null;
   const backImage = selectedBackImage?.startsWith('data:') ? selectedBackImage : null;
   const detailImage = selectedDetailImage?.startsWith('data:') ? selectedDetailImage : null;
   const response = await fetch(`${n8nUrl}/vizzu/produto-editar`, {
   method: 'POST',
   headers: { 'Content-Type': 'application/json' },
   body: JSON.stringify({
   user_id: user?.id,
   product_id: editingProduct.id,
   name: newProduct.name,
   brand: newProduct.brand || null,
   color: newProduct.color || null,
   category: newProduct.category,
   collection: newProduct.collection || null,
   attributes: Object.keys(productAttributes).length > 0 ? productAttributes : null,
   image_front_base64: frontImage,
   image_back_base64: backImage,
   image_detail_base64: detailImage,
   })
   });
   const data = await response.json();
   if (data.success) {
   if (user?.id) {
   await loadUserProducts(user.id);
   }
   setShowCreateProduct(false);
   setEditingProduct(null);
   setSelectedFrontImage(null);
   setSelectedBackImage(null);
   setSelectedDetailImage(null);
   setNewProduct({ name: '', brand: '', color: '', category: '', collection: '' });
   setProductAttributes({});
   showToast('Produto atualizado com sucesso!', 'success');
   addHistoryLog('Produto editado', `"${newProduct.name}" foi atualizado`, 'success', [], 'manual', 0);
   } else {
   alert('Erro ao atualizar produto: ' + (data.error || 'Tente novamente'));
   }
   } catch (error) {
   console.error('Erro ao atualizar produto:', error);
   showToast('Erro ao atualizar produto', 'error');
   } finally {
   setIsCreatingProduct(false);
   }
  };

  return (
    <>
 <div className="flex-1 overflow-y-auto p-4 md:p-6">
 <div className="max-w-6xl mx-auto">
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-3">
 <div className={'w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-xl ' + (theme === 'dark' ? 'bg-white/10 border border-white/15' : 'bg-white/60 border border-gray-200/60 shadow-sm')}>
 <i className={'fas fa-box text-sm ' + (theme === 'dark' ? 'text-neutral-200' : 'text-[#1A1A1A]')}></i>
 </div>
 <div>
 <h1 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-extrabold'}>Produtos</h1>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs font-serif italic'}>Gerencie seu catálogo</p>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <button onClick={() => setShowBulkImport(true)} className="px-3 py-2 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-lg font-medium text-xs hover:opacity-90 transition-opacity">
 <i className="fas fa-file-import mr-1.5"></i>Importar
 </button>
 <button onClick={() => setShowCreateProduct(true)} className="px-3 py-2 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-lg font-medium text-xs">
 <i className="fas fa-plus mr-1.5"></i>Novo
 </button>
 </div>
 </div>

 <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 ') + ' rounded-xl border p-3 mb-4'}>
 <div className="flex flex-wrap gap-2">
 <div className="flex-shrink-0 w-44">
 <div className="relative">
 <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px]'}></i>
 <input type="text" id="product-search" name="search" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full pl-7 pr-2 py-1.5 border rounded-lg text-xs'} />
 </div>
 </div>
 <select
 value={filterCategoryGroup}
 onChange={(e) => { setFilterCategoryGroup(e.target.value); setFilterCategory(''); }}
 className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' flex-shrink-0 px-2.5 py-1.5 border rounded-lg text-xs'}
 >
 <option value="">Categoria</option>
 {CATEGORY_GROUPS.map(group => (
 <option key={group.id} value={group.id}>{group.label}</option>
 ))}
 </select>
 {filterCategoryGroup && (
 <select
 value={filterCategory}
 onChange={(e) => setFilterCategory(e.target.value)}
 className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' flex-shrink-0 px-2.5 py-1.5 border rounded-lg text-xs'}
 >
 <option value="">Subcategoria</option>
 {CATEGORY_GROUPS.find(g => g.id === filterCategoryGroup)?.items.map(cat => (
 <option key={cat} value={cat}>{cat}</option>
 ))}
 </select>
 )}
 <select value={filterColor} onChange={(e) => setFilterColor(e.target.value)} className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' flex-shrink-0 px-2.5 py-1.5 border rounded-lg text-xs'}>
 <option value="">Cor</option>
 {COLORS.map(color => <option key={color} value={color}>{color}</option>)}
 </select>
 <select value={filterCollection} onChange={(e) => setFilterCollection(e.target.value)} className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' flex-shrink-0 px-2.5 py-1.5 border rounded-lg text-xs'}>
 <option value="">Coleção</option>
 {COLLECTIONS.map(col => <option key={col} value={col}>{col}</option>)}
 </select>
 {(filterCategoryGroup || filterCategory || filterColor || filterCollection) && (
 <button onClick={() => { setFilterCategoryGroup(''); setFilterCategory(''); setFilterColor(''); setFilterCollection(''); }} className="px-2.5 py-1.5 text-xs text-[#E91E8C] hover:bg-neutral-800/50 rounded-lg transition-colors">
 <i className="fas fa-times mr-1"></i>Limpar
 </button>
 )}
 </div>
 <div className="flex items-center justify-between mt-2">
 <p className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-500') + ' text-[10px]'}>
 {filteredProducts.length > visibleProductsCount
 ? `Mostrando ${Math.min(visibleProductsCount, filteredProducts.length)} de ${filteredProducts.length} produtos`
 : `${filteredProducts.length} de ${products.length} produtos`}
 </p>
 {filteredProducts.length > 0 && (
 <button onClick={selectAllProducts} className={(theme === 'dark' ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-gray-700') + ' text-[10px] flex items-center gap-1'}>
 <i className={`fas fa-${selectedProducts.length === filteredProducts.length ? 'check-square' : 'square'} text-xs`}></i>
 {selectedProducts.length === filteredProducts.length ? 'Desmarcar todos' : 'Selecionar todos'}
 </button>
 )}
 </div>
 </div>

 {/* Barra de ações para produtos selecionados */}
 {selectedProducts.length > 0 && (
 <div className={(theme === 'dark' ? 'bg-white/5 border-white/10 backdrop-blur-xl' : 'bg-white/40 border-gray-200/40 backdrop-blur-xl shadow-sm') + ' rounded-xl border p-3 mb-4 flex items-center justify-between'}>
 <div className="flex items-center gap-2">
 <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] font-medium text-sm">{selectedProducts.length} selecionado{selectedProducts.length > 1 ? 's' : ''}</span>
 <button onClick={() => setSelectedProducts([])} className={(theme === 'dark' ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-gray-700') + ' text-xs'}>
 <i className="fas fa-times mr-1"></i>Cancelar
 </button>
 </div>
 <button onClick={() => setShowDeleteProductsModal(true)} className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors">
 <i className="fas fa-trash text-[10px]"></i>Excluir {selectedProducts.length > 1 ? `(${selectedProducts.length})` : ''}
 </button>
 </div>
 )}

 <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 ') + ' rounded-xl border overflow-hidden'}>
 {filteredProducts.length > 0 ? (
 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 p-3">
 {filteredProducts.slice(0, visibleProductsCount).map(product => (
 <div
 key={product.id}
 className={(theme === 'dark' ? 'bg-neutral-800 hover:bg-gray-300' : 'bg-gray-50 hover:bg-gray-100 border border-gray-200') + ' rounded-lg overflow-hidden cursor-pointer transition-colors group relative select-none ' + (selectedProducts.includes(product.id) ? (theme === 'dark' ? 'ring-2 ring-neutral-500' : 'ring-2 ring-gray-400') : '')}
 onTouchStart={() => handleProductTouchStart(product.id)}
 onTouchEnd={() => handleProductTouchEnd(product.id)}
 onTouchMove={handleProductTouchMove}
 onClick={(e) => {
 // Desktop: clique abre card se não está em modo seleção
 if (window.matchMedia('(pointer: fine)').matches) {
 if (selectedProducts.length > 0) {
 toggleProductSelection(product.id);
 } else {
 setShowOptimizedImage(true); // Reset toggle ao abrir novo produto
 setShowProductDetail(product);
 }
 }
 }}
 >
 <div className={(theme === 'dark' ? 'bg-gray-300' : 'bg-gray-200') + ' aspect-square relative overflow-hidden'}>
 <img src={getProductDisplayImage(product)} alt={product.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform pointer-events-none" />
 {/* Badge de produto otimizado */}
 {isProductOptimized(product) && (
 <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-[7px] font-bold rounded-full flex items-center gap-1 pointer-events-none">
 <i className="fas fa-cube text-[6px]"></i>
 <span className="hidden sm:inline">Studio</span>
 </div>
 )}
 {/* Checkbox de seleção - visível em modo seleção ou hover no desktop */}
 <div
 className={'absolute top-1.5 left-1.5 w-5 h-5 rounded flex items-center justify-center transition-all pointer-events-none ' + (selectedProducts.includes(product.id) ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white' : selectedProducts.length > 0 ? 'bg-black/50 text-white/70' : 'bg-black/50 text-white/70 opacity-0 group-hover:opacity-100')}
 >
 <i className={`fas fa-${selectedProducts.includes(product.id) ? 'check' : 'square'} text-[8px]`}></i>
 </div>
 {/* Botão delete individual - apenas desktop hover */}
 <button
 onClick={(e) => { e.stopPropagation(); setDeleteProductTarget(product); setShowDeleteProductsModal(true); }}
 className="absolute top-1.5 right-1.5 w-5 h-5 rounded bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hidden md:flex"
 title="Excluir produto"
 >
 <i className="fas fa-trash text-[8px]"></i>
 </button>
 </div>
 <div className="p-2">
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-400') + ' text-[8px] font-medium uppercase tracking-wide'}>{product.sku}</p>
 <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-[10px] font-medium truncate'}>{product.name}</p>
 </div>
 </div>
 ))}
 </div>
 ) : null}

 {/* Botão Carregar Mais */}
 {filteredProducts.length > 0 && visibleProductsCount < filteredProducts.length && (
 <div className="flex justify-center p-4 pt-2">
 <button
 onClick={() => setVisibleProductsCount(prev => prev + 20)}
 className={(theme === 'dark' ? 'bg-neutral-800 hover:bg-gray-300 text-white border-neutral-700' : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200') + ' px-6 py-2.5 border rounded-xl font-medium text-sm flex items-center gap-2 transition-colors'}
 >
 <i className="fas fa-chevron-down text-xs"></i>
 Carregar mais ({filteredProducts.length - visibleProductsCount} restantes)
 </button>
 </div>
 )}

 {filteredProducts.length === 0 && (
 <div className="p-8 text-center">
 <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100') + ' w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3'}>
 <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-box text-xl'}></i>
 </div>
 <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-medium mb-1'}>Nenhum produto</h3>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs mb-3'}>Adicione seu primeiro produto</p>
 <button onClick={() => setShowCreateProduct(true)} className={'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white hover:opacity-90 mt-3 px-4 py-2 rounded-lg font-medium text-xs transition-opacity'}>
 <i className="fas fa-plus mr-1.5"></i>Adicionar
 </button>
 </div>
 )}
 </div>
 </div>
 </div>

{showPhotoSourcePicker && (
 <div className="fixed inset-0 z-[60] bg-black/60 flex items-end justify-center" onClick={() => setShowPhotoSourcePicker(null)}>
 <div className={(theme === 'dark' ? 'bg-neutral-900/95 backdrop-blur-2xl border-neutral-800' : 'bg-white/95 backdrop-blur-2xl border-gray-200') + ' rounded-t-2xl w-full max-w-md p-5 pb-8 border-t'} onClick={(e) => e.stopPropagation()}>
 <div className={(theme === 'dark' ? 'bg-gray-300' : 'bg-gray-300') + ' w-10 h-1 rounded-full mx-auto mb-4'}></div>
 <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-medium text-center mb-4'}>
 Adicionar foto {showPhotoSourcePicker === 'front' ? 'de frente' : showPhotoSourcePicker === 'back' ? 'de costas' : 'de detalhe'}
 </h3>
 <div className="grid grid-cols-2 gap-3">
 <label className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 hover:border-neutral-500' : 'bg-gray-50 border-gray-200 hover:border-neutral-500') + ' border rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer transition-all'}>
 <div className={(theme === 'dark' ? 'bg-gray-300' : 'bg-[#E91E8C]/15') + ' w-12 h-12 rounded-full flex items-center justify-center'}>
 <i className="fas fa-images text-[#E91E8C]"></i>
 </div>
 <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>Galeria</span>
 <input
 type="file"
 accept="image/*,.heic,.heif"
 className="hidden"
 onChange={async (e) => {
 const file = e.target.files?.[0];
 if (file) {
 try {
 const base64 = await processImageFile(file);
 if (showPhotoSourcePicker === 'front') {
 setSelectedFrontImage(base64);
 // Analisar imagem com IA para pré-preencher campos
 analyzeProductImageWithAI(base64);
 } else if (showPhotoSourcePicker === 'back') {
 setSelectedBackImage(base64);
 } else {
 setSelectedDetailImage(base64);
 }
 setShowPhotoSourcePicker(null);
 } catch (error) {
 console.error('Erro ao processar imagem:', error);
 alert('Erro ao processar imagem. Tente outro formato.');
 }
 }
 }}
 />
 </label>
 <label className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 hover:border-neutral-500' : 'bg-gray-50 border-gray-200 hover:border-neutral-500') + ' border rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer transition-all'}>
 <div className={(theme === 'dark' ? 'bg-gray-300' : 'bg-orange-100') + ' w-12 h-12 rounded-full flex items-center justify-center'}>
 <i className="fas fa-camera text-[#FF9F43]"></i>
 </div>
 <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>Câmera</span>
 <input
 type="file"
 accept="image/*,.heic,.heif"
 capture="environment"
 className="hidden"
 onChange={async (e) => {
 const file = e.target.files?.[0];
 if (file) {
 try {
 const base64 = await processImageFile(file);
 if (showPhotoSourcePicker === 'front') {
 setSelectedFrontImage(base64);
 // Analisar imagem com IA para pré-preencher campos
 analyzeProductImageWithAI(base64);
 } else if (showPhotoSourcePicker === 'back') {
 setSelectedBackImage(base64);
 } else {
 setSelectedDetailImage(base64);
 }
 setShowPhotoSourcePicker(null);
 } catch (error) {
 console.error('Erro ao processar imagem:', error);
 alert('Erro ao processar imagem. Tente outro formato.');
 }
 }
 }}
 />
 </label>
 </div>
 <button onClick={() => setShowPhotoSourcePicker(null)} className={(theme === 'dark' ? 'text-neutral-500 hover:text-white' : 'text-gray-500 hover:text-gray-700') + ' w-full mt-4 py-2 text-xs font-medium'}>
 Cancelar
 </button>
 </div>
 </div>
)}

{/* PRODUCT SELECTOR MODAL - Quando múltiplos produtos são detectados na imagem */}
{showProductSelector && detectedProducts.length > 1 && (
 <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setShowProductSelector(false)}>
 <div className={(theme === 'dark' ? 'bg-neutral-900/95 backdrop-blur-2xl border-neutral-700/50' : 'bg-white/95 backdrop-blur-2xl border-gray-200') + ' rounded-t-2xl md:rounded-2xl border w-full max-w-md p-5 max-h-[80vh] overflow-y-auto'} onClick={(e) => e.stopPropagation()}>
 <div className={(theme === 'dark' ? 'bg-gray-300' : 'bg-gray-300') + ' w-10 h-1 rounded-full mx-auto mb-4 md:hidden'}></div>

 <div className="flex items-center gap-3 mb-4">
 <div className={'w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-xl ' + (theme === 'dark' ? 'bg-white/10 border border-white/15' : 'bg-white/60 border border-gray-200/60 shadow-sm')}>
 <i className={'fas fa-wand-magic-sparkles ' + (theme === 'dark' ? 'text-neutral-200' : 'text-[#1A1A1A]')}></i>
 </div>
 <div>
 <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold'}>Múltiplos produtos detectados</h3>
 <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' text-xs'}>Qual produto deseja cadastrar agora?</p>
 </div>
 </div>

 <div className="space-y-2">
 {detectedProducts.map((product, index) => (
 <button
 key={index}
 onClick={() => handleSelectDetectedProduct(product)}
 className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800/80' : 'bg-gray-50 border-gray-200 hover:border-neutral-500 hover:bg-neutral-800/50') + ' w-full p-4 border rounded-xl flex items-center gap-4 transition-all text-left'}
 >
 <div className={(theme === 'dark' ? 'bg-gray-300' : 'bg-gray-200') + ' w-12 h-12 rounded-lg flex items-center justify-center'}>
 <i className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' fas fa-tshirt text-xl'}></i>
 </div>
 <div className="flex-1">
 <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-medium'}>{product.suggestedName || product.type}</p>
 <div className="flex flex-wrap gap-1.5 mt-1">
 <span className={(theme === 'dark' ? 'bg-gray-300 text-neutral-300' : 'bg-gray-200 text-gray-600') + ' px-2 py-0.5 rounded text-[10px]'}>{product.type}</span>
 <span className={(theme === 'dark' ? 'bg-gray-300 text-neutral-300' : 'bg-gray-200 text-gray-600') + ' px-2 py-0.5 rounded text-[10px]'}>{product.color}</span>
 {product.pattern && product.pattern !== 'Liso' && (
 <span className={(theme === 'dark' ? 'bg-gray-300 text-neutral-300' : 'bg-gray-200 text-gray-600') + ' px-2 py-0.5 rounded text-[10px]'}>{product.pattern}</span>
 )}
 </div>
 </div>
 <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-chevron-right'}></i>
 </button>
 ))}
 </div>

 <button
 onClick={() => setShowProductSelector(false)}
 className={(theme === 'dark' ? 'text-neutral-500 hover:text-white' : 'text-gray-500 hover:text-gray-700') + ' w-full mt-4 py-2 text-xs font-medium'}
 >
 Preencher manualmente
 </button>
 </div>
 </div>
)}

{/* CREATE PRODUCT MODAL */}
{showCreateProduct && (
 <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => { setShowCreateProduct(false); setSelectedFrontImage(null); setSelectedBackImage(null); setSelectedDetailImage(null); setEditingProduct(null); }}>
 <div className={(theme === 'dark' ? 'bg-neutral-900/95 backdrop-blur-2xl border-neutral-700/50' : 'bg-white/95 backdrop-blur-2xl border-gray-200') + ' relative rounded-t-2xl md:rounded-2xl border w-full max-w-md p-5 max-h-[90vh] overflow-y-auto safe-area-bottom-sheet'} onClick={(e) => e.stopPropagation()}>
 {/* Drag handle - mobile */}
 <div className="md:hidden pb-2 flex justify-center -mt-1">
 <div className={(theme === 'dark' ? 'bg-gray-300' : 'bg-gray-300') + ' w-10 h-1 rounded-full'}></div>
 </div>
 <div className="flex items-center justify-between mb-4">
 <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold font-serif'}>{editingProduct ? 'Editar Produto' : 'Criar Produto'}</h3>
 <button onClick={() => { setShowCreateProduct(false); setSelectedFrontImage(null); setSelectedBackImage(null); setSelectedDetailImage(null); setEditingProduct(null); }} className={(theme === 'dark' ? 'bg-neutral-800 text-neutral-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-700') + ' w-7 h-7 rounded-full hidden md:flex items-center justify-center'}>
 <i className="fas fa-times text-xs"></i>
 </button>
 </div>

 {/* Fotos Frente/Costas/Detalhe */}
 <div className="mb-4">
 <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' text-[10px] font-medium uppercase tracking-wide mb-2'}>Fotos do Produto</p>
 <div className="grid grid-cols-3 gap-2">
 {/* FRENTE */}
 <div className="flex flex-col">
 <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px] font-medium uppercase tracking-wide mb-1 flex items-center gap-1'}>
 <i className="fas fa-image text-[#E91E8C] text-[8px]"></i>
 Frente <span className="text-[#E91E8C]">*</span>
 </label>
 {selectedFrontImage ? (
 <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-[#E91E8C]">
 <img src={selectedFrontImage} alt="Frente" className="w-full h-full object-cover" />
 <div className="absolute top-1 right-1 flex gap-0.5">
 <button onClick={() => setShowPhotoSourcePicker('front')} className="w-5 h-5 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center">
 <i className="fas fa-sync text-[7px]"></i>
 </button>
 <button onClick={() => setSelectedFrontImage(null)} className="w-5 h-5 bg-red-500/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center">
 <i className="fas fa-times text-[7px]"></i>
 </button>
 </div>
 <div className="absolute bottom-1 left-1 px-1 py-0.5 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white text-[7px] font-bold rounded-full">
 <i className="fas fa-check mr-0.5"></i>OK
 </div>
 </div>
 ) : (
 <div onDrop={(e) => handleImageDrop(e, 'front')} onDragOver={handleDragOver} onClick={() => setShowPhotoSourcePicker('front')} className={(theme === 'dark' ? 'border-neutral-700 hover:border-neutral-500 bg-neutral-800/50' : 'border-gray-300 hover:border-gray-400 bg-gray-50') + ' aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all cursor-pointer'}>
 <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-plus text-sm'}></i>
 <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[8px]'}>Adicionar</span>
 </div>
 )}
 </div>

 {/* COSTAS */}
 <div className="flex flex-col">
 <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px] font-medium uppercase tracking-wide mb-1 flex items-center gap-1'}>
 <i className="fas fa-image text-neutral-400 text-[8px]"></i>
 Costas
 </label>
 {selectedBackImage ? (
 <div className={(theme === 'dark' ? 'border-green-500' : 'border-green-400') + ' relative aspect-square rounded-lg overflow-hidden border-2'}>
 <img src={selectedBackImage} alt="Costas" className="w-full h-full object-cover" />
 <div className="absolute top-1 right-1 flex gap-0.5">
 <button onClick={() => setShowPhotoSourcePicker('back')} className="w-5 h-5 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center">
 <i className="fas fa-sync text-[7px]"></i>
 </button>
 <button onClick={() => setSelectedBackImage(null)} className="w-5 h-5 bg-red-500/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center">
 <i className="fas fa-times text-[7px]"></i>
 </button>
 </div>
 <div className="absolute bottom-1 left-1 px-1 py-0.5 bg-green-500 text-white text-[7px] font-bold rounded-full">
 <i className="fas fa-check mr-0.5"></i>OK
 </div>
 </div>
 ) : (
 <div onDrop={(e) => handleImageDrop(e, 'back')} onDragOver={handleDragOver} onClick={() => setShowPhotoSourcePicker('back')} className={(theme === 'dark' ? 'border-neutral-700 hover:border-neutral-500 bg-neutral-800/50' : 'border-gray-300 hover:border-gray-400 bg-gray-50') + ' aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all cursor-pointer'}>
 <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-plus text-sm'}></i>
 <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[8px]'}>Adicionar</span>
 </div>
 )}
 </div>

 {/* DETALHE */}
 <div className="flex flex-col">
 <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px] font-medium uppercase tracking-wide mb-1 flex items-center gap-1'}>
 <i className="fas fa-magnifying-glass-plus text-[#FF9F43] text-[8px]"></i>
 Detalhe
 </label>
 {selectedDetailImage ? (
 <div className={(theme === 'dark' ? 'border-[#FF9F43]' : 'border-[#FF9F43]') + ' relative aspect-square rounded-lg overflow-hidden border-2'}>
 <img src={selectedDetailImage} alt="Detalhe" className="w-full h-full object-cover" />
 <div className="absolute top-1 right-1 flex gap-0.5">
 <button onClick={() => setShowPhotoSourcePicker('detail')} className="w-5 h-5 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center">
 <i className="fas fa-sync text-[7px]"></i>
 </button>
 <button onClick={() => setSelectedDetailImage(null)} className="w-5 h-5 bg-red-500/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center">
 <i className="fas fa-times text-[7px]"></i>
 </button>
 </div>
 <div className="absolute bottom-1 left-1 px-1 py-0.5 bg-[#FF9F43] text-white text-[7px] font-bold rounded-full">
 <i className="fas fa-check mr-0.5"></i>OK
 </div>
 </div>
 ) : (
 <div onDrop={(e) => handleImageDrop(e, 'detail')} onDragOver={handleDragOver} onClick={() => setShowPhotoSourcePicker('detail')} className={(theme === 'dark' ? 'border-neutral-700 hover:border-neutral-500 bg-neutral-800/50' : 'border-gray-300 hover:border-gray-400 bg-gray-50') + ' aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all cursor-pointer'}>
 <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-plus text-sm'}></i>
 <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[8px]'}>Adicionar</span>
 </div>
 )}
 </div>
 </div>

 {/* Dica */}
 <div className={(theme === 'dark' ? 'bg-[#FF9F43]/10 border-[#FF9F43]/30' : 'bg-orange-50 border-[#FF9F43]/20') + ' rounded-lg p-2 mt-3 border'}>
 <p className={(theme === 'dark' ? 'text-[#FF9F43]' : 'text-[#FF9F43]') + ' text-[10px] flex items-start gap-1.5'}>
 <i className="fas fa-magnifying-glass-plus mt-0.5"></i>
 <span><strong>Imagem de Detalhe:</strong> Importante para logos, estampas ou detalhes pequenos que precisam aparecer fielmente na IA.</span>
 </p>
 </div>

 </div>

 {/* OVERLAY DE ANÁLISE IA - Tela imersiva de loading */}
 {isAnalyzingImage && (
 <div className={`absolute inset-0 z-50 backdrop-blur-2xl flex flex-col items-center justify-center rounded-2xl ${theme === 'dark' ? 'bg-neutral-900/70 border border-white/10' : 'bg-white/30 border border-gray-200/40'}`}>
 {/* Animação central */}
 <div className="relative mb-6">
 {/* Círculo externo pulsante */}
 <div className="absolute inset-0 w-24 h-24 rounded-full bg-gradient-to-r from-[#FF6B6B]/30 to-[#FF9F43]/30 animate-ping"></div>
 {/* Círculo principal */}
 <div className="relative w-24 h-24 rounded-full bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] flex items-center justify-center">
 <i className="fas fa-wand-magic-sparkles text-white text-3xl animate-pulse"></i>
 </div>
 </div>

 {/* Texto */}
 <h3 className={`text-lg font-semibold mb-2 font-serif ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Analisando imagem...</h3>
 <p className={`text-sm text-center px-8 mb-4 ${theme === 'dark' ? 'text-neutral-300' : 'text-gray-500'}`}>
 Nossa IA está identificando o produto, cor, marca e categoria
 </p>

 {/* Barra de progresso animada */}
 <div className={`w-48 h-1.5 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-white/20' : 'bg-gray-200'}`}>
 <div className="h-full w-1/2 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] rounded-full animate-loading"></div>
 </div>

 {/* Lista de detecções */}
 <div className="mt-6 space-y-2 text-center">
 <div className={`flex items-center gap-2 text-xs ${theme === 'dark' ? 'text-neutral-300' : 'text-gray-600'}`}>
 <i className="fas fa-check-circle text-green-400"></i>
 <span>Tipo de produto</span>
 </div>
 <div className={`flex items-center gap-2 text-xs ${theme === 'dark' ? 'text-neutral-300' : 'text-gray-600'}`}>
 <i className="fas fa-spinner fa-spin text-[#FF9F43]"></i>
 <span>Cor e padrão</span>
 </div>
 <div className={`flex items-center gap-2 text-xs ${theme === 'dark' ? 'text-neutral-400/50' : 'text-gray-400'}`}>
 <i className="fas fa-circle text-[#FF9F43]/30"></i>
 <span>Marca e caimento</span>
 </div>
 </div>
 </div>
 )}

 {/* Form Fields */}
 <div className="space-y-3">
 <div>
 <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' block text-[9px] font-medium uppercase tracking-wide mb-1'}>Nome do Produto *</label>
 <input type="text" id="new-product-name" name="productName" autoComplete="off" value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm'} placeholder="Ex: Camiseta Básica Branca" />
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' block text-[9px] font-medium uppercase tracking-wide mb-1'}>Marca</label>
 <input type="text" id="new-product-brand" name="productBrand" autoComplete="off" value={newProduct.brand} onChange={(e) => setNewProduct({...newProduct, brand: e.target.value})} className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm'} placeholder="Ex: Nike" />
 </div>
 <div>
 <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' block text-[9px] font-medium uppercase tracking-wide mb-1'}>Cor</label>
 <select value={newProduct.color} onChange={(e) => setNewProduct({...newProduct, color: e.target.value})} className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm'}>
 <option value="">Selecione</option>
 {COLORS.map(color => <option key={color} value={color}>{color}</option>)}
 </select>
 </div>
 </div>
 <div>
 <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' block text-[9px] font-medium uppercase tracking-wide mb-1'}>Categoria *</label>
 <select value={newProduct.category} onChange={(e) => { setNewProduct({...newProduct, category: e.target.value}); setProductAttributes({}); }} className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm'}>
 <option value="">Selecione</option>
 {CATEGORY_GROUPS.map(group => (
 <optgroup key={group.label} label={group.label}>
 {group.items.map(cat => <option key={cat} value={cat}>{cat}</option>)}
 </optgroup>
 ))}
 </select>
 </div>

 {/* Atributos condicionais por categoria */}
 {newProduct.category && CATEGORY_ATTRIBUTES[newProduct.category] && (
 <div className={(theme === 'dark' ? 'bg-neutral-800/50 border-neutral-700' : 'bg-gray-50 border-gray-200') + ' p-3 rounded-xl border'}>
 <div className="flex items-center gap-2 mb-2">
 <i className={(theme === 'dark' ? 'text-[#E91E8C]' : 'text-[#E91E8C]') + ' fas fa-sliders text-xs'}></i>
 <span className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-[10px] font-medium uppercase tracking-wide'}>Atributos de {newProduct.category}</span>
 </div>
 <div className={`grid gap-3 ${CATEGORY_ATTRIBUTES[newProduct.category].length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
 {CATEGORY_ATTRIBUTES[newProduct.category].map(attr => (
 <div key={attr.id}>
 <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' block text-[9px] font-medium uppercase tracking-wide mb-1'}>{attr.label}</label>
 <select
 value={productAttributes[attr.id] || ''}
 onChange={(e) => setProductAttributes(prev => ({ ...prev, [attr.id]: e.target.value }))}
 className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm'}
 >
 <option value="">Selecione</option>
 {attr.options.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
 </select>
 </div>
 ))}
 </div>
 <p className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' text-[9px] mt-2'}>
 <i className="fas fa-info-circle mr-1"></i>
 Esses atributos ajudam a IA a gerar imagens mais precisas
 </p>
 </div>
 )}

 <button onClick={editingProduct ? handleSaveEditedProduct : handleCreateProduct} disabled={isCreatingProduct || !selectedFrontImage} className="w-full py-2.5 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-lg font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
 {isCreatingProduct ? (
 <>
 <i className="fas fa-spinner fa-spin text-xs"></i>
 Salvando...
 </>
 ) : (
 <>
 <i className="fas fa-check mr-1.5"></i>{editingProduct ? 'Salvar Alterações' : 'Criar Produto'}
 </>
 )}
 </button>
 </div>
 </div>
 </div>
)}

 {/* PRODUCT DETAIL MODAL */}
 {showProductDetail && (
 <div
 className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-4"
 style={{
 paddingTop: 'env(safe-area-inset-top, 0px)',
 paddingBottom: 'env(safe-area-inset-bottom, 0px)'
 }}
 onClick={() => setShowProductDetail(null)}
 >
 <div
 className={(theme === 'dark' ? 'bg-neutral-900' : 'bg-white') + ' rounded-t-2xl md:rounded-2xl w-full max-w-lg overflow-hidden flex flex-col'}
 style={{
 maxHeight: 'calc(92vh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))',
 marginBottom: 'env(safe-area-inset-bottom, 0px)'
 }}
 onClick={(e) => e.stopPropagation()}
 >
 {/* Header fixo com botão fechar visível no mobile */}
 <div className={'flex items-center justify-between p-4 border-b safe-area-top md:pt-4 ' + (theme === 'dark' ? 'border-neutral-800' : 'border-gray-200')}>
 <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-medium'}>Detalhes do Produto</h3>
 <div className="flex items-center gap-2">
 <button onClick={() => startEditProduct(showProductDetail)} className={(theme === 'dark' ? 'bg-neutral-800 text-neutral-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-700') + ' w-8 h-8 rounded-full flex items-center justify-center'}>
 <i className="fas fa-pen text-sm"></i>
 </button>
 <button onClick={() => setShowProductDetail(null)} className={(theme === 'dark' ? 'bg-neutral-800 text-neutral-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-700') + ' w-8 h-8 rounded-full flex items-center justify-center'}>
 <i className="fas fa-times text-sm"></i>
 </button>
 </div>
 </div>

 {/* Conteúdo com scroll */}
 <div className="flex-1 overflow-y-auto p-4">
 {/* Toggle para alternar entre foto otimizada e original */}
 {isProductOptimized(showProductDetail) && (
 <div className="flex items-center justify-center gap-2 mb-3">
 <button
 onClick={() => setShowOptimizedImage(true)}
 className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
 showOptimizedImage
 ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white '
 : (theme === 'dark' ? 'bg-neutral-800 text-neutral-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-700')
 }`}
 >
 <i className="fas fa-cube text-[10px]"></i>
 Otimizada
 </button>
 <button
 onClick={() => setShowOptimizedImage(false)}
 className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
 !showOptimizedImage
 ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white '
 : (theme === 'dark' ? 'bg-neutral-800 text-neutral-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-700')
 }`}
 >
 <i className="fas fa-image text-[10px]"></i>
 Original
 </button>
 </div>
 )}

 {/* Imagem principal */}
 <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100') + ' rounded-xl overflow-hidden mb-4 relative'}>
 <img
 src={
 isProductOptimized(showProductDetail) && showOptimizedImage
 ? getProductDisplayImage(showProductDetail)
 : (getOriginalImages(showProductDetail)[0]?.url || showProductDetail.images[0]?.base64 || showProductDetail.images[0]?.url)
 }
 alt={showProductDetail.name}
 className="w-full h-auto max-h-[50vh] object-contain"
 />
 {isProductOptimized(showProductDetail) && showOptimizedImage && (
 <div className="absolute top-2 left-2 px-2 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-[9px] font-bold rounded-full flex items-center gap-1.5 ">
 <i className="fas fa-cube text-[8px]"></i>
 Foto Otimizada
 </div>
 )}
 </div>

 {/* Informações do produto */}
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px] font-medium uppercase tracking-wide mb-0.5'}>{showProductDetail.sku}</p>
 <h4 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-base font-semibold mb-3'}>{showProductDetail.name}</h4>

 <div className="grid grid-cols-2 gap-2">
 {showProductDetail.brand && (
 <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100') + ' rounded-lg p-2'}>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[8px] uppercase tracking-wide mb-0.5'}>Marca</p>
 <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-[10px] font-medium'}>{showProductDetail.brand}</p>
 </div>
 )}
 {showProductDetail.category && (
 <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100') + ' rounded-lg p-2'}>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[8px] uppercase tracking-wide mb-0.5'}>Categoria</p>
 <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-[10px] font-medium'}>{showProductDetail.category}</p>
 </div>
 )}
 {showProductDetail.color && (
 <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100') + ' rounded-lg p-2'}>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[8px] uppercase tracking-wide mb-0.5'}>Cor</p>
 <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-[10px] font-medium'}>{showProductDetail.color}</p>
 </div>
 )}
 {showProductDetail.fit && (
 <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100') + ' rounded-lg p-2'}>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[8px] uppercase tracking-wide mb-0.5'}>Caimento</p>
 <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-[10px] font-medium'}>{showProductDetail.fit}</p>
 </div>
 )}
 </div>

 {/* Seção Fotos Otimizadas (Product Studio) */}
 {isProductOptimized(showProductDetail) && (
 <div className={'mt-4 pt-4 border-t ' + (theme === 'dark' ? 'border-neutral-800' : 'border-gray-200')}>
 <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold mb-3 flex items-center gap-2'}>
 <span className="w-6 h-6 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
 <i className="fas fa-cube text-white text-[10px]"></i>
 </span>
 Fotos Otimizadas
 <span className="px-1.5 py-0.5 bg-green-500/20 text-green-500 text-[8px] font-medium rounded-full">
 {getOptimizedImages(showProductDetail).length} {getOptimizedImages(showProductDetail).length === 1 ? 'foto' : 'fotos'}
 </span>
 </p>
 <div className="grid grid-cols-4 gap-2">
 {getOptimizedImages(showProductDetail).map((img, idx) => (
 <div key={idx} className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100') + ' rounded-lg overflow-hidden relative group'}>
 <img src={img.url} alt={`Otimizada ${img.angle}`} loading="lazy" className="w-full aspect-square object-cover" />
 <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1">
 <p className="text-white text-[7px] font-medium text-center capitalize">
 {img.angle === 'front' ? 'Frente' : img.angle === 'back' ? 'Costas' : img.angle === 'side-left' ? 'Lat. Esq.' : img.angle === 'side-right' ? 'Lat. Dir.' : img.angle}
 </p>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Seção Fotos Originais */}
 {getOriginalImages(showProductDetail).length > 0 && (
 <div className={'mt-4 pt-4 border-t ' + (theme === 'dark' ? 'border-neutral-800' : 'border-gray-200')}>
 <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold mb-3 flex items-center gap-2'}>
 <span className={(theme === 'dark' ? 'bg-gray-300' : 'bg-gray-200') + ' w-6 h-6 rounded-lg flex items-center justify-center'}>
 <i className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' fas fa-image text-[10px]'}></i>
 </span>
 Fotos Originais
 <span className={(theme === 'dark' ? 'bg-gray-300 text-neutral-400' : 'bg-gray-200 text-gray-500') + ' px-1.5 py-0.5 text-[8px] font-medium rounded-full'}>
 {getOriginalImages(showProductDetail).length} {getOriginalImages(showProductDetail).length === 1 ? 'foto' : 'fotos'}
 </span>
 </p>
 <div className="grid grid-cols-4 gap-2">
 {getOriginalImages(showProductDetail).map((img, idx) => (
 <div key={idx} className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100') + ' rounded-lg overflow-hidden relative'}>
 <img src={img.url} alt={img.label} loading="lazy" className="w-full aspect-square object-cover" />
 <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1">
 <p className="text-white text-[7px] font-medium text-center">{img.label}</p>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Seção "Deseja criar?" */}
 <div className={'mt-5 pt-4 border-t ' + (theme === 'dark' ? 'border-neutral-800' : 'border-gray-200')}>
 <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold mb-3'}>
 <i className="fas fa-wand-magic-sparkles text-[#E91E8C] mr-2"></i>
 Deseja criar?
 </p>
 <div className="grid grid-cols-2 gap-2">
 {/* Product Studio */}
 <button
 onClick={() => {
 setProductForCreation(showProductDetail);
 setShowProductDetail(null);
 navigateTo('product-studio');
 }}
 className={(theme === 'dark' ? 'bg-neutral-800 hover:bg-gray-300 border-neutral-700' : 'bg-gray-50 hover:bg-gray-100 border-gray-200') + ' border rounded-xl p-3 text-left transition-all group'}
 >
 <div className={'w-8 h-8 rounded-lg flex items-center justify-center mb-2 backdrop-blur-xl ' + (theme === 'dark' ? 'bg-white/10 border border-white/15' : 'bg-white/60 border border-gray-200/60 shadow-sm')}>
 <i className={'fas fa-camera text-xs ' + (theme === 'dark' ? 'text-neutral-200' : 'text-[#1A1A1A]')}></i>
 </div>
 <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>Product Studio</p>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px]'}>Foto profissional</p>
 </button>

 {/* Provador */}
 <button
 onClick={() => {
 setProductForCreation(showProductDetail);
 setShowProductDetail(null);
 navigateTo('provador');
 }}
 className={(theme === 'dark' ? 'bg-neutral-800 hover:bg-gray-300 border-neutral-700' : 'bg-gray-50 hover:bg-gray-100 border-gray-200') + ' border rounded-xl p-3 text-left transition-all group'}
 >
 <div className={'w-8 h-8 rounded-lg flex items-center justify-center mb-2 backdrop-blur-xl ' + (theme === 'dark' ? 'bg-white/10 border border-white/15' : 'bg-white/60 border border-gray-200/60 shadow-sm')}>
 <i className={'fas fa-shirt text-xs ' + (theme === 'dark' ? 'text-neutral-200' : 'text-[#1A1A1A]')}></i>
 </div>
 <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>Provador</p>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px]'}>Vista seus clientes</p>
 </button>

 {/* Vizzu Look Composer */}
 <button
 onClick={() => {
 setProductForCreation(showProductDetail);
 setShowProductDetail(null);
 navigateTo('look-composer');
 }}
 className={(theme === 'dark' ? 'bg-neutral-800 hover:bg-gray-300 border-neutral-700' : 'bg-gray-50 hover:bg-gray-100 border-gray-200') + ' border rounded-xl p-3 text-left transition-all group'}
 >
 <div className={'w-8 h-8 rounded-lg flex items-center justify-center mb-2 backdrop-blur-xl ' + (theme === 'dark' ? 'bg-white/10 border border-white/15' : 'bg-white/60 border border-gray-200/60 shadow-sm')}>
 <i className={'fas fa-layer-group text-xs ' + (theme === 'dark' ? 'text-neutral-200' : 'text-[#1A1A1A]')}></i>
 </div>
 <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>Vizzu Look Composer&reg;</p>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px]'}>Monte combinações</p>
 </button>

 {/* Cenário Criativo */}
 <button
 onClick={() => {
 setProductForCreation(showProductDetail);
 setShowProductDetail(null);
 navigateTo('lifestyle');
 }}
 className={(theme === 'dark' ? 'bg-neutral-800 hover:bg-gray-300 border-neutral-700' : 'bg-gray-50 hover:bg-gray-100 border-gray-200') + ' border rounded-xl p-3 text-left transition-all group'}
 >
 <div className={'w-8 h-8 rounded-lg flex items-center justify-center mb-2 backdrop-blur-xl ' + (theme === 'dark' ? 'bg-white/10 border border-white/15' : 'bg-white/60 border border-gray-200/60 shadow-sm')}>
 <i className={'fas fa-mountain-sun text-xs ' + (theme === 'dark' ? 'text-neutral-200' : 'text-[#1A1A1A]')}></i>
 </div>
 <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>Cenário Criativo</p>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px]'}>Com ambiente</p>
 </button>
 </div>
 </div>
 </div>

 </div>
 </div>
 )}

 <BulkImportModal
 isOpen={showBulkImport}
 onClose={() => setShowBulkImport(false)}
 onImport={(importedProducts) => {
 const newProducts = importedProducts.map(p => ({
 ...p,
 id: p.id || `prod-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
 sku: p.sku || `SKU-${Date.now()}`,
 name: p.name || 'Produto Importado',
 category: p.category || '',
 images: p.images || [],
 createdAt: p.createdAt || new Date().toISOString(),
 } as Product));

 setProducts(prev => [...prev, ...newProducts]);

 // Log da importação
 const newLog: HistoryLog = {
 id: `log-${Date.now()}`,
 date: new Date().toISOString(),
 action: 'Importação em Massa',
 details: `${newProducts.length} produtos importados`,
 status: 'success',
 method: 'bulk',
 cost: 0,
 itemsCount: newProducts.length,
 };
 setHistoryLogs(prev => [newLog, ...prev]);

 // Notificação
 setSuccessNotification(`${newProducts.length} produtos importados com sucesso!`);
 setTimeout(() => setSuccessNotification(null), 3000);
 }}
 theme={theme}
 />

 {/* Modal de confirmação de exclusão de produtos */}
 {showDeleteProductsModal && (
 <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => { setShowDeleteProductsModal(false); setDeleteProductTarget(null); }}>
 <div className={(theme === 'dark' ? 'bg-neutral-900' : 'bg-white') + ' rounded-t-2xl md:rounded-2xl w-full max-w-sm p-5 safe-area-bottom-sheet'} onClick={(e) => e.stopPropagation()}>
 {/* Drag handle - mobile */}
 <div className="md:hidden pb-3 flex justify-center -mt-1">
 <div className={(theme === 'dark' ? 'bg-gray-300' : 'bg-gray-300') + ' w-10 h-1 rounded-full'}></div>
 </div>
 <div className="flex items-center gap-3 mb-4">
 <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
 <i className="fas fa-trash text-red-500"></i>
 </div>
 <div>
 <h4 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium'}>
 {deleteProductTarget ? 'Excluir Produto' : `Excluir ${selectedProducts.length} Produto${selectedProducts.length > 1 ? 's' : ''}`}
 </h4>
 <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' text-xs'}>Esta ação não pode ser desfeita</p>
 </div>
 </div>

 <p className={(theme === 'dark' ? 'text-neutral-300' : 'text-gray-600') + ' text-sm mb-4'}>
 {deleteProductTarget
 ? <>Tem certeza que deseja excluir <strong>"{deleteProductTarget.name}"</strong>?</>
 : <>Tem certeza que deseja excluir <strong>{selectedProducts.length} produto{selectedProducts.length > 1 ? 's' : ''}</strong> selecionado{selectedProducts.length > 1 ? 's' : ''}?</>
 }
 </p>

 <div className="flex gap-2">
 <button
 onClick={() => { setShowDeleteProductsModal(false); setDeleteProductTarget(null); }}
 className={(theme === 'dark' ? 'bg-neutral-800 text-white hover:bg-gray-300' : 'bg-gray-100 text-gray-700 hover:bg-gray-200') + ' flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors'}
 >
 Cancelar
 </button>
 <button
 onClick={() => {
 if (deleteProductTarget) {
 handleDeleteProduct(deleteProductTarget);
 setSelectedProducts(prev => prev.filter(id => id !== deleteProductTarget.id));
 setShowDeleteProductsModal(false);
 setDeleteProductTarget(null);
 } else {
 deleteSelectedProducts(selectedProducts, () => {
 setSelectedProducts([]);
 setShowDeleteProductsModal(false);
 });
 }
 }}
 className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
 >
 <i className="fas fa-trash text-xs"></i>
 Excluir
 </button>
 </div>
 </div>
 </div>
 )}
    </>
  );
}

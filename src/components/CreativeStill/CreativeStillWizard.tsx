import React, { useState, useRef, useMemo } from 'react';
import {
 Product,
 CreativeStillWizardState,
 CreativeStillAdditionalProduct,
} from '../../types';
import {
 LIGHTING_OPTIONS,
 LENS_OPTIONS,
 CAMERA_ANGLES,
 FRAME_RATIOS,
 ALL_PRESENTATIONS,
 PRODUCT_TYPES_FOR_UPLOAD,
 PRODUCT_SCALES,
 MOOD_SEASONS,
 VISUAL_STYLES,
 RESOLUTIONS,
 getPresentationsForType,
 getProductTypeGroup,
 ProductTypeGroup,
} from './index';

// ============================================================
// CONSTANTES
// ============================================================

const CATEGORY_GROUPS = [
 { id: 'cabeca', label: '👒 Cabeça', items: ['Bonés', 'Chapéus', 'Tiaras', 'Lenços'] },
 { id: 'parte-de-cima', label: '👕 Parte de Cima', items: ['Camisetas', 'Blusas', 'Regatas', 'Tops', 'Camisas', 'Bodies', 'Jaquetas', 'Casacos', 'Blazers', 'Moletons'] },
 { id: 'parte-de-baixo', label: '👖 Parte de Baixo', items: ['Calças', 'Shorts', 'Bermudas', 'Saias', 'Leggings', 'Shorts Fitness'] },
 { id: 'pecas-inteiras', label: '👗 Peças Inteiras', items: ['Vestidos', 'Macacões', 'Jardineiras', 'Biquínis', 'Maiôs'] },
 { id: 'calcados', label: '👟 Calçados', items: ['Tênis', 'Sandálias', 'Botas', 'Sapatos', 'Chinelos'] },
 { id: 'acessorios', label: '💍 Acessórios', items: ['Bolsas', 'Cintos', 'Relógios', 'Óculos', 'Bijuterias', 'Mochilas', 'Outros Acessórios'] },
];
const getCategoryGroupBySubcategory = (subcategory: string) => CATEGORY_GROUPS.find(g => g.items.includes(subcategory));

const STEPS = [
 { id: 1, title: 'Produtos', icon: 'fa-box' },
 { id: 2, title: 'Cenário', icon: 'fa-mountain-sun' },
 { id: 3, title: 'Estética', icon: 'fa-camera-retro' },
 { id: 4, title: 'Frame & Configs', icon: 'fa-sliders' },
];

// ============================================================
// INFO TOOLTIP (click-toggle, mobile-friendly)
// ============================================================

const InfoTooltip: React.FC<{ text: string; isDark: boolean }> = ({ text, isDark }) => {
 const [open, setOpen] = React.useState(false);
 return (
 <span className="relative inline-flex ml-1.5 align-middle">
 <button
 type="button"
 onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
 className={(isDark ? 'text-neutral-500 hover:text-amber-400' : 'text-gray-400 hover:text-amber-500') + ' transition-colors'}
 aria-label="Mais informações"
 >
 <i className="fas fa-circle-question text-[11px]"></i>
 </button>
 {open && (
 <div className={'absolute left-0 top-full mt-1.5 z-30 w-64 rounded-lg p-3 text-xs leading-relaxed border ' + (isDark ? 'bg-neutral-800 border-neutral-700 text-neutral-300' : 'bg-white border-gray-200 text-gray-600 ')}>
 {text}
 </div>
 )}
 </span>
 );
};

// ============================================================
// BUDGET CALCULATOR
// ============================================================

export interface ImageBudget {
 totalUsed: number;
 products: number;
 references: number;
 elementsAsImage: number;
 elementsAsText: number;
}

export function calculateImageBudget(ws: CreativeStillWizardState): ImageBudget {
 const MAX = 14;
 let used = 0;

 // Priority 1 — Products (always image)
 let products = 0;
 if (ws.mainProduct) {
 products += 1; // front
 if (ws.mainProductView === 'both') products += 1; // back
 }
 products += ws.additionalProducts.length;
 used += products;

 // Priority 2 — Visual references
 let references = 0;
 if (ws.surfaceReference) references++;
 if (ws.environmentReference) references++;
 if (ws.compositionReference) references++;
 if (ws.lightingReference) references++;
 if (ws.visualStyleReference) references++;
 used += references;

 // Priority 3 — Composition elements with image
 const elementsWithImage = ws.compositionElements.filter(e => e.image).length;
 const remaining = MAX - used;
 const elementsAsImage = Math.min(elementsWithImage, remaining);
 const elementsAsText = elementsWithImage - elementsAsImage;
 used += elementsAsImage;

 return { totalUsed: used, products, references, elementsAsImage, elementsAsText };
}

// ============================================================
// PROPS
// ============================================================

interface Props {
 theme: 'dark' | 'light';
 products: Product[];
 wizardState: CreativeStillWizardState;
 onUpdateState: (updates: Partial<CreativeStillWizardState>) => void;
 onGenerate: () => void;
 onBack: () => void;
 userCredits: number;
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export const CreativeStillWizard: React.FC<Props> = ({
 theme,
 products,
 wizardState,
 onUpdateState,
 onGenerate,
 onBack,
 userCredits,
}) => {
 const [currentStep, setCurrentStep] = useState(1);
 const [showProductModal, setShowProductModal] = useState(false);
 const [showAddElementModal, setShowAddElementModal] = useState(false);
 const [productSearchTerm, setProductSearchTerm] = useState('');
 const [productFilterCategoryGroup, setProductFilterCategoryGroup] = useState('');
 const [productFilterCategory, setProductFilterCategory] = useState('');
 const [elementTab, setElementTab] = useState<'catalog' | 'upload'>('catalog');
 const [elementPosition, setElementPosition] = useState('');
 const [elementSearchTerm, setElementSearchTerm] = useState('');
 const [elementFilterCategoryGroup, setElementFilterCategoryGroup] = useState('');
 const [elementFilterCategory, setElementFilterCategory] = useState('');
 const [uploadProductType, setUploadProductType] = useState<ProductTypeGroup | null>(null);
 const [budgetExpanded, setBudgetExpanded] = useState(false);
 const elementFileRef = useRef<HTMLInputElement>(null);
 const mainProductFileRef = useRef<HTMLInputElement>(null);
 const [dragOver, setDragOver] = useState(false);

 const isDark = theme === 'dark';
 const totalSteps = STEPS.length;

 // Filtra produtos
 const filteredProducts = useMemo(() => {
 return products.filter(product => {
 const matchesSearch = !productSearchTerm ||
 product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
 (product.sku || '').toLowerCase().includes(productSearchTerm.toLowerCase());
 const categoryGroup = getCategoryGroupBySubcategory(product.category);
 const matchesCategoryGroup = !productFilterCategoryGroup || categoryGroup?.id === productFilterCategoryGroup;
 const matchesCategory = !productFilterCategory || product.category === productFilterCategory;
 return matchesSearch && matchesCategoryGroup && matchesCategory;
 });
 }, [products, productSearchTerm, productFilterCategoryGroup, productFilterCategory]);

 const filteredElementProducts = useMemo(() => {
 return products.filter(product => {
 const matchesSearch = !elementSearchTerm ||
 product.name.toLowerCase().includes(elementSearchTerm.toLowerCase()) ||
 (product.sku || '').toLowerCase().includes(elementSearchTerm.toLowerCase());
 const categoryGroup = getCategoryGroupBySubcategory(product.category);
 const matchesCategoryGroup = !elementFilterCategoryGroup || categoryGroup?.id === elementFilterCategoryGroup;
 const matchesCategory = !elementFilterCategory || product.category === elementFilterCategory;
 return matchesSearch && matchesCategoryGroup && matchesCategory;
 });
 }, [products, elementSearchTerm, elementFilterCategoryGroup, elementFilterCategory]);

 const isUploadedProduct = wizardState.mainProduct?.id?.startsWith('upload-') ?? false;
 const effectiveProductType: ProductTypeGroup | null = wizardState.mainProduct
 ? (isUploadedProduct ? uploadProductType : getProductTypeGroup(wizardState.mainProduct.category))
 : null;
 const availablePresentations = getPresentationsForType(effectiveProductType);

 // Navegação
 const canGoNext = () => {
 if (currentStep === 1) {
 if (!wizardState.mainProduct) return false;
 if (isUploadedProduct && !uploadProductType) return false;
 if (!isUploadedProduct && wizardState.mainProductView === 'back' && !hasBackImage(wizardState.mainProduct!)) return false;
 return true;
 }
 return true;
 };

 const goNext = () => {
 if (currentStep < totalSteps && canGoNext()) setCurrentStep(prev => prev + 1);
 };

 const goPrev = () => {
 if (currentStep > 1) setCurrentStep(prev => prev - 1);
 else onBack();
 };

 // ============================================================
 // HELPERS
 // ============================================================

 const getProductImageUrl = (product: Product): string => {
 if (product.generatedImages?.productStudio?.length) {
 const lastSession = product.generatedImages.productStudio[product.generatedImages.productStudio.length - 1];
 if (lastSession.images?.length) {
 const frontImage = lastSession.images.find(img => img.angle === 'front');
 if (frontImage?.url) return frontImage.url;
 if (lastSession.images[0]?.url) return lastSession.images[0].url;
 }
 }
 if (product.originalImages?.front?.url) return product.originalImages.front.url;
 if (product.images?.[0]?.url) return product.images[0].url;
 if (product.images?.[0]?.base64) return product.images[0].base64;
 return '';
 };

 const getProductBackImageUrl = (product: Product): string => {
 if (product.generatedImages?.productStudio?.length) {
 const lastSession = product.generatedImages.productStudio[product.generatedImages.productStudio.length - 1];
 const back = lastSession.images?.find(i => i.angle === 'back');
 if (back?.url) return back.url;
 }
 if (product.originalImages?.back?.url) return product.originalImages.back.url;
 return '';
 };

 const hasBackImage = (product: Product): boolean => {
 if (product.hasBackImage) return true;
 if (product.generatedImages?.productStudio?.length) {
 const lastSession = product.generatedImages.productStudio[product.generatedImages.productStudio.length - 1];
 if (lastSession.images?.find(i => i.angle === 'back')) return true;
 }
 if (product.originalImages?.back?.url) return true;
 return false;
 };

 const handleAddCatalogElement = (product: Product) => {
 if (wizardState.additionalProducts.length >= 4) return;
 const newElement: CreativeStillAdditionalProduct = {
 product_id: product.id || '',
 product_name: product.name,
 product_image_url: getProductImageUrl(product),
 position_description: elementPosition,
 source: 'catalog',
 };
 onUpdateState({ additionalProducts: [...wizardState.additionalProducts, newElement] });
 setShowAddElementModal(false);
 setElementPosition('');
 setElementSearchTerm('');
 };

 const handleElementUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file || wizardState.additionalProducts.length >= 4) return;
 const reader = new FileReader();
 reader.onload = () => {
 const base64 = (reader.result as string).split(',')[1];
 const newElement: CreativeStillAdditionalProduct = {
 product_id: '',
 product_name: file.name.replace(/\.[^/.]+$/, ''),
 product_image_url: reader.result as string,
 position_description: elementPosition,
 source: 'upload',
 upload_base64: base64,
 upload_mime_type: file.type,
 };
 onUpdateState({ additionalProducts: [...wizardState.additionalProducts, newElement] });
 setShowAddElementModal(false);
 setElementPosition('');
 };
 reader.readAsDataURL(file);
 if (elementFileRef.current) elementFileRef.current.value = '';
 };

 const handleRemoveElement = (index: number) => {
 onUpdateState({ additionalProducts: wizardState.additionalProducts.filter((_, i) => i !== index) });
 };

 const handleReferenceUpload = (field: 'surfaceReference' | 'environmentReference' | 'compositionReference' | 'lightingReference' | 'visualStyleReference') => (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;
 const reader = new FileReader();
 reader.onload = () => {
 const base64 = (reader.result as string).split(',')[1];
 onUpdateState({ [field]: { base64, mimeType: file.type } });
 };
 reader.readAsDataURL(file);
 };

 const handleMainProductUpload = (file: File) => {
 const reader = new FileReader();
 reader.onload = () => {
 const dataUrl = reader.result as string;
 const uploadedProduct: Product = {
 id: `upload-${Date.now()}`,
 name: file.name.replace(/\.[^/.]+$/, ''),
 images: [{ name: file.name, url: dataUrl }],
 originalImages: { front: { name: file.name, url: dataUrl } },
 category: '',
 color: '',
 sku: '',
 } as Product;
 onUpdateState({ mainProduct: uploadedProduct, productPresentation: 'ai_choose', customPresentationText: '' });
 setUploadProductType(null);
 };
 reader.readAsDataURL(file);
 };

 const handleMainProductFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (file) handleMainProductUpload(file);
 if (mainProductFileRef.current) mainProductFileRef.current.value = '';
 };

 const handleDrop = (e: React.DragEvent) => {
 e.preventDefault();
 setDragOver(false);
 const file = e.dataTransfer.files?.[0];
 if (file && file.type.startsWith('image/')) handleMainProductUpload(file);
 };

 // ============================================================
 // STYLE HELPERS
 // ============================================================

 const cardClass = (selected: boolean) =>
 'rounded-xl p-3 text-left transition-all cursor-pointer border ' +
 (selected
 ? (isDark ? 'bg-amber-500/20 border-amber-500/50 ring-1 ring-amber-500/30' : 'bg-amber-50 border-amber-400 ring-1 ring-amber-300')
 : (isDark ? 'bg-neutral-900 border-neutral-800 hover:border-neutral-700' : 'bg-white border-gray-200 hover:border-gray-300'));

 const sectionTitle = (text: string, icon: string) => (
 <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold mb-3'}>
 <i className={'fas ' + icon + ' mr-2 text-xs opacity-50'}></i>
 {text}
 </h3>
 );

 const separator = () => (
 <div className={'my-5 border-t ' + (isDark ? 'border-neutral-800' : 'border-gray-200')}></div>
 );

 const renderRefUpload = (field: 'surfaceReference' | 'environmentReference' | 'compositionReference' | 'lightingReference' | 'visualStyleReference', value: { base64: string; mimeType: string } | null) => (
 value ? (
 <div className="relative inline-block mt-2">
 <img src={`data:${value.mimeType};base64,${value.base64}`} alt="Ref" className="w-20 h-20 object-cover rounded-lg" />
 <button onClick={() => onUpdateState({ [field]: null })} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px]">
 <i className="fas fa-times"></i>
 </button>
 </div>
 ) : (
 <label className={'inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg border border-dashed cursor-pointer text-xs transition-colors ' + (isDark ? 'border-neutral-700 hover:border-amber-500/50 text-neutral-500' : 'border-gray-300 hover:border-amber-400 text-gray-400')}>
 <i className="fas fa-cloud-arrow-up text-[10px]"></i>
 Referência visual (opcional)
 <input type="file" accept="image/*" onChange={handleReferenceUpload(field)} className="hidden" />
 </label>
 )
 );

 // ============================================================
 // STEP 1 — PRODUTOS
 // ============================================================

 const renderStep1 = () => (
 <div>
 {sectionTitle('Qual o produto principal?', 'fa-box')}

 {wizardState.mainProduct ? (
 <div className={'rounded-xl p-4 flex items-center gap-4 ' + (isDark ? 'bg-neutral-900 border border-neutral-800' : 'bg-white border border-gray-200 ')}>
 <div className={'w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 ' + (isDark ? 'bg-neutral-800' : 'bg-gray-100')}>
 {getProductImageUrl(wizardState.mainProduct) ? (
 <img src={getProductImageUrl(wizardState.mainProduct)} alt="" className="w-full h-full object-cover" />
 ) : (
 <div className="w-full h-full flex items-center justify-center">
 <i className={'fas fa-image ' + (isDark ? 'text-neutral-700' : 'text-gray-300')}></i>
 </div>
 )}
 </div>
 <div className="flex-1 min-w-0">
 <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-medium truncate'}>{wizardState.mainProduct.name}</p>
 <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>
 {wizardState.mainProduct.color && <span>{wizardState.mainProduct.color}</span>}
 {wizardState.mainProduct.category && <span> · {wizardState.mainProduct.category}</span>}
 </p>
 </div>
 <button
 onClick={() => { onUpdateState({ mainProduct: null, productPresentation: 'ai_choose', customPresentationText: '' }); setUploadProductType(null); }}
 className={(isDark ? 'text-amber-400 hover:text-amber-300' : 'text-amber-600 hover:text-amber-500') + ' text-xs font-medium'}
 >
 Trocar
 </button>
 </div>
 ) : (
 <div className="space-y-0">
 <button
 onClick={() => setShowProductModal(true)}
 className={'w-full rounded-t-xl p-4 text-left flex items-center gap-4 transition-all border border-b-0 ' + (isDark ? 'bg-neutral-900 border-neutral-800 hover:border-amber-500/50' : 'bg-white border-gray-200 hover:border-amber-400 ')}
 >
 <div className={'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ' + (isDark ? 'bg-blue-500/20' : 'bg-blue-100')}>
 <i className={'fas fa-box text-sm ' + (isDark ? 'text-blue-400' : 'text-blue-500')}></i>
 </div>
 <div>
 <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-medium'}>Selecionar do catálogo</p>
 <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>Escolha um produto já cadastrado</p>
 </div>
 <i className={'fas fa-chevron-right ml-auto text-xs ' + (isDark ? 'text-neutral-600' : 'text-gray-400')}></i>
 </button>
 <div className={'flex items-center border-x ' + (isDark ? 'border-neutral-800 bg-neutral-900' : 'border-gray-200 bg-white')}>
 <div className={'flex-1 h-px ' + (isDark ? 'bg-neutral-800' : 'bg-gray-200')}></div>
 <span className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' text-[10px] font-medium uppercase tracking-wider px-4 py-2'}>ou</span>
 <div className={'flex-1 h-px ' + (isDark ? 'bg-neutral-800' : 'bg-gray-200')}></div>
 </div>
 <div
 onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
 onDragLeave={() => setDragOver(false)}
 onDrop={handleDrop}
 className={'w-full rounded-b-xl p-6 text-center transition-all cursor-pointer border ' +
 (dragOver
 ? (isDark ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-amber-400 bg-amber-50 text-amber-500')
 : (isDark ? 'bg-neutral-900 border-neutral-800 hover:border-amber-500/50 text-neutral-500 hover:text-amber-400' : 'bg-white border-gray-200 hover:border-amber-400 text-gray-400 hover:text-amber-500')
 )}
 onClick={() => mainProductFileRef.current?.click()}
 >
 <i className={'text-2xl mb-2 block fas ' + (dragOver ? 'fa-arrow-down' : 'fa-cloud-arrow-up')}></i>
 <span className="text-sm font-medium block">{dragOver ? 'Solte a imagem aqui' : 'Subir imagem ou tirar foto'}</span>
 <span className={'text-[10px] block mt-1 ' + (isDark ? 'text-neutral-600' : 'text-gray-400')}>Arraste e solte, ou clique para selecionar · JPG, PNG, WebP</span>
 <input ref={mainProductFileRef} type="file" accept="image/*" capture="environment" onChange={handleMainProductFileChange} className="hidden" />
 </div>
 </div>
 )}

 {/* Vista: Frente / Costas / Ambos */}
 {wizardState.mainProduct && !isUploadedProduct && (
 <>
 {separator()}
 {sectionTitle('Qual vista do produto?', 'fa-camera-rotate')}
 <div className="grid grid-cols-3 gap-2">
 {(['front', 'back', 'both'] as const).map(view => {
 const labels = { front: 'Frente', back: 'Costas', both: 'Ambos' };
 const disabled = view !== 'front' && !hasBackImage(wizardState.mainProduct!);
 return (
 <button
 key={view}
 onClick={() => !disabled && onUpdateState({ mainProductView: view })}
 className={disabled
 ? 'rounded-xl p-3 text-center border opacity-50 cursor-not-allowed ' + (isDark ? 'bg-neutral-900/50 border-neutral-800' : 'bg-gray-50 border-gray-200')
 : cardClass(wizardState.mainProductView === view) + ' text-center'
 }
 >
 <span className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>{labels[view]}</span>
 </button>
 );
 })}
 </div>
 {/* Se "Ambos": destaque */}
 {wizardState.mainProductView === 'both' && (
 <div className="mt-3">
 <p className={(isDark ? 'text-neutral-400' : 'text-gray-600') + ' text-xs mb-2'}>Qual é o destaque?</p>
 <div className="grid grid-cols-2 gap-2">
 {(['front', 'back'] as const).map(hl => (
 <button key={hl} onClick={() => onUpdateState({ mainProductHighlight: hl })} className={cardClass(wizardState.mainProductHighlight === hl) + ' text-center'}>
 <span className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>{hl === 'front' ? 'Frente' : 'Costas'}</span>
 </button>
 ))}
 </div>
 </div>
 )}
 </>
 )}

 {/* Tipo de produto (upload) */}
 {wizardState.mainProduct && isUploadedProduct && (
 <>
 {separator()}
 {sectionTitle('Que tipo de produto é?', 'fa-tag')}
 <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
 {PRODUCT_TYPES_FOR_UPLOAD.map(type => (
 <button
 key={type.id}
 onClick={() => {
 setUploadProductType(type.id);
 const newPresentations = getPresentationsForType(type.id);
 if (!newPresentations.find(p => p.id === wizardState.productPresentation)) {
 onUpdateState({ productPresentation: 'ai_choose', customPresentationText: '' });
 }
 }}
 className={cardClass(uploadProductType === type.id)}
 >
 <div className="flex items-center gap-2 mb-1">
 <i className={'fas ' + type.icon + ' text-xs ' + (uploadProductType === type.id ? (isDark ? 'text-amber-400' : 'text-amber-500') : (isDark ? 'text-neutral-500' : 'text-gray-400'))}></i>
 <span className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>{type.label}</span>
 </div>
 <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>{type.description}</p>
 </button>
 ))}
 </div>
 </>
 )}

 {/* Apresentação */}
 {wizardState.mainProduct && effectiveProductType && (
 <>
 {separator()}
 {sectionTitle('Como quer exibir o produto?', 'fa-shirt')}
 <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
 {availablePresentations.map(pres => (
 <button
 key={pres.id}
 onClick={() => onUpdateState({ productPresentation: pres.id, ...(pres.id !== 'custom' ? { customPresentationText: '' } : {}) })}
 className={cardClass(wizardState.productPresentation === pres.id)}
 >
 <div className="flex items-center gap-2 mb-1">
 <i className={'fas ' + pres.icon + ' text-xs ' + (wizardState.productPresentation === pres.id ? (isDark ? 'text-amber-400' : 'text-amber-500') : (isDark ? 'text-neutral-500' : 'text-gray-400'))}></i>
 <span className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>{pres.label}</span>
 </div>
 <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>{pres.description}</p>
 </button>
 ))}
 </div>
 {wizardState.productPresentation === 'custom' && (
 <textarea
 value={wizardState.customPresentationText}
 onChange={(e) => onUpdateState({ customPresentationText: e.target.value })}
 placeholder="Ex: Boné apoiado de lado sobre uma superfície de madeira..."
 rows={3}
 className={'w-full rounded-lg px-3 py-2 text-sm outline-none border transition-colors resize-none mt-3 ' +
 (isDark ? 'bg-neutral-800 border-neutral-700 text-white placeholder-neutral-600 focus:border-amber-500/50' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-amber-400')}
 />
 )}
 </>
 )}

 {/* Escala */}
 {wizardState.mainProduct && (
 <>
 {separator()}
 <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold mb-3'}>
 <i className="fas fa-up-right-and-down-left-from-center mr-2 text-xs opacity-50"></i>
 Escala na imagem
 <InfoTooltip isDark={isDark} text="Define o quão próximo o produto aparece na foto. Close-up mostra detalhes de textura, Completo mostra o produto inteiro com espaço ao redor." />
 </h3>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
 {PRODUCT_SCALES.map(scale => (
 <button
 key={scale.id}
 onClick={() => onUpdateState({ productScale: scale.id as CreativeStillWizardState['productScale'] })}
 className={cardClass(wizardState.productScale === scale.id)}
 >
 <div className="flex items-center gap-2 mb-1">
 <i className={'fas ' + scale.icon + ' text-xs ' + (wizardState.productScale === scale.id ? (isDark ? 'text-amber-400' : 'text-amber-500') : (isDark ? 'text-neutral-500' : 'text-gray-400'))}></i>
 <span className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>{scale.label}</span>
 </div>
 <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>{scale.description}</p>
 </button>
 ))}
 </div>
 </>
 )}

 {/* Produtos complementares */}
 {separator()}
 {sectionTitle('Produtos complementares (até 4)', 'fa-layer-group')}
 <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs mb-3 -mt-1'}>
 Adicione outros produtos para compor a cena (opcional)
 </p>
 {wizardState.additionalProducts.length > 0 && (
 <div className="space-y-2 mb-3">
 {wizardState.additionalProducts.map((el, i) => (
 <div key={i} className={'rounded-lg p-3 flex items-center gap-3 ' + (isDark ? 'bg-neutral-900 border border-neutral-800' : 'bg-gray-50 border border-gray-200')}>
 {el.product_image_url ? (
 <div className={'w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 ' + (isDark ? 'bg-neutral-800' : 'bg-gray-100')}>
 <img src={el.product_image_url} alt="" className="w-full h-full object-cover" />
 </div>
 ) : (
 <div className={'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ' + (isDark ? 'bg-neutral-800' : 'bg-gray-200')}>
 <i className={'fas fa-image text-xs ' + (isDark ? 'text-neutral-600' : 'text-gray-400')}></i>
 </div>
 )}
 <div className="flex-1 min-w-0">
 <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium truncate'}>{el.product_name}</p>
 <span className={'text-[9px] px-1.5 py-0.5 rounded-full mt-0.5 inline-block ' + (
 el.source === 'catalog' ? (isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600') :
 (isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600')
 )}>
 {el.source === 'catalog' ? 'Catálogo' : 'Upload'}
 </span>
 </div>
 <button onClick={() => handleRemoveElement(i)} className={(isDark ? 'text-neutral-600 hover:text-red-400' : 'text-gray-400 hover:text-red-500') + ' transition-colors'}>
 <i className="fas fa-times"></i>
 </button>
 </div>
 ))}
 </div>
 )}
 {wizardState.additionalProducts.length < 4 && (
 <button
 onClick={() => setShowAddElementModal(true)}
 className={'w-full rounded-lg p-3 border border-dashed text-center text-xs font-medium transition-colors ' + (isDark ? 'border-neutral-700 hover:border-amber-500/50 text-neutral-500 hover:text-amber-400' : 'border-gray-300 hover:border-amber-400 text-gray-400 hover:text-amber-500')}
 >
 <i className="fas fa-plus mr-1.5"></i>Adicionar produto
 </button>
 )}
 </div>
 );

 // ============================================================
 // STEP 2 — CENÁRIO
 // ============================================================

 const renderStep2 = () => (
 <div>
 {/* Superfície */}
 <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold mb-3'}>
 <i className="fas fa-table mr-2 text-xs opacity-50"></i>
 Superfície
 <InfoTooltip isDark={isDark} text="A base onde o produto será colocado. Ex: mármore branco, madeira rústica, concreto polido, areia." />
 </h3>
 <textarea
 value={wizardState.surfaceDescription}
 onChange={(e) => onUpdateState({ surfaceDescription: e.target.value })}
 placeholder='Ex: "Mármore branco com veios dourados", "Madeira rústica envelhecida"'
 className={'w-full rounded-lg p-3 text-sm resize-none h-20 ' + (isDark ? 'bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-600' : 'bg-white border border-gray-200 text-gray-900 placeholder-gray-400')}
 />
 {renderRefUpload('surfaceReference', wizardState.surfaceReference)}

 {separator()}

 {/* Ambiente/Contexto */}
 <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold mb-3'}>
 <i className="fas fa-mountain-sun mr-2 text-xs opacity-50"></i>
 Ambiente / Contexto
 <InfoTooltip isDark={isDark} text="O fundo e cenário ao redor. Ex: jardim com plantas tropicais, estúdio minimalista, praia ao entardecer." />
 </h3>
 <textarea
 value={wizardState.environmentDescription}
 onChange={(e) => onUpdateState({ environmentDescription: e.target.value })}
 placeholder='Ex: "Jardim tropical ao fundo", "Estúdio com parede de tijolos"'
 className={'w-full rounded-lg p-3 text-sm resize-none h-20 ' + (isDark ? 'bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-600' : 'bg-white border border-gray-200 text-gray-900 placeholder-gray-400')}
 />
 {renderRefUpload('environmentReference', wizardState.environmentReference)}

 {separator()}

 {/* Elementos de composição */}
 <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold mb-3'}>
 <i className="fas fa-leaf mr-2 text-xs opacity-50"></i>
 Elementos de composição
 <InfoTooltip isDark={isDark} text="Objetos decorativos que complementam a cena. Ex: flores secas, folhas, conchas, velas, tecidos." />
 </h3>
 <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs mb-3 -mt-1'}>
 Adicione elementos decorativos para a cena (até 6)
 </p>
 {wizardState.compositionElements.length > 0 && (
 <div className="space-y-2 mb-3">
 {wizardState.compositionElements.map((el, i) => (
 <div key={i} className={'rounded-lg p-3 flex items-start gap-3 ' + (isDark ? 'bg-neutral-900 border border-neutral-800' : 'bg-gray-50 border border-gray-200')}>
 <div className="flex-1">
 <textarea
 value={el.description}
 onChange={(e) => {
 const updated = [...wizardState.compositionElements];
 updated[i] = { ...updated[i], description: e.target.value };
 onUpdateState({ compositionElements: updated });
 }}
 placeholder="Descreva o elemento..."
 rows={2}
 className={'w-full rounded-md px-2 py-1.5 text-xs resize-none ' + (isDark ? 'bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-600' : 'bg-white border border-gray-200 text-gray-900 placeholder-gray-400')}
 />
 {el.image ? (
 <div className="relative inline-block mt-2">
 <img src={`data:${el.image.mimeType};base64,${el.image.base64}`} alt="" className="w-16 h-16 object-cover rounded-lg" />
 <button onClick={() => {
 const updated = [...wizardState.compositionElements];
 updated[i] = { ...updated[i], image: undefined };
 onUpdateState({ compositionElements: updated });
 }} className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[8px]">
 <i className="fas fa-times"></i>
 </button>
 </div>
 ) : (
 <label className={'inline-flex items-center gap-1 mt-2 px-2 py-1 rounded border border-dashed cursor-pointer text-[10px] transition-colors ' + (isDark ? 'border-neutral-700 text-neutral-500 hover:border-amber-500/50' : 'border-gray-300 text-gray-400 hover:border-amber-400')}>
 <i className="fas fa-image"></i> Imagem (opcional)
 <input type="file" accept="image/*" onChange={(e) => {
 const file = e.target.files?.[0];
 if (!file) return;
 const reader = new FileReader();
 reader.onload = () => {
 const b64 = (reader.result as string).split(',')[1];
 const updated = [...wizardState.compositionElements];
 updated[i] = { ...updated[i], image: { base64: b64, mimeType: file.type } };
 onUpdateState({ compositionElements: updated });
 };
 reader.readAsDataURL(file);
 }} className="hidden" />
 </label>
 )}
 </div>
 <button onClick={() => {
 onUpdateState({ compositionElements: wizardState.compositionElements.filter((_, idx) => idx !== i) });
 }} className={(isDark ? 'text-neutral-600 hover:text-red-400' : 'text-gray-400 hover:text-red-500') + ' transition-colors mt-1'}>
 <i className="fas fa-times"></i>
 </button>
 </div>
 ))}
 </div>
 )}
 {wizardState.compositionElements.length < 6 && (
 <button
 onClick={() => onUpdateState({ compositionElements: [...wizardState.compositionElements, { description: '' }] })}
 className={'w-full rounded-lg p-3 border border-dashed text-center text-xs font-medium transition-colors ' + (isDark ? 'border-neutral-700 hover:border-amber-500/50 text-neutral-500 hover:text-amber-400' : 'border-gray-300 hover:border-amber-400 text-gray-400 hover:text-amber-500')}
 >
 <i className="fas fa-plus mr-1.5"></i>Adicionar elemento
 </button>
 )}

 {separator()}

 {/* Referência geral de composição */}
 <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold mb-3'}>
 <i className="fas fa-image mr-2 text-xs opacity-50"></i>
 Referência de composição (opcional)
 <InfoTooltip isDark={isDark} text="Uma foto de referência para o estilo geral de composição que você quer. A IA usará como inspiração." />
 </h3>
 {renderRefUpload('compositionReference', wizardState.compositionReference)}

 {separator()}

 {/* Mood / Estação */}
 <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold mb-3'}>
 <i className="fas fa-sun mr-2 text-xs opacity-50"></i>
 Mood / Estação
 <InfoTooltip isDark={isDark} text="Define a atmosfera e paleta de cores geral. Influencia tons, texturas e sensação da imagem." />
 </h3>
 <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
 {MOOD_SEASONS.map(mood => (
 <button
 key={mood.id}
 onClick={() => onUpdateState({ moodSeason: mood.id, ...(mood.id !== 'custom' ? { customMoodSeason: '' } : {}) })}
 className={cardClass(wizardState.moodSeason === mood.id)}
 >
 <div className="flex items-center gap-2">
 <i className={'fas ' + mood.icon + ' text-xs ' + (wizardState.moodSeason === mood.id ? (isDark ? 'text-amber-400' : 'text-amber-500') : (isDark ? 'text-neutral-500' : 'text-gray-400'))}></i>
 <span className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>{mood.label}</span>
 </div>
 </button>
 ))}
 </div>
 {wizardState.moodSeason === 'custom' && (
 <textarea
 value={wizardState.customMoodSeason}
 onChange={(e) => onUpdateState({ customMoodSeason: e.target.value })}
 placeholder="Descreva o mood/estação desejado..."
 rows={2}
 className={'w-full rounded-lg px-3 py-2 text-sm resize-none mt-3 ' + (isDark ? 'bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-600' : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400')}
 />
 )}
 </div>
 );

 // ============================================================
 // STEP 3 — ESTÉTICA FOTOGRÁFICA
 // ============================================================

 const renderStep3 = () => (
 <div>
 {/* BLOCO: Enquadramento */}
 <div className={'rounded-xl p-4 mb-4 ' + (isDark ? 'bg-neutral-900/50 border border-neutral-800' : 'bg-gray-50 border border-gray-200')}>
 <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold mb-4'}>
 <i className="fas fa-camera mr-2 text-xs opacity-50"></i>Enquadramento
 </h3>

 {/* Lente */}
 <p className={(isDark ? 'text-neutral-400' : 'text-gray-600') + ' text-xs font-medium mb-2'}>
 Modelo da Lente
 <InfoTooltip isDark={isDark} text="A lente define a perspectiva e o estilo visual da foto. Wide cria drama, Standard é versátil, Portrait desfoca o fundo, Macro captura detalhes extremos." />
 </p>
 {['wide', 'standard', 'portrait', 'macro', 'ai'].map(category => {
 const lenses = LENS_OPTIONS.filter(l => l.category === category);
 const labels: Record<string, string> = { wide: 'Wide', standard: 'Standard', portrait: 'Portrait', macro: 'Macro', ai: '' };
 return (
 <div key={category} className="mb-2">
 {labels[category] && <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] font-medium uppercase tracking-wide mb-1'}>{labels[category]}</p>}
 <div className="grid grid-cols-2 gap-2">
 {lenses.map(lens => (
 <button key={lens.id} onClick={() => onUpdateState({ lensModel: lens.id })} className={cardClass(wizardState.lensModel === lens.id)}>
 <span className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium block'}>{lens.label}</span>
 <span className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] block'}>{lens.description}</span>
 </button>
 ))}
 </div>
 </div>
 );
 })}

 <div className={'my-4 border-t ' + (isDark ? 'border-neutral-800' : 'border-gray-200')}></div>

 {/* Ângulo */}
 <p className={(isDark ? 'text-neutral-400' : 'text-gray-600') + ' text-xs font-medium mb-2'}>
 Ângulo de câmera
 <InfoTooltip isDark={isDark} text="Define de onde a câmera aponta para o produto. Top-Down é visto de cima, 45° é angular, Eye-Level é frontal, Low Angle é de baixo para cima." />
 </p>
 <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
 {CAMERA_ANGLES.map(angle => (
 <button key={angle.id} onClick={() => onUpdateState({ cameraAngle: angle.id })} className={cardClass(wizardState.cameraAngle === angle.id)}>
 <div className="flex items-center gap-2 mb-1">
 <i className={'fas ' + angle.icon + ' text-xs ' + (wizardState.cameraAngle === angle.id ? (isDark ? 'text-amber-400' : 'text-amber-500') : (isDark ? 'text-neutral-500' : 'text-gray-400'))}></i>
 <span className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>{angle.label}</span>
 </div>
 <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>{angle.description}</p>
 </button>
 ))}
 </div>

 {/* Profundidade de campo */}
 <p className={(isDark ? 'text-neutral-400' : 'text-gray-600') + ' text-xs font-medium mb-2'}>
 Profundidade de campo
 <InfoTooltip isDark={isDark} text="Controla o desfoque do fundo. À esquerda tudo fica nítido, à direita só o produto fica em foco (efeito bokeh)." />
 </p>
 <div className="flex items-center gap-3">
 <span className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] w-16 text-right'}>Tudo em foco</span>
 <input type="range" min={0} max={100} value={wizardState.depthOfField} onChange={(e) => onUpdateState({ depthOfField: Number(e.target.value) })} className="flex-1 accent-amber-500" />
 <span className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] w-16'}>Bokeh intenso</span>
 </div>
 </div>

 {/* BLOCO: Estilo Visual */}
 <div className={'rounded-xl p-4 mb-4 ' + (isDark ? 'bg-neutral-900/50 border border-neutral-800' : 'bg-gray-50 border border-gray-200')}>
 <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold mb-4'}>
 <i className="fas fa-palette mr-2 text-xs opacity-50"></i>Estilo Visual
 <InfoTooltip isDark={isDark} text="Combina cor, contraste e textura da imagem final. Cada preset aplica uma combinação coerente desses elementos." />
 </h3>

 <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-2">
 {VISUAL_STYLES.map(style => (
 <button key={style.id} onClick={() => onUpdateState({ visualStyle: style.id, ...(style.id !== 'custom' ? { customVisualStyle: '' } : {}) })} className={cardClass(wizardState.visualStyle === style.id)}>
 <div className="flex items-center gap-2 mb-1">
 <i className={'fas ' + style.icon + ' text-xs ' + (wizardState.visualStyle === style.id ? (isDark ? 'text-amber-400' : 'text-amber-500') : (isDark ? 'text-neutral-500' : 'text-gray-400'))}></i>
 <span className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>{style.label}</span>
 </div>
 <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>{style.description}</p>
 </button>
 ))}
 </div>
 {wizardState.visualStyle === 'custom' && (
 <textarea
 value={wizardState.customVisualStyle}
 onChange={(e) => onUpdateState({ customVisualStyle: e.target.value })}
 placeholder="Descreva o estilo visual desejado (cores, contraste, grão, temperatura)..."
 rows={2}
 className={'w-full rounded-lg px-3 py-2 text-sm resize-none mb-2 ' + (isDark ? 'bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-600' : 'bg-white border border-gray-200 text-gray-900 placeholder-gray-400')}
 />
 )}
 {renderRefUpload('visualStyleReference', wizardState.visualStyleReference)}
 </div>

 {/* BLOCO: Iluminação */}
 <div className={'rounded-xl p-4 ' + (isDark ? 'bg-neutral-900/50 border border-neutral-800' : 'bg-gray-50 border border-gray-200')}>
 <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold mb-4'}>
 <i className="fas fa-lightbulb mr-2 text-xs opacity-50"></i>Iluminação
 </h3>

 <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-2">
 {LIGHTING_OPTIONS.map(opt => (
 <button key={opt.id} onClick={() => onUpdateState({ lighting: opt.id, ...(opt.id !== 'custom' ? { customLighting: '' } : {}) })} className={cardClass(wizardState.lighting === opt.id)}>
 <div className="flex items-center gap-2 mb-1">
 <i className={'fas ' + opt.icon + ' text-xs ' + (wizardState.lighting === opt.id ? (isDark ? 'text-amber-400' : 'text-amber-500') : (isDark ? 'text-neutral-500' : 'text-gray-400'))}></i>
 <span className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>{opt.label}</span>
 </div>
 <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>{opt.description}</p>
 </button>
 ))}
 {/* Personalizado */}
 <button onClick={() => onUpdateState({ lighting: 'custom' })} className={cardClass(wizardState.lighting === 'custom')}>
 <div className="flex items-center gap-2 mb-1">
 <i className={'fas fa-pen text-xs ' + (wizardState.lighting === 'custom' ? (isDark ? 'text-amber-400' : 'text-amber-500') : (isDark ? 'text-neutral-500' : 'text-gray-400'))}></i>
 <span className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>Personalizado</span>
 </div>
 <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>Descreva a iluminação</p>
 </button>
 </div>
 {wizardState.lighting === 'custom' && (
 <textarea
 value={wizardState.customLighting}
 onChange={(e) => onUpdateState({ customLighting: e.target.value })}
 placeholder="Descreva a iluminação desejada..."
 rows={2}
 className={'w-full rounded-lg px-3 py-2 text-sm resize-none mb-2 ' + (isDark ? 'bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-600' : 'bg-white border border-gray-200 text-gray-900 placeholder-gray-400')}
 />
 )}
 {renderRefUpload('lightingReference', wizardState.lightingReference)}
 </div>
 </div>
 );

 // ============================================================
 // STEP 4 — FRAME & CONFIGS + REVIEW
 // ============================================================

 const renderStep4 = () => {
 const budget = calculateImageBudget(wizardState);

 // Review labels
 const lightingLabel = wizardState.lighting === 'custom' ? (wizardState.customLighting || 'Personalizado') : (LIGHTING_OPTIONS.find(l => l.id === wizardState.lighting)?.label || wizardState.lighting);
 const lensLabel = LENS_OPTIONS.find(l => l.id === wizardState.lensModel)?.label || wizardState.lensModel;
 const angleLabel = CAMERA_ANGLES.find(a => a.id === wizardState.cameraAngle)?.label || wizardState.cameraAngle;
 const visualStyleLabel = wizardState.visualStyle === 'custom' ? (wizardState.customVisualStyle || 'Personalizado') : (VISUAL_STYLES.find(s => s.id === wizardState.visualStyle)?.label || wizardState.visualStyle);
 const ratioLabel = FRAME_RATIOS.find(r => r.id === wizardState.frameRatio)?.label || wizardState.frameRatio;
 const scaleLabel = PRODUCT_SCALES.find(s => s.id === wizardState.productScale)?.label || wizardState.productScale;
 const moodLabel = wizardState.moodSeason === 'custom' ? (wizardState.customMoodSeason || 'Personalizado') : (MOOD_SEASONS.find(m => m.id === wizardState.moodSeason)?.label || wizardState.moodSeason);
 const presentationLabel = wizardState.productPresentation === 'custom'
 ? (wizardState.customPresentationText || 'Personalizado')
 : (ALL_PRESENTATIONS.find(p => p.id === wizardState.productPresentation)?.label || wizardState.productPresentation);

 const ReviewRow = ({ icon, label, value, onEdit }: { icon: string; label: string; value: string; onEdit: () => void }) => (
 <div className="flex items-center justify-between py-2">
 <div className="flex items-center gap-2 min-w-0 flex-1">
 <i className={'fas ' + icon + ' text-xs w-4 text-center ' + (isDark ? 'text-neutral-600' : 'text-gray-400')}></i>
 <span className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs w-20 flex-shrink-0'}>{label}</span>
 <span className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium truncate'}>{value}</span>
 </div>
 <button onClick={onEdit} className={(isDark ? 'text-amber-400 hover:text-amber-300' : 'text-amber-600 hover:text-amber-500') + ' text-[10px] font-medium flex-shrink-0 ml-2'}>
 Editar
 </button>
 </div>
 );

 return (
 <div>
 {/* Formato */}
 {sectionTitle('Formato da imagem', 'fa-crop-simple')}
 <div className="grid grid-cols-4 gap-2 mb-4">
 {FRAME_RATIOS.map(ratio => (
 <button key={ratio.id} onClick={() => onUpdateState({ frameRatio: ratio.id })} className={cardClass(wizardState.frameRatio === ratio.id) + ' text-center'}>
 <span className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold block'}>{ratio.label}</span>
 <span className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] block'}>{ratio.description}</span>
 </button>
 ))}
 </div>

 {separator()}

 {/* Resolução */}
 {sectionTitle('Resolução', 'fa-display')}
 <div className="grid grid-cols-2 gap-2 mb-4">
 {RESOLUTIONS.map(res => (
 <button key={res.id} onClick={() => onUpdateState({ resolution: res.id as CreativeStillWizardState['resolution'] })} className={cardClass(wizardState.resolution === res.id) + ' text-center'}>
 <span className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold block'}>{res.label}</span>
 <span className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] block'}>{res.description}</span>
 </button>
 ))}
 </div>

 {separator()}

 {/* Variações */}
 {sectionTitle('Variações', 'fa-clone')}
 <div className="flex items-center gap-4 mb-2">
 <input
 type="range"
 min={1}
 max={10}
 value={wizardState.variationsCount}
 onChange={(e) => onUpdateState({ variationsCount: Number(e.target.value) })}
 className="flex-1 accent-amber-500"
 />
 <div className={'px-3 py-1.5 rounded-lg text-sm font-bold min-w-[3rem] text-center ' + (isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600')}>
 {wizardState.variationsCount}
 </div>
 </div>
 <p className={(isDark ? 'text-amber-400/80' : 'text-amber-600') + ' text-xs'}>
 <i className="fas fa-coins mr-1.5 text-[10px]"></i>
 {wizardState.variationsCount} {wizardState.variationsCount === 1 ? 'crédito será utilizado' : 'créditos serão utilizados'}
 </p>

 {separator()}

 {/* Salvar como template */}
 <div className="flex items-start gap-3 mb-6">
 <input
 type="checkbox"
 checked={wizardState.saveAsTemplate}
 onChange={(e) => onUpdateState({ saveAsTemplate: e.target.checked })}
 className="mt-1 accent-amber-500"
 />
 <div className="flex-1">
 <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>Salvar este estilo como template</p>
 <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>Para reutilizar com outros produtos</p>
 {wizardState.saveAsTemplate && (
 <input
 value={wizardState.templateName}
 onChange={(e) => onUpdateState({ templateName: e.target.value })}
 placeholder="Nome do template..."
 className={'mt-2 w-full rounded-lg px-3 py-2 text-sm ' + (isDark ? 'bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-600' : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400')}
 />
 )}
 </div>
 </div>

 {separator()}

 {/* Resumo */}
 {sectionTitle('Resumo do seu Vizzu Still Criativo®', 'fa-clipboard-list')}
 <div className={'rounded-xl overflow-hidden divide-y ' + (isDark ? 'bg-neutral-900 border border-neutral-800 divide-neutral-800' : 'bg-white border border-gray-200 divide-gray-100 ')}>
 <div className="px-4">
 <ReviewRow icon="fa-box" label="Produto" value={
 (wizardState.mainProduct?.name || 'Nenhum') +
 (wizardState.mainProductView === 'both' ? ' (Ambos)' : wizardState.mainProductView === 'back' ? ' (Costas)' : ' (Frente)')
 } onEdit={() => setCurrentStep(1)} />
 {wizardState.additionalProducts.length > 0 && (
 <div className="pb-2">
 {wizardState.additionalProducts.map((el, i) => (
 <p key={i} className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] ml-6 pl-1'}>+ {el.product_name}</p>
 ))}
 </div>
 )}
 </div>
 <div className="px-4"><ReviewRow icon="fa-shirt" label="Exibição" value={presentationLabel} onEdit={() => setCurrentStep(1)} /></div>
 <div className="px-4"><ReviewRow icon="fa-up-right-and-down-left-from-center" label="Escala" value={scaleLabel} onEdit={() => setCurrentStep(1)} /></div>
 <div className="px-4"><ReviewRow icon="fa-table" label="Superfície" value={wizardState.surfaceDescription || 'Não definido'} onEdit={() => setCurrentStep(2)} /></div>
 {wizardState.environmentDescription && (
 <div className="px-4"><ReviewRow icon="fa-mountain-sun" label="Ambiente" value={wizardState.environmentDescription} onEdit={() => setCurrentStep(2)} /></div>
 )}
 <div className="px-4"><ReviewRow icon="fa-sun" label="Mood" value={moodLabel} onEdit={() => setCurrentStep(2)} /></div>
 <div className="px-4"><ReviewRow icon="fa-lightbulb" label="Iluminação" value={lightingLabel} onEdit={() => setCurrentStep(3)} /></div>
 <div className="px-4"><ReviewRow icon="fa-circle-dot" label="Lente" value={lensLabel} onEdit={() => setCurrentStep(3)} /></div>
 <div className="px-4"><ReviewRow icon="fa-rotate" label="Ângulo" value={angleLabel} onEdit={() => setCurrentStep(3)} /></div>
 <div className="px-4"><ReviewRow icon="fa-palette" label="Estilo Visual" value={visualStyleLabel} onEdit={() => setCurrentStep(3)} /></div>
 <div className="px-4"><ReviewRow icon="fa-crop-simple" label="Formato" value={ratioLabel + ' · ' + wizardState.resolution.toUpperCase()} onEdit={() => setCurrentStep(4)} /></div>
 </div>

 {/* Budget Card */}
 <div className={'mt-4 rounded-xl overflow-hidden ' + (isDark ? 'bg-neutral-900 border border-neutral-800' : 'bg-white border border-gray-200 ')}>
 <button
 onClick={() => setBudgetExpanded(!budgetExpanded)}
 className={'w-full px-4 py-3 flex items-center justify-between text-left ' + (isDark ? 'hover:bg-neutral-800/50' : 'hover:bg-gray-50')}
 >
 <div className="flex items-center gap-2">
 <span className="text-sm">📊</span>
 <span className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-semibold'}>
 Budget de Imagens ({budget.totalUsed}/14 usadas)
 <InfoTooltip isDark={isDark} text="A IA aceita até 14 imagens por geração. Produtos têm prioridade máxima, depois referências, depois elementos." />
 </span>
 </div>
 <i className={'fas fa-chevron-' + (budgetExpanded ? 'up' : 'down') + ' text-xs ' + (isDark ? 'text-neutral-500' : 'text-gray-400')}></i>
 </button>
 {budgetExpanded && (
 <div className={'px-4 pb-3 space-y-1.5 border-t ' + (isDark ? 'border-neutral-800' : 'border-gray-200')}>
 <div className="pt-2">
 <p className={(isDark ? 'text-neutral-400' : 'text-gray-600') + ' text-xs'}>
 <span className="font-medium">Produtos:</span> {budget.products} {budget.products === 1 ? 'imagem' : 'imagens'} (prioridade máxima)
 </p>
 <p className={(isDark ? 'text-neutral-400' : 'text-gray-600') + ' text-xs'}>
 <span className="font-medium">Referências visuais:</span> {budget.references} {budget.references === 1 ? 'imagem' : 'imagens'}
 </p>
 <p className={(isDark ? 'text-neutral-400' : 'text-gray-600') + ' text-xs'}>
 <span className="font-medium">Elementos de composição:</span> {budget.elementsAsImage} como imagem{budget.elementsAsText > 0 ? `, ${budget.elementsAsText} transcritos em texto` : ''}
 </p>
 </div>
 </div>
 )}
 </div>
 </div>
 );
 };

 // ============================================================
 // RENDER CURRENT STEP
 // ============================================================
 const renderCurrentStep = () => {
 switch (currentStep) {
 case 1: return renderStep1();
 case 2: return renderStep2();
 case 3: return renderStep3();
 case 4: return renderStep4();
 default: return null;
 }
 };

 const isLastStep = currentStep === totalSteps;

 // ============================================================
 // RENDER
 // ============================================================
 return (
 <div className={'flex-1 overflow-y-auto ' + (isDark ? '' : 'bg-cream')} style={{ paddingTop: 'max(1rem, env(safe-area-inset-top, 1rem))' }}>
 <div className="max-w-2xl mx-auto p-4 md:p-6">
 {/* Header */}
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-3">
 <button onClick={goPrev} className={(isDark ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-gray-900') + ' p-2 -ml-2 rounded-lg transition-colors'}>
 <i className="fas fa-arrow-left"></i>
 </button>
 <div>
 <h1 className={(isDark ? 'text-white' : 'text-[#1A1A1A]') + ' text-lg font-extrabold'}>Vizzu Still Criativo®</h1>
 <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>
 Passo {currentStep} de {totalSteps}
 </p>
 </div>
 </div>
 <div className={'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ' + (isDark ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-amber-50 text-amber-600 border border-amber-200')}>
 <i className="fas fa-coins text-[10px]"></i>
 <span>{userCredits.toLocaleString()}</span>
 </div>
 </div>

 {/* Progress Steps */}
 <div className="flex items-center gap-1 mb-6">
 {STEPS.map((step, i) => (
 <React.Fragment key={step.id}>
 <button
 onClick={() => { if (step.id < currentStep) setCurrentStep(step.id); }}
 className={'flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium transition-all ' +
 (step.id === currentStep
 ? (isDark ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-amber-100 text-amber-600 border border-amber-300')
 : step.id < currentStep
 ? (isDark ? 'bg-green-500/20 text-green-400 border border-green-500/30 cursor-pointer' : 'bg-green-100 text-green-600 border border-green-300 cursor-pointer')
 : (isDark ? 'bg-neutral-800 text-neutral-600 border border-neutral-700' : 'bg-gray-100 text-gray-400 border border-gray-200')
 )}
 >
 <i className={'fas ' + (step.id < currentStep ? 'fa-check' : step.icon) + ' text-[8px]'}></i>
 <span className="hidden md:inline">{step.title}</span>
 </button>
 {i < STEPS.length - 1 && (
 <div className={'flex-1 h-px ' + (step.id < currentStep ? (isDark ? 'bg-green-500/30' : 'bg-green-300') : (isDark ? 'bg-neutral-800' : 'bg-gray-200'))}></div>
 )}
 </React.Fragment>
 ))}
 </div>

 {/* Step Content */}
 {renderCurrentStep()}

 {/* Navigation Buttons */}
 <div className="flex gap-3 mt-6">
 <button
 onClick={goPrev}
 className={'flex-1 py-3 rounded-xl font-medium text-sm transition-all ' + (isDark ? 'bg-neutral-800 text-white hover:bg-neutral-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')}
 >
 <i className="fas fa-arrow-left mr-2"></i>Voltar
 </button>
 {isLastStep ? (
 <button
 onClick={onGenerate}
 disabled={userCredits < wizardState.variationsCount}
 className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-[#FF9F43] text-white rounded-xl font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
 >
 <i className="fas fa-wand-magic-sparkles mr-2"></i>Gerar {wizardState.variationsCount} {wizardState.variationsCount === 1 ? 'Variação' : 'Variações'} ({wizardState.variationsCount} {wizardState.variationsCount === 1 ? 'crédito' : 'créditos'})
 </button>
 ) : (
 canGoNext() && (
 <button
 onClick={goNext}
 className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-[#FF9F43] text-white rounded-xl font-medium text-sm"
 >
 Continuar<i className="fas fa-arrow-right ml-2"></i>
 </button>
 )
 )}
 </div>
 </div>

 {/* ============================================================ */}
 {/* MODAL: Selecionar Produto */}
 {/* ============================================================ */}
 {showProductModal && (
 <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
 <div className={(isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200') + ' rounded-2xl border w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col'}>
 <div className={(isDark ? 'border-neutral-800' : 'border-gray-200') + ' border-b p-4 flex items-center justify-between'}>
 <div>
 <h2 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold font-serif'}>Selecione o produto</h2>
 <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>{filteredProducts.length} produto{filteredProducts.length !== 1 ? 's' : ''} disponíveis</p>
 </div>
 <button
 onClick={() => { setShowProductModal(false); setProductSearchTerm(''); setProductFilterCategoryGroup(''); setProductFilterCategory(''); }}
 className={(isDark ? 'text-neutral-500 hover:text-white' : 'text-gray-400 hover:text-gray-600') + ' w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-800/50 transition-colors'}
 >
 <i className="fas fa-times"></i>
 </button>
 </div>
 <div className="p-4 flex flex-col sm:flex-row gap-3">
 <div className="flex-1 relative">
 <i className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-sm'}></i>
 <input
 type="text"
 placeholder="Buscar produto..."
 value={productSearchTerm}
 onChange={(e) => setProductSearchTerm(e.target.value)}
 className={(isDark ? 'bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400') + ' w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-amber-500/50'}
 autoFocus
 />
 </div>
 <select
 value={productFilterCategoryGroup}
 onChange={(e) => { setProductFilterCategoryGroup(e.target.value); setProductFilterCategory(''); }}
 className={(isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' px-4 py-2.5 border rounded-xl text-sm sm:w-40'}
 >
 <option value="">Categoria</option>
 {CATEGORY_GROUPS.map(group => (<option key={group.id} value={group.id}>{group.label}</option>))}
 </select>
 {productFilterCategoryGroup && (
 <select
 value={productFilterCategory}
 onChange={(e) => setProductFilterCategory(e.target.value)}
 className={(isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' px-4 py-2.5 border rounded-xl text-sm sm:w-40'}
 >
 <option value="">Subcategoria</option>
 {CATEGORY_GROUPS.find(g => g.id === productFilterCategoryGroup)?.items.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
 </select>
 )}
 </div>
 <div className="flex-1 overflow-y-auto p-4 pt-0">
 {filteredProducts.length > 0 ? (
 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
 {filteredProducts.map(product => {
 const productImage = getProductImageUrl(product);
 return (
 <div
 key={product.id}
 onClick={() => {
 onUpdateState({ mainProduct: product, mainProductView: 'front', productPresentation: 'ai_choose', customPresentationText: '' });
 setUploadProductType(null);
 setShowProductModal(false);
 setProductSearchTerm('');
 setProductFilterCategoryGroup('');
 setProductFilterCategory('');
 }}
 className={(isDark ? 'bg-neutral-800 border-neutral-700 hover:border-amber-500/50' : 'bg-gray-50 border-gray-200 hover:border-amber-300') + ' rounded-xl border overflow-hidden cursor-pointer transition-all group'}
 >
 <div className={(isDark ? 'bg-neutral-700' : 'bg-gray-100') + ' aspect-square relative overflow-hidden'}>
 {productImage ? (
 <img src={productImage} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
 ) : (
 <div className="w-full h-full flex items-center justify-center">
 <i className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-image text-2xl'}></i>
 </div>
 )}
 <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
 <button className="w-full py-1.5 bg-gradient-to-r from-amber-500 to-[#FF9F43] text-white rounded-lg font-medium text-[10px]">
 <i className="fas fa-check mr-1"></i>Selecionar
 </button>
 </div>
 </div>
 <div className="p-2.5">
 <p className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-[8px] font-medium uppercase tracking-wide'}>{product.sku}</p>
 <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium truncate mt-0.5'}>{product.name}</p>
 {product.category && <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px] mt-1'}>{product.category}</p>}
 </div>
 </div>
 );
 })}
 </div>
 ) : (
 <div className="text-center py-12">
 <div className={(isDark ? 'bg-neutral-800' : 'bg-gray-100') + ' w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3'}>
 <i className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-search text-xl'}></i>
 </div>
 <p className={(isDark ? 'text-white' : 'text-gray-900') + ' font-medium text-sm mb-1'}>Nenhum produto encontrado</p>
 <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>Tente ajustar os filtros</p>
 </div>
 )}
 </div>
 </div>
 </div>
 )}

 {/* ============================================================ */}
 {/* MODAL: Adicionar Elemento */}
 {/* ============================================================ */}
 {showAddElementModal && (
 <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
 <div className={(isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200') + ' rounded-2xl border w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col'}>
 <div className={(isDark ? 'border-neutral-800' : 'border-gray-200') + ' border-b p-4 flex items-center justify-between'}>
 <div>
 <h2 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold font-serif'}>Adicionar Produto</h2>
 <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>Selecione um produto adicional para a composição</p>
 </div>
 <button
 onClick={() => { setShowAddElementModal(false); setElementSearchTerm(''); setElementFilterCategoryGroup(''); setElementFilterCategory(''); }}
 className={(isDark ? 'text-neutral-500 hover:text-white' : 'text-gray-400 hover:text-gray-600') + ' w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-800/50 transition-colors'}
 >
 <i className="fas fa-times"></i>
 </button>
 </div>
 <div className={'flex border-b ' + (isDark ? 'border-neutral-800' : 'border-gray-200')}>
 {[
 { id: 'catalog' as const, label: 'Do Catálogo', icon: 'fa-box' },
 { id: 'upload' as const, label: 'Foto / Upload', icon: 'fa-camera' },
 ].map(tab => (
 <button
 key={tab.id}
 onClick={() => setElementTab(tab.id)}
 className={'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors border-b-2 ' +
 (elementTab === tab.id
 ? (isDark ? 'border-amber-500 text-amber-400' : 'border-amber-500 text-amber-600')
 : (isDark ? 'border-transparent text-neutral-500 hover:text-white' : 'border-transparent text-gray-400 hover:text-gray-600')
 )}
 >
 <i className={'fas ' + tab.icon + ' text-[10px]'}></i>
 {tab.label}
 </button>
 ))}
 </div>
 <div className="p-4 pb-0">
 <input
 value={elementPosition}
 onChange={(e) => setElementPosition(e.target.value)}
 placeholder="Posicionamento: ex. ao lado esquerdo, levemente inclinado"
 className={(isDark ? 'bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400') + ' w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-amber-500/50'}
 />
 </div>
 {elementTab === 'catalog' && (
 <>
 <div className="p-4 pb-0 flex flex-col sm:flex-row gap-3">
 <div className="flex-1 relative">
 <i className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-sm'}></i>
 <input
 type="text"
 placeholder="Buscar produto..."
 value={elementSearchTerm}
 onChange={(e) => setElementSearchTerm(e.target.value)}
 className={(isDark ? 'bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400') + ' w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-amber-500/50'}
 />
 </div>
 <select
 value={elementFilterCategoryGroup}
 onChange={(e) => { setElementFilterCategoryGroup(e.target.value); setElementFilterCategory(''); }}
 className={(isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' px-4 py-2.5 border rounded-xl text-sm sm:w-40'}
 >
 <option value="">Categoria</option>
 {CATEGORY_GROUPS.map(group => (<option key={group.id} value={group.id}>{group.label}</option>))}
 </select>
 {elementFilterCategoryGroup && (
 <select
 value={elementFilterCategory}
 onChange={(e) => setElementFilterCategory(e.target.value)}
 className={(isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' px-4 py-2.5 border rounded-xl text-sm sm:w-40'}
 >
 <option value="">Subcategoria</option>
 {CATEGORY_GROUPS.find(g => g.id === elementFilterCategoryGroup)?.items.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
 </select>
 )}
 </div>
 <div className="flex-1 overflow-y-auto p-4">
 {filteredElementProducts.length > 0 ? (
 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
 {filteredElementProducts.map(product => {
 const productImage = getProductImageUrl(product);
 return (
 <div
 key={product.id}
 onClick={() => handleAddCatalogElement(product)}
 className={(isDark ? 'bg-neutral-800 border-neutral-700 hover:border-amber-500/50' : 'bg-gray-50 border-gray-200 hover:border-amber-300') + ' rounded-xl border overflow-hidden cursor-pointer transition-all group'}
 >
 <div className={(isDark ? 'bg-neutral-700' : 'bg-gray-100') + ' aspect-square relative overflow-hidden'}>
 {productImage ? (
 <img src={productImage} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
 ) : (
 <div className="w-full h-full flex items-center justify-center">
 <i className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-image text-2xl'}></i>
 </div>
 )}
 <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
 <button className="w-full py-1.5 bg-gradient-to-r from-amber-500 to-[#FF9F43] text-white rounded-lg font-medium text-[10px]">
 <i className="fas fa-plus mr-1"></i>Adicionar
 </button>
 </div>
 </div>
 <div className="p-2.5">
 <p className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-[8px] font-medium uppercase tracking-wide'}>{product.sku}</p>
 <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium truncate mt-0.5'}>{product.name}</p>
 {product.category && <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px] mt-1'}>{product.category}</p>}
 </div>
 </div>
 );
 })}
 </div>
 ) : (
 <div className="text-center py-12">
 <div className={(isDark ? 'bg-neutral-800' : 'bg-gray-100') + ' w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3'}>
 <i className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-search text-xl'}></i>
 </div>
 <p className={(isDark ? 'text-white' : 'text-gray-900') + ' font-medium text-sm mb-1'}>Nenhum produto encontrado</p>
 <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>Tente ajustar os filtros</p>
 </div>
 )}
 </div>
 </>
 )}
 {elementTab === 'upload' && (
 <div className="flex-1 flex items-center justify-center p-4">
 <label className={'block rounded-xl p-8 border-2 border-dashed cursor-pointer transition-colors w-full text-center ' + (isDark ? 'border-neutral-700 hover:border-amber-500/50 text-neutral-500' : 'border-gray-300 hover:border-amber-400 text-gray-400')}>
 <i className="fas fa-camera text-3xl mb-3 block"></i>
 <span className="text-sm font-medium block">Tirar foto ou selecionar imagem</span>
 <span className="text-[10px] block mt-1">JPG, PNG ou WebP</span>
 <input ref={elementFileRef} type="file" accept="image/*" capture="environment" onChange={handleElementUpload} className="hidden" />
 </label>
 </div>
 )}
 </div>
 </div>
 )}
 </div>
 );
};

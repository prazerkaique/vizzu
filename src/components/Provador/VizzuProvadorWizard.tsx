import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import heic2any from 'heic2any';
import {
 Client,
 ClientPhoto,
 ClientLook,
 LookComposition,
 Product,
 WhatsAppTemplate,
} from '../../types';
import { LookComposer as StudioLookComposer } from '../LookComposer/LookComposerUI';
import { compressImage, formatFileSize } from '../../utils/imageCompression';
import { OptimizedImage } from '../OptimizedImage';
import { ResolutionSelector, Resolution } from '../ResolutionSelector';
import { Resolution4KConfirmModal, has4KConfirmation, savePreferredResolution, getPreferredResolution } from '../Resolution4KConfirmModal';
import { RESOLUTION_COST, canUseResolution, Plan } from '../../hooks/useCredits';
import { useAuth } from '../../contexts/AuthContext';
import { useUI, type VizzuTheme } from '../../contexts/UIContext';
import { ReportModal } from '../ReportModal';
import { submitReport } from '../../lib/api/reports';

import { FeatureTour } from '../onboarding/FeatureTour';
import { PROVADOR_TOUR_STOPS } from '../onboarding/tourStops';
import { useOnboarding } from '../../hooks/useOnboarding';

// ============================================================
// TIPOS E CONSTANTES
// ============================================================

interface Props {
 theme: VizzuTheme;
 clients: Client[];
 products: Product[];
 collections: string[];
 userCredits: number;
 whatsappTemplates: WhatsAppTemplate[];
 onCreateClient: () => void;
 onUpdateClient: (client: Client) => void;
 onClientSelect: (client: Client | null) => void;
 onGenerate: (
 client: Client,
 photoType: ClientPhoto['type'],
 look: LookComposition,
 resolution?: '2k' | '4k'
 ) => Promise<{ imageUrl: string; generationId?: string } | null>;
 onSendWhatsApp: (
 client: Client,
 image: string,
 message: string,
 look: LookComposition,
 productStudioImages?: { name: string; url: string }[]
 ) => void;
 onDownloadImage: (image: string, clientName: string) => void;
 onSaveLook: (client: Client, image: string, look: LookComposition) => Promise<ClientLook | null>;
 onDeleteLook: (look: ClientLook) => void;
 onGenerateAIMessage: (clientName: string) => Promise<string>;
 clientLooks: ClientLook[];
 isGenerating: boolean;
 generationProgress: number;
 loadingText: string;
 // Produto pré-selecionado (vindo do modal de detalhes)
 initialProduct?: Product | null;
 onClearInitialProduct?: () => void;
 // Navegação de volta
 onBack?: () => void;
 // Plano atual do usuário para verificar permissões de resolução
 currentPlan?: Plan;
 // Callback para abrir modal de planos (quando tentar usar 4K sem permissão)
 onOpenPlanModal?: () => void;
 // Timestamp de início da geração para o banner de alta demanda
 generationStartTime?: number | null;
 // Callback para "Continuar em segundo plano"
 onContinueInBackground?: () => void;
 // Callback para cancelar a geração (fechar overlay)
 onCancelGeneration?: () => void;
}

const PHOTO_TYPES: { id: ClientPhoto['type']; label: string; icon: string }[] = [
 { id: 'frente', label: 'Frente', icon: 'fa-user' },
 { id: 'costas', label: 'Costas', icon: 'fa-user-slash' },
 { id: 'rosto', label: 'Rosto', icon: 'fa-face-smile' },
];

const WIZARD_STEPS = [
 { id: 1, title: 'Cliente', icon: 'fa-user' },
 { id: 2, title: 'Foto', icon: 'fa-camera' },
 { id: 3, title: 'Look', icon: 'fa-shirt' },
 { id: 4, title: 'Enviar', icon: 'fa-paper-plane' },
];

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export const VizzuProvadorWizard: React.FC<Props> = ({
 theme,
 clients,
 products,
 collections,
 userCredits,
 whatsappTemplates,
 onCreateClient,
 onUpdateClient,
 onClientSelect,
 onGenerate,
 onSendWhatsApp,
 onDownloadImage,
 onSaveLook,
 onDeleteLook,
 onGenerateAIMessage,
 clientLooks,
 isGenerating,
 generationProgress,
 loadingText,
 initialProduct,
 onClearInitialProduct,
 onBack,
 currentPlan,
 onOpenPlanModal,
 generationStartTime,
 onContinueInBackground,
 onCancelGeneration,
}) => {
 // Estados do Wizard
 const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

 // Estados do Provador
 const [selectedClient, setSelectedClient] = useState<Client | null>(null);
 const [selectedPhotoType, setSelectedPhotoType] = useState<ClientPhoto['type']>('frente');
 const [lookComposition, setLookComposition] = useState<LookComposition>({});
 const [collectionFilter, setCollectionFilter] = useState<string>('');

 // Estados de Geração
 const [generatedImage, setGeneratedImage] = useState<string | null>(null);
 const [originalImage, setOriginalImage] = useState<string | null>(null);
 const [showBeforeAfter, setShowBeforeAfter] = useState<'before' | 'after'>('after');
 const [selectedSavedLook, setSelectedSavedLook] = useState<ClientLook | null>(null);
 const [savingLook, setSavingLook] = useState(false);
 const [showReveal, setShowReveal] = useState(false);
 const [wasGeneratingProvador, setWasGeneratingProvador] = useState(false);
 const [lastGenerationId, setLastGenerationId] = useState<string | null>(null);
 const [showReportModal, setShowReportModal] = useState(false);

 // Auth & UI para reports
 const { user } = useAuth();
 const { showToast } = useUI();
 const { shouldShowTour } = useOnboarding();

 // Reveal animation: generating → done transition
 useEffect(() => {
 if (isGenerating) {
 setWasGeneratingProvador(true);
 } else if (wasGeneratingProvador && generatedImage) {
 setShowReveal(true);
 const timer = setTimeout(() => setShowReveal(false), 2500);
 return () => clearTimeout(timer);
 }
 }, [isGenerating, wasGeneratingProvador, generatedImage]);

 // Estados de Mensagem
 const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(whatsappTemplates?.[0] || null);
 const [message, setMessage] = useState(whatsappTemplates?.[0]?.message || '');
 const [isGeneratingAIMessage, setIsGeneratingAIMessage] = useState(false);
 const [isEditingMessage, setIsEditingMessage] = useState(false);
 const [fullEditedMessage, setFullEditedMessage] = useState<string | null>(null);

 // Estados de Upload de Foto
 const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
 const [showPhotoOptions, setShowPhotoOptions] = useState(false);
 const [uploadingPhotoType, setUploadingPhotoType] = useState<ClientPhoto['type']>('frente');

 // Estado de resolução (2K ou 4K)
 const [resolution, setResolution] = useState<Resolution>(() => getPreferredResolution());
 const [show4KConfirmModal, setShow4KConfirmModal] = useState(false);
 const [pending4KConfirm, setPending4KConfirm] = useState(false);

 // Verificar se plano permite 4K
 const canUse4K = currentPlan ? canUseResolution(currentPlan, '4k') : false;

 // Custo base do Provador: 1 crédito (multiplicado por resolução)
 const BASE_PROVADOR_CREDITS = 1;
 const creditsNeeded = BASE_PROVADOR_CREDITS * RESOLUTION_COST[resolution];

 // Refs
 const photoInputRef = useRef<HTMLInputElement>(null);
 const cameraInputRef = useRef<HTMLInputElement>(null);

 // Clientes com fotos para Provador
 const clientsWithProvador = clients.filter(
 (c) => c.hasProvadorIA && (c.photos?.length || c.photo)
 );

 // Pré-selecionar produto quando vier do modal de detalhes
 useEffect(() => {
 if (initialProduct) {
 // Determinar slot baseado na categoria do produto
 const categoryToSlot: Record<string, keyof LookComposition> = {
 'Chapéu': 'head', 'Boné': 'head', 'Gorro': 'head', 'Viseira': 'head', 'Touca': 'head', 'Boina': 'head', 'Turbante': 'head',
 'Camiseta': 'top', 'Camisa': 'top', 'Blusa': 'top', 'Top': 'top', 'Cropped': 'top', 'Regata': 'top',
 'Moletom': 'top', 'Suéter': 'top', 'Cardigan': 'top', 'Jaqueta': 'top', 'Blazer': 'top', 'Colete': 'top',
 'Vestido': 'top', 'Macacão': 'top', 'Conjunto': 'top', 'Pijama': 'top', 'Jardineira': 'top',
 'Calça': 'bottom', 'Shorts': 'bottom', 'Bermuda': 'bottom', 'Saia': 'bottom', 'Legging': 'bottom',
 'Tênis': 'feet', 'Sapato': 'feet', 'Sandália': 'feet', 'Chinelo': 'feet', 'Bota': 'feet', 'Sapatilha': 'feet',
 'Bolsa': 'accessory1', 'Mochila': 'accessory1', 'Pochete': 'accessory1', 'Carteira': 'accessory1', 'Cinto': 'accessory1',
 'Óculos': 'accessory2', 'Relógio': 'accessory2', 'Colar': 'accessory2', 'Brinco': 'accessory2', 'Pulseira': 'accessory2', 'Gravata': 'accessory2',
 };

 const FULLPIECE_CATS = ['Vestido', 'Vestidos', 'Macacão', 'Macacões', 'Conjunto', 'Conjuntos', 'Pijama', 'Pijamas', 'Jardineira', 'Jardineiras'];
 const slot = categoryToSlot[initialProduct.category || ''] || 'top';
 const isFullpiece = FULLPIECE_CATS.some(c => c.toLowerCase() === (initialProduct.category || '').toLowerCase());
 const imageUrl = initialProduct.images?.[0]?.url || initialProduct.images?.[0]?.base64 || '';

 if (imageUrl) {
 const item = {
 image: imageUrl,
 name: initialProduct.name,
 sku: initialProduct.sku,
 productId: initialProduct.id,
 };
 setLookComposition(prev => ({
 ...prev,
 [slot]: item,
 ...(isFullpiece ? { top: item, bottom: item } : {}),
 }));
 // Ir para o step 3 (Look) se já tiver cliente selecionado, senão vai para step 1
 if (selectedClient) {
 setCurrentStep(3);
 }
 }

 onClearInitialProduct?.();
 }
 }, [initialProduct, onClearInitialProduct, selectedClient]);

 // ============================================================
 // FUNÇÕES AUXILIARES
 // ============================================================

 const getClientPhoto = useCallback(
 (client: Client | null, type?: ClientPhoto['type']): string | undefined => {
 if (!client) return undefined;
 if (type && client.photos) {
 const photo = client.photos.find((p) => p.type === type);
 if (photo) return photo.base64;
 }
 if (client.photos?.length) return client.photos[0].base64;
 return client.photo;
 },
 []
 );

 // Emojis para cada tipo de peça do look
 const lookEmojis: Record<string, string> = {
 head: '🧢',
 top: '👕',
 bottom: '👖',
 feet: '👟',
 accessory1: '💼',
 accessory2: '⌚',
 };

 // Formatar os itens do look para preview (com preço real quando disponível)
 const formatLookItemsPreview = useCallback(() => {
 const currentLook = selectedSavedLook?.lookItems || lookComposition;
 const items: string[] = [];
 const seenIds = new Set<string>();
 const lookKeys = ['head', 'top', 'bottom', 'feet', 'accessory1', 'accessory2'] as const;

 lookKeys.forEach(key => {
 const item = currentLook[key];
 if (item && item.name) {
 // Evitar duplicar quando top e bottom são a mesma peça (vestido/macacão)
 const dedupeKey = item.productId || item.name;
 if (seenIds.has(dedupeKey)) return;
 seenIds.add(dedupeKey);

 const emoji = lookEmojis[key] || '👔';
 let priceText = 'Consulte';
 if (item.productId) {
 const product = products.find(p => p.id === item.productId);
 if (product?.priceSale) {
 priceText = `R$ ${product.priceSale.toFixed(2).replace('.', ',')}`;
 } else if (product?.price) {
 priceText = `R$ ${product.price.toFixed(2).replace('.', ',')}`;
 }
 }
 items.push(`${emoji} ${item.name} — ${priceText}`);
 }
 });

 return items.join('\n');
 }, [lookComposition, selectedSavedLook, products]);

 // Mensagem completa formatada para preview (gerada automaticamente)
 const getFormattedMessagePreview = useCallback(() => {
 if (!selectedClient) return message;
 const baseMessage = message.replace(/{nome}/gi, selectedClient.firstName);
 const lookItems = formatLookItemsPreview();
 return lookItems ? `${baseMessage}\n\n${lookItems}` : baseMessage;
 }, [message, selectedClient, formatLookItemsPreview]);

 // Mensagem final que será enviada (editada ou gerada)
 const getFinalMessage = useCallback(() => {
 return fullEditedMessage !== null ? fullEditedMessage : getFormattedMessagePreview();
 }, [fullEditedMessage, getFormattedMessagePreview]);

 // Função para entrar/sair do modo de edição
 const toggleEditMessage = useCallback(() => {
 if (!isEditingMessage) {
 // Entrando em modo edição: copiar a mensagem atual para editar
 setFullEditedMessage(fullEditedMessage !== null ? fullEditedMessage : getFormattedMessagePreview());
 }
 setIsEditingMessage(!isEditingMessage);
 }, [isEditingMessage, fullEditedMessage, getFormattedMessagePreview]);

 const formatWhatsApp = (phone: string): string => {
 const cleaned = phone.replace(/\D/g, '');
 if (cleaned.length === 11) {
 return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
 }
 return phone;
 };

 const processImageFile = async (file: File): Promise<string> => {
 try {
 let processedFile: File | Blob = file;

 // Converter HEIC/HEIF para PNG
 if (
 file.type === 'image/heic' ||
 file.type === 'image/heif' ||
 file.name.toLowerCase().endsWith('.heic') ||
 file.name.toLowerCase().endsWith('.heif')
 ) {
 const convertedBlob = await heic2any({
 blob: file,
 toType: 'image/png',
 quality: 0.9,
 });
 processedFile = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
 }

 // Comprimir imagem para reduzir consumo de banda (force: fotos de cliente podem ser grandes)
 const result = await compressImage(processedFile, { force: true });

 if (result.wasCompressed && result.savings > 0) {
 console.info(`[Compressão] ${formatFileSize(result.originalSize)} → ${formatFileSize(result.compressedSize)} (${result.savings}% menor)`);
 }

 return result.base64;
 } catch (error) {
 throw error;
 }
 };

 // ============================================================
 // HANDLERS
 // ============================================================

 const handleSelectClient = (client: Client) => {
 setSelectedClient(client);
 onClientSelect(client);
 setSelectedPhotoType('frente');
 setCurrentStep(2);
 };

 const handleSelectPhoto = (photoType: ClientPhoto['type']) => {
 setSelectedPhotoType(photoType);
 if (selectedClient) {
 setOriginalImage(getClientPhoto(selectedClient, photoType) || null);
 }
 setCurrentStep(3);
 };

 const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, source: 'gallery' | 'camera') => {
 const file = e.target.files?.[0];
 if (!file || !selectedClient) return;

 setIsUploadingPhoto(true);
 setShowPhotoOptions(false);

 try {
 const base64 = await processImageFile(file);

 // Atualizar fotos do cliente
 const newPhoto: ClientPhoto = {
 type: uploadingPhotoType,
 base64,
 createdAt: new Date().toISOString(),
 };

 const existingPhotos = selectedClient.photos || [];
 const filteredPhotos = existingPhotos.filter((p) => p.type !== uploadingPhotoType);
 const updatedPhotos = [...filteredPhotos, newPhoto];

 const updatedClient: Client = {
 ...selectedClient,
 photos: updatedPhotos,
 hasProvadorIA: true,
 };

 // Atualizar cliente no estado e no banco
 setSelectedClient(updatedClient);
 onUpdateClient(updatedClient);

 // Selecionar automaticamente a foto recém-adicionada
 setSelectedPhotoType(uploadingPhotoType);
 setOriginalImage(base64);

 // Avançar para o próximo step
 setCurrentStep(3);
 } catch (error) {
 console.error('Erro ao processar foto:', error);
 alert('Erro ao processar a foto. Tente novamente.');
 } finally {
 setIsUploadingPhoto(false);
 }
 };

 const handleOpenPhotoOptions = (photoType: ClientPhoto['type']) => {
 setUploadingPhotoType(photoType);
 setShowPhotoOptions(true);
 };

 // Handler para mudança de resolução com confirmação 4K
 const handleResolutionChange = (newResolution: Resolution) => {
 if (newResolution === '4k' && !has4KConfirmation()) {
 // Primeira vez selecionando 4K - mostrar modal de confirmação
 setPending4KConfirm(true);
 setShow4KConfirmModal(true);
 return;
 }

 setResolution(newResolution);
 savePreferredResolution(newResolution);
 };

 // Confirmar seleção de 4K
 const handleConfirm4K = () => {
 setResolution('4k');
 savePreferredResolution('4k');
 setShow4KConfirmModal(false);
 setPending4KConfirm(false);
 };

 // Cancelar seleção de 4K
 const handleCancel4K = () => {
 setShow4KConfirmModal(false);
 setPending4KConfirm(false);
 };

 // Handler para abrir modal de upgrade de plano
 const handleUpgradeClick = () => {
 if (onOpenPlanModal) {
 onOpenPlanModal();
 }
 };

 const handleGenerate = async () => {
 if (!selectedClient || Object.keys(lookComposition).length === 0) return;

 // Guardar imagem original para o antes/depois
 const origImg = getClientPhoto(selectedClient, selectedPhotoType);
 if (origImg) {
 setOriginalImage(origImg);
 }

 setSelectedSavedLook(null);
 const result = await onGenerate(selectedClient, selectedPhotoType, lookComposition, resolution);

 if (result) {
 setGeneratedImage(result.imageUrl);
 setLastGenerationId(result.generationId || null);
 setShowBeforeAfter('after');
 }
 };

 const handleSaveLook = async () => {
 if (!generatedImage || !selectedClient) return;

 setSavingLook(true);
 const saved = await onSaveLook(selectedClient, generatedImage, lookComposition);
 setSavingLook(false);

 if (saved) {
 alert('Look salvo com sucesso!');
 }
 };

 const handleSendWhatsApp = () => {
 if (!selectedClient) return;
 const imageToSend = generatedImage || selectedSavedLook?.imageUrl;
 if (!imageToSend) return;

 // Usa a mensagem editada ou a gerada automaticamente
 const messageToSend = getFinalMessage();
 // Usa o look atual ou o look salvo selecionado
 const lookToSend = selectedSavedLook?.lookItems || lookComposition;

 // Coletar fotos otimizadas do Product Studio para cada produto do look
 const psImages: { name: string; url: string }[] = [];
 const seenProductIds = new Set<string>();
 const lookKeys = ['head', 'top', 'bottom', 'feet', 'accessory1', 'accessory2'] as const;
 lookKeys.forEach(key => {
 const item = lookToSend[key];
 if (item?.productId && !seenProductIds.has(item.productId)) {
 seenProductIds.add(item.productId);
 const product = products.find(p => p.id === item.productId);
 if (product?.generatedImages?.productStudio?.length) {
 const lastSession = product.generatedImages.productStudio[product.generatedImages.productStudio.length - 1];
 if (lastSession.images?.length) {
 const frontImg = lastSession.images.find(img => img.angle === 'front') || lastSession.images[0];
 if (frontImg?.url) {
 psImages.push({ name: item.name, url: frontImg.url });
 }
 }
 }
 }
 });

 onSendWhatsApp(selectedClient, imageToSend, messageToSend, lookToSend, psImages.length > 0 ? psImages : undefined);
 };

 const handleDownload = () => {
 if (!selectedClient) return;
 const imageToDownload = generatedImage || selectedSavedLook?.imageUrl;
 if (!imageToDownload) return;

 onDownloadImage(imageToDownload, `${selectedClient.firstName}_${selectedClient.lastName}`);
 };

 const handleGenerateAIMessage = async () => {
 if (!selectedClient) return;

 setIsGeneratingAIMessage(true);
 try {
 const aiMessage = await onGenerateAIMessage(selectedClient.firstName);
 // Gera a mensagem completa com os itens do look
 const lookItems = formatLookItemsPreview();
 const fullMessage = lookItems ? `${aiMessage}\n\n${lookItems}` : aiMessage;
 setFullEditedMessage(fullMessage);
 setMessage(aiMessage); // Mantém a base para referência
 } catch (error) {
 console.error('Erro ao gerar mensagem IA:', error);
 } finally {
 setIsGeneratingAIMessage(false);
 }
 };

 const handleReportSubmit = async (observation: string) => {
 if (!user || !generatedImage) return;
 const lookNames = Object.values(lookComposition).filter(Boolean).map(i => i!.name).join(', ');
 const result = await submitReport({
 userId: user.id,
 userEmail: user.email || '',
 userName: user.name || user.email || '',
 generationType: 'provador',
 generationId: lastGenerationId || undefined,
 productName: lookNames || selectedClient?.firstName || 'Provador',
 generatedImageUrl: generatedImage,
 originalImageUrl: originalImage || undefined,
 observation,
 });
 if (result.success) {
 showToast('Report enviado! Analisaremos em até 24h.', 'success');
 } else {
 throw new Error(result.error || 'Erro ao enviar report');
 }
 };

 const handleReset = () => {
 setSelectedClient(null);
 onClientSelect(null);
 setSelectedPhotoType('frente');
 setLookComposition({});
 setGeneratedImage(null);
 setOriginalImage(null);
 setSelectedSavedLook(null);
 setCollectionFilter('');
 setMessage(whatsappTemplates[0]?.message || '');
 setFullEditedMessage(null);
 setIsEditingMessage(false);
 setCurrentStep(1);
 };

 const canGoToStep = (step: number): boolean => {
 switch (step) {
 case 1:
 return true;
 case 2:
 return !!selectedClient;
 case 3:
 return !!selectedClient && !!selectedPhotoType;
 case 4:
 return !!selectedClient && !!selectedPhotoType && Object.keys(lookComposition).length > 0;
 default:
 return false;
 }
 };

 const isStepComplete = (step: number): boolean => {
 switch (step) {
 case 1:
 return !!selectedClient;
 case 2:
 return !!selectedClient && !!selectedPhotoType && !!getClientPhoto(selectedClient, selectedPhotoType);
 case 3:
 return Object.keys(lookComposition).length > 0;
 case 4:
 return !!generatedImage || !!selectedSavedLook;
 default:
 return false;
 }
 };

 // ============================================================
 // RENDERIZADORES DE STEP
 // ============================================================

 const renderStepIndicators = () => (
 <div data-tour="provador-steps" className="flex items-center justify-center gap-2 mb-6">
 {WIZARD_STEPS.map((step) => {
 const isActive = currentStep === step.id;
 const isComplete = isStepComplete(step.id);
 const canNavigate = canGoToStep(step.id);

 return (
 <button
 key={step.id}
 onClick={() => canNavigate && setCurrentStep(step.id as 1 | 2 | 3 | 4)}
 disabled={!canNavigate}
 className={`
 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all
 ${isActive
 ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white scale-105 '
 : isComplete
 ? theme !== 'light' ? 'bg-white/5 text-neutral-300 border border-white/10' : 'bg-white/60 text-gray-600 border border-gray-200/50'
 : canNavigate
 ? theme !== 'light'
 ? 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
 : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
 : theme !== 'light'
 ? 'bg-neutral-900 text-neutral-600'
 : 'bg-gray-50 text-gray-300'
 }
 ${!canNavigate ? 'cursor-not-allowed' : 'cursor-pointer'}
 `}
 >
 <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${
 isActive
 ? 'bg-white/20'
 : isComplete
 ? 'bg-white/10 text-green-400'
 : theme !== 'light'
 ? 'bg-neutral-700'
 : 'bg-gray-200'
 }`}>
 {isComplete && !isActive ? (
 <i className="fas fa-check"></i>
 ) : (
 <i className={`fas ${step.icon}`}></i>
 )}
 </span>
 <span className="hidden sm:inline">{step.title}</span>
 </button>
 );
 })}
 </div>
 );

 const renderStep1 = () => (
 <div className={`${theme !== 'light' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 '} rounded-2xl border overflow-hidden`}>
 <div className={`p-4 border-b ${theme !== 'light' ? 'border-neutral-800' : 'border-gray-100'}`}>
 <h3 className={`${theme !== 'light' ? 'text-white' : 'text-gray-900'} font-semibold text-base flex items-center gap-2`}>
 <span className="w-7 h-7 rounded-full bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] flex items-center justify-center text-white text-xs">1</span>
 Selecionar Cliente
 </h3>
 <p className={`${theme !== 'light' ? 'text-neutral-500' : 'text-gray-500'} text-xs mt-1`}>
 Escolha um cliente cadastrado ou adicione um novo
 </p>
 </div>

 <div className="p-4">
 {selectedClient ? (
 <div className="text-center">
 <div className="relative inline-block mb-3">
 <OptimizedImage
 src={getClientPhoto(selectedClient) || ''}
 alt={selectedClient.firstName}
 className="w-24 h-24 rounded-full border-4 border-white/20"
 size="thumb"
 />
 <button
 onClick={() => { setSelectedClient(null); onClientSelect(null); }}
 className="absolute -top-1 -right-1 w-7 h-7 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 transition-colors"
 >
 <i className="fas fa-times"></i>
 </button>
 </div>
 <p className={`${theme !== 'light' ? 'text-white' : 'text-gray-900'} font-semibold text-lg`}>
 {selectedClient.firstName} {selectedClient.lastName}
 </p>
 <p className={`${theme !== 'light' ? 'text-neutral-500' : 'text-gray-500'} text-sm`}>
 {formatWhatsApp(selectedClient.whatsapp)}
 </p>
 <p className={`${theme !== 'light' ? 'text-neutral-600' : 'text-gray-400'} text-xs mt-1`}>
 {selectedClient.photos?.length || 1} foto(s) cadastrada(s)
 </p>

 <button
 onClick={() => setCurrentStep(2)}
 className="mt-4 px-6 py-2.5 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-xl font-medium text-sm transition-all"
 >
 Continuar <i className="fas fa-arrow-right ml-2"></i>
 </button>
 </div>
 ) : (
 <>
 {/* Buscar clientes */}
 <div data-tour="provador-client-search" className="mb-4">
 <div className="relative">
 <i className={`fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs ${theme !== 'light' ? 'text-neutral-500' : 'text-gray-400'}`}></i>
 <input
 type="text"
 id="provador-client-search"
 name="clientSearch"
 placeholder="Buscar cliente..."
 className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm border ${
 theme !== 'light'
 ? 'bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500'
 : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
 }`}
 />
 </div>
 </div>

 {/* Lista de clientes */}
 <div data-tour="provador-client-list" className="space-y-2 max-h-80 overflow-y-auto">
 {clientsWithProvador.length > 0 ? (
 clientsWithProvador.map((client) => (
 <div
 key={client.id}
 onClick={() => handleSelectClient(client)}
 className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
 theme !== 'light'
 ? 'border-neutral-800 hover:border-neutral-600 hover:bg-neutral-800'
 : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
 }`}
 >
 <OptimizedImage
 src={getClientPhoto(client) || ''}
 alt={client.firstName}
 className="w-12 h-12 rounded-full border-2 border-white/20"
 size="thumb"
 />
 <div className="flex-1 min-w-0">
 <p className={`${theme !== 'light' ? 'text-white' : 'text-gray-900'} font-medium text-sm truncate`}>
 {client.firstName} {client.lastName}
 </p>
 <p className={`${theme !== 'light' ? 'text-neutral-500' : 'text-gray-500'} text-xs`}>
 {client.photos?.length || 1} foto(s)
 </p>
 </div>
 <i className={`fas fa-chevron-right text-xs ${theme !== 'light' ? 'text-neutral-600' : 'text-gray-400'}`}></i>
 </div>
 ))
 ) : (
 <div className="text-center py-8">
 <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-3 ${
 theme !== 'light' ? 'bg-neutral-800' : 'bg-gray-100'
 }`}>
 <i className={`fas fa-user-plus text-2xl ${theme !== 'light' ? 'text-neutral-600' : 'text-gray-400'}`}></i>
 </div>
 <p className={`${theme !== 'light' ? 'text-neutral-500' : 'text-gray-500'} text-sm mb-1`}>
 Nenhum cliente com foto cadastrada
 </p>
 <p className={`${theme !== 'light' ? 'text-neutral-600' : 'text-gray-400'} text-xs`}>
 Cadastre um cliente para usar o Provador
 </p>
 </div>
 )}
 </div>

 {/* Botao de adicionar cliente */}
 <button
 data-tour="provador-client-create"
 onClick={onCreateClient}
 className={`w-full mt-4 py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all ${
 theme !== 'light'
 ? 'bg-neutral-800 text-white hover:bg-neutral-700 border border-neutral-700'
 : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
 }`}
 >
 <i className="fas fa-plus"></i>
 Adicionar Novo Cliente
 </button>
 </>
 )}
 </div>
 </div>
 );

 const renderStep2 = () => (
 <div className={`${theme !== 'light' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 '} rounded-2xl border overflow-hidden`}>
 <div className={`p-4 border-b ${theme !== 'light' ? 'border-neutral-800' : 'border-gray-100'}`}>
 <h3 className={`${theme !== 'light' ? 'text-white' : 'text-gray-900'} font-semibold text-base flex items-center gap-2`}>
 <span className="w-7 h-7 rounded-full bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] flex items-center justify-center text-white text-xs">2</span>
 Selecionar Foto
 </h3>
 <p className={`${theme !== 'light' ? 'text-neutral-500' : 'text-gray-500'} text-xs mt-1`}>
 Escolha a foto que sera usada ou adicione uma nova
 </p>
 </div>

 {/* Preview do cliente selecionado */}
 {selectedClient && (
 <div className={`px-4 py-3 border-b ${theme !== 'light' ? 'border-neutral-800 bg-neutral-800/50' : 'border-gray-100 bg-gray-50'}`}>
 <div className="flex items-center gap-3">
 <OptimizedImage
 src={getClientPhoto(selectedClient) || ''}
 alt={selectedClient.firstName}
 className="w-10 h-10 rounded-full border-2 border-white/20"
 size="thumb"
 />
 <div>
 <p className={`${theme !== 'light' ? 'text-white' : 'text-gray-900'} font-medium text-sm`}>
 {selectedClient.firstName} {selectedClient.lastName}
 </p>
 <p className={`${theme !== 'light' ? 'text-neutral-500' : 'text-gray-500'} text-xs`}>
 {selectedClient.photos?.length || 1} foto(s) disponivel(is)
 </p>
 </div>
 </div>
 </div>
 )}

 <div className="p-4">
 {selectedClient ? (
 <div className="space-y-3">
 {/* Tipos de foto disponiveis */}
 {PHOTO_TYPES.map((photoType) => {
 const hasPhoto = selectedClient.photos?.some((p) => p.type === photoType.id) ||
 (photoType.id === 'frente' && selectedClient.photo);
 const photoSrc = selectedClient.photos?.find((p) => p.type === photoType.id)?.base64 ||
 (photoType.id === 'frente' ? selectedClient.photo : undefined);
 const isSelected = selectedPhotoType === photoType.id && hasPhoto;

 return (
 <div
 key={photoType.id}
 className={`rounded-xl border overflow-hidden transition-all ${
 isSelected
 ? theme !== 'light' ? 'border-neutral-400 ring-1 ring-neutral-400/20' : 'border-gray-400 ring-1 ring-gray-400/20'
 : theme !== 'light'
 ? 'border-neutral-800'
 : 'border-gray-200'
 }`}
 >
 <div
 onClick={() => hasPhoto && handleSelectPhoto(photoType.id)}
 className={`flex items-center gap-4 p-4 transition-all ${
 !hasPhoto
 ? 'opacity-50 cursor-not-allowed'
 : 'cursor-pointer hover:bg-white/5'
 }`}
 >
 {hasPhoto && photoSrc ? (
 <OptimizedImage
 src={photoSrc}
 alt={photoType.label}
 className="w-16 h-16 rounded-xl"
 size="thumb"
 />
 ) : (
 <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
 theme !== 'light' ? 'bg-neutral-800' : 'bg-gray-100'
 }`}>
 <i className={`fas ${photoType.icon} text-lg ${
 theme !== 'light' ? 'text-neutral-600' : 'text-gray-400'
 }`}></i>
 </div>
 )}

 <div className="flex-1">
 <p className={`${theme !== 'light' ? 'text-white' : 'text-gray-900'} font-medium`}>
 {photoType.label}
 </p>
 <p className={`${theme !== 'light' ? 'text-neutral-500' : 'text-gray-500'} text-xs`}>
 {hasPhoto ? 'Toque para selecionar' : 'Nao cadastrada'}
 </p>
 </div>

 {isSelected && (
 <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 backdrop-blur-xl flex items-center justify-center">
 <i className="fas fa-check text-green-400 text-xs"></i>
 </div>
 )}

 {hasPhoto && !isSelected && (
 <i className={`fas fa-chevron-right ${theme !== 'light' ? 'text-neutral-600' : 'text-gray-400'}`}></i>
 )}
 </div>

 {/* Botao para adicionar/substituir foto */}
 {!hasPhoto && (
 <div className={`px-4 pb-4 pt-0`}>
 <button
 onClick={() => handleOpenPhotoOptions(photoType.id)}
 className={`w-full py-2.5 rounded-lg font-medium text-xs flex items-center justify-center gap-2 transition-all ${
 theme !== 'light'
 ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
 : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
 }`}
 >
 <i className="fas fa-camera"></i>
 Adicionar foto de {photoType.label.toLowerCase()}
 </button>
 </div>
 )}
 </div>
 );
 })}

 {/* Botao para adicionar nova foto */}
 <div className={`mt-4 p-4 rounded-xl border border-dashed ${
 theme !== 'light' ? 'border-neutral-700 bg-neutral-800/30' : 'border-gray-300 bg-gray-50'
 }`}>
 <p className={`${theme !== 'light' ? 'text-neutral-400' : 'text-gray-600'} text-sm text-center mb-3`}>
 <i className="fas fa-lightbulb text-yellow-500 mr-2"></i>
 Cliente na loja? Tire uma foto agora!
 </p>
 <button
 onClick={() => handleOpenPhotoOptions(selectedPhotoType)}
 className="w-full py-3 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2"
 >
 <i className="fas fa-camera"></i>
 Tirar Nova Foto
 </button>
 </div>

 {/* Navegacao */}
 <div className="flex gap-3 mt-4">
 <button
 onClick={() => setCurrentStep(1)}
 className={`flex-1 py-3 rounded-xl font-medium text-sm transition-all ${
 theme !== 'light'
 ? 'bg-neutral-800 text-white hover:bg-neutral-700'
 : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
 }`}
 >
 <i className="fas fa-arrow-left mr-2"></i>Voltar
 </button>
 {getClientPhoto(selectedClient, selectedPhotoType) && (
 <button
 onClick={() => setCurrentStep(3)}
 className="flex-1 py-3 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-xl font-medium text-sm"
 >
 Continuar<i className="fas fa-arrow-right ml-2"></i>
 </button>
 )}
 </div>
 </div>
 ) : (
 <div className="text-center py-8">
 <p className={`${theme !== 'light' ? 'text-neutral-500' : 'text-gray-500'} text-sm`}>
 Selecione um cliente primeiro
 </p>
 <button
 onClick={() => setCurrentStep(1)}
 className="mt-3 px-4 py-2 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-lg text-sm font-medium"
 >
 Voltar para clientes
 </button>
 </div>
 )}
 </div>

 {/* Modal de opcoes de foto (Galeria/Camera) */}
 {showPhotoOptions && (
 <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
 <div className={`w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl overflow-hidden safe-area-bottom-sheet ${
 theme !== 'light' ? 'bg-neutral-900' : 'bg-white'
 }`}>
 <div className={`p-4 border-b ${theme !== 'light' ? 'border-neutral-800' : 'border-gray-100'}`}>
 <div className="flex items-center justify-between">
 <h4 className={`${theme !== 'light' ? 'text-white' : 'text-gray-900'} font-semibold`}>
 Adicionar Foto
 </h4>
 <button
 onClick={() => setShowPhotoOptions(false)}
 className={`w-8 h-8 rounded-full flex items-center justify-center ${
 theme !== 'light' ? 'bg-neutral-800 text-neutral-400' : 'bg-gray-100 text-gray-500'
 }`}
 >
 <i className="fas fa-times text-sm"></i>
 </button>
 </div>
 <p className={`${theme !== 'light' ? 'text-neutral-500' : 'text-gray-500'} text-xs mt-1`}>
 Foto de {PHOTO_TYPES.find(p => p.id === uploadingPhotoType)?.label.toLowerCase()}
 </p>
 </div>

 <div className="p-4 space-y-3">
 {/* Camera */}
 <button
 onClick={() => cameraInputRef.current?.click()}
 disabled={isUploadingPhoto}
 className={`w-full p-4 rounded-xl flex items-center gap-4 transition-all ${
 theme !== 'light'
 ? 'bg-neutral-800 hover:bg-neutral-700'
 : 'bg-gray-50 hover:bg-gray-100'
 }`}
 >
 <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] flex items-center justify-center">
 <i className="fas fa-camera text-white text-lg"></i>
 </div>
 <div className="text-left">
 <p className={`${theme !== 'light' ? 'text-white' : 'text-gray-900'} font-medium`}>
 Camera
 </p>
 <p className={`${theme !== 'light' ? 'text-neutral-500' : 'text-gray-500'} text-xs`}>
 Tirar foto agora
 </p>
 </div>
 </button>

 {/* Galeria */}
 <button
 onClick={() => photoInputRef.current?.click()}
 disabled={isUploadingPhoto}
 className={`w-full p-4 rounded-xl flex items-center gap-4 transition-all ${
 theme !== 'light'
 ? 'bg-neutral-800 hover:bg-neutral-700'
 : 'bg-gray-50 hover:bg-gray-100'
 }`}
 >
 <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
 theme !== 'light' ? 'bg-neutral-700' : 'bg-gray-200'
 }`}>
 <i className={`fas fa-images text-lg ${theme !== 'light' ? 'text-neutral-300' : 'text-gray-600'}`}></i>
 </div>
 <div className="text-left">
 <p className={`${theme !== 'light' ? 'text-white' : 'text-gray-900'} font-medium`}>
 Galeria
 </p>
 <p className={`${theme !== 'light' ? 'text-neutral-500' : 'text-gray-500'} text-xs`}>
 Escolher da galeria
 </p>
 </div>
 </button>

 {isUploadingPhoto && (
 <div className="flex items-center justify-center gap-2 py-2">
 <i className="fas fa-spinner fa-spin text-[#FF9F43]"></i>
 <span className={`${theme !== 'light' ? 'text-neutral-400' : 'text-gray-500'} text-sm`}>
 Processando...
 </span>
 </div>
 )}
 </div>
 </div>
 </div>
 )}

 {/* Inputs de arquivo ocultos */}
 <input
 ref={photoInputRef}
 id="provador-photo-gallery"
 name="photoGallery"
 type="file"
 accept="image/*,.heic,.heif"
 onChange={(e) => handlePhotoUpload(e, 'gallery')}
 className="hidden"
 />
 <input
 ref={cameraInputRef}
 id="provador-photo-camera"
 name="photoCamera"
 type="file"
 accept="image/*,.heic,.heif"
 capture="environment"
 onChange={(e) => handlePhotoUpload(e, 'camera')}
 className="hidden"
 />
 </div>
 );

 const renderStep3 = () => (
 <div className={`${theme !== 'light' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 '} rounded-2xl border overflow-hidden`}>
 <div className={`p-4 border-b ${theme !== 'light' ? 'border-neutral-800' : 'border-gray-100'}`}>
 <h3 className={`${theme !== 'light' ? 'text-white' : 'text-gray-900'} font-semibold text-base flex items-center gap-2`}>
 <span className="w-7 h-7 rounded-full bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] flex items-center justify-center text-white text-xs">3</span>
 Montar Look
 {Object.keys(lookComposition).length > 0 && (
 <span className="ml-auto text-xs text-[#FF9F43] bg-[#FF9F43]/15 px-2 py-1 rounded-full">
 {Object.keys(lookComposition).length} peca(s)
 </span>
 )}
 </h3>
 <p className={`${theme !== 'light' ? 'text-neutral-500' : 'text-gray-500'} text-xs mt-1`}>
 Selecione as pecas que compoem o look
 </p>
 </div>

 {/* Preview lateral do cliente */}
 <div className="flex">
 {/* Preview da foto do cliente (sempre visivel) */}
 <div className={`w-1/4 p-3 border-r ${theme !== 'light' ? 'border-neutral-800 bg-neutral-800/30' : 'border-gray-100 bg-gray-50'}`}>
 <p className={`${theme !== 'light' ? 'text-neutral-500' : 'text-gray-500'} text-[10px] font-medium uppercase tracking-wide mb-2`}>
 Cliente
 </p>
 {selectedClient && (
 <div className="text-center">
 <img
 src={getClientPhoto(selectedClient, selectedPhotoType) || getClientPhoto(selectedClient) || ''}
 alt={selectedClient.firstName}
 className="w-full aspect-[3/4] object-cover rounded-xl mb-2"
 />
 <p className={`${theme !== 'light' ? 'text-white' : 'text-gray-900'} font-medium text-xs truncate`}>
 {selectedClient.firstName}
 </p>
 <p className={`${theme !== 'light' ? 'text-neutral-500' : 'text-gray-500'} text-[10px] capitalize`}>
 Foto: {selectedPhotoType}
 </p>
 </div>
 )}
 </div>

 {/* Composicao do look */}
 <div className="flex-1 p-3">
 {/* Filtro de colecao */}
 <select
 id="provador-collection-filter"
 name="collectionFilter"
 value={collectionFilter}
 onChange={(e) => setCollectionFilter(e.target.value)}
 className={`w-full px-3 py-2 border rounded-xl text-xs mb-3 ${
 theme !== 'light'
 ? 'bg-neutral-800 border-neutral-700 text-white'
 : 'bg-gray-50 border-gray-200 text-gray-900'
 }`}
 >
 <option value="">Todas as colecoes</option>
 {collections.map((c) => (
 <option key={c} value={c}>{c}</option>
 ))}
 </select>

 {/* Componente de Look Composer */}
 <div className="max-h-[500px] overflow-y-auto">
 <StudioLookComposer
 products={collectionFilter ? products.filter((p) => p.collection === collectionFilter) : products}
 composition={lookComposition}
 onChange={setLookComposition}
 theme={theme}
 />
 </div>
 </div>
 </div>

 {/* Navegacao */}
 <div className={`p-4 border-t ${theme !== 'light' ? 'border-neutral-800' : 'border-gray-100'}`}>
 <div className="flex gap-3">
 <button
 onClick={() => setCurrentStep(2)}
 className={`flex-1 py-3 rounded-xl font-medium text-sm transition-all ${
 theme !== 'light'
 ? 'bg-neutral-800 text-white hover:bg-neutral-700'
 : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
 }`}
 >
 <i className="fas fa-arrow-left mr-2"></i>Voltar
 </button>
 <button
 onClick={() => setCurrentStep(4)}
 disabled={Object.keys(lookComposition).length === 0}
 className="flex-1 py-3 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-xl font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
 >
 Continuar<i className="fas fa-arrow-right ml-2"></i>
 </button>
 </div>
 </div>
 </div>
 );

 const renderStep4 = () => (
 <div className={`${theme !== 'light' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 '} rounded-2xl border overflow-hidden`}>
 <div className={`p-4 border-b ${theme !== 'light' ? 'border-neutral-800' : 'border-gray-100'}`}>
 <h3 className={`${theme !== 'light' ? 'text-white' : 'text-gray-900'} font-semibold text-base flex items-center gap-2`}>
 <span className="w-7 h-7 rounded-full bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] flex items-center justify-center text-white text-xs">4</span>
 Gerar e Enviar
 </h3>
 <p className={`${theme !== 'light' ? 'text-neutral-500' : 'text-gray-500'} text-xs mt-1`}>
 Gere a imagem e envie para o cliente
 </p>
 </div>

 {/* Layout lado a lado: Imagem esquerda, Acoes direita */}
 <div className="flex flex-col md:flex-row">
 {/* Coluna Esquerda - Imagem */}
 <div className="md:w-1/2 p-4">
 <div className={`aspect-[3/4] rounded-xl overflow-hidden relative ${
 theme !== 'light' ? 'bg-neutral-800' : 'bg-gray-100'
 }`}>
 {isGenerating ? (
 <div className="flex flex-col items-center justify-center h-full p-6">
 <div className="w-20 h-20 mb-3 rounded-xl overflow-hidden flex items-center justify-center">
 <img src="/Scene-1.gif" alt="" className="h-full object-cover" style={{ width: '140%', maxWidth: 'none' }} />
 </div>
 <p className={`${theme !== 'light' ? 'text-white' : 'text-gray-800'} text-xs font-medium mb-2 text-center`}>
 {loadingText}
 </p>
 <div className={`w-full max-w-[150px] h-1.5 rounded-full overflow-hidden ${
 theme !== 'light' ? 'bg-neutral-700' : 'bg-gray-200'
 }`}>
 <div
 className="h-full bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] transition-all duration-300"
 style={{ width: `${Math.min(generationProgress, 100)}%` }}
 />
 </div>
 <p className={`${theme !== 'light' ? 'text-neutral-500' : 'text-gray-500'} text-[10px] mt-1`}>
 {Math.round(Math.min(generationProgress, 100))}%
 </p>
 </div>
 ) : showReveal ? (
 <div className="flex flex-col items-center justify-center h-full">
 <div className="w-48 h-48">
 <DotLottieReact
 src="https://lottie.host/c73f7881-d168-4dee-be3a-3c73bd916083/vnLD4LVey6.lottie"
 loop
 autoplay
 style={{ width: '100%', height: '100%' }}
 />
 </div>
 </div>
 ) : selectedSavedLook ? (
 <>
 <OptimizedImage
 src={selectedSavedLook.imageUrl}
 alt="Look salvo"
 className="w-full h-full"
 size="preview"
 />
 <button
 onClick={() => setSelectedSavedLook(null)}
 className="absolute top-2 right-2 w-7 h-7 bg-black/50 hover:bg-black/70 text-white rounded-full text-xs"
 >
 <i className="fas fa-times"></i>
 </button>
 </>
 ) : generatedImage ? (
 <>
 {/* Toggle Antes/Depois */}
 <div className="absolute top-2 left-2 z-10">
 <div className={`flex rounded-lg overflow-hidden text-[10px] ${
 theme !== 'light' ? 'bg-black/50' : 'bg-white/80'
 }`}>
 <button
 onClick={() => setShowBeforeAfter('before')}
 className={`px-2 py-1 font-medium transition-colors ${
 showBeforeAfter === 'before'
 ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white'
 : theme !== 'light'
 ? 'text-white hover:bg-white/10'
 : 'text-gray-700 hover:bg-gray-200'
 }`}
 >
 Antes
 </button>
 <button
 onClick={() => setShowBeforeAfter('after')}
 className={`px-2 py-1 font-medium transition-colors ${
 showBeforeAfter === 'after'
 ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white'
 : theme !== 'light'
 ? 'text-white hover:bg-white/10'
 : 'text-gray-700 hover:bg-gray-200'
 }`}
 >
 Depois
 </button>
 </div>
 </div>

 <img
 src={showBeforeAfter === 'after' ? generatedImage : (originalImage || '')}
 alt={showBeforeAfter === 'after' ? 'Imagem gerada' : 'Imagem original'}
 className="w-full h-full object-cover"
 />

 <button
 onClick={() => {
 if (confirm('Descartar esta imagem?')) {
 setGeneratedImage(null);
 setShowBeforeAfter('after');
 }
 }}
 className="absolute top-2 right-2 w-7 h-7 bg-black/50 hover:bg-red-500 text-white rounded-full text-xs transition-colors"
 >
 <i className="fas fa-trash"></i>
 </button>
 </>
 ) : selectedClient && getClientPhoto(selectedClient, selectedPhotoType) ? (
 <div className="relative w-full h-full">
 <img
 src={getClientPhoto(selectedClient, selectedPhotoType)!}
 alt="Preview"
 className="w-full h-full object-cover opacity-30"
 />
 <div className="absolute inset-0 flex items-center justify-center">
 <div className="text-center">
 <i className="fas fa-wand-magic-sparkles text-[#FF9F43] text-2xl mb-2"></i>
 <p className={`${theme !== 'light' ? 'text-neutral-400' : 'text-gray-500'} text-xs`}>
 Clique em Criar
 </p>
 </div>
 </div>
 </div>
 ) : (
 <div className="flex flex-col items-center justify-center h-full">
 <i className={`fas fa-image text-3xl mb-2 ${theme !== 'light' ? 'text-neutral-700' : 'text-gray-300'}`}></i>
 <p className={`${theme !== 'light' ? 'text-neutral-600' : 'text-gray-400'} text-xs`}>Preview</p>
 </div>
 )}
 </div>

 {/* Botao de salvar look (quando tem imagem gerada) */}
 {generatedImage && !selectedSavedLook && (
 <button
 onClick={handleSaveLook}
 disabled={savingLook}
 className={`w-full mt-2 py-2 rounded-lg font-medium text-xs flex items-center justify-center gap-2 transition-all ${
 theme !== 'light'
 ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-white'
 : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
 } border`}
 >
 {savingLook ? (
 <><i className="fas fa-spinner fa-spin"></i>Salvando...</>
 ) : (
 <><i className="fas fa-bookmark"></i>Salvar Look</>
 )}
 </button>
 )}

 {/* Galeria de looks salvos */}
 {selectedClient && clientLooks.length > 0 && (
 <div className="mt-3">
 <p className={`${theme !== 'light' ? 'text-neutral-400' : 'text-gray-500'} text-[10px] mb-1.5 flex items-center gap-1`}>
 <i className="fas fa-images"></i> Looks salvos ({clientLooks.length})
 </p>
 <div className="flex gap-1.5 overflow-x-auto pb-1">
 {clientLooks.map((look) => (
 <div key={look.id} className="relative flex-shrink-0 group">
 <OptimizedImage
 src={look.imageUrl}
 alt="Look"
 onClick={() => setSelectedSavedLook(look)}
 className={`w-12 h-16 rounded-lg cursor-pointer transition-all ${
 selectedSavedLook?.id === look.id
 ? 'ring-2 ring-[#FF9F43]'
 : 'hover:ring-2 hover:ring-[#FF9F43]/50'
 }`}
 size="thumb"
 />
 <button
 onClick={(e) => {
 e.stopPropagation();
 if (confirm('Deletar este look?')) onDeleteLook(look);
 }}
 className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[8px] opacity-0 group-hover:opacity-100 transition-opacity"
 >
 <i className="fas fa-times"></i>
 </button>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>

 {/* Coluna Direita - Acoes */}
 <div className={`md:w-1/2 p-4 ${theme !== 'light' ? 'md:border-l md:border-neutral-800' : 'md:border-l md:border-gray-100'}`}>
 {/* Info do cliente */}
 {selectedClient && (
 <div className={`flex items-center gap-3 p-3 rounded-xl mb-4 ${
 theme !== 'light' ? 'bg-neutral-800' : 'bg-gray-50'
 }`}>
 <OptimizedImage
 src={getClientPhoto(selectedClient) || ''}
 alt={selectedClient.firstName}
 className="w-10 h-10 rounded-full border-2 border-white/20"
 size="thumb"
 />
 <div className="flex-1 min-w-0">
 <p className={`${theme !== 'light' ? 'text-white' : 'text-gray-900'} font-medium text-sm truncate`}>
 {selectedClient.firstName} {selectedClient.lastName}
 </p>
 <p className={`${theme !== 'light' ? 'text-neutral-500' : 'text-gray-500'} text-xs`}>
 {formatWhatsApp(selectedClient.whatsapp)}
 </p>
 </div>
 </div>
 )}

 {/* Mensagem WhatsApp - Preview ou Edição */}
 <div className={`mb-3 p-3 rounded-xl border ${theme !== 'light' ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-200'}`}>
 <div className="flex items-center justify-between mb-2">
 <div className="flex items-center gap-1.5">
 <i className="fab fa-whatsapp text-green-500 text-sm"></i>
 <span className={`text-[10px] font-medium uppercase tracking-wide ${theme !== 'light' ? 'text-green-400' : 'text-green-600'}`}>
 Mensagem que será enviada
 </span>
 </div>
 <div className="flex items-center gap-1">
 <button
 onClick={handleGenerateAIMessage}
 disabled={isGeneratingAIMessage || !selectedClient}
 title="Gerar mensagem com IA"
 className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
 isGeneratingAIMessage
 ? 'bg-[#FF9F43]/20 text-[#FF9F43]'
 : theme !== 'light'
 ? 'bg-neutral-700 text-[#FF9F43] hover:bg-neutral-600'
 : 'bg-[#FF9F43]/10 text-[#FF9F43] hover:bg-[#FF9F43]/15'
 }`}
 >
 {isGeneratingAIMessage ? (
 <i className="fas fa-spinner fa-spin text-[10px]"></i>
 ) : (
 <i className="fas fa-wand-magic-sparkles text-[10px]"></i>
 )}
 </button>
 <button
 onClick={toggleEditMessage}
 title={isEditingMessage ? "Fechar edição" : "Editar mensagem"}
 className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
 isEditingMessage
 ? theme !== 'light'
 ? 'bg-green-500/30 text-green-400'
 : 'bg-green-200 text-green-700'
 : theme !== 'light'
 ? 'bg-neutral-700 text-neutral-400 hover:bg-neutral-600'
 : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
 }`}
 >
 <i className={`fas ${isEditingMessage ? 'fa-check' : 'fa-pen'} text-[10px]`}></i>
 </button>
 </div>
 </div>

 {isEditingMessage ? (
 /* Modo edição - textarea com mensagem completa */
 <div>
 <textarea
 id="provador-message"
 name="provadorMessage"
 value={fullEditedMessage || ''}
 onChange={(e) => setFullEditedMessage(e.target.value)}
 rows={8}
 placeholder="Escreva sua mensagem personalizada..."
 className={`w-full px-3 py-2 border rounded-lg text-xs resize-none ${
 theme !== 'light'
 ? 'bg-neutral-800/50 border-green-500/20 text-white placeholder-neutral-500'
 : 'bg-white/50 border-green-200 text-gray-900 placeholder-gray-400'
 }`}
 autoFocus
 />
 </div>
 ) : (
 /* Modo preview - mensagem completa (editada ou gerada) */
 <div className={`text-xs whitespace-pre-wrap ${theme !== 'light' ? 'text-neutral-200' : 'text-gray-700'}`}>
 {getFinalMessage()}
 </div>
 )}
 </div>

 {/* Seletor de Resolução */}
 <div className={`rounded-xl p-4 mb-3 ${theme !== 'light' ? 'bg-neutral-800/50 border border-neutral-700' : 'bg-gray-50 border border-gray-200'}`}>
 <ResolutionSelector
 resolution={resolution}
 onChange={handleResolutionChange}
 canUse4K={canUse4K}
 onUpgradeClick={handleUpgradeClick}
 theme={theme}
 disabled={isGenerating}
 />
 </div>

 {/* Botoes de acao */}
 <div className="space-y-2">
 {/* Botao Criar */}
 <button
 onClick={handleGenerate}
 disabled={!selectedClient || Object.keys(lookComposition).length === 0 || userCredits < creditsNeeded || isGenerating}
 className={`w-full py-3 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all ${
 (!selectedClient || Object.keys(lookComposition).length === 0 || userCredits < creditsNeeded)
 ? 'opacity-50 cursor-not-allowed'
 : isGenerating
 ? 'opacity-75 cursor-wait'
 : ' '
 }`}
 >
 {isGenerating ? (
 <><i className="fas fa-spinner fa-spin"></i>Gerando...</>
 ) : (
 <><i className="fas fa-wand-magic-sparkles"></i>Criar ({creditsNeeded} {creditsNeeded === 1 ? 'crédito' : 'créditos'})</>
 )}
 </button>

 {/* Botoes WhatsApp e Download */}
 <div className="flex gap-2">
 <button
 onClick={handleSendWhatsApp}
 disabled={!selectedClient || (!generatedImage && !selectedSavedLook)}
 className={`flex-1 py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
 theme !== 'light'
 ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-green-400'
 : 'bg-white hover:bg-gray-50 border-gray-200 text-green-600'
 } border`}
 >
 <i className="fab fa-whatsapp"></i>WhatsApp
 </button>
 <button
 onClick={handleDownload}
 disabled={!selectedClient || (!generatedImage && !selectedSavedLook)}
 className={`flex-1 py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
 theme !== 'light'
 ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-white'
 : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
 } border`}
 >
 <i className="fas fa-download"></i>Download
 </button>
 </div>

 {/* Botao Report */}
 {generatedImage && !selectedSavedLook && (
 <button
 onClick={() => setShowReportModal(true)}
 className={`w-full py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all ${
 theme !== 'light'
 ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-400'
 : 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-600'
 } border`}
 >
 <i className="fas fa-flag"></i>Reportar Problema
 </button>
 )}

 {/* Botao voltar */}
 <button
 onClick={() => setCurrentStep(3)}
 className={`w-full py-2.5 text-sm ${
 theme !== 'light' ? 'text-neutral-500 hover:text-neutral-400' : 'text-gray-500 hover:text-gray-600'
 }`}
 >
 <i className="fas fa-arrow-left mr-2"></i>Voltar para o Look
 </button>
 </div>
 </div>
 </div>
 </div>
 );

 // ============================================================
 // RENDER PRINCIPAL
 // ============================================================

 return (
 <div
 className="flex-1 overflow-y-auto p-3 md:p-6"
 style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0.75rem))' }}
 >
 <div className="max-w-4xl mx-auto">
 {/* Header */}
 <div className="flex items-center justify-between mb-6">
 <div className="flex items-center gap-3">
 {onBack && (
 <button
 onClick={onBack}
 className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
 theme !== 'light'
 ? 'bg-white/10 backdrop-blur-xl border border-white/20 text-neutral-300 hover:text-white hover:bg-white/15 shadow-lg'
 : 'bg-white/60 backdrop-blur-xl border border-gray-200/60 text-gray-500 hover:text-gray-700 hover:bg-white/80 shadow-sm'
 }`}
 >
 <i className="fas fa-arrow-left text-sm"></i>
 </button>
 )}
 <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
 theme !== 'light'
 ? 'bg-white/10 border border-white/15 backdrop-blur-xl'
 : 'bg-white/60 border border-gray-200/60 shadow-sm backdrop-blur-xl'
 }`}>
 <i className={`fas fa-shirt text-lg ${theme !== 'light' ? 'text-neutral-200' : 'text-[#1A1A1A]'}`}></i>
 </div>
 <div>
 <h1 className={`text-xl font-extrabold ${theme !== 'light' ? 'text-white' : 'text-gray-900'}`}>
 Vizzu Provador<sup className="text-[10px] font-normal ml-0.5">®</sup>
 </h1>
 <p className={`${theme !== 'light' ? 'text-neutral-500' : 'text-gray-500'} text-sm font-serif italic`}>
 Vista seus clientes virtualmente
 </p>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <span className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 ${
 theme !== 'light'
 ? 'bg-neutral-900 border border-neutral-800 text-neutral-400'
 : 'bg-gray-100 border border-gray-200 text-gray-500'
 }`}>
 <i className="fas fa-coins text-[10px]"></i>
 {userCredits}
 </span>
 {(selectedClient || Object.keys(lookComposition).length > 0) && (
 <button
 onClick={handleReset}
 className={`p-2 rounded-lg text-sm transition-colors ${
 theme !== 'light'
 ? 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:bg-neutral-800 hover:text-white'
 : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
 }`}
 >
 <i className="fas fa-undo"></i>
 </button>
 )}
 </div>
 </div>

 {/* Step Indicators */}
 {renderStepIndicators()}

 {/* Conteudo do Step */}
 <div className="transition-all duration-300">
 {currentStep === 1 && renderStep1()}
 {currentStep === 2 && renderStep2()}
 {currentStep === 3 && renderStep3()}
 {currentStep === 4 && renderStep4()}
 </div>
 </div>

 {/* Modal de Loading Fullscreen */}
 {isGenerating && (
 <div className="fixed inset-0 z-50 flex items-center justify-center">
 {/* Backdrop com blur */}
 <div className={`absolute inset-0 backdrop-blur-2xl ${theme !== 'light' ? 'bg-black/80' : 'bg-white/30'}`}></div>

 {/* Container do conteudo */}
 <div className="relative z-10 flex flex-col items-center justify-center max-w-md mx-auto p-6">
 {/* Vizzu Motion */}
 <div className="w-64 h-64 mb-6 rounded-2xl overflow-hidden flex items-center justify-center">
 <img src="/Scene-1.gif" alt="" className="h-full object-cover" style={{ width: '140%', maxWidth: 'none' }} />
 </div>

 {/* Titulo */}
 <h2 className={`text-2xl font-bold font-serif mb-2 text-center ${theme !== 'light' ? 'text-white' : 'text-gray-900'}`}>
 Criando seu look...
 </h2>

 {/* Frase de loading dinamica */}
 <p className={`text-sm mb-6 text-center min-h-[20px] ${theme !== 'light' ? 'text-neutral-400' : 'text-gray-500'}`}>
 {loadingText}
 </p>

 {/* Barra de progresso */}
 <div className="w-full max-w-xs mb-4">
 <div className={`h-2 rounded-full overflow-hidden ${theme !== 'light' ? 'bg-neutral-800' : 'bg-gray-200'}`}>
 <div
 className="h-full bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] transition-all duration-300"
 style={{ width: `${Math.min(generationProgress, 100)}%` }}
 ></div>
 </div>
 <p className={`text-sm font-medium text-center mt-2 ${theme !== 'light' ? 'text-white' : 'text-gray-900'}`}>
 {Math.round(Math.min(generationProgress, 100))}%
 </p>
 </div>

 {/* Info do cliente */}
 {selectedClient && (
 <div className={`rounded-xl p-4 border mb-6 w-full max-w-xs ${theme !== 'light' ? 'bg-neutral-900/80 border-neutral-800' : 'bg-white/80 border-gray-200/60 shadow-sm'}`}>
 <div className="flex items-center gap-3">
 <OptimizedImage
 src={getClientPhoto(selectedClient) || ''}
 alt={selectedClient.firstName}
 className={`w-12 h-12 rounded-full border-2 ${theme !== 'light' ? 'border-white/20' : 'border-gray-200'}`}
 size="thumb"
 />
 <div className="flex-1 min-w-0">
 <p className={`text-sm font-medium truncate ${theme !== 'light' ? 'text-white' : 'text-gray-900'}`}>
 {selectedClient.firstName} {selectedClient.lastName}
 </p>
 <p className={`text-xs ${theme !== 'light' ? 'text-neutral-500' : 'text-gray-500'}`}>
 {Object.keys(lookComposition).length} peca(s) selecionada(s)
 </p>
 </div>
 </div>
 </div>
 )}

 {/* Botao Segundo Plano */}
 <button
 onClick={() => onContinueInBackground?.()}
 className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-colors ${theme !== 'light' ? 'bg-neutral-800 hover:bg-neutral-700 text-white' : 'bg-white/80 hover:bg-white border border-gray-200/60 text-gray-700 shadow-sm'}`}
 >
 <i className="fas fa-arrow-down-to-line"></i>
 <span>Continuar em segundo plano</span>
 </button>

 <p className="text-neutral-600 text-xs mt-2 text-center">
 Você será notificado quando terminar
 </p>

 {onCancelGeneration && (
 <button
   onClick={onCancelGeneration}
   className={`mt-3 text-xs transition-all ${theme !== 'light' ? 'text-neutral-600 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}
 >
   Cancelar geração
 </button>
 )}
 </div>
 </div>
 )}

 {/* Modal de confirmação 4K */}
 <Resolution4KConfirmModal
 isOpen={show4KConfirmModal}
 onConfirm={handleConfirm4K}
 onCancel={handleCancel4K}
 theme={theme}
 />

 {/* Modal de Report */}
 <ReportModal
 isOpen={showReportModal}
 onClose={() => setShowReportModal(false)}
 onSubmit={handleReportSubmit}
 generationType="provador"
 productName={selectedClient?.firstName || undefined}
 theme={theme}
 />

 {/* ONBOARDING TOUR */}
 {shouldShowTour('provador') && (
 <FeatureTour featureId="provador" stops={PROVADOR_TOUR_STOPS} theme={theme} />
 )}
 </div>
 );
};

export default VizzuProvadorWizard;

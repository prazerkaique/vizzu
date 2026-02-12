import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SavedModel, MODEL_OPTIONS } from '../types';
import { useUI } from '../contexts/UIContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';
import { generateModelImages } from '../lib/api/studio';
import { OptimizedImage } from '../components/OptimizedImage';
import { ModelGridSkeleton } from '../components/LoadingSkeleton';
import heic2any from 'heic2any';
import { compressImage } from '../utils/imageCompression';

// Componente de carrossel para cards de modelos
const ModelCardCarousel: React.FC<{
 images: { key: string; label: string; src: string }[];
 modelName: string;
 onCardClick: () => void;
}> = ({ images, modelName, onCardClick }) => {
 const [currentIndex, setCurrentIndex] = useState(0);

 const nextImage = (e: React.MouseEvent) => {
 e.stopPropagation();
 setCurrentIndex((prev) => (prev + 1) % images.length);
 };

 const prevImage = (e: React.MouseEvent) => {
 e.stopPropagation();
 setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
 };

 const goToImage = (index: number, e: React.MouseEvent) => {
 e.stopPropagation();
 setCurrentIndex(index);
 };

 return (
 <div className="relative w-full h-full" onClick={onCardClick}>
 {/* Imagem atual */}
 <OptimizedImage
 src={images[currentIndex].src}
 alt={`${modelName} - ${images[currentIndex].label}`}
 className="w-full h-full"
 imgStyle={images[currentIndex].key === 'face' ? { objectPosition: 'top' } : undefined}
 size="preview"
 />

 {/* Setas de navegação */}
 {images.length > 1 && (
 <>
 <button
 onClick={prevImage}
 className="absolute left-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
 >
 <i className="fas fa-chevron-left text-xs"></i>
 </button>
 <button
 onClick={nextImage}
 className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
 >
 <i className="fas fa-chevron-right text-xs"></i>
 </button>
 </>
 )}

 {/* Indicadores de navegação */}
 {images.length > 1 && (
 <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
 {images.map((img, index) => (
 <button
 key={img.key}
 onClick={(e) => goToImage(index, e)}
 className={`w-1.5 h-1.5 rounded-full transition-all ${
 index === currentIndex
 ? 'bg-white w-3'
 : 'bg-white/50 hover:bg-white/80'
 }`}
 title={img.label}
 />
 ))}
 </div>
 )}

 {/* Label da imagem atual */}
 <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/40 backdrop-blur-sm text-white text-[9px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
 {images[currentIndex].label}
 </div>
 </div>
 );
};

// Custo de criação de modelo IA
const MODEL_CREATION_COST = 2;

// 4 modelos pré-definidos gratuitos
export const DEFAULT_MODELS: SavedModel[] = [
  {
    id: 'default-woman-1', userId: 'system', name: 'Hana',
    gender: 'woman', ethnicity: 'asian', skinTone: 'light',
    bodyType: 'slim', ageRange: 'adult', height: 'short',
    hairColor: 'black', hairStyle: 'straight', eyeColor: 'brown',
    expression: 'neutral', bustSize: 'small', waistType: 'thin',
    images: {
      front: 'https://dbdqiqehuapcicejnzyd.supabase.co/storage/v1/object/public/products/models/314df8ec-687f-44d6-bc11-f00f0bab2bde/preview-1770052079801/front.jpg',
      back: 'https://dbdqiqehuapcicejnzyd.supabase.co/storage/v1/object/public/products/models/314df8ec-687f-44d6-bc11-f00f0bab2bde/preview-1770052079801/back.jpg',
    },
    status: 'ready', createdAt: '2026-02-02',
  },
  {
    id: 'default-woman-2', userId: 'system', name: 'Sara',
    gender: 'woman', ethnicity: 'brazilian', skinTone: 'dark',
    bodyType: 'plus', ageRange: 'young', height: 'medium',
    hairColor: 'brown', hairStyle: 'curly', eyeColor: 'brown',
    expression: 'natural-smile', bustSize: 'large', waistType: 'wide',
    images: {
      front: 'https://dbdqiqehuapcicejnzyd.supabase.co/storage/v1/object/public/products/models/314df8ec-687f-44d6-bc11-f00f0bab2bde/preview-1770057178621/front.jpg',
      back: 'https://dbdqiqehuapcicejnzyd.supabase.co/storage/v1/object/public/products/models/314df8ec-687f-44d6-bc11-f00f0bab2bde/preview-1770057178621/back.jpg',
    },
    status: 'ready', createdAt: '2026-02-02',
  },
  {
    id: 'default-man-1', userId: 'system', name: 'Rafael',
    gender: 'man', ethnicity: 'brazilian', skinTone: 'light',
    bodyType: 'athletic', ageRange: 'adult', height: 'tall',
    hairColor: 'blonde', hairStyle: 'straight', eyeColor: 'blue',
    expression: 'confident',
    images: {
      front: 'https://dbdqiqehuapcicejnzyd.supabase.co/storage/v1/object/public/products/models/314df8ec-687f-44d6-bc11-f00f0bab2bde/preview-1770057349382/front.jpg',
      back: 'https://dbdqiqehuapcicejnzyd.supabase.co/storage/v1/object/public/products/models/314df8ec-687f-44d6-bc11-f00f0bab2bde/preview-1770057349382/back.jpg',
    },
    status: 'ready', createdAt: '2026-02-02',
  },
  {
    id: 'default-man-2', userId: 'system', name: 'Jamal',
    gender: 'man', ethnicity: 'brazilian', skinTone: 'dark',
    bodyType: 'average', ageRange: 'mature', height: 'medium',
    hairColor: 'brown', hairStyle: 'straight', eyeColor: 'black',
    expression: 'neutral',
    images: {
      front: 'https://dbdqiqehuapcicejnzyd.supabase.co/storage/v1/object/public/products/models/314df8ec-687f-44d6-bc11-f00f0bab2bde/preview-1770054106688/front.jpg',
      back: 'https://dbdqiqehuapcicejnzyd.supabase.co/storage/v1/object/public/products/models/314df8ec-687f-44d6-bc11-f00f0bab2bde/preview-1770054106688/back.jpg',
    },
    status: 'ready', createdAt: '2026-02-02',
  },
  {
    id: 'default-woman-3', userId: 'system', name: 'Amanda',
    gender: 'woman', ethnicity: 'brazilian', skinTone: 'tan',
    bodyType: 'average', ageRange: 'adult', height: 'medium',
    hairColor: 'black', hairStyle: 'straight', eyeColor: 'brown',
    expression: 'neutral', bustSize: 'medium', waistType: 'thin',
    images: {
      front: 'https://dbdqiqehuapcicejnzyd.supabase.co/storage/v1/object/public/products/models/314df8ec-687f-44d6-bc11-f00f0bab2bde/preview-1770814004742/front.jpeg',
      back: 'https://dbdqiqehuapcicejnzyd.supabase.co/storage/v1/object/public/products/models/314df8ec-687f-44d6-bc11-f00f0bab2bde/preview-1770814004742/back.jpeg',
    },
    status: 'ready', createdAt: '2026-02-11',
  },
];

interface ModelsPageProps {
 savedModels: SavedModel[];
 setSavedModels: React.Dispatch<React.SetStateAction<SavedModel[]>>;
 showCreateModel: boolean;
 setShowCreateModel: (v: boolean) => void;
 userCredits?: number;
 onDeductCredits?: (amount: number, reason: string) => boolean;
 onModelCreated?: (modelId: string) => void;
}

export const ModelsPage: React.FC<ModelsPageProps> = ({
 savedModels,
 setSavedModels,
 showCreateModel,
 setShowCreateModel,
 userCredits = 0,
 onDeductCredits,
 onModelCreated,
}) => {
 // Combinar modelos default + do usuário
 const allModels = [...DEFAULT_MODELS, ...savedModels];
 const isDefaultModel = (id: string) => id.startsWith('default-');
 const { theme, navigateTo, showToast } = useUI();
 const { user } = useAuth();

 // Model states
 const [showModelDetail, setShowModelDetail] = useState<SavedModel | null>(null);
 const [editingModel, setEditingModel] = useState<SavedModel | null>(null);
 const [renamingModel, setRenamingModel] = useState<SavedModel | null>(null);
 const [renameValue, setRenameValue] = useState('');
 const [savingRename, setSavingRename] = useState(false);
 const [modelWizardStep, setModelWizardStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
 const [newModel, setNewModel] = useState({
 modelType: null as 'ai' | 'real' | null,
 name: '',
 gender: 'woman' as 'woman' | 'man',
 ethnicity: 'brazilian',
 skinTone: 'medium',
 bodyType: 'average',
 ageRange: 'adult',
 height: 'medium',
 hairColor: 'brown',
 hairStyle: 'straight',
 hairLength: 'medium',
 eyeColor: 'brown',
 expression: 'natural-smile',
 bustSize: 'medium',
 waistType: 'medium',
 referenceImage: null as string | null,
 physicalNotes: '',
 hairNotes: '',
 skinNotes: '',
 });
 const [realModelPhotos, setRealModelPhotos] = useState<{ front: string | null; back: string | null; face: string | null }>({ front: null, back: null, face: null });
 const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
 const [savingModel, setSavingModel] = useState(false);
 const [generatingModelImages, setGeneratingModelImages] = useState(false);
 const [modelGenerationProgress, setModelGenerationProgress] = useState(0);
 const [modelGenerationStep, setModelGenerationStep] = useState<'front' | 'back' | 'done'>('front');
 const [modelPreviewImages, setModelPreviewImages] = useState<{ front?: string; back?: string } | null>(null);
 const [showCreateDropdown, setShowCreateDropdown] = useState(false);

 // Filtros da página de Modelos
 const [modelFilterGender, setModelFilterGender] = useState<string>('');
 const [modelFilterSkinTone, setModelFilterSkinTone] = useState<string>('');
 const [modelFilterAge, setModelFilterAge] = useState<string>('');
 const [modelFilterBodyType, setModelFilterBodyType] = useState<string>('');
 const [modelFilterSearch, setModelFilterSearch] = useState<string>('');
 const [pendingModelBanner, setPendingModelBanner] = useState<string | null>(null);

 // Fix 8: state para confirmação de delete
 const [showDeleteModelConfirm, setShowDeleteModelConfirm] = useState(false);
 const [deleteModelTarget, setDeleteModelTarget] = useState<SavedModel | null>(null);

 // Fix 10: loading state
 const [isLoadingModels, setIsLoadingModels] = useState(true);


 // Quando showCreateModel muda para true (de fora, ex: LookComposer), reset wizard
 useEffect(() => {
 if (showCreateModel && !editingModel) {
 resetModelWizard();
 }
 }, [showCreateModel]);

 // Fechar modais com Esc
 useEffect(() => {
 const handleEsc = (e: KeyboardEvent) => {
 if (e.key === 'Escape') {
 if (renamingModel) setRenamingModel(null);
 else if (showCreateModel) { setShowCreateModel(false); setEditingModel(null); }
 else if (showModelDetail) setShowModelDetail(null);
 }
 };
 window.addEventListener('keydown', handleEsc);
 return () => window.removeEventListener('keydown', handleEsc);
 }, [showCreateModel, showModelDetail]);

 // ═══════════════════════════════════════════════════════════════
 // SAVED MODELS - Funções para gerenciar modelos salvos
 // ═══════════════════════════════════════════════════════════════

 const loadSavedModels = async () => {
 if (!user) return;
 try {
 const { data, error } = await supabase
 .from('saved_models')
 .select('*')
 .eq('user_id', user.id)
 .order('created_at', { ascending: false });

 if (error) throw error;

 const models: SavedModel[] = (data || []).map(m => ({
 id: m.id,
 userId: m.user_id,
 name: m.name,
 gender: m.gender,
 modelType: (m.model_type as 'ai' | 'real') || 'ai',
 ethnicity: m.ethnicity,
 skinTone: m.skin_tone,
 bodyType: m.body_type,
 ageRange: m.age_range,
 height: m.height,
 hairColor: m.hair_color,
 hairStyle: m.hair_style,
 eyeColor: m.eye_color,
 expression: m.expression,
 bustSize: m.bust_size,
 waistType: m.waist_type,
 physicalNotes: m.physical_notes || undefined,
 hairNotes: m.hair_notes || undefined,
 skinNotes: m.skin_notes || undefined,
 referenceImageUrl: m.reference_image_url,
 referenceStoragePath: m.reference_storage_path,
 images: typeof m.images === 'string' ? JSON.parse(m.images) : (m.images || {}),
 status: m.status,
 createdAt: m.created_at,
 updatedAt: m.updated_at,
 }));

 setSavedModels(models);
 } catch (error) {
 console.error('Erro ao carregar modelos:', error);
 showToast('Erro ao carregar modelos', 'error');
 } finally {
 setIsLoadingModels(false);
 }
 };

 // Carregar modelos ao autenticar
 useEffect(() => {
 if (user) {
 setIsLoadingModels(true);
 loadSavedModels();
 }
 }, [user?.id]);

 // Desligar loading após 3s (evitar skeleton eterno se sem modelos)
 useEffect(() => {
 const t = setTimeout(() => setIsLoadingModels(false), 3000);
 return () => clearTimeout(t);
 }, []);

 // Verificar se há geração pendente (F5 / saiu da página)
 useEffect(() => {
 if (!user) return;
 const pending = localStorage.getItem('vizzu_pending_model');
 if (!pending) return;
 try {
 const data = JSON.parse(pending);
 // Se passou mais de 5 minutos, descartar
 if (Date.now() - data.startTime > 300000) {
 localStorage.removeItem('vizzu_pending_model');
 return;
 }
 setPendingModelBanner(data.modelName || 'Modelo');
 // Polling: verificar se o modelo ficou ready no Supabase
 const pollInterval = setInterval(async () => {
 try {
 const { data: model } = await supabase
 .from('saved_models')
 .select('status')
 .eq('id', data.modelId)
 .single();
 if (model?.status === 'ready') {
 clearInterval(pollInterval);
 localStorage.removeItem('vizzu_pending_model');
 setPendingModelBanner(null);
 await loadSavedModels();
 }
 } catch (e) { /* silencioso */ }
 }, 5000);
 // Limpar após 5 minutos
 const timeout = setTimeout(() => {
 clearInterval(pollInterval);
 localStorage.removeItem('vizzu_pending_model');
 setPendingModelBanner(null);
 }, 300000);
 return () => { clearInterval(pollInterval); clearTimeout(timeout); };
 } catch (e) { localStorage.removeItem('vizzu_pending_model'); }
 }, [user?.id]);

 const getModelLimit = () => {
 const plan = user?.plan || 'free';
 return plan === 'free' ? 1 : 10;
 };

 const canCreateModel = () => {
 return savedModels.length < getModelLimit();
 };

 const resetModelWizard = () => {
 setModelWizardStep(1);
 setNewModel({
 modelType: null,
 name: '',
 gender: 'woman',
 ethnicity: 'brazilian',
 skinTone: 'medium',
 bodyType: 'average',
 ageRange: 'adult',
 height: 'medium',
 hairColor: 'brown',
 hairStyle: 'straight',
 hairLength: 'medium',
 eyeColor: 'brown',
 expression: 'natural-smile',
 bustSize: 'medium',
 waistType: 'medium',
 referenceImage: null,
 physicalNotes: '',
 hairNotes: '',
 skinNotes: '',
 });
 setRealModelPhotos({ front: null, back: null, face: null });
 setUploadingPhoto(null);
 setEditingModel(null);
 setModelPreviewImages(null);
 setGeneratingModelImages(false);
 };

 // Processa arquivo de imagem (HEIC→PNG + compressão)
 const processImageFile = async (file: File): Promise<string> => {
 let processedFile: File | Blob = file;
 if (file.type === 'image/heic' || file.type === 'image/heif' ||
   file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
   const convertedBlob = await heic2any({ blob: file, toType: 'image/png', quality: 0.9 });
   processedFile = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
 }
 const result = await compressImage(processedFile);
 return result.base64;
 };

 const generateModelPrompt = () => {
 const translations: Record<string, Record<string, string>> = {
 gender: { 'woman': 'woman', 'man': 'man' },
 ethnicity: {
 'caucasian': 'Caucasian', 'latino': 'Latino/Hispanic', 'black': 'Black/African',
 'asian': 'East Asian', 'indian': 'South Asian/Indian', 'middle-eastern': 'Middle Eastern', 'mixed': 'Mixed race'
 },
 skinTone: {
 'very-light': 'very fair/porcelain', 'light': 'fair', 'medium-light': 'light olive',
 'medium': 'medium/olive', 'medium-dark': 'tan', 'dark': 'brown', 'very-dark': 'deep brown/ebony'
 },
 bodyType: { 'slim': 'slim/slender', 'athletic': 'athletic/toned', 'average': 'average', 'curvy': 'curvy', 'plus': 'plus size' },
 ageRange: {
 'child': '3-12 years old child', 'teen': '13-19 years old teenager',
 'young': '20-25 years old young adult', 'adult': '25-35 years old adult', 'mature': '35-50 years old mature adult',
 'senior': '50-60 years old senior', 'elderly': '60+ years old elderly'
 },
 height: { 'very-short': 'petite', 'short': 'below average height', 'medium': 'average height', 'tall': 'tall', 'very-tall': 'very tall' },
 hairColor: {
 'black': 'jet black', 'dark-brown': 'dark brown', 'brown': 'brown', 'light-brown': 'light brown/chestnut',
 'blonde': 'blonde', 'platinum': 'platinum blonde', 'red': 'red/auburn', 'gray': 'gray/silver', 'white': 'white'
 },
 hairStyle: { 'straight': 'straight', 'wavy': 'wavy', 'curly': 'curly', 'coily': 'coily/kinky', 'braided': 'braided' },
 hairLength: { 'bald': 'bald/shaved', 'very-short': 'buzz cut', 'short': 'short', 'medium': 'medium length', 'long': 'long', 'very-long': 'very long' },
 eyeColor: { 'black': 'dark brown/black', 'dark-brown': 'dark brown', 'brown': 'brown', 'hazel': 'hazel', 'green': 'green', 'blue': 'blue', 'gray': 'gray' },
 expression: { 'neutral': 'neutral/relaxed', 'smile': 'gentle smile', 'serious': 'serious/confident', 'happy': 'happy/joyful', 'professional': 'professional/poised' },
 bustSize: { 'small': 'small bust', 'medium': 'medium bust', 'large': 'large bust' },
 waistType: { 'defined': 'defined waist', 'straight': 'straight torso', 'hourglass': 'hourglass figure' }
 };

 const t = (cat: string, val: string) => translations[cat]?.[val] || val;

 const subject = `${t('ageRange', newModel.ageRange)} ${t('ethnicity', newModel.ethnicity)} ${t('gender', newModel.gender)}, ${t('skinTone', newModel.skinTone)} skin, ${t('bodyType', newModel.bodyType)} body type, ${t('height', newModel.height)}`;

 const hairLen = newModel.hairLength || 'medium';
 const hair = hairLen === 'bald' ? 'bald/shaved head' : `${t('hairColor', newModel.hairColor)} ${t('hairLength', hairLen)} ${t('hairStyle', newModel.hairStyle)} hair`;

 const face = `${t('eyeColor', newModel.eyeColor)} eyes, ${t('expression', newModel.expression)} expression`;

 const bodyParts = [];
 if (newModel.ageRange !== 'child') {
 if (newModel.gender === 'woman' && newModel.bustSize) bodyParts.push(t('bustSize', newModel.bustSize));
 if (newModel.waistType) bodyParts.push(t('waistType', newModel.waistType));
 }
 const bodySpecifics = bodyParts.join(', ');

 let prompt = `${subject}. ${hair}. ${face}`;
 if (bodySpecifics) prompt += `. ${bodySpecifics}`;

 const notes = [];
 if (newModel.physicalNotes) notes.push(`Physical: ${newModel.physicalNotes}`);
 if (newModel.hairNotes) notes.push(`Face & Hair: ${newModel.hairNotes}`);
 if (newModel.skinNotes) notes.push(`Skin: ${newModel.skinNotes}`);
 if (notes.length > 0) prompt += `\n\n${notes.join('. ')}`;

 prompt += '\n\n📸 Configurações fixas:\n';
 prompt += '• Fundo: cinza neutro (#B0B0B0)\n';
 prompt += '• Roupa: camiseta branca com logo Vizzu + jeans azul\n';
 prompt += '• Iluminação: estúdio profissional\n';
 prompt += '• Câmera: Canon EOS R5, 85mm f/1.4';

 return prompt;
 };

 const generateModelPreview = async () => {
 if (!user || !newModel.name.trim()) return;

 // Verificar e debitar créditos (2 créditos para criar modelo)
 if (onDeductCredits) {
 const success = onDeductCredits(MODEL_CREATION_COST, 'Criar Modelo IA');
 if (!success) {
 showToast('Créditos insuficientes. Você precisa de 2 créditos para criar um modelo.', 'error');
 return;
 }
 }

 setGeneratingModelImages(true);
 setModelPreviewImages(null);
 setModelGenerationProgress(0);
 setModelGenerationStep('front');

 const modelId = 'preview-' + Date.now();

 // Salvar no localStorage para sobreviver F5
 localStorage.setItem('vizzu_pending_model', JSON.stringify({
 modelId,
 modelName: newModel.name.trim(),
 startTime: Date.now(),
 }));

 // Progress linear: 100 segundos para chegar a 95%
 const totalDuration = 100; // segundos
 let elapsed = 0;
 const progressInterval = setInterval(() => {
 elapsed++;
 const progress = Math.min(Math.round((elapsed / totalDuration) * 95), 95);
 if (elapsed < totalDuration * 0.45) {
 setModelGenerationStep('front');
 } else {
 setModelGenerationStep('back');
 }
 setModelGenerationProgress(progress);
 if (progress >= 95) clearInterval(progressInterval);
 }, 1000);

 try {
 const result = await generateModelImages({
 modelId,
 userId: user.id,
 modelProfile: {
 name: newModel.name.trim(),
 gender: newModel.gender,
 ethnicity: newModel.ethnicity,
 skinTone: newModel.skinTone,
 bodyType: newModel.bodyType,
 ageRange: newModel.ageRange,
 height: newModel.height,
 hairColor: newModel.hairColor,
 hairStyle: newModel.hairStyle,
 hairLength: newModel.hairLength,
 eyeColor: newModel.eyeColor,
 expression: newModel.expression,
 bustSize: newModel.gender === 'woman' && newModel.ageRange !== 'child' ? newModel.bustSize : undefined,
 waistType: newModel.ageRange !== 'child' ? newModel.waistType : undefined,
 physicalNotes: newModel.physicalNotes || undefined,
 hairNotes: newModel.hairNotes || undefined,
 skinNotes: newModel.skinNotes || undefined,
 },
 prompt: generateModelPrompt(),
 });

 clearInterval(progressInterval);
 setModelGenerationProgress(100);
 setModelGenerationStep('done');
 localStorage.removeItem('vizzu_pending_model');

 if (result.success && result.model?.images) {
 setModelPreviewImages(result.model.images);
 } else {
 throw new Error(result.error || 'Erro ao gerar preview');
 }
 } catch (error) {
 clearInterval(progressInterval);
 localStorage.removeItem('vizzu_pending_model');
 console.error('Erro ao gerar preview:', error);
 showToast('Erro ao gerar preview do modelo. Tente novamente.', 'error');
 } finally {
 setGeneratingModelImages(false);
 }
 };

 const saveModel = async () => {
 if (!user || !newModel.name.trim()) return null;

 setSavingModel(true);
 try {
 const hasPreview = modelPreviewImages && (modelPreviewImages.front || modelPreviewImages.back);

 const modelData = {
 user_id: user.id,
 name: newModel.name.trim(),
 model_type: 'ai',
 gender: newModel.gender,
 ethnicity: newModel.ethnicity,
 skin_tone: newModel.skinTone,
 body_type: newModel.bodyType,
 age_range: newModel.ageRange,
 height: newModel.height,
 hair_color: newModel.hairColor,
 hair_style: newModel.hairStyle,
 eye_color: newModel.eyeColor,
 expression: newModel.expression,
 bust_size: newModel.gender === 'woman' && newModel.ageRange !== 'child' ? newModel.bustSize : null,
 waist_type: newModel.ageRange !== 'child' ? newModel.waistType : null,
 physical_notes: newModel.physicalNotes || null,
 hair_notes: newModel.hairNotes || null,
 skin_notes: newModel.skinNotes || null,
 reference_image_url: newModel.referenceImage,
 status: hasPreview ? 'ready' : 'draft',
 images: hasPreview ? modelPreviewImages : {},
 };

 let result;
 if (editingModel) {
 const { data, error } = await supabase
 .from('saved_models')
 .update(modelData)
 .eq('id', editingModel.id)
 .eq('user_id', user.id)
 .select()
 .single();

 if (error) throw error;
 result = data;
 } else {
 const { data, error } = await supabase
 .from('saved_models')
 .insert(modelData)
 .select()
 .single();

 if (error) throw error;
 result = data;
 }

 await loadSavedModels();
 setShowCreateModel(false);
 resetModelWizard();
 onModelCreated?.(result.id);

 return result;
 } catch (error) {
 console.error('Erro ao salvar modelo:', error);
 showToast('Erro ao salvar modelo. Tente novamente.', 'error');
 return null;
 } finally {
 setSavingModel(false);
 }
 };

 const saveRealModel = async () => {
 if (!user || !newModel.name.trim() || !realModelPhotos.front) return null;

 setSavingModel(true);
 try {
   const modelId = crypto.randomUUID();
   const uploadedImages: { front?: string; back?: string; face?: string } = {};

   for (const type of ['front', 'back', 'face'] as const) {
     const base64 = realModelPhotos[type];
     if (!base64) continue;

     const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
     const byteCharacters = atob(base64Data);
     const byteNumbers = new Array(byteCharacters.length);
     for (let i = 0; i < byteCharacters.length; i++) {
       byteNumbers[i] = byteCharacters.charCodeAt(i);
     }
     const byteArray = new Uint8Array(byteNumbers);
     const mimeType = base64.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';
     const extension = mimeType.split('/')[1] === 'webp' ? 'webp' : mimeType.split('/')[1] === 'png' ? 'png' : 'jpg';
     const blob = new Blob([byteArray], { type: mimeType });

     const storagePath = `models/${user.id}/${modelId}/${type}.${extension}`;
     const { error: uploadError } = await supabase.storage
       .from('products')
       .upload(storagePath, blob, { upsert: true });

     if (uploadError) throw uploadError;

     const { data: urlData } = supabase.storage.from('products').getPublicUrl(storagePath);
     uploadedImages[type] = urlData.publicUrl;
   }

   const modelData = {
     id: modelId,
     user_id: user.id,
     name: newModel.name.trim(),
     model_type: 'real',
     gender: newModel.gender,
     ethnicity: 'other',
     skin_tone: 'medium',
     body_type: 'average',
     age_range: 'adult',
     height: 'medium',
     hair_color: 'brown',
     hair_style: 'straight',
     eye_color: 'brown',
     expression: 'neutral',
     status: 'ready',
     images: uploadedImages,
     reference_image_url: uploadedImages.front || null,
   };

   const { data, error } = await supabase
     .from('saved_models')
     .insert(modelData)
     .select()
     .single();

   if (error) throw error;

   await loadSavedModels();
   setShowCreateModel(false);
   resetModelWizard();
   showToast(`Modelo "${newModel.name}" criado com sucesso!`, 'success');
   onModelCreated?.(data.id);
   return data;
 } catch (error) {
   console.error('Erro ao salvar modelo real:', error);
   showToast('Erro ao salvar modelo. Tente novamente.', 'error');
   return null;
 } finally {
   setSavingModel(false);
 }
 };

 const deleteModel = useCallback(async (model: SavedModel) => {
 if (!user) return;

 // 1. Esconder otimisticamente
 setSavedModels(prev => prev.filter(m => m.id !== model.id));
 if (showModelDetail?.id === model.id) setShowModelDetail(null);

 // 2. Deletar imediatamente no banco
 try {
  const { error } = await supabase.from('saved_models').delete().eq('id', model.id).eq('user_id', user.id);
  if (error) throw error;
 } catch (error) {
  console.error('Erro ao deletar modelo:', error);
  showToast('Erro ao deletar modelo', 'error');
  loadSavedModels();
  return;
 }

 // 3. Toast com Desfazer (re-insere se clicado)
 showToast(`"${model.name}" excluído`, 'success', {
 label: 'Desfazer',
 onClick: async () => {
  try {
   const { error } = await supabase.from('saved_models').insert({
    id: model.id,
    user_id: user.id,
    name: model.name,
    model_type: model.modelType || 'ai',
    gender: model.gender,
    ethnicity: model.ethnicity,
    skin_tone: model.skinTone,
    body_type: model.bodyType,
    age_range: model.ageRange,
    height: model.height,
    hair_color: model.hairColor,
    hair_style: model.hairStyle,
    eye_color: model.eyeColor,
    expression: model.expression,
    bust_size: model.bustSize || null,
    waist_type: model.waistType || null,
    physical_notes: model.physicalNotes || null,
    hair_notes: model.hairNotes || null,
    skin_notes: model.skinNotes || null,
    reference_image_url: model.referenceImageUrl || null,
    reference_storage_path: model.referenceStoragePath || null,
    status: model.status,
    images: model.images || {},
   });
   if (error) throw error;
   setSavedModels(prev => [...prev, model].sort((a, b) =>
    new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
   ));
  } catch (e) {
   console.error('Erro ao restaurar modelo:', e);
   showToast('Erro ao desfazer exclusão', 'error');
  }
 }
 });
 }, [user, showModelDetail, showToast]);

 const getModelLabel = (field: keyof typeof MODEL_OPTIONS, id: string) => {
 const options = MODEL_OPTIONS[field] as { id: string; label: string }[];
 return options?.find(o => o.id === id)?.label || id;
 };

 // Fix 18: filtro extraído em useMemo (evita duplicação)
 const filterModel = useCallback((model: SavedModel) => {
 if (modelFilterSearch && !model.name.toLowerCase().includes(modelFilterSearch.toLowerCase())) return false;
 if (modelFilterGender && model.gender !== modelFilterGender) return false;
 if (modelFilterSkinTone && model.skinTone !== modelFilterSkinTone) return false;
 if (modelFilterAge && model.ageRange !== modelFilterAge) return false;
 if (modelFilterBodyType && model.bodyType !== modelFilterBodyType) return false;
 return true;
 }, [modelFilterSearch, modelFilterGender, modelFilterSkinTone, modelFilterAge, modelFilterBodyType]);

 // Fix 17: separar default e user models filtrados
 const filteredDefaultModels = useMemo(() => DEFAULT_MODELS.filter(filterModel), [filterModel]);
 const filteredUserModels = useMemo(() => savedModels.filter(filterModel), [savedModels, filterModel]);

 // Fix 9 + render card extraído para reusar em ambas seções
 const renderModelCard = useCallback((model: SavedModel) => {
 const images = [
  ...(model.images?.front ? [{ key: 'front', label: 'Frente', src: model.images.front }] : []),
  ...(model.images?.back ? [{ key: 'back', label: 'Costas', src: model.images.back }] : []),
 ];
 return (
  <div
  key={model.id}
  onClick={() => setShowModelDetail(model)}
  className={'rounded-2xl overflow-hidden cursor-pointer transition-all hover:scale-[1.02] group ' + (theme === 'dark' ? 'bg-neutral-900 border border-neutral-800 hover:border-neutral-500' : 'bg-white border border-gray-100 ')}
  >
  <div className={'relative aspect-[3/4] flex items-center justify-center ' + (theme === 'dark' ? 'bg-neutral-800' : 'bg-gradient-to-br from-[#FF6B6B]/5 to-[#FF9F43]/5')}>
  {images.length > 0 ? (
   <ModelCardCarousel images={images} modelName={model.name} onCardClick={() => setShowModelDetail(model)} />
  ) : (
   <div className="text-center">
   <div className={'w-20 h-20 rounded-full mx-auto flex items-center justify-center ' + (model.gender === 'woman' ? 'bg-gradient-to-br from-[#FF6B6B] to-[#FF9F43]' : 'bg-gradient-to-br from-blue-400 to-indigo-500')}>
    <i className="fas fa-user text-3xl text-white"></i>
   </div>
   <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-400') + ' text-xs mt-3'}>
    {model.status === 'generating' ? 'Gerando imagens...' : model.status === 'error' ? 'Erro na geração' : 'Clique para ver'}
   </p>
   </div>
  )}
  {model.status === 'generating' && (
   <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
   <div className="w-16 h-16 rounded-xl overflow-hidden flex items-center justify-center">
    <img src="/Scene-1.gif" alt="" className="h-full object-cover" style={{ width: '140%', maxWidth: 'none' }} />
   </div>
   </div>
  )}
  <div className={'absolute top-2 right-2 px-2 py-0.5 rounded-full text-[8px] font-bold tracking-wide uppercase ' + (
   model.status === 'ready' ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white' :
   model.status === 'generating' ? 'bg-amber-500 text-white' :
   model.status === 'error' ? 'bg-red-500 text-white' :
   'bg-neutral-600 text-white'
  )}>
   {model.status === 'ready' ? 'Pronto' : model.status === 'generating' ? 'Gerando...' : model.status === 'error' ? 'Erro' : 'Rascunho'}
  </div>
  {isDefaultModel(model.id) ? (
   <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[8px] font-bold tracking-wide uppercase bg-white/90 text-[#FF6B6B]">Padrão</div>
  ) : model.modelType === 'real' ? (
   <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[8px] font-bold tracking-wide uppercase bg-blue-500/90 text-white"><i className="fas fa-camera mr-0.5 text-[6px]"></i> Real</div>
  ) : (
   <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[8px] font-bold tracking-wide uppercase bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white"><i className="fas fa-wand-magic-sparkles mr-0.5 text-[6px]"></i> IA</div>
  )}
  </div>
  <div className="p-3">
  <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-semibold text-sm mb-1.5 truncate'} title={model.name}>{model.name}</h3>
  <div className="flex flex-wrap gap-1">
   <span className={(theme === 'dark' ? 'bg-neutral-800 text-neutral-400' : 'bg-gray-100 text-gray-600') + ' px-1.5 py-0.5 rounded text-[9px]'}>{getModelLabel('gender', model.gender)}</span>
   {model.modelType !== 'real' && (
   <>
   <span className={(theme === 'dark' ? 'bg-neutral-800 text-neutral-400' : 'bg-gray-100 text-gray-600') + ' px-1.5 py-0.5 rounded text-[9px]'}>{getModelLabel('skinTone', model.skinTone)}</span>
   <span className={(theme === 'dark' ? 'bg-neutral-800 text-neutral-400' : 'bg-gray-100 text-gray-600') + ' px-1.5 py-0.5 rounded text-[9px]'}>{getModelLabel('ageRange', model.ageRange)}</span>
   </>
   )}
  </div>
  </div>
  </div>
 );
 }, [theme, getModelLabel]);

 return (
 <>
 {/* MODELS GRID */}
 <div className="flex-1 overflow-y-auto p-4 md:p-6">
 <div className="max-w-7xl mx-auto">
 {/* Header */}
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-3">
 <div className={'w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-xl ' + (theme === 'dark' ? 'bg-white/10 border border-white/15' : 'bg-white/60 border border-gray-200/60 shadow-sm')}>
 <i className={'fas fa-user-tie text-sm ' + (theme === 'dark' ? 'text-neutral-200' : 'text-[#1A1A1A]')}></i>
 </div>
 <div>
 <h1 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-extrabold'}>Modelos Salvos</h1>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs font-serif italic'}>Crie e gerencie seus modelos de IA</p>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>
 {savedModels.length}/{getModelLimit()} modelos
 {!canCreateModel() && <span className="text-red-400 ml-1">(limite atingido)</span>}
 </span>
 <button
 onClick={() => { resetModelWizard(); setShowCreateModel(true); }}
 disabled={!canCreateModel()}
 title={!canCreateModel() ? `Limite de ${getModelLimit()} modelos atingido` : 'Criar novo modelo'}
 className={'px-3 py-2 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-lg font-medium text-xs transition-opacity ' + (!canCreateModel() ? 'opacity-50 cursor-not-allowed' : '')}
 >
 <i className="fas fa-plus mr-1.5"></i>Novo Modelo
 </button>
 </div>
 </div>

 {/* Filtros */}
 <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 ') + ' rounded-xl border p-3 mb-4'}>
 <div className="flex flex-wrap gap-2">
 {/* Busca */}
 <div className="flex-shrink-0 w-40">
 <div className="relative">
 <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px]'}></i>
 <input
 type="text"
 placeholder="Buscar..."
 value={modelFilterSearch}
 onChange={(e) => setModelFilterSearch(e.target.value)}
 className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400') + ' w-full pl-7 pr-2 py-1.5 border rounded-lg text-xs'}
 />
 </div>
 </div>
 {/* Gênero */}
 <select
 value={modelFilterGender}
 onChange={(e) => setModelFilterGender(e.target.value)}
 className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' px-2 py-1.5 border rounded-lg text-xs'}
 >
 <option value="">Gênero</option>
 <option value="woman">Feminino</option>
 <option value="man">Masculino</option>
 </select>
 {/* Tom de Pele */}
 <select
 value={modelFilterSkinTone}
 onChange={(e) => setModelFilterSkinTone(e.target.value)}
 className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' px-2 py-1.5 border rounded-lg text-xs'}
 >
 <option value="">Tom de Pele</option>
 {MODEL_OPTIONS.skinTone.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
 </select>
 {/* Idade */}
 <select
 value={modelFilterAge}
 onChange={(e) => setModelFilterAge(e.target.value)}
 className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' px-2 py-1.5 border rounded-lg text-xs'}
 >
 <option value="">Idade</option>
 {MODEL_OPTIONS.ageRange.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
 </select>
 {/* Tipo Físico */}
 <select
 value={modelFilterBodyType}
 onChange={(e) => setModelFilterBodyType(e.target.value)}
 className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' px-2 py-1.5 border rounded-lg text-xs'}
 >
 <option value="">Tipo Físico</option>
 {MODEL_OPTIONS.bodyType.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
 </select>
 {/* Limpar filtros */}
 {(modelFilterSearch || modelFilterGender || modelFilterSkinTone || modelFilterAge || modelFilterBodyType) && (
 <button
 onClick={() => {
 setModelFilterSearch('');
 setModelFilterGender('');
 setModelFilterSkinTone('');
 setModelFilterAge('');
 setModelFilterBodyType('');
 }}
 className={(theme === 'dark' ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-gray-700') + ' px-2 py-1.5 text-xs transition-colors'}
 >
 <i className="fas fa-times mr-1"></i>Limpar
 </button>
 )}
 </div>
 </div>

 {/* Loading skeleton */}
 {isLoadingModels && savedModels.length === 0 ? (
 <ModelGridSkeleton theme={theme} count={8} />
 ) : allModels.length === 0 ? (
 <div className={'rounded-2xl p-12 text-center ' + (theme === 'dark' ? 'bg-neutral-900 border border-neutral-800' : 'bg-white border border-gray-100 ')}>
 <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-r from-[#FF6B6B]/10 to-[#FF9F43]/10 flex items-center justify-center">
 <i className="fas fa-user-tie text-3xl text-[#FF6B6B]"></i>
 </div>
 <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold mb-2 font-serif'}>Nenhum modelo criado</h3>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-sm mb-6 max-w-md mx-auto'}>
 Crie modelos personalizados para usar no Vizzu Studio. Defina características como gênero, etnia, tipo de corpo e muito mais.
 </p>
 <button
 onClick={() => { resetModelWizard(); setShowCreateModel(true); }}
 className="px-4 py-2.5 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-lg font-medium text-sm"
 >
 <i className="fas fa-plus mr-2"></i>Criar Primeiro Modelo
 </button>
 </div>
 ) : (
 <>
 {/* Banner de geração pendente */}
 {pendingModelBanner && (
 <div className={(theme === 'dark' ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-700') + ' border rounded-xl p-4 mb-4 flex items-center gap-3'}>
 <div className="animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full flex-shrink-0"></div>
 <div>
 <p className="font-medium text-sm">Modelo "{pendingModelBanner}" está sendo gerado</p>
 <p className="text-xs opacity-75">Quando finalizar, ele aparecerá automaticamente na lista.</p>
 </div>
 </div>
 )}

 {/* Modelos Padrão */}
 {filteredDefaultModels.length > 0 && (
 <>
 <div className="flex items-center gap-2 mb-3">
 <h2 className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' text-xs font-semibold uppercase tracking-wide'}>Modelos Padrão</h2>
 </div>
 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
 {filteredDefaultModels.map(model => renderModelCard(model))}
 </div>
 </>
 )}

 {/* Meus Modelos */}
 {filteredUserModels.length > 0 && (
 <>
 <div className="flex items-center gap-2 mb-3">
 <h2 className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' text-xs font-semibold uppercase tracking-wide'}>Meus Modelos</h2>
 <span className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' text-[10px]'}>({filteredUserModels.length})</span>
 </div>
 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
 {filteredUserModels.map(model => renderModelCard(model))}
 </div>
 </>
 )}

 {/* Nenhum resultado com filtros */}
 {filteredDefaultModels.length === 0 && filteredUserModels.length === 0 && (
 <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200') + ' rounded-xl border p-8 text-center'}>
 <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-filter-circle-xmark text-3xl mb-3'}></i>
 <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' text-sm'}>Nenhum modelo encontrado com os filtros selecionados</p>
 </div>
 )}
 </>
 )}
 </div>
 </div>

 {/* CREATE MODEL WIZARD MODAL */}
 {showCreateModel && (
 <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => { setShowCreateModel(false); setEditingModel(null); }}>
 <div className={(theme === 'dark' ? 'bg-neutral-900/95 backdrop-blur-2xl border-neutral-800' : 'bg-white/95 backdrop-blur-2xl border-gray-200') + ' rounded-t-2xl md:rounded-2xl border w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col safe-area-bottom-sheet'} onClick={(e) => e.stopPropagation()}>
 {/* Drag handle - mobile */}
 <div className="md:hidden pt-3 pb-1 flex justify-center">
 <div className={(theme === 'dark' ? 'bg-neutral-600' : 'bg-gray-300') + ' w-10 h-1 rounded-full'}></div>
 </div>
 {/* Header com Steps */}
 <div className={'p-4 border-b ' + (theme === 'dark' ? 'border-neutral-800' : 'border-gray-200')}>
 <div className="flex items-center justify-between mb-3">
 <h2 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold font-serif'}>
 {editingModel ? 'Editar Modelo' : 'Criar Modelo'}
 </h2>
 <button onClick={() => { setShowCreateModel(false); setEditingModel(null); }} className={(theme === 'dark' ? 'text-neutral-500 hover:text-white' : 'text-gray-400 hover:text-gray-600') + ' transition-colors'}>
 <i className="fas fa-times"></i>
 </button>
 </div>
 {/* Step Indicators — dinâmico por tipo de modelo */}
 {(() => {
 const steps = newModel.modelType === 'real'
 ? [{ step: 1, label: 'Tipo' }, { step: 2, label: 'Fotos' }, { step: 3, label: 'Salvar' }]
 : newModel.modelType === 'ai'
 ? [{ step: 1, label: 'Tipo' }, { step: 2, label: 'Gênero' }, { step: 3, label: 'Físico' }, { step: 4, label: 'Aparência' }, { step: 5, label: 'Proporções' }, { step: 6, label: 'Finalizar' }]
 : [{ step: 1, label: 'Tipo' }];
 return (
 <div className="flex items-center justify-between gap-2">
 {steps.map(({ step, label }) => (
 <div key={step} className="flex-1 text-center">
 <div className={'mx-auto w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium mb-1 transition-all ' + (
   modelWizardStep === step
   ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white'
   : modelWizardStep > step
   ? (theme === 'dark' ? 'bg-[#FF6B6B]/20 text-[#FF6B6B]' : 'bg-[#FF6B6B]/10 text-[#FF6B6B]')
   : (theme === 'dark' ? 'bg-neutral-800 text-neutral-500' : 'bg-gray-100 text-gray-400')
 )}>
   {modelWizardStep > step ? <i className="fas fa-check text-[10px]"></i> : step}
 </div>
 <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>{label}</span>
 </div>
 ))}
 </div>
 );
 })()}
 </div>

 {/* Content */}
 <div className="flex-1 overflow-y-auto p-4">
 {/* Step 1: Tipo de Modelo */}
 {modelWizardStep === 1 && (
 <div className="space-y-4">
 <div className="text-center mb-4">
 <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold mb-1 font-serif'}>Que tipo de modelo?</h3>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-sm'}>Crie com IA ou use fotos de uma pessoa real</p>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <button
 onClick={() => { setNewModel({ ...newModel, modelType: 'ai' }); setModelWizardStep(2); }}
 className={'p-6 rounded-xl border-2 transition-all text-center ' + (theme === 'dark' ? 'border-neutral-800 hover:border-[#FF6B6B]/50 hover:bg-[#FF6B6B]/5' : 'border-gray-200 hover:border-[#FF6B6B]/50 hover:bg-[#FF6B6B]/5')}
 >
 <i className={'fas fa-wand-magic-sparkles text-4xl mb-3 ' + (theme === 'dark' ? 'text-neutral-400' : 'text-gray-400')}></i>
 <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-base font-medium'}>Modelo IA</p>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] mt-1'}>Criar modelo virtual personalizado</p>
 <p className="text-[#FF6B6B] text-[9px] font-medium mt-2">2 créditos</p>
 </button>
 <button
 onClick={() => { setNewModel({ ...newModel, modelType: 'real' }); setModelWizardStep(2); }}
 className={'p-6 rounded-xl border-2 transition-all text-center ' + (theme === 'dark' ? 'border-neutral-800 hover:border-blue-500/50 hover:bg-blue-500/5' : 'border-gray-200 hover:border-blue-500/50 hover:bg-blue-500/5')}
 >
 <i className={'fas fa-camera text-4xl mb-3 ' + (theme === 'dark' ? 'text-neutral-400' : 'text-gray-400')}></i>
 <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-base font-medium'}>Modelo Real</p>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] mt-1'}>Enviar fotos de uma pessoa real</p>
 <p className="text-green-500 text-[9px] font-medium mt-2">Grátis</p>
 </button>
 </div>
 </div>
 )}

 {/* ═══ FLUXO MODELO REAL ═══ */}

 {/* Step 2 (Real): Gênero + Upload de Fotos */}
 {modelWizardStep === 2 && newModel.modelType === 'real' && (
 <div className="space-y-4">
 <div className="text-center mb-2">
 <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-base font-semibold font-serif'}>Envie as fotos do modelo</h3>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>Foto de frente é obrigatória. Costas e rosto são opcionais.</p>
 </div>

 {/* Gênero - toggle simples */}
 <div>
 <label className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs font-medium block mb-2'}>Gênero</label>
 <div className="flex gap-2">
 {MODEL_OPTIONS.gender.map(opt => (
   <button
   key={opt.id}
   onClick={() => setNewModel({ ...newModel, gender: opt.id as 'woman' | 'man' })}
   className={'flex-1 py-2 rounded-lg text-xs font-medium transition-colors ' + (
     newModel.gender === opt.id
     ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white'
     : (theme === 'dark' ? 'bg-neutral-800 text-neutral-300' : 'bg-gray-200 text-gray-600')
   )}
   >
   <i className={'fas ' + (opt.id === 'woman' ? 'fa-venus' : 'fa-mars') + ' mr-1.5'}></i>{opt.label}
   </button>
 ))}
 </div>
 </div>

 {/* Grid 3 colunas para upload de fotos */}
 <div className="grid grid-cols-3 gap-3">
 {(['front', 'back', 'face'] as const).map(type => {
   const labels = { front: 'Frente', back: 'Costas', face: 'Rosto' };
   const icons = { front: 'fa-user', back: 'fa-user-slash', face: 'fa-face-smile' };
   const required = type === 'front';
   const photo = realModelPhotos[type];
   const isUploading = uploadingPhoto === type;
   return (
   <div key={type} className="text-center">
     <label className="block cursor-pointer">
     <div className={'aspect-[3/4] rounded-xl border-2 border-dashed overflow-hidden transition-all ' + (
       photo
       ? 'border-solid ' + (theme === 'dark' ? 'border-neutral-700' : 'border-gray-300')
       : required
       ? (theme === 'dark' ? 'border-[#FF6B6B]/40 hover:border-[#FF6B6B]/70' : 'border-[#FF6B6B]/30 hover:border-[#FF6B6B]/60')
       : (theme === 'dark' ? 'border-neutral-700 hover:border-neutral-600' : 'border-gray-300 hover:border-gray-400')
     )}>
       {photo ? (
       <div className="relative w-full h-full group">
         <img src={photo} alt={labels[type]} className="w-full h-full object-cover" />
         <button
         onClick={(e) => { e.preventDefault(); e.stopPropagation(); setRealModelPhotos(prev => ({ ...prev, [type]: null })); }}
         className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px]"
         >
         <i className="fas fa-times"></i>
         </button>
       </div>
       ) : isUploading ? (
       <div className="w-full h-full flex flex-col items-center justify-center gap-2">
         <div className="animate-spin w-5 h-5 border-2 border-[#FF6B6B] border-t-transparent rounded-full"></div>
         <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-400') + ' text-[9px]'}>Processando...</span>
       </div>
       ) : (
       <div className="w-full h-full flex flex-col items-center justify-center gap-1.5">
         <i className={'fas ' + icons[type] + ' text-xl ' + (theme === 'dark' ? 'text-neutral-600' : 'text-gray-300')}></i>
         <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px] font-medium'}>{labels[type]}</span>
         {required && <span className="text-[8px] text-[#FF6B6B] font-medium">Obrigatório</span>}
       </div>
       )}
     </div>
     <input type="file" accept="image/*,.heic,.heif" className="hidden" onChange={async (e) => {
       const file = e.target.files?.[0];
       if (!file) return;
       setUploadingPhoto(type);
       try {
       const base64 = await processImageFile(file);
       setRealModelPhotos(prev => ({ ...prev, [type]: base64 }));
       } catch (err) {
       showToast('Erro ao processar imagem. Tente outro formato.', 'error');
       }
       setUploadingPhoto(null);
       e.target.value = '';
     }} />
     </label>
     <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] mt-1 block'}>{labels[type]} {required ? '' : '(opc.)'}</span>
   </div>
   );
 })}
 </div>

 <div className={(theme === 'dark' ? 'bg-neutral-800/50 border-neutral-700/50' : 'bg-gray-50 border-gray-200') + ' rounded-lg border p-3'}>
 <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' text-[10px] leading-relaxed'}>
   <i className="fas fa-info-circle mr-1 text-blue-400"></i>
   Use fotos com boa iluminação, fundo limpo e corpo inteiro visível para melhores resultados. Você é responsável por ter o consentimento da pessoa fotografada.
 </p>
 </div>
 </div>
 )}

 {/* Step 3 (Real): Nome + Preview + Salvar */}
 {modelWizardStep === 3 && newModel.modelType === 'real' && (
 <div className="space-y-4">
 <div>
 <label className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs font-medium block mb-2'}>Nome do Modelo</label>
 <input
   type="text"
   value={newModel.name}
   onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
   placeholder="Ex: Maria, Pedro, Modelo Principal..."
   maxLength={30}
   className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-600' : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400') + ' w-full px-3 py-2.5 rounded-lg border text-sm'}
 />
 </div>

 {/* Preview das fotos */}
 <div className="grid grid-cols-3 gap-2">
 {(['front', 'back', 'face'] as const).map(type => {
   const labels = { front: 'Frente', back: 'Costas', face: 'Rosto' };
   const photo = realModelPhotos[type];
   if (!photo) return (
   <div key={type} className={'aspect-[3/4] rounded-xl flex items-center justify-center ' + (theme === 'dark' ? 'bg-neutral-800/50' : 'bg-gray-100')}>
     <span className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-300') + ' text-[10px]'}>{labels[type]}</span>
   </div>
   );
   return (
   <div key={type} className="text-center">
     <div className={'aspect-[3/4] rounded-xl overflow-hidden border ' + (theme === 'dark' ? 'border-neutral-700' : 'border-gray-200')}>
     <img src={photo} alt={labels[type]} className="w-full h-full object-cover" />
     </div>
     <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>{labels[type]}</span>
   </div>
   );
 })}
 </div>

 {/* Resumo */}
 <div className={(theme === 'dark' ? 'bg-neutral-800/50 border-neutral-700/50' : 'bg-gray-50 border-gray-200') + ' rounded-xl border p-3'}>
 <div className="flex items-center justify-between text-xs">
   <span className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500')}>Tipo</span>
   <span className="text-blue-400 font-medium"><i className="fas fa-camera mr-1"></i>Modelo Real</span>
 </div>
 <div className={'h-px my-2 ' + (theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-200')}></div>
 <div className="flex items-center justify-between text-xs">
   <span className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500')}>Gênero</span>
   <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900')}>{newModel.gender === 'woman' ? 'Feminino' : 'Masculino'}</span>
 </div>
 <div className={'h-px my-2 ' + (theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-200')}></div>
 <div className="flex items-center justify-between text-xs">
   <span className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500')}>Fotos</span>
   <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900')}>{[realModelPhotos.front, realModelPhotos.back, realModelPhotos.face].filter(Boolean).length} de 3</span>
 </div>
 <div className={'h-px my-2 ' + (theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-200')}></div>
 <div className="flex items-center justify-between text-xs">
   <span className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500')}>Créditos</span>
   <span className="text-green-500 font-medium">Grátis</span>
 </div>
 </div>
 </div>
 )}

 {/* ═══ FLUXO MODELO IA ═══ */}

 {/* Step 2 (IA): Gênero */}
 {modelWizardStep === 2 && newModel.modelType === 'ai' && (
 <div className="space-y-4">
 <div className="text-center mb-4">
 <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold mb-1 font-serif'}>Selecione o Gênero</h3>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-sm'}>Escolha o gênero do modelo que você deseja criar</p>
 </div>
 <div className="grid grid-cols-2 gap-4">
 {MODEL_OPTIONS.gender.map(opt => (
 <button
 key={opt.id}
 onClick={() => setNewModel({ ...newModel, gender: opt.id as 'woman' | 'man' })}
 className={'p-6 rounded-xl border-2 transition-all text-center ' + (
 newModel.gender === opt.id
 ? 'border-[#FF6B6B]/50 bg-gradient-to-r from-[#FF6B6B]/15 to-[#FF9F43]/15'
 : (theme === 'dark' ? 'border-neutral-800 hover:border-neutral-700' : 'border-gray-200 hover:border-neutral-500')
 )}
 >
 <i className={'fas ' + (opt.id === 'woman' ? 'fa-venus' : 'fa-mars') + ' text-4xl mb-3 ' + (newModel.gender === opt.id ? 'text-[#FF6B6B]' : (theme === 'dark' ? 'text-neutral-500' : 'text-gray-400'))}></i>
 <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-base font-medium'}>{opt.label}</p>
 </button>
 ))}
 </div>
 </div>
 )}

 {/* Step 3 (IA): Físico */}
 {modelWizardStep === 3 && newModel.modelType === 'ai' && (
 <div className="space-y-4">
 {/* Faixa Etária - Dropdown (8 opções) */}
 <div>
 <label className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs font-medium block mb-2'}>Faixa Etária</label>
 <select
 value={newModel.ageRange}
 onChange={(e) => setNewModel({ ...newModel, ageRange: e.target.value })}
 className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-white border-gray-200 text-gray-900') + ' w-full px-3 py-2.5 rounded-lg border text-sm cursor-pointer'}
 >
 {MODEL_OPTIONS.ageRange.map(opt => (
 <option key={opt.id} value={opt.id}>{opt.label}</option>
 ))}
 </select>
 </div>

 {/* Etnia - Dropdown (6 opções) */}
 <div>
 <label className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs font-medium block mb-2'}>Etnia</label>
 <select
 value={newModel.ethnicity}
 onChange={(e) => setNewModel({ ...newModel, ethnicity: e.target.value })}
 className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-white border-gray-200 text-gray-900') + ' w-full px-3 py-2.5 rounded-lg border text-sm cursor-pointer'}
 >
 {MODEL_OPTIONS.ethnicity.map(opt => (
 <option key={opt.id} value={opt.id}>{opt.label}</option>
 ))}
 </select>
 </div>

 {/* Tom de Pele - Chips (4 opções) */}
 <div>
 <label className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs font-medium block mb-2'}>Tom de Pele</label>
 <div className="flex flex-wrap gap-2">
 {MODEL_OPTIONS.skinTone.map(opt => (
 <button
 key={opt.id}
 onClick={() => setNewModel({ ...newModel, skinTone: opt.id })}
 className={'px-4 py-2 rounded-full text-sm font-medium transition-all ' + (
 newModel.skinTone === opt.id
 ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white'
 : (theme === 'dark' ? 'text-neutral-400 hover:bg-neutral-800' : 'text-gray-500 hover:bg-gray-100')
 )}
 >
 {opt.label}
 </button>
 ))}
 </div>
 </div>

 {/* Tipo de Corpo - Chips (5 opções) */}
 <div>
 <label className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs font-medium block mb-2'}>Tipo de Corpo</label>
 <div className="flex flex-wrap gap-2">
 {MODEL_OPTIONS.bodyType.map(opt => (
 <button
 key={opt.id}
 onClick={() => setNewModel({ ...newModel, bodyType: opt.id })}
 className={'px-4 py-2 rounded-full text-sm font-medium transition-all ' + (
 newModel.bodyType === opt.id
 ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white'
 : (theme === 'dark' ? 'text-neutral-400 hover:bg-neutral-800' : 'text-gray-500 hover:bg-gray-100')
 )}
 >
 {opt.label}
 </button>
 ))}
 </div>
 </div>

 {/* Altura - Slider (3 opções) */}
 <div>
 <label className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs font-medium block mb-2'}>
 Altura: <span className="text-[#FF6B6B]">{MODEL_OPTIONS.height.find(h => h.id === newModel.height)?.label}</span>
 </label>
 <input
 type="range"
 min={0}
 max={2}
 value={MODEL_OPTIONS.height.findIndex(h => h.id === newModel.height)}
 onChange={(e) => setNewModel({ ...newModel, height: MODEL_OPTIONS.height[Number(e.target.value)].id })}
 className={'w-full h-2 rounded-full appearance-none cursor-pointer ' + (theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-200') + `
 [&::-webkit-slider-thumb]:appearance-none
 [&::-webkit-slider-thumb]:w-5
 [&::-webkit-slider-thumb]:h-5
 [&::-webkit-slider-thumb]:rounded-full
 [&::-webkit-slider-thumb]:bg-gradient-to-r
 [&::-webkit-slider-thumb]:from-[#FF6B6B]
 [&::-webkit-slider-thumb]:to-[#FF9F43]
 [&::-webkit-slider-thumb]:cursor-pointer
 [&::-webkit-slider-thumb]:`}
 />
 <div className={'flex justify-between text-[10px] mt-1.5 ' + (theme === 'dark' ? 'text-neutral-600' : 'text-gray-400')}>
 <span>Baixa</span>
 <span>Média</span>
 <span>Alta</span>
 </div>
 </div>

 {/* Observações */}
 <div>
 <label className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs font-medium block mb-2'}>Observações Físicas <span className="text-neutral-500">(opcional)</span></label>
 <textarea
 value={newModel.physicalNotes}
 onChange={(e) => setNewModel({ ...newModel, physicalNotes: e.target.value })}
 placeholder="Ex: Ombros largos, pernas longas, tatuagens visíveis..."
 rows={2}
 className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400') + ' w-full px-3 py-2 rounded-lg border text-xs resize-none'}
 />
 </div>
 </div>
 )}

 {/* Step 4 (IA): Aparência */}
 {modelWizardStep === 4 && newModel.modelType === 'ai' && (
 <div className="space-y-4">
 {/* Tipo de Cabelo - Chips (desabilitado se careca) */}
 <div className={'transition-opacity ' + (newModel.hairLength === 'bald' ? 'opacity-40 pointer-events-none' : '')}>
 <label className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs font-medium block mb-2'}>Tipo de Cabelo</label>
 <div className="flex flex-wrap gap-2">
 {MODEL_OPTIONS.hairStyle.map(opt => (
 <button
 key={opt.id}
 onClick={() => setNewModel({ ...newModel, hairStyle: opt.id })}
 className={'px-4 py-2 rounded-full text-sm font-medium transition-all ' + (
 newModel.hairLength === 'bald'
 ? (theme === 'dark' ? 'text-neutral-600' : 'text-gray-300')
 : newModel.hairStyle === opt.id
 ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white'
 : (theme === 'dark' ? 'text-neutral-400 hover:bg-neutral-800' : 'text-gray-500 hover:bg-gray-100')
 )}
 >
 {opt.label}
 </button>
 ))}
 </div>
 </div>

 {/* Cor do Cabelo - Chips (desabilitado se careca) */}
 <div className={'transition-opacity ' + (newModel.hairLength === 'bald' ? 'opacity-40 pointer-events-none' : '')}>
 <label className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs font-medium block mb-2'}>Cor do Cabelo</label>
 <div className="flex flex-wrap gap-2">
 {MODEL_OPTIONS.hairColor.map(opt => (
 <button
 key={opt.id}
 onClick={() => setNewModel({ ...newModel, hairColor: opt.id })}
 className={'px-4 py-2 rounded-full text-sm font-medium transition-all ' + (
 newModel.hairLength === 'bald'
 ? (theme === 'dark' ? 'text-neutral-600' : 'text-gray-300')
 : newModel.hairColor === opt.id
 ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white'
 : (theme === 'dark' ? 'text-neutral-400 hover:bg-neutral-800' : 'text-gray-500 hover:bg-gray-100')
 )}
 >
 {opt.label}
 </button>
 ))}
 </div>
 </div>

 {/* Tamanho do Cabelo - Slider */}
 <div>
 <label className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs font-medium block mb-2'}>
 Tamanho do Cabelo: <span className="text-[#FF6B6B]">{MODEL_OPTIONS.hairLength.find(h => h.id === newModel.hairLength)?.label}</span>
 </label>
 <input
 type="range"
 min={0}
 max={5}
 value={MODEL_OPTIONS.hairLength.findIndex(h => h.id === newModel.hairLength)}
 onChange={(e) => setNewModel({ ...newModel, hairLength: MODEL_OPTIONS.hairLength[Number(e.target.value)].id })}
 className={'w-full h-2 rounded-full appearance-none cursor-pointer ' + (theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-200') + `
 [&::-webkit-slider-thumb]:appearance-none
 [&::-webkit-slider-thumb]:w-5
 [&::-webkit-slider-thumb]:h-5
 [&::-webkit-slider-thumb]:rounded-full
 [&::-webkit-slider-thumb]:bg-gradient-to-r
 [&::-webkit-slider-thumb]:from-[#FF6B6B]
 [&::-webkit-slider-thumb]:to-[#FF9F43]
 [&::-webkit-slider-thumb]:cursor-pointer
 [&::-webkit-slider-thumb]:`}
 />
 <div className={'flex justify-between text-[10px] mt-1.5 ' + (theme === 'dark' ? 'text-neutral-600' : 'text-gray-400')}>
 <span>Careca</span>
 <span>Muito longo</span>
 </div>
 </div>

 {/* Observações Rosto e Cabelo */}
 <div>
 <label className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs font-medium block mb-2'}>Observações Rosto e Cabelo <span className="text-neutral-500">(opcional)</span></label>
 <input
 type="text"
 value={newModel.hairNotes}
 onChange={(e) => setNewModel({ ...newModel, hairNotes: e.target.value })}
 placeholder="Ex: Franja, mechas loiras, rosto oval, queixo marcado..."
 className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400') + ' w-full px-3 py-2 rounded-lg border text-xs'}
 />
 </div>

 {/* Cor dos Olhos - Chips (5 opções) */}
 <div>
 <label className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs font-medium block mb-2'}>Cor dos Olhos</label>
 <div className="flex flex-wrap gap-2">
 {MODEL_OPTIONS.eyeColor.map(opt => (
 <button
 key={opt.id}
 onClick={() => setNewModel({ ...newModel, eyeColor: opt.id })}
 className={'px-4 py-2 rounded-full text-sm font-medium transition-all ' + (
 newModel.eyeColor === opt.id
 ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white'
 : (theme === 'dark' ? 'text-neutral-400 hover:bg-neutral-800' : 'text-gray-500 hover:bg-gray-100')
 )}
 >
 {opt.label}
 </button>
 ))}
 </div>
 </div>

 {/* Expressão - Chips (5 opções) */}
 <div>
 <label className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs font-medium block mb-2'}>Expressão</label>
 <div className="flex flex-wrap gap-2">
 {MODEL_OPTIONS.expression.map(opt => (
 <button
 key={opt.id}
 onClick={() => setNewModel({ ...newModel, expression: opt.id })}
 className={'px-4 py-2 rounded-full text-sm font-medium transition-all ' + (
 newModel.expression === opt.id
 ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white'
 : (theme === 'dark' ? 'text-neutral-400 hover:bg-neutral-800' : 'text-gray-500 hover:bg-gray-100')
 )}
 >
 {opt.label}
 </button>
 ))}
 </div>
 </div>

 {/* Observações da Pele */}
 <div>
 <label className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs font-medium block mb-2'}>Observações da Pele <span className="text-neutral-500">(opcional)</span></label>
 <input
 type="text"
 value={newModel.skinNotes}
 onChange={(e) => setNewModel({ ...newModel, skinNotes: e.target.value })}
 placeholder="Ex: Sardas, manchas, vitiligo, cicatrizes..."
 className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400') + ' w-full px-3 py-2 rounded-lg border text-xs'}
 />
 </div>
 </div>
 )}

 {/* Step 5 (IA): Proporções */}
 {modelWizardStep === 5 && newModel.modelType === 'ai' && (
 <div className="space-y-4">
 {/* Tamanho do Busto - Slider (3 opções, só para mulheres adultas) */}
 {newModel.gender === 'woman' && newModel.ageRange !== 'child' && (
 <div>
 <label className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs font-medium block mb-2'}>
 Tamanho do Busto: <span className="text-[#FF6B6B]">{MODEL_OPTIONS.bustSize.find(b => b.id === newModel.bustSize)?.label}</span>
 </label>
 <input
 type="range"
 min={0}
 max={2}
 value={MODEL_OPTIONS.bustSize.findIndex(b => b.id === newModel.bustSize)}
 onChange={(e) => setNewModel({ ...newModel, bustSize: MODEL_OPTIONS.bustSize[Number(e.target.value)].id })}
 className={'w-full h-2 rounded-full appearance-none cursor-pointer ' + (theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-200') + `
 [&::-webkit-slider-thumb]:appearance-none
 [&::-webkit-slider-thumb]:w-5
 [&::-webkit-slider-thumb]:h-5
 [&::-webkit-slider-thumb]:rounded-full
 [&::-webkit-slider-thumb]:bg-gradient-to-r
 [&::-webkit-slider-thumb]:from-[#FF6B6B]
 [&::-webkit-slider-thumb]:to-[#FF9F43]
 [&::-webkit-slider-thumb]:cursor-pointer
 [&::-webkit-slider-thumb]:`}
 />
 <div className={'flex justify-between text-[10px] mt-1.5 ' + (theme === 'dark' ? 'text-neutral-600' : 'text-gray-400')}>
 <span>Pequeno</span>
 <span>Médio</span>
 <span>Grande</span>
 </div>
 </div>
 )}

 {/* Tipo de Cintura - Slider (3 opções, não para crianças) */}
 {newModel.ageRange !== 'child' && <div>
 <label className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs font-medium block mb-2'}>
 Tipo de Cintura: <span className="text-[#FF6B6B]">{MODEL_OPTIONS.waistType.find(w => w.id === newModel.waistType)?.label}</span>
 </label>
 <input
 type="range"
 min={0}
 max={2}
 value={MODEL_OPTIONS.waistType.findIndex(w => w.id === newModel.waistType)}
 onChange={(e) => setNewModel({ ...newModel, waistType: MODEL_OPTIONS.waistType[Number(e.target.value)].id })}
 className={'w-full h-2 rounded-full appearance-none cursor-pointer ' + (theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-200') + `
 [&::-webkit-slider-thumb]:appearance-none
 [&::-webkit-slider-thumb]:w-5
 [&::-webkit-slider-thumb]:h-5
 [&::-webkit-slider-thumb]:rounded-full
 [&::-webkit-slider-thumb]:bg-gradient-to-r
 [&::-webkit-slider-thumb]:from-[#FF6B6B]
 [&::-webkit-slider-thumb]:to-[#FF9F43]
 [&::-webkit-slider-thumb]:cursor-pointer
 [&::-webkit-slider-thumb]:`}
 />
 <div className={'flex justify-between text-[10px] mt-1.5 ' + (theme === 'dark' ? 'text-neutral-600' : 'text-gray-400')}>
 <span>Fina</span>
 <span>Média</span>
 <span>Larga</span>
 </div>
 </div>}

 {/* Mensagem informativa para crianças */}
 {newModel.ageRange === 'child' && (
 <div className={(theme === 'dark' ? 'bg-neutral-800/50' : 'bg-gray-50') + ' rounded-xl p-4 text-center'}>
 <i className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-400') + ' fas fa-child text-lg mb-2'}></i>
 <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' text-xs'}>
 Proporções corporais não se aplicam a modelos infantis.
 </p>
 </div>
 )}

 {/* Mensagem para homens */}
 {newModel.gender === 'man' && newModel.ageRange !== 'child' && (
 <div className={(theme === 'dark' ? 'bg-neutral-800/50' : 'bg-gray-50') + ' rounded-xl p-4 text-center'}>
 <i className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-400') + ' fas fa-info-circle text-lg mb-2'}></i>
 <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' text-xs'}>
 Para modelos masculinos, apenas a cintura é configurável nesta etapa.
 </p>
 </div>
 )}
 </div>
 )}

 {/* Step 6 (IA): Criar e Visualizar */}
 {modelWizardStep === 6 && newModel.modelType === 'ai' && (
 <div className="space-y-4">
 {/* Estado: Gerando */}
 {generatingModelImages && (
 <div className="text-center py-4">
 <div className="w-20 h-20 mx-auto mb-4 rounded-xl overflow-hidden flex items-center justify-center">
 <img src="/Scene-1.gif" alt="" className="h-full object-cover" style={{ width: '140%', maxWidth: 'none' }} />
 </div>
 <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-semibold text-lg mb-1'}>Criando seu modelo...</h3>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs mb-4'}>
 {modelGenerationStep === 'front' && 'Gerando imagem de frente...'}
 {modelGenerationStep === 'back' && 'Gerando imagem de costas...'}
 {modelGenerationStep === 'done' && 'Finalizando...'}
 </p>

 {/* Steps */}
 <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100') + ' rounded-xl p-3 mb-4'}>
 <div className="flex items-center justify-between gap-2 text-xs">
 {[
 { key: 'front', label: 'Frente', icon: 'fa-user' },
 { key: 'back', label: 'Costas', icon: 'fa-person-walking-arrow-right' },
 ].map((step) => {
 const isCompleted =
 (step.key === 'front' && modelGenerationProgress >= 50) ||
 (step.key === 'back' && modelGenerationProgress >= 95);
 const isCurrent = modelGenerationStep === step.key;
 return (
 <div key={step.key} className="flex flex-col items-center gap-1 flex-1">
 <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
 isCompleted ? 'bg-green-500' : isCurrent ? 'bg-[#FF6B6B]/100' : (theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-300')
 }`}>
 {isCompleted ? (
 <i className="fas fa-check text-white text-xs"></i>
 ) : isCurrent ? (
 <i className="fas fa-spinner fa-spin text-white text-xs"></i>
 ) : (
 <i className={`fas ${step.icon} ${theme === 'dark' ? 'text-neutral-500' : 'text-gray-500'} text-xs`}></i>
 )}
 </div>
 <span className={`${isCompleted ? 'text-[#FF6B6B]' : isCurrent ? (theme === 'dark' ? 'text-white' : 'text-gray-900') : (theme === 'dark' ? 'text-neutral-500' : 'text-gray-500')} text-[10px]`}>
 {step.label}
 </span>
 </div>
 );
 })}
 </div>
 </div>

 {/* Barra de Progresso */}
 <div className="px-2">
 <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-200') + ' h-2 rounded-full overflow-hidden'}>
 <div
 className="h-full bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] rounded-full transition-all duration-500"
 style={{ width: `${modelGenerationProgress}%` }}
 ></div>
 </div>
 <div className="flex justify-between items-center mt-2">
 <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>Processando</span>
 <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-bold'}>{modelGenerationProgress}%</span>
 </div>
 </div>
 </div>
 )}

 {/* Estado: Preview pronto */}
 {!generatingModelImages && modelPreviewImages && (
 <>
 <div className="text-center mb-2">
 <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-semibold text-lg'}>{newModel.name}</h3>
 <p className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-sm font-medium">
 <i className="fas fa-check-circle mr-1 text-[#FF6B6B]"></i>Modelo criado com sucesso!
 </p>
 </div>
 {/* Grid de imagens geradas */}
 <div className="grid grid-cols-2 gap-3">
 {['front', 'back'].map((type) => {
 const imgUrl = modelPreviewImages[type as keyof typeof modelPreviewImages];
 const labels = { front: 'Frente', back: 'Costas' };
 return (
 <div key={type} className="text-center">
 <div className={'aspect-[3/4] rounded-xl overflow-hidden mb-1 ' + (theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100')}>
 {imgUrl ? (
 <OptimizedImage
 src={imgUrl}
 alt={type}
 className="w-full h-full"
 objectFit="contain"
 size="preview"
 />
 ) : (
 <div className="w-full h-full flex items-center justify-center">
 <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-300') + ' fas fa-image text-xl'}></i>
 </div>
 )}
 </div>
 <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>{labels[type as keyof typeof labels]}</span>
 </div>
 );
 })}
 </div>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs text-center mt-2'}>
 Gostou? Salve o modelo ou gere outro com as mesmas características.
 </p>
 </>
 )}

 {/* Estado: Aguardando criar */}
 {!generatingModelImages && !modelPreviewImages && (
 <>
 {/* Nome do modelo */}
 <div>
 <label className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs font-medium block mb-2'}>Nome do Modelo</label>
 <input
 type="text"
 value={newModel.name}
 onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
 placeholder="Ex: Amanda, João, Modelo Principal..."
 maxLength={30}
 className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400') + ' w-full px-3 py-2.5 rounded-lg border text-sm'}
 />
 </div>

 {/* Preview humanizado do modelo */}
 <div className={(theme === 'dark' ? 'bg-gradient-to-br from-[#FF6B6B]/10 to-[#FF9F43]/10 border-[#FF6B6B]/20' : 'bg-gradient-to-br from-[#FF6B6B]/5 to-[#FF9F43]/5 border-[#FF6B6B]/20') + ' rounded-xl p-4 border'}>
 <div className="flex items-start gap-3">
 <div className={'w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ' + (newModel.gender === 'woman' ? 'bg-gradient-to-br from-[#FF6B6B] to-[#FF9F43]' : 'bg-gradient-to-br from-blue-400 to-indigo-500')}>
 <i className={'fas ' + (newModel.gender === 'woman' ? 'fa-venus' : 'fa-mars') + ' text-white text-lg'}></i>
 </div>
 <div className="flex-1">
 <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' text-[10px] font-medium uppercase tracking-wide mb-1.5'}>
 <i className="fas fa-sparkles text-[#FF6B6B] mr-1"></i>O que será gerado
 </p>
 <p className={(theme === 'dark' ? 'text-white' : 'text-gray-800') + ' text-sm leading-relaxed'}>
 {newModel.name || (newModel.gender === 'woman' ? 'Ela' : 'Ele')} terá{' '}
 <span className="text-[#FF6B6B] font-medium">olhos {getModelLabel('eyeColor', newModel.eyeColor).toLowerCase()}</span>
 {newModel.hairLength === 'bald' ? (
 <> e será <span className="text-[#FF6B6B] font-medium">careca</span>.</>
 ) : (
 <>, cabelo <span className="text-[#FF6B6B] font-medium">{getModelLabel('hairColor', newModel.hairColor).toLowerCase()}</span>{' '}
 <span className="text-[#FF6B6B] font-medium">{getModelLabel('hairLength', newModel.hairLength).toLowerCase()}</span>{' '}
 e <span className="text-[#FF6B6B] font-medium">{getModelLabel('hairStyle', newModel.hairStyle).toLowerCase()}</span>.</>
 )}{' '}
 Corpo <span className="text-[#FF6B6B] font-medium">{getModelLabel('bodyType', newModel.bodyType).toLowerCase()}</span>,{' '}
 pele <span className="text-[#FF6B6B] font-medium">{getModelLabel('skinTone', newModel.skinTone).toLowerCase()}</span>,{' '}
 estatura <span className="text-[#FF6B6B] font-medium">{getModelLabel('height', newModel.height).toLowerCase()}</span>{' '}
 {newModel.ageRange !== 'child' && (
 <>e cintura <span className="text-[#FF6B6B] font-medium">{getModelLabel('waistType', newModel.waistType).toLowerCase()}</span></>
 )}
 {newModel.gender === 'woman' && newModel.ageRange !== 'child' && (
 <>, busto <span className="text-[#FF6B6B] font-medium">{getModelLabel('bustSize', newModel.bustSize).toLowerCase()}</span></>
 )}.{' '}
 Expressão <span className="text-[#FF6B6B] font-medium">{getModelLabel('expression', newModel.expression).toLowerCase()}</span>.
 </p>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] mt-2'}>
 <i className="fas fa-camera mr-1"></i>
 Serão geradas 3 imagens: rosto, frente e costas
 </p>
 </div>
 </div>
 </div>
 </>
 )}
 </div>
 )}
 </div>

 {/* Footer */}
 <div className={'p-4 border-t flex justify-between gap-2 ' + (theme === 'dark' ? 'border-neutral-800' : 'border-gray-200')}>

 {/* Step 1 (Tipo): só Cancelar — avança ao clicar nos cards */}
 {modelWizardStep === 1 && (
 <button
 onClick={() => { setShowCreateModel(false); setEditingModel(null); }}
 className={(theme === 'dark' ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-gray-700') + ' px-4 py-2 text-sm font-medium transition-colors'}
 >
 Cancelar
 </button>
 )}

 {/* ═══ Footer Modelo REAL ═══ */}
 {newModel.modelType === 'real' && modelWizardStep === 2 && (
 <>
 <button
 onClick={() => { setNewModel({ ...newModel, modelType: null }); setModelWizardStep(1); }}
 className={(theme === 'dark' ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-gray-700') + ' px-4 py-2 text-sm font-medium transition-colors'}
 >
 Voltar
 </button>
 <button
 onClick={() => setModelWizardStep(3)}
 disabled={!realModelPhotos.front}
 className={'px-4 py-2 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-lg text-sm font-medium transition-opacity ' + (!realModelPhotos.front ? 'opacity-50 cursor-not-allowed' : '')}
 >
 Próximo
 </button>
 </>
 )}
 {newModel.modelType === 'real' && modelWizardStep === 3 && (
 <>
 <button
 onClick={() => setModelWizardStep(2)}
 className={(theme === 'dark' ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-gray-700') + ' px-4 py-2 text-sm font-medium transition-colors'}
 >
 Voltar
 </button>
 <button
 onClick={saveRealModel}
 disabled={!newModel.name.trim() || savingModel}
 className={'px-4 py-2 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-opacity ' + (!newModel.name.trim() || savingModel ? 'opacity-50 cursor-not-allowed' : '')}
 >
 {savingModel ? (
 <><div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>Salvando...</>
 ) : (
 <><i className="fas fa-check"></i>Salvar Modelo</>
 )}
 </button>
 </>
 )}

 {/* ═══ Footer Modelo IA ═══ */}
 {/* Steps 2-5 (IA): Voltar + Próximo */}
 {newModel.modelType === 'ai' && modelWizardStep >= 2 && modelWizardStep <= 5 && (
 <>
 <button
 onClick={() => modelWizardStep === 2 ? (setNewModel({ ...newModel, modelType: null }), setModelWizardStep(1)) : setModelWizardStep((modelWizardStep - 1) as 1 | 2 | 3 | 4 | 5 | 6)}
 className={(theme === 'dark' ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-gray-700') + ' px-4 py-2 text-sm font-medium transition-colors'}
 >
 Voltar
 </button>
 <button
 onClick={() => setModelWizardStep((modelWizardStep + 1) as 1 | 2 | 3 | 4 | 5 | 6)}
 className="px-4 py-2 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-lg text-sm font-medium"
 >
 Próximo
 </button>
 </>
 )}

 {/* Step 6 (IA): Criar e Visualizar */}
 {newModel.modelType === 'ai' && modelWizardStep === 6 && (
 <>
 {/* Gerando: só mostra loading */}
 {generatingModelImages && (
 <div className="flex-1 text-center">
 <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-sm'}>
 <i className="fas fa-spinner fa-spin mr-2"></i>Gerando imagens...
 </span>
 </div>
 )}

 {/* Sem preview: Voltar + Criar Modelo */}
 {!generatingModelImages && !modelPreviewImages && (
 <>
 <button
 onClick={() => setModelWizardStep(5)}
 className={(theme === 'dark' ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-gray-700') + ' px-4 py-2 text-sm font-medium transition-colors'}
 >
 Voltar
 </button>
 <button
 onClick={generateModelPreview}
 disabled={!newModel.name.trim()}
 className={'px-4 py-2 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-opacity ' + (!newModel.name.trim() ? 'opacity-50 cursor-not-allowed' : '')}
 >
 <i className="fas fa-wand-magic-sparkles"></i>
 Criar Modelo
 </button>
 </>
 )}

 {/* Com preview: Descartar + Gerar Outro + Criar + Salvar */}
 {!generatingModelImages && modelPreviewImages && (
 <>
 <button
 onClick={() => { setModelPreviewImages(null); setShowCreateModel(false); resetModelWizard(); }}
 className={(theme === 'dark' ? 'text-red-400 hover:text-red-300' : 'text-red-500 hover:text-red-600') + ' px-2 py-2 text-sm font-medium transition-colors'}
 >
 <i className="fas fa-trash"></i>
 </button>
 <button
 onClick={() => { setModelPreviewImages(null); generateModelPreview(); }}
 className={(theme === 'dark' ? 'text-neutral-400 hover:text-white border-neutral-700' : 'text-gray-600 hover:text-gray-800 border-gray-300') + ' px-2 py-2 border rounded-lg text-sm font-medium transition-colors'}
 title="Gerar Outro"
 >
 <i className="fas fa-redo"></i>
 </button>

 {/* Criar Dropdown */}
 <div className="relative">
 <button
 onClick={() => setShowCreateDropdown(!showCreateDropdown)}
 className={(theme === 'dark' ? 'text-neutral-400 hover:text-white border-neutral-700' : 'text-gray-600 hover:text-gray-800 border-gray-300') + ' px-3 py-2 border rounded-lg text-sm font-medium transition-colors flex items-center gap-1'}
 >
 <i className="fas fa-plus"></i>
 Criar
 <i className={'fas fa-chevron-' + (showCreateDropdown ? 'up' : 'down') + ' text-xs ml-1'}></i>
 </button>
 {showCreateDropdown && (
 <div className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-gray-200') + ' absolute bottom-full mb-2 right-0 rounded-xl border overflow-hidden min-w-[180px] z-10'}>
 <button
 onClick={() => {
 setShowCreateDropdown(false);
 setShowCreateModel(false);
 navigateTo('product-studio');
 }}
 className={(theme === 'dark' ? 'hover:bg-neutral-700 text-white' : 'hover:bg-gray-50 text-gray-900') + ' w-full px-4 py-3 text-left text-sm flex items-center gap-3 transition-colors'}
 >
 <div className={'w-8 h-8 rounded-lg flex items-center justify-center backdrop-blur-xl ' + (theme === 'dark' ? 'bg-white/10 border border-white/15' : 'bg-white/60 border border-gray-200/60 shadow-sm')}>
 <i className={'fas fa-camera text-xs ' + (theme === 'dark' ? 'text-neutral-200' : 'text-[#1A1A1A]')}></i>
 </div>
 <div>
 <p className="font-medium">Studio Ready</p>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>Foto profissional</p>
 </div>
 </button>
 <button
 onClick={() => {
 setShowCreateDropdown(false);
 setShowCreateModel(false);
 navigateTo('lifestyle');
 }}
 className={(theme === 'dark' ? 'hover:bg-neutral-700 text-white' : 'hover:bg-gray-50 text-gray-900') + ' w-full px-4 py-3 text-left text-sm flex items-center gap-3 transition-colors'}
 >
 <div className={'w-8 h-8 rounded-lg flex items-center justify-center backdrop-blur-xl ' + (theme === 'dark' ? 'bg-white/10 border border-white/15' : 'bg-white/60 border border-gray-200/60 shadow-sm')}>
 <i className={'fas fa-mountain-sun text-xs ' + (theme === 'dark' ? 'text-neutral-200' : 'text-[#1A1A1A]')}></i>
 </div>
 <div>
 <p className="font-medium">Cenário Criativo</p>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>Com ambiente</p>
 </div>
 </button>
 <button
 onClick={() => {
 setShowCreateDropdown(false);
 setShowCreateModel(false);
 navigateTo('look-composer');
 }}
 className={(theme === 'dark' ? 'hover:bg-neutral-700 text-white' : 'hover:bg-gray-50 text-gray-900') + ' w-full px-4 py-3 text-left text-sm flex items-center gap-3 transition-colors'}
 >
 <div className={'w-8 h-8 rounded-lg flex items-center justify-center backdrop-blur-xl ' + (theme === 'dark' ? 'bg-white/10 border border-white/15' : 'bg-white/60 border border-gray-200/60 shadow-sm')}>
 <i className={'fas fa-layer-group text-xs ' + (theme === 'dark' ? 'text-neutral-200' : 'text-[#1A1A1A]')}></i>
 </div>
 <div>
 <p className="font-medium">Look Composer</p>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>Montar look</p>
 </div>
 </button>
 </div>
 )}
 </div>

 <button
 onClick={saveModel}
 disabled={savingModel}
 className={'px-4 py-2 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-lg text-sm font-medium flex items-center gap-2 ' + (savingModel ? 'opacity-70' : '')}
 >
 {savingModel ? (
 <>
 <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
 Salvando...
 </>
 ) : (
 <>
 <i className="fas fa-check"></i>
 Salvar
 </>
 )}
 </button>
 </>
 )}
 </>
 )}
 </div>
 </div>
 </div>
 )}

 {/* MODEL DETAIL MODAL */}
 {showModelDetail && (
 <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setShowModelDetail(null)}>
 <div className={(theme === 'dark' ? 'bg-neutral-900/95 backdrop-blur-2xl border-neutral-800' : 'bg-white/95 backdrop-blur-2xl border-gray-200') + ' rounded-t-2xl md:rounded-2xl border w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col safe-area-bottom-sheet'} onClick={(e) => e.stopPropagation()}>
 {/* Drag handle - mobile */}
 <div className="md:hidden pt-3 pb-1 flex justify-center">
 <div className={(theme === 'dark' ? 'bg-neutral-600' : 'bg-gray-300') + ' w-10 h-1 rounded-full'}></div>
 </div>
 {/* Header */}
 <div className={'p-4 border-b flex items-center justify-between ' + (theme === 'dark' ? 'border-neutral-800' : 'border-gray-200')}>
 <h2 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold font-serif'}>{showModelDetail.name}</h2>
 <button onClick={() => setShowModelDetail(null)} className={(theme === 'dark' ? 'text-neutral-500 hover:text-white' : 'text-gray-400 hover:text-gray-600') + ' transition-colors'}>
 <i className="fas fa-times"></i>
 </button>
 </div>
 {/* Content */}
 <div className="flex-1 overflow-y-auto p-4">
 {/* Images Grid */}
 {(showModelDetail.images.front || showModelDetail.images.back) ? (
 <div className="grid grid-cols-2 gap-2 mb-4">
 {['front', 'back'].map((type) => {
 const imgUrl = showModelDetail.images[type as keyof typeof showModelDetail.images];
 return (
 <div key={type} className={'aspect-[3/4] rounded-xl overflow-hidden ' + (theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100')}>
 {imgUrl ? (
 <OptimizedImage
 src={imgUrl}
 alt={type === 'front' ? 'Frente' : 'Costas'}
 className="w-full h-full"
 size="preview"
 />
 ) : (
 <div className="w-full h-full flex items-center justify-center">
 <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-300') + ' fas fa-image text-2xl'}></i>
 </div>
 )}
 </div>
 );
 })}
 </div>
 ) : (
 <div className={'rounded-xl p-8 mb-4 text-center ' + (theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100')}>
 <div className={'w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center ' + (showModelDetail.gender === 'woman' ? 'bg-gradient-to-br from-[#FF6B6B] to-[#FF9F43]' : 'bg-gradient-to-br from-blue-400 to-indigo-500')}>
 <i className="fas fa-user text-3xl text-white"></i>
 </div>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-sm'}>
 {showModelDetail.status === 'generating' ? 'Gerando imagens...' : 'Nenhuma imagem gerada'}
 </p>
 </div>
 )}
 {/* Características (só para modelos IA) */}
 {showModelDetail.modelType === 'real' ? (
 <div className={(theme === 'dark' ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200') + ' rounded-xl border p-4'}>
 <div className="flex items-center gap-2 mb-2">
 <i className="fas fa-camera text-blue-400 text-sm"></i>
 <h4 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold'}>Modelo Real</h4>
 </div>
 <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs'}>
 Criado com fotos reais. Gênero: {getModelLabel('gender', showModelDetail.gender)}.
 </p>
 </div>
 ) : (
 <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-50') + ' rounded-xl p-4'}>
 <h4 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold mb-3'}>Características</h4>
 <div className="grid grid-cols-2 gap-2 text-xs">
 <div className="flex justify-between">
 <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500')}>Gênero:</span>
 <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium'}>{getModelLabel('gender', showModelDetail.gender)}</span>
 </div>
 <div className="flex justify-between">
 <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500')}>Etnia:</span>
 <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium'}>{getModelLabel('ethnicity', showModelDetail.ethnicity)}</span>
 </div>
 <div className="flex justify-between">
 <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500')}>Pele:</span>
 <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium'}>{getModelLabel('skinTone', showModelDetail.skinTone)}</span>
 </div>
 <div className="flex justify-between">
 <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500')}>Corpo:</span>
 <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium'}>{getModelLabel('bodyType', showModelDetail.bodyType)}</span>
 </div>
 <div className="flex justify-between">
 <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500')}>Idade:</span>
 <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium'}>{getModelLabel('ageRange', showModelDetail.ageRange)}</span>
 </div>
 <div className="flex justify-between">
 <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500')}>Altura:</span>
 <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium'}>{getModelLabel('height', showModelDetail.height)}</span>
 </div>
 <div className="flex justify-between">
 <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500')}>Cabelo:</span>
 <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium'}>{getModelLabel('hairColor', showModelDetail.hairColor)} - {getModelLabel('hairStyle', showModelDetail.hairStyle)}</span>
 </div>
 <div className="flex justify-between">
 <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500')}>Olhos:</span>
 <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium'}>{getModelLabel('eyeColor', showModelDetail.eyeColor)}</span>
 </div>
 <div className="flex justify-between">
 <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500')}>Expressão:</span>
 <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium'}>{getModelLabel('expression', showModelDetail.expression)}</span>
 </div>
 {showModelDetail.gender === 'woman' && showModelDetail.bustSize && (
 <div className="flex justify-between">
 <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500')}>Busto:</span>
 <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium'}>{getModelLabel('bustSize', showModelDetail.bustSize)}</span>
 </div>
 )}
 {showModelDetail.waistType && (
 <div className="flex justify-between">
 <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500')}>Cintura:</span>
 <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium'}>{getModelLabel('waistType', showModelDetail.waistType)}</span>
 </div>
 )}
 </div>
 </div>
 )}
 </div>
 {/* Footer */}
 <div className={'p-4 border-t flex gap-2 ' + (theme === 'dark' ? 'border-neutral-800' : 'border-gray-200')}>
 {!isDefaultModel(showModelDetail.id) && (
 <>
 <button
 onClick={() => {
 setDeleteModelTarget(showModelDetail);
 setShowDeleteModelConfirm(true);
 }}
 className={(theme === 'dark' ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50') + ' px-4 py-2 rounded-lg text-sm font-medium transition-colors'}
 >
 <i className="fas fa-trash mr-2"></i>Excluir
 </button>
 <button
 onClick={() => {
 setRenameValue(showModelDetail.name);
 setRenamingModel(showModelDetail);
 setShowModelDetail(null);
 }}
 className={(theme === 'dark' ? 'text-neutral-400 hover:bg-neutral-800' : 'text-gray-500 hover:bg-gray-100') + ' px-4 py-2 rounded-lg text-sm font-medium transition-colors'}
 >
 <i className="fas fa-edit mr-2"></i>Renomear
 </button>
 </>
 )}
 {isDefaultModel(showModelDetail.id) && (
 <span className="text-[#FF9F43] text-xs flex items-center px-2">
 <i className="fas fa-info-circle mr-1.5"></i>Modelo padrão — incluso no plano
 </span>
 )}
 <button
 onClick={() => setShowModelDetail(null)}
 className="flex-1 px-4 py-2 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-lg text-sm font-medium"
 >
 Fechar
 </button>
 </div>
 </div>
 </div>
 )}
 {/* RENAME MODEL MODAL */}
 {renamingModel && (
 <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setRenamingModel(null)}>
 <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200') + ' rounded-2xl border w-full max-w-sm p-6'} onClick={(e) => e.stopPropagation()}>
 <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold mb-4'}>Renomear Modelo</h3>
 <input
 type="text"
 value={renameValue}
 onChange={(e) => setRenameValue(e.target.value)}
 maxLength={30}
 onKeyDown={(e) => {
 if (e.key === 'Enter' && renameValue.trim() && !savingRename) {
 (async () => {
 setSavingRename(true);
 try {
 const { error } = await supabase.from('saved_models').update({ name: renameValue.trim() }).eq('id', renamingModel.id);
 if (error) throw error;
 await loadSavedModels();
 setRenamingModel(null);
 showToast('Modelo renomeado', 'success');
 } catch (err) { console.error('Erro ao renomear:', err); showToast('Erro ao renomear modelo', 'error'); }
 finally { setSavingRename(false); }
 })();
 }
 }}
 className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400') + ' w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]/50'}
 placeholder="Nome do modelo"
 autoFocus
 />
 <div className="flex gap-3 mt-4">
 <button
 onClick={() => setRenamingModel(null)}
 className={(theme === 'dark' ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200') + ' flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors'}
 >
 Cancelar
 </button>
 <button
 disabled={!renameValue.trim() || savingRename}
 onClick={async () => {
 setSavingRename(true);
 try {
 const { error } = await supabase.from('saved_models').update({ name: renameValue.trim() }).eq('id', renamingModel.id);
 if (error) throw error;
 await loadSavedModels();
 setRenamingModel(null);
 showToast('Modelo renomeado', 'success');
 } catch (err) { console.error('Erro ao renomear:', err); showToast('Erro ao renomear modelo', 'error'); }
 finally { setSavingRename(false); }
 }}
 className={'flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-colors ' + (!renameValue.trim() || savingRename ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] hover:opacity-90')}
 >
 {savingRename ? 'Salvando...' : 'Salvar'}
 </button>
 </div>
 </div>
 </div>
 )}
 {/* DELETE CONFIRM MODAL */}
 {showDeleteModelConfirm && deleteModelTarget && (
 <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowDeleteModelConfirm(false)}>
 <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200') + ' rounded-2xl border w-full max-w-xs p-5'} onClick={(e) => e.stopPropagation()}>
 <div className="text-center mb-4">
 <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-3">
  <i className="fas fa-trash text-red-500"></i>
 </div>
 <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-semibold text-sm'}>Excluir "{deleteModelTarget.name}"?</h3>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs mt-1'}>Esta ação pode ser desfeita nos próximos segundos.</p>
 </div>
 <div className="flex gap-2">
 <button onClick={() => setShowDeleteModelConfirm(false)} className={(theme === 'dark' ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200') + ' flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors'}>
  Cancelar
 </button>
 <button onClick={() => { deleteModel(deleteModelTarget); setShowDeleteModelConfirm(false); setShowModelDetail(null); }} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors">
  Excluir
 </button>
 </div>
 </div>
 </div>
 )}
 </>
 );
};

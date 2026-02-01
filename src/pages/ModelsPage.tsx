import React, { useState, useEffect } from 'react';
import { SavedModel, MODEL_OPTIONS } from '../types';
import { useUI } from '../contexts/UIContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';
import { generateModelImages } from '../lib/api/studio';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { OptimizedImage } from '../components/OptimizedImage';

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

interface ModelsPageProps {
 savedModels: SavedModel[];
 setSavedModels: React.Dispatch<React.SetStateAction<SavedModel[]>>;
 showCreateModel: boolean;
 setShowCreateModel: (v: boolean) => void;
}

export const ModelsPage: React.FC<ModelsPageProps> = ({
 savedModels,
 setSavedModels,
 showCreateModel,
 setShowCreateModel,
}) => {
 const { theme, navigateTo } = useUI();
 const { user } = useAuth();

 // Model states
 const [showModelDetail, setShowModelDetail] = useState<SavedModel | null>(null);
 const [editingModel, setEditingModel] = useState<SavedModel | null>(null);
 const [modelWizardStep, setModelWizardStep] = useState<1 | 2 | 3 | 4 | 5>(1);
 const [newModel, setNewModel] = useState({
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
 if (showCreateModel) { setShowCreateModel(false); setEditingModel(null); }
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
 }
 };

 // Carregar modelos ao autenticar
 useEffect(() => {
 if (user) {
 loadSavedModels();
 }
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
 setEditingModel(null);
 setModelPreviewImages(null);
 setGeneratingModelImages(false);
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
 'baby': '0-2 years old baby', 'child': '3-12 years old child', 'teen': '13-19 years old teenager',
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
 if (newModel.gender === 'woman' && newModel.bustSize) bodyParts.push(t('bustSize', newModel.bustSize));
 if (newModel.waistType) bodyParts.push(t('waistType', newModel.waistType));
 const bodySpecifics = bodyParts.join(', ');

 let prompt = `${subject}. ${hair}. ${face}`;
 if (bodySpecifics) prompt += `. ${bodySpecifics}`;

 const notes = [];
 if (newModel.physicalNotes) notes.push(`Physical: ${newModel.physicalNotes}`);
 if (newModel.hairNotes) notes.push(`Hair: ${newModel.hairNotes}`);
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

 setGeneratingModelImages(true);
 setModelPreviewImages(null);
 setModelGenerationProgress(0);
 setModelGenerationStep('front');

 let currentProgress = 0;
 const progressInterval = setInterval(() => {
 currentProgress += Math.random() * 2 + 0.5;
 if (currentProgress < 50) {
 setModelGenerationStep('front');
 } else if (currentProgress < 95) {
 setModelGenerationStep('back');
 }
 if (currentProgress >= 95) {
 currentProgress = 95;
 clearInterval(progressInterval);
 }
 setModelGenerationProgress(Math.round(currentProgress));
 }, 1000);

 try {
 const result = await generateModelImages({
 modelId: 'preview-' + Date.now(),
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
 bustSize: newModel.gender === 'woman' ? newModel.bustSize : undefined,
 waistType: newModel.waistType,
 physicalNotes: newModel.physicalNotes || undefined,
 hairNotes: newModel.hairNotes || undefined,
 skinNotes: newModel.skinNotes || undefined,
 },
 prompt: generateModelPrompt(),
 });

 clearInterval(progressInterval);
 setModelGenerationProgress(100);
 setModelGenerationStep('done');

 if (result.success && result.model?.images) {
 setModelPreviewImages(result.model.images);
 } else {
 throw new Error(result.error || 'Erro ao gerar preview');
 }
 } catch (error) {
 clearInterval(progressInterval);
 console.error('Erro ao gerar preview:', error);
 alert('Erro ao gerar preview do modelo. Tente novamente.');
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
 bust_size: newModel.gender === 'woman' ? newModel.bustSize : null,
 waist_type: newModel.gender === 'woman' ? newModel.waistType : null,
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

 return result;
 } catch (error) {
 console.error('Erro ao salvar modelo:', error);
 alert('Erro ao salvar modelo. Tente novamente.');
 return null;
 } finally {
 setSavingModel(false);
 }
 };

 const deleteModel = async (model: SavedModel) => {
 if (!user) return;

 try {
 if (model.referenceStoragePath) {
 await supabase.storage
 .from('model-references')
 .remove([model.referenceStoragePath]);
 }

 if (model.images) {
 const imagePaths = [];
 if (model.images.front) imagePaths.push(`${user.id}/${model.id}/front.png`);
 if (model.images.back) imagePaths.push(`${user.id}/${model.id}/back.png`);
 if (imagePaths.length > 0) {
 await supabase.storage.from('model-images').remove(imagePaths);
 }
 }

 const { error } = await supabase
 .from('saved_models')
 .delete()
 .eq('id', model.id)
 .eq('user_id', user.id);

 if (error) throw error;

 setSavedModels(prev => prev.filter(m => m.id !== model.id));
 if (showModelDetail?.id === model.id) {
 setShowModelDetail(null);
 }
 } catch (error) {
 console.error('Erro ao deletar modelo:', error);
 alert('Erro ao deletar modelo.');
 }
 };

 const getModelLabel = (field: keyof typeof MODEL_OPTIONS, id: string) => {
 const options = MODEL_OPTIONS[field] as { id: string; label: string }[];
 return options?.find(o => o.id === id)?.label || id;
 };

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
 </span>
 <button
 onClick={() => { resetModelWizard(); setShowCreateModel(true); }}
 disabled={!canCreateModel()}
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
 <option value="very-light">Muito Claro</option>
 <option value="light">Claro</option>
 <option value="medium">Médio</option>
 <option value="tan">Bronzeado</option>
 <option value="dark">Escuro</option>
 <option value="very-dark">Muito Escuro</option>
 </select>
 {/* Idade */}
 <select
 value={modelFilterAge}
 onChange={(e) => setModelFilterAge(e.target.value)}
 className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' px-2 py-1.5 border rounded-lg text-xs'}
 >
 <option value="">Idade</option>
 <option value="young">18-25 anos</option>
 <option value="adult">26-35 anos</option>
 <option value="mature">36-50 anos</option>
 <option value="senior">50+ anos</option>
 </select>
 {/* Tipo Físico */}
 <select
 value={modelFilterBodyType}
 onChange={(e) => setModelFilterBodyType(e.target.value)}
 className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' px-2 py-1.5 border rounded-lg text-xs'}
 >
 <option value="">Tipo Físico</option>
 <option value="slim">Magro(a)</option>
 <option value="athletic">Atlético(a)</option>
 <option value="average">Médio</option>
 <option value="curvy">Curvilíneo(a)</option>
 <option value="plussize">Plus Size</option>
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

 {/* Empty State */}
 {savedModels.length === 0 ? (
 <div className={'rounded-2xl p-12 text-center ' + (theme === 'dark' ? 'bg-neutral-900 border border-neutral-800' : 'bg-white border border-gray-100 ')}>
 <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-r from-[#E91E8C]/10 to-[#FF9F43]/10 flex items-center justify-center">
 <i className="fas fa-user-tie text-3xl text-[#E91E8C]"></i>
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
 /* Models Grid - Vertical Cards */
 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
 {savedModels
 .filter(model => {
 if (modelFilterSearch && !model.name.toLowerCase().includes(modelFilterSearch.toLowerCase())) return false;
 if (modelFilterGender && model.gender !== modelFilterGender) return false;
 if (modelFilterSkinTone && model.skinTone !== modelFilterSkinTone) return false;
 if (modelFilterAge && model.ageRange !== modelFilterAge) return false;
 if (modelFilterBodyType && model.bodyType !== modelFilterBodyType) return false;
 return true;
 })
 .map(model => {
 const images = [
 { key: 'front', label: 'Frente', src: model.images.front },
 { key: 'back', label: 'Costas', src: model.images.back },
 ].filter(img => img.src);
 return (
 <div
 key={model.id}
 onClick={() => setShowModelDetail(model)}
 className={'rounded-2xl overflow-hidden cursor-pointer transition-all hover:scale-[1.02] group ' + (theme === 'dark' ? 'bg-neutral-900 border border-neutral-800 hover:border-neutral-500' : 'bg-white border border-gray-100 ')}
 >
 {/* Image Carousel */}
 <div className={'relative aspect-[3/4] flex items-center justify-center ' + (theme === 'dark' ? 'bg-neutral-800' : 'bg-gradient-to-br from-[#E91E8C]/5 to-[#FF9F43]/5')}>
 {images.length > 0 ? (
 <ModelCardCarousel
 images={images}
 modelName={model.name}
 onCardClick={() => setShowModelDetail(model)}
 />
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
 <div className="w-16 h-16">
 <DotLottieReact
 src="https://lottie.host/d29d70f3-bf03-4212-b53f-932dbefb9077/kIkLDFupvi.lottie"
 loop
 autoplay
 style={{ width: '100%', height: '100%' }}
 />
 </div>
 </div>
 )}
 {/* Status Badge */}
 <div className={'absolute top-2 right-2 px-2 py-1 rounded-full text-[10px] font-medium ' + (
 model.status === 'ready' ? 'bg-green-500/20 text-green-400 backdrop-blur-sm' :
 model.status === 'generating' ? 'bg-yellow-500/20 text-yellow-400 backdrop-blur-sm' :
 model.status === 'error' ? 'bg-red-500/20 text-red-400 backdrop-blur-sm' :
 'bg-neutral-500/20 text-neutral-400 backdrop-blur-sm'
 )}>
 {model.status === 'ready' ? 'Pronto' : model.status === 'generating' ? 'Gerando...' : model.status === 'error' ? 'Erro' : 'Rascunho'}
 </div>
 </div>
 {/* Info */}
 <div className="p-3">
 <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-semibold text-sm mb-1.5 truncate'}>{model.name}</h3>
 <div className="flex flex-wrap gap-1">
 <span className={(theme === 'dark' ? 'bg-neutral-800 text-neutral-400' : 'bg-gray-100 text-gray-600') + ' px-1.5 py-0.5 rounded text-[9px]'}>
 {getModelLabel('gender', model.gender)}
 </span>
 <span className={(theme === 'dark' ? 'bg-neutral-800 text-neutral-400' : 'bg-gray-100 text-gray-600') + ' px-1.5 py-0.5 rounded text-[9px]'}>
 {getModelLabel('skinTone', model.skinTone)}
 </span>
 <span className={(theme === 'dark' ? 'bg-neutral-800 text-neutral-400' : 'bg-gray-100 text-gray-600') + ' px-1.5 py-0.5 rounded text-[9px]'}>
 {getModelLabel('ageRange', model.ageRange)}
 </span>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 )}

 {/* Nenhum resultado com filtros */}
 {savedModels.length > 0 && savedModels.filter(model => {
 if (modelFilterSearch && !model.name.toLowerCase().includes(modelFilterSearch.toLowerCase())) return false;
 if (modelFilterGender && model.gender !== modelFilterGender) return false;
 if (modelFilterSkinTone && model.skinTone !== modelFilterSkinTone) return false;
 if (modelFilterAge && model.ageRange !== modelFilterAge) return false;
 if (modelFilterBodyType && model.bodyType !== modelFilterBodyType) return false;
 return true;
 }).length === 0 && (
 <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200') + ' rounded-xl border p-8 text-center'}>
 <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-filter text-3xl mb-3'}></i>
 <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' text-sm'}>Nenhum modelo encontrado com os filtros selecionados</p>
 </div>
 )}
 </div>
 </div>

 {/* CREATE MODEL WIZARD MODAL */}
 {showCreateModel && (
 <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => { setShowCreateModel(false); setEditingModel(null); }}>
 <div className={(theme === 'dark' ? 'bg-neutral-900/95 backdrop-blur-2xl border-neutral-800' : 'bg-white/95 backdrop-blur-2xl border-gray-200') + ' rounded-t-2xl md:rounded-2xl border w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col safe-area-bottom-sheet'} onClick={(e) => e.stopPropagation()}>
 {/* Drag handle - mobile */}
 <div className="md:hidden pt-3 pb-1 flex justify-center">
 <div className={(theme === 'dark' ? 'bg-gray-300' : 'bg-gray-300') + ' w-10 h-1 rounded-full'}></div>
 </div>
 {/* Header com Steps */}
 <div className={'p-4 border-b ' + (theme === 'dark' ? 'border-neutral-800' : 'border-gray-200')}>
 <div className="flex items-center justify-between mb-3">
 <h2 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold font-serif'}>
 {editingModel ? 'Editar Modelo' : 'Criar Modelo'}
 </h2>
 <div className="hidden md:flex items-center gap-2">
 <button onClick={() => { setShowCreateModel(false); setEditingModel(null); }} className={(theme === 'dark' ? 'text-neutral-500 hover:text-white' : 'text-gray-400 hover:text-gray-600') + ' transition-colors'}>
 <i className="fas fa-times"></i>
 </button>
 </div>
 </div>
 {/* Step Indicators */}
 <div className="flex items-center justify-between gap-2">
 {[
 { step: 1, label: 'Gênero' },
 { step: 2, label: 'Físico' },
 { step: 3, label: 'Aparência' },
 { step: 4, label: 'Proporções' },
 { step: 5, label: 'Finalizar' },
 ].map(({ step, label }) => (
 <div key={step} className="flex-1 text-center">
 <div className={'mx-auto w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium mb-1 transition-all ' + (
 modelWizardStep === step
 ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white'
 : modelWizardStep > step
 ? (theme === 'dark' ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600')
 : (theme === 'dark' ? 'bg-neutral-800 text-neutral-500' : 'bg-gray-100 text-gray-400')
 )}>
 {modelWizardStep > step ? <i className="fas fa-check text-[10px]"></i> : step}
 </div>
 <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>{label}</span>
 </div>
 ))}
 </div>
 </div>

 {/* Content */}
 <div className="flex-1 overflow-y-auto p-4">
 {/* Step 1: Gênero */}
 {modelWizardStep === 1 && (
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
 ? 'border-[#E91E8C]/50 bg-gradient-to-r from-[#E91E8C]/15 to-[#FF9F43]/15'
 : (theme === 'dark' ? 'border-neutral-800 hover:border-neutral-700' : 'border-gray-200 hover:border-neutral-500')
 )}
 >
 <i className={'fas ' + (opt.id === 'woman' ? 'fa-venus' : 'fa-mars') + ' text-4xl mb-3 ' + (newModel.gender === opt.id ? 'text-[#E91E8C]' : (theme === 'dark' ? 'text-neutral-500' : 'text-gray-400'))}></i>
 <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-base font-medium'}>{opt.label}</p>
 </button>
 ))}
 </div>
 </div>
 )}

 {/* Step 2: Físico */}
 {modelWizardStep === 2 && (
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
 Altura: <span className="text-[#E91E8C]">{MODEL_OPTIONS.height.find(h => h.id === newModel.height)?.label}</span>
 </label>
 <input
 type="range"
 min={0}
 max={2}
 value={MODEL_OPTIONS.height.findIndex(h => h.id === newModel.height)}
 onChange={(e) => setNewModel({ ...newModel, height: MODEL_OPTIONS.height[Number(e.target.value)].id })}
 className={'w-full h-2 rounded-full appearance-none cursor-pointer ' + (theme === 'dark' ? 'bg-gray-300' : 'bg-gray-200') + `
 [&::-webkit-slider-thumb]:appearance-none
 [&::-webkit-slider-thumb]:w-5
 [&::-webkit-slider-thumb]:h-5
 [&::-webkit-slider-thumb]:rounded-full
 [&::-webkit-slider-thumb]:bg-gradient-to-r
 [&::-webkit-slider-thumb]:from-[#E91E8C]
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

 {/* Step 3: Aparência */}
 {modelWizardStep === 3 && (
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
 Tamanho do Cabelo: <span className="text-[#E91E8C]">{MODEL_OPTIONS.hairLength.find(h => h.id === newModel.hairLength)?.label}</span>
 </label>
 <input
 type="range"
 min={0}
 max={5}
 value={MODEL_OPTIONS.hairLength.findIndex(h => h.id === newModel.hairLength)}
 onChange={(e) => setNewModel({ ...newModel, hairLength: MODEL_OPTIONS.hairLength[Number(e.target.value)].id })}
 className={'w-full h-2 rounded-full appearance-none cursor-pointer ' + (theme === 'dark' ? 'bg-gray-300' : 'bg-gray-200') + `
 [&::-webkit-slider-thumb]:appearance-none
 [&::-webkit-slider-thumb]:w-5
 [&::-webkit-slider-thumb]:h-5
 [&::-webkit-slider-thumb]:rounded-full
 [&::-webkit-slider-thumb]:bg-gradient-to-r
 [&::-webkit-slider-thumb]:from-[#E91E8C]
 [&::-webkit-slider-thumb]:to-[#FF9F43]
 [&::-webkit-slider-thumb]:cursor-pointer
 [&::-webkit-slider-thumb]:`}
 />
 <div className={'flex justify-between text-[10px] mt-1.5 ' + (theme === 'dark' ? 'text-neutral-600' : 'text-gray-400')}>
 <span>Careca</span>
 <span>Muito longo</span>
 </div>
 </div>

 {/* Observações do Cabelo (desabilitado se careca) */}
 <div className={'transition-opacity ' + (newModel.hairLength === 'bald' ? 'opacity-40 pointer-events-none' : '')}>
 <label className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs font-medium block mb-2'}>Observações do Cabelo <span className="text-neutral-500">(opcional)</span></label>
 <input
 type="text"
 value={newModel.hairNotes}
 onChange={(e) => setNewModel({ ...newModel, hairNotes: e.target.value })}
 placeholder="Ex: Franja, mechas coloridas, raspado nas laterais..."
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

 {/* Step 4: Proporções */}
 {modelWizardStep === 4 && (
 <div className="space-y-4">
 {/* Tamanho do Busto - Slider (3 opções, só para mulheres) */}
 {newModel.gender === 'woman' && (
 <div>
 <label className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs font-medium block mb-2'}>
 Tamanho do Busto: <span className="text-[#E91E8C]">{MODEL_OPTIONS.bustSize.find(b => b.id === newModel.bustSize)?.label}</span>
 </label>
 <input
 type="range"
 min={0}
 max={2}
 value={MODEL_OPTIONS.bustSize.findIndex(b => b.id === newModel.bustSize)}
 onChange={(e) => setNewModel({ ...newModel, bustSize: MODEL_OPTIONS.bustSize[Number(e.target.value)].id })}
 className={'w-full h-2 rounded-full appearance-none cursor-pointer ' + (theme === 'dark' ? 'bg-gray-300' : 'bg-gray-200') + `
 [&::-webkit-slider-thumb]:appearance-none
 [&::-webkit-slider-thumb]:w-5
 [&::-webkit-slider-thumb]:h-5
 [&::-webkit-slider-thumb]:rounded-full
 [&::-webkit-slider-thumb]:bg-gradient-to-r
 [&::-webkit-slider-thumb]:from-[#E91E8C]
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

 {/* Tipo de Cintura - Slider (3 opções) */}
 <div>
 <label className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs font-medium block mb-2'}>
 Tipo de Cintura: <span className="text-[#E91E8C]">{MODEL_OPTIONS.waistType.find(w => w.id === newModel.waistType)?.label}</span>
 </label>
 <input
 type="range"
 min={0}
 max={2}
 value={MODEL_OPTIONS.waistType.findIndex(w => w.id === newModel.waistType)}
 onChange={(e) => setNewModel({ ...newModel, waistType: MODEL_OPTIONS.waistType[Number(e.target.value)].id })}
 className={'w-full h-2 rounded-full appearance-none cursor-pointer ' + (theme === 'dark' ? 'bg-gray-300' : 'bg-gray-200') + `
 [&::-webkit-slider-thumb]:appearance-none
 [&::-webkit-slider-thumb]:w-5
 [&::-webkit-slider-thumb]:h-5
 [&::-webkit-slider-thumb]:rounded-full
 [&::-webkit-slider-thumb]:bg-gradient-to-r
 [&::-webkit-slider-thumb]:from-[#E91E8C]
 [&::-webkit-slider-thumb]:to-[#FF9F43]
 [&::-webkit-slider-thumb]:cursor-pointer
 [&::-webkit-slider-thumb]:`}
 />
 <div className={'flex justify-between text-[10px] mt-1.5 ' + (theme === 'dark' ? 'text-neutral-600' : 'text-gray-400')}>
 <span>Fina</span>
 <span>Média</span>
 <span>Larga</span>
 </div>
 </div>

 {/* Mensagem para homens */}
 {newModel.gender === 'man' && (
 <div className={(theme === 'dark' ? 'bg-neutral-800/50' : 'bg-gray-50') + ' rounded-xl p-4 text-center'}>
 <i className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-400') + ' fas fa-info-circle text-lg mb-2'}></i>
 <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' text-xs'}>
 Para modelos masculinos, apenas a cintura é configurável nesta etapa.
 </p>
 </div>
 )}
 </div>
 )}

 {/* Step 5: Criar e Visualizar */}
 {modelWizardStep === 5 && (
 <div className="space-y-4">
 {/* Estado: Gerando */}
 {generatingModelImages && (
 <div className="text-center py-4">
 <div className="w-20 h-20 mx-auto mb-4">
 <DotLottieReact
 src="https://lottie.host/d29d70f3-bf03-4212-b53f-932dbefb9077/kIkLDFupvi.lottie"
 loop
 autoplay
 style={{ width: '100%', height: '100%' }}
 />
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
 isCompleted ? 'bg-green-500' : isCurrent ? 'bg-[#E91E8C]/100' : (theme === 'dark' ? 'bg-gray-300' : 'bg-gray-300')
 }`}>
 {isCompleted ? (
 <i className="fas fa-check text-white text-xs"></i>
 ) : isCurrent ? (
 <i className="fas fa-spinner fa-spin text-white text-xs"></i>
 ) : (
 <i className={`fas ${step.icon} ${theme === 'dark' ? 'text-neutral-500' : 'text-gray-500'} text-xs`}></i>
 )}
 </div>
 <span className={`${isCompleted ? 'text-green-400' : isCurrent ? (theme === 'dark' ? 'text-white' : 'text-gray-900') : (theme === 'dark' ? 'text-neutral-500' : 'text-gray-500')} text-[10px]`}>
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
 <p className={(theme === 'dark' ? 'text-green-400' : 'text-green-600') + ' text-sm'}>
 <i className="fas fa-check-circle mr-1"></i>Modelo criado com sucesso!
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
 className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400') + ' w-full px-3 py-2.5 rounded-lg border text-sm'}
 />
 </div>

 {/* Preview humanizado do modelo */}
 <div className={(theme === 'dark' ? 'bg-gradient-to-br from-[#E91E8C]/10 to-[#FF9F43]/10 border-[#E91E8C]/20' : 'bg-gradient-to-br from-[#E91E8C]/5 to-[#FF9F43]/5 border-[#E91E8C]/20') + ' rounded-xl p-4 border'}>
 <div className="flex items-start gap-3">
 <div className={'w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ' + (newModel.gender === 'woman' ? 'bg-gradient-to-br from-[#FF6B6B] to-[#FF9F43]' : 'bg-gradient-to-br from-blue-400 to-indigo-500')}>
 <i className={'fas ' + (newModel.gender === 'woman' ? 'fa-venus' : 'fa-mars') + ' text-white text-lg'}></i>
 </div>
 <div className="flex-1">
 <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' text-[10px] font-medium uppercase tracking-wide mb-1.5'}>
 <i className="fas fa-sparkles text-[#E91E8C] mr-1"></i>O que será gerado
 </p>
 <p className={(theme === 'dark' ? 'text-white' : 'text-gray-800') + ' text-sm leading-relaxed'}>
 {newModel.name || (newModel.gender === 'woman' ? 'Ela' : 'Ele')} terá{' '}
 <span className="text-[#E91E8C] font-medium">olhos {getModelLabel('eyeColor', newModel.eyeColor).toLowerCase()}</span>
 {newModel.hairLength === 'bald' ? (
 <> e será <span className="text-[#E91E8C] font-medium">careca</span>.</>
 ) : (
 <>, cabelo <span className="text-[#E91E8C] font-medium">{getModelLabel('hairColor', newModel.hairColor).toLowerCase()}</span>{' '}
 <span className="text-[#E91E8C] font-medium">{getModelLabel('hairLength', newModel.hairLength).toLowerCase()}</span>{' '}
 e <span className="text-[#E91E8C] font-medium">{getModelLabel('hairStyle', newModel.hairStyle).toLowerCase()}</span>.</>
 )}{' '}
 Corpo <span className="text-[#E91E8C] font-medium">{getModelLabel('bodyType', newModel.bodyType).toLowerCase()}</span>,{' '}
 pele <span className="text-[#E91E8C] font-medium">{getModelLabel('skinTone', newModel.skinTone).toLowerCase()}</span>,{' '}
 estatura <span className="text-[#E91E8C] font-medium">{getModelLabel('height', newModel.height).toLowerCase()}</span>{' '}
 e cintura <span className="text-[#E91E8C] font-medium">{getModelLabel('waistType', newModel.waistType).toLowerCase()}</span>
 {newModel.gender === 'woman' && (
 <>, busto <span className="text-[#E91E8C] font-medium">{getModelLabel('bustSize', newModel.bustSize).toLowerCase()}</span></>
 )}.{' '}
 Expressão <span className="text-[#E91E8C] font-medium">{getModelLabel('expression', newModel.expression).toLowerCase()}</span>.
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
 {/* Steps 1-4: Cancelar/Voltar + Próximo */}
 {modelWizardStep < 5 && (
 <>
 <button
 onClick={() => modelWizardStep > 1 ? setModelWizardStep((modelWizardStep - 1) as 1 | 2 | 3 | 4 | 5) : (setShowCreateModel(false), setEditingModel(null))}
 className={(theme === 'dark' ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-gray-700') + ' px-4 py-2 text-sm font-medium transition-colors'}
 >
 {modelWizardStep === 1 ? 'Cancelar' : 'Voltar'}
 </button>
 <button
 onClick={() => setModelWizardStep((modelWizardStep + 1) as 1 | 2 | 3 | 4 | 5)}
 className="px-4 py-2 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-lg text-sm font-medium"
 >
 Próximo
 </button>
 </>
 )}

 {/* Step 5: Estados diferentes */}
 {modelWizardStep === 5 && (
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
 onClick={() => setModelWizardStep(4)}
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
 className={(theme === 'dark' ? 'hover:bg-gray-300 text-white' : 'hover:bg-gray-50 text-gray-900') + ' w-full px-4 py-3 text-left text-sm flex items-center gap-3 transition-colors'}
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
 className={(theme === 'dark' ? 'hover:bg-gray-300 text-white' : 'hover:bg-gray-50 text-gray-900') + ' w-full px-4 py-3 text-left text-sm flex items-center gap-3 transition-colors'}
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
 className={(theme === 'dark' ? 'hover:bg-gray-300 text-white' : 'hover:bg-gray-50 text-gray-900') + ' w-full px-4 py-3 text-left text-sm flex items-center gap-3 transition-colors'}
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
 <div className={(theme === 'dark' ? 'bg-gray-300' : 'bg-gray-300') + ' w-10 h-1 rounded-full'}></div>
 </div>
 {/* Header */}
 <div className={'p-4 border-b flex items-center justify-between ' + (theme === 'dark' ? 'border-neutral-800' : 'border-gray-200')}>
 <h2 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold font-serif'}>{showModelDetail.name}</h2>
 <button onClick={() => setShowModelDetail(null)} className={(theme === 'dark' ? 'text-neutral-500 hover:text-white' : 'text-gray-400 hover:text-gray-600') + ' hidden md:block transition-colors'}>
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
 objectFit="cover"
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
 {/* Características */}
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
 </div>
 {/* Footer */}
 <div className={'p-4 border-t flex gap-2 ' + (theme === 'dark' ? 'border-neutral-800' : 'border-gray-200')}>
 <button
 onClick={() => {
 if (window.confirm('Tem certeza que deseja excluir este modelo?')) {
 deleteModel(showModelDetail);
 setShowModelDetail(null);
 }
 }}
 className={(theme === 'dark' ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50') + ' px-4 py-2 rounded-lg text-sm font-medium transition-colors'}
 >
 <i className="fas fa-trash mr-2"></i>Excluir
 </button>
 <button
 onClick={() => {
 setNewModel({
 name: showModelDetail.name,
 gender: showModelDetail.gender,
 ethnicity: showModelDetail.ethnicity,
 skinTone: showModelDetail.skinTone,
 bodyType: showModelDetail.bodyType,
 ageRange: showModelDetail.ageRange,
 height: showModelDetail.height,
 hairColor: showModelDetail.hairColor,
 hairStyle: showModelDetail.hairStyle,
 hairLength: (showModelDetail as any).hairLength || 'medium',
 eyeColor: showModelDetail.eyeColor,
 expression: showModelDetail.expression,
 bustSize: showModelDetail.bustSize || 'medium',
 waistType: showModelDetail.waistType || 'medium',
 referenceImage: showModelDetail.referenceImageUrl || null,
 physicalNotes: (showModelDetail as any).physicalNotes || '',
 hairNotes: (showModelDetail as any).hairNotes || '',
 skinNotes: (showModelDetail as any).skinNotes || '',
 });
 setEditingModel(showModelDetail);
 setModelWizardStep(1);
 setShowModelDetail(null);
 setShowCreateModel(true);
 }}
 className={(theme === 'dark' ? 'text-neutral-400 hover:bg-neutral-800' : 'text-gray-500 hover:bg-gray-100') + ' px-4 py-2 rounded-lg text-sm font-medium transition-colors'}
 >
 <i className="fas fa-edit mr-2"></i>Editar
 </button>
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
 </>
 );
};

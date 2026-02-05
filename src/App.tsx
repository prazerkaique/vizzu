import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { AuthPage } from './components/AuthPage';
import { CreditExhaustedModal } from './components/CreditExhaustedModal';
import { LoadingSkeleton } from './components/LoadingSkeleton';

// Lazy loading dos componentes pesados (carrega só quando acessar)
const VizzuLookComposer = lazy(() => import('./components/LookComposer').then(m => ({ default: m.LookComposer })));
const ProductStudio = lazy(() => import('./components/ProductStudio').then(m => ({ default: m.ProductStudio })));
const VizzuProvadorWizard = lazy(() => import('./components/Provador/VizzuProvadorWizard').then(m => ({ default: m.VizzuProvadorWizard })));
const CreativeStill = lazy(() => import('./components/CreativeStill').then(m => ({ default: m.CreativeStill })));

import { Product, Client, ClientPhoto, ClientLook, WhatsAppTemplate, LookComposition, SavedModel } from './types';
import { useUI, type Page } from './contexts/UIContext';
import { useAuth } from './contexts/AuthContext';
import { useHistory } from './contexts/HistoryContext';
import { useProducts } from './contexts/ProductsContext';
import { useClients } from './contexts/ClientsContext';
import { useCredits } from './hooks/useCredits';
import { usePlans } from './contexts/PlansContext';
import { useGeneration } from './contexts/GenerationContext';
import { supabase } from './services/supabaseClient';
import { generateProvador, sendWhatsAppMessage } from './lib/api/studio';
import { cancelSubscription } from './lib/api/billing';
import { smartDownload } from './utils/downloadHelper';
import { runFullMigration, runProductMigration, runStorageMigration } from './utils/imageMigration';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { ClientsPage } from './pages/ClientsPage';
import { ModelsPage, DEFAULT_MODELS } from './pages/ModelsPage';
import { SettingsPage } from './pages/SettingsPage';
import { CreateHubPage } from './pages/CreateHubPage';
import { AppLayout } from './components/Layout/AppLayout';

// Expor funções de migração globalmente para uso via Console (F12)
declare global {
 interface Window {
 vizzu: {
 comprimirImagens: typeof runFullMigration;
 comprimirProdutos: typeof runProductMigration;
 comprimirStorage: typeof runStorageMigration;
 };
 }
}
window.vizzu = {
 comprimirImagens: runFullMigration,
 comprimirProdutos: runProductMigration,
 comprimirStorage: runStorageMigration,
};

const COLLECTIONS = ['Verão 2025', 'Inverno 2025', 'Básicos', 'Premium', 'Promoção'];

const DEFAULT_WHATSAPP_TEMPLATES: WhatsAppTemplate[] = [
 { id: '1', name: 'Provador Virtual', message: 'Oi {nome}! 😍\n\nMontei esse look especial pra você:', isDefault: true },
 { id: '2', name: 'Look Composer', message: 'Oi {nome}! ✨\n\nOlha só o que separei pra você:', isDefault: false },
 { id: '3', name: 'Novidades', message: 'Oi {nome}! 👋\n\nChegou novidade que combina com você:', isDefault: false },
];

function App() {
 // UI state from context
 const { theme, currentPage, navigateTo, goBack, setSettingsTab, showToast, showVideoTutorial, setShowVideoTutorial } = useUI();

 // Auth state from context
 const { user, isAuthenticated, login, loginDemo, logout } = useAuth();
 // History from context
 const { addHistoryLog, loadUserHistory } = useHistory();
 // Products from context
 const { products, setProducts, loadUserProducts, updateProduct: handleUpdateProduct } = useProducts();
 // Clients from context
 const { clients, setClients, clientLooks, setClientLooks, loadUserClients, saveClientToSupabase, getClientPhoto } = useClients();
 const [productForCreation, setProductForCreation] = useState<Product | null>(null);
 const [showCreateClient, setShowCreateClient] = useState(false);

 // Generation states from context
 const {
   isGeneratingProductStudio, setIsGeneratingProductStudio,
   productStudioMinimized, setProductStudioMinimized,
   productStudioProgress, setProductStudioProgress,
   productStudioLoadingText, setProductStudioLoadingText,
   isGeneratingLookComposer, setIsGeneratingLookComposer,
   lookComposerMinimized, setLookComposerMinimized,
   lookComposerProgress, setLookComposerProgress,
   lookComposerLoadingText, setLookComposerLoadingText,
   isGeneratingProvador, setIsGeneratingProvador,
   provadorMinimized, setProvadorMinimized,
   provadorProgress, setProvadorProgress,
   provadorLoadingIndex, setProvadorLoadingIndex,
   provadorLoadingText,
   isGeneratingCreativeStill, setIsGeneratingCreativeStill,
   creativeStillMinimized, setCreativeStillMinimized,
   creativeStillProgress, setCreativeStillProgress,
   isAnyGenerationRunning,
   minimizedModals, setMinimizedModals,
   closeMinimizedModal,
 } = useGeneration();

 const [provadorClient, setProvadorClient] = useState<Client | null>(null);
 const [createClientFromProvador, setCreateClientFromProvador] = useState(false);
 const [selectedSavedLook, setSelectedSavedLook] = useState<ClientLook | null>(null);

 const [whatsappTemplates] = useState<WhatsAppTemplate[]>(DEFAULT_WHATSAPP_TEMPLATES);

 // Saved Models (shared with LookComposer)
 const [savedModels, setSavedModels] = useState<SavedModel[]>([]);
 const [showCreateModel, setShowCreateModel] = useState(false);
 const restoreModal = (modalId: string) => {
 const modal = minimizedModals.find(m => m.id === modalId);
 if (modal) {
 setMinimizedModals(prev => prev.filter(m => m.id !== modalId));
 // Restore the original modal
 if (modal.type === 'createModel') setShowCreateModel(true);
 // For detail modals, we'd need to store the detail object too
 }
 };

 // Credit Exhausted Modal
 const [showCreditModal, setShowCreditModal] = useState(false);
 const [creditModalContext, setCreditModalContext] = useState<{
 creditsNeeded: number;
 actionContext: 'studio' | 'cenario' | 'lifestyle' | 'video' | 'provador' | 'generic';
 }>({ creditsNeeded: 1, actionContext: 'generic' });

 // Hook de créditos com integração ao backend
 const {
 userCredits,
 currentPlan,
 billingPeriod,
 daysUntilRenewal,
 isCheckoutLoading,
 deductCredits,
 purchaseCredits,
 upgradePlan,
 setBillingPeriod,
 setCredits,
 refresh: refreshBilling,
 } = useCredits({ userId: user?.id, enableBackend: true });

 // Plans from context
 const { plans } = usePlans();

 // Função para verificar créditos e mostrar modal se insuficientes
 const checkCreditsAndShowModal = (
 creditsNeeded: number,
 actionContext: 'studio' | 'cenario' | 'lifestyle' | 'video' | 'provador' | 'generic'
 ): boolean => {
 if (userCredits >= creditsNeeded) {
 return true; // Tem créditos suficientes
 }
 // Mostrar modal de créditos insuficientes
 setCreditModalContext({ creditsNeeded, actionContext });
 setShowCreditModal(true);
 return false;
 };

 // Handler para compra de créditos
 const handleBuyCredits = async (amount: number) => {
 try {
 showToast('Preparando pagamento... Você será redirecionado em instantes.', 'info');
 const result = await purchaseCredits(amount);

 if (result.checkoutUrl) {
 setShowCreditModal(false);
 // Tenta abrir em nova aba; se bloqueado (PWA), redireciona na mesma
 const newWindow = window.open(result.checkoutUrl, '_blank');
 if (!newWindow || newWindow.closed) {
 window.location.href = result.checkoutUrl;
 }
 } else if (result.success) {
 // Modo demo/offline - créditos adicionados localmente
 setShowCreditModal(false);
 addHistoryLog('Créditos adicionados', `${amount} créditos foram adicionados à sua conta`, 'success', [], 'system', 0);
 showToast(`${amount} créditos adicionados!`, 'success');
 } else {
 showToast(result.error || 'Erro ao processar compra', 'error');
 }
 } catch (e: any) {
 console.error('Error buying credits:', e);
 showToast('Erro ao processar compra', 'error');
 }
 };

 // Handler para upgrade de plano
 const handleUpgradePlanFromModal = async (planId: string) => {
 try {
 showToast('Preparando pagamento... Você será redirecionado em instantes.', 'info');
 const result = await upgradePlan(planId);
 const plan = plans.find(p => p.id === planId);

 if (result.checkoutUrl) {
 setShowCreditModal(false);
 // Tenta abrir em nova aba; se bloqueado (PWA), redireciona na mesma
 const newWindow = window.open(result.checkoutUrl, '_blank');
 if (!newWindow || newWindow.closed) {
 window.location.href = result.checkoutUrl;
 }
 } else if (result.success) {
 // Modo demo/offline - plano alterado localmente
 setShowCreditModal(false);
 if (plan) {
 addHistoryLog('Plano atualizado', `Você fez upgrade para o plano ${plan.name}`, 'success', [], 'system', 0);
 showToast(`Upgrade para ${plan.name} realizado!`, 'success');
 }
 } else {
 showToast(result.error || 'Erro ao processar upgrade', 'error');
 }
 } catch (e: any) {
 console.error('Error upgrading plan:', e);
 showToast('Erro ao processar upgrade', 'error');
 }
 };

 // Handler para cancelar assinatura
 const handleCancelSubscription = async () => {
 if (!user?.id) return;
 const confirmed = window.confirm('Tem certeza que deseja cancelar sua assinatura? Você continuará tendo acesso até o fim do período atual.');
 if (!confirmed) return;
 try {
 const result = await cancelSubscription({ userId: user.id });
 if (result.success) {
 showToast('Assinatura será cancelada ao fim do período atual.', 'success');
 refreshBilling();
 } else {
 showToast(result.error || 'Erro ao cancelar assinatura', 'error');
 }
 } catch (e: any) {
 console.error('Error canceling subscription:', e);
 showToast('Erro ao cancelar assinatura', 'error');
 }
 };

 // Load saved models from Supabase
 const loadSavedModels = async (userId: string) => {
 try {
 const { data, error } = await supabase
 .from('saved_models')
 .select('*')
 .eq('user_id', userId)
 .order('created_at', { ascending: false });

 if (error) throw error;

 const models: SavedModel[] = (data || []).map((m: any) => ({
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
 }
 };

 // Load user data when user changes (triggered by AuthContext)
 const prevUserIdRef = useRef<string | null>(null);
 useEffect(() => {
 if (user && user.id !== prevUserIdRef.current) {
 prevUserIdRef.current = user.id;
 loadUserProducts(user.id);
 loadUserClients(user.id);
 loadUserHistory(user.id);
 loadSavedModels(user.id);
 } else if (!user) {
 prevUserIdRef.current = null;
 }
 }, [user]);

 // Checar gerações concluídas em segundo plano ao abrir o app
 useEffect(() => {
 if (!user?.id) return;

 const checkBackgroundGenerations = async () => {
 try {
 // Buscar IDs já notificados do localStorage
 const notifiedKey = `vizzu_bg_notified_${user.id}`;
 const notifiedIds: string[] = JSON.parse(localStorage.getItem(notifiedKey) || '[]');

 // Creative Still completados nas últimas 24h
 const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
 const { data: stills } = await supabase
 .from('creative_still_generations')
 .select('id, created_at')
 .eq('user_id', user.id)
 .eq('status', 'completed')
 .gte('created_at', since);

 // Provador (client_looks) completados nas últimas 24h
 const { data: looks } = await supabase
 .from('client_looks')
 .select('id, created_at')
 .eq('user_id', user.id)
 .gte('created_at', since);

 // Product Studio (generations com output_urls) completados nas últimas 24h
 const { data: psGenerations } = await supabase
 .from('generations')
 .select('id, created_at')
 .eq('user_id', user.id)
 .eq('status', 'completed')
 .not('output_urls', 'is', null)
 .gte('created_at', since);

 // Look Composer (generations com output_image_url, type modelo_ia) completados nas últimas 24h
 const { data: lcGenerations } = await supabase
 .from('generations')
 .select('id, created_at')
 .eq('user_id', user.id)
 .eq('status', 'completed')
 .eq('type', 'modelo_ia')
 .not('output_image_url', 'is', null)
 .gte('created_at', since);

 // Provador (generations com output_image_url, type provador) completados nas últimas 24h
 const { data: provGenerations } = await supabase
 .from('generations')
 .select('id, created_at')
 .eq('user_id', user.id)
 .eq('status', 'completed')
 .eq('type', 'provador')
 .not('output_image_url', 'is', null)
 .gte('created_at', since);

 // Filtrar apenas os que não foram notificados
 const newStills = (stills || []).filter(s => !notifiedIds.includes(`still-${s.id}`));
 const newLooks = (looks || []).filter(l => !notifiedIds.includes(`look-${l.id}`));
 const newPS = (psGenerations || []).filter(g => !notifiedIds.includes(`ps-${g.id}`));
 const newLC = (lcGenerations || []).filter(g => !notifiedIds.includes(`lc-${g.id}`));
 const newProv = (provGenerations || []).filter(g => !notifiedIds.includes(`prov-${g.id}`));
 const total = newStills.length + newLooks.length + newPS.length + newLC.length + newProv.length;

 if (total > 0) {
 // Determinar para onde navegar ao clicar "Ver"
 const targetPage = newStills.length > 0 ? 'creative-still'
 : newPS.length > 0 ? 'product-studio'
 : newLC.length > 0 ? 'look-composer'
 : 'provador';
 showToast(
 total === 1
 ? 'A criação da imagem foi concluída em segundo plano.'
 : `${total} criações foram concluídas em segundo plano.`,
 'success',
 { label: 'Ver', onClick: () => navigateTo(targetPage as any) }
 );

 // Marcar como notificados
 const newNotified = [
 ...notifiedIds,
 ...newStills.map(s => `still-${s.id}`),
 ...newLooks.map(l => `look-${l.id}`),
 ...newPS.map(g => `ps-${g.id}`),
 ...newLC.map(g => `lc-${g.id}`),
 ...newProv.map(g => `prov-${g.id}`),
 ];
 // Manter apenas últimos 200 para não crescer infinitamente
 localStorage.setItem(notifiedKey, JSON.stringify(newNotified.slice(-200)));
 }
 } catch (e) {
 console.error('Erro ao checar gerações em background:', e);
 }
 };

 // Pequeno delay para não competir com o carregamento inicial
 const timeout = setTimeout(checkBackgroundGenerations, 3000);
 return () => clearTimeout(timeout);
 }, [user?.id]);

 // Sincronizar créditos com Supabase quando uma geração termina
 const wasGeneratingRef = useRef(false);
 useEffect(() => {
 if (isAnyGenerationRunning) {
   wasGeneratingRef.current = true;
 } else if (wasGeneratingRef.current) {
   // Geração acabou de terminar — resincronizar saldo real
   wasGeneratingRef.current = false;
   setTimeout(() => refreshBilling(), 2000);
 }
 }, [isAnyGenerationRunning, refreshBilling]);

 // Fechar modais com Esc
 useEffect(() => {
 const handleEsc = (e: KeyboardEvent) => {
 if (e.key === 'Escape') {
 if (showVideoTutorial) setShowVideoTutorial(null);
 }
 };
 window.addEventListener('keydown', handleEsc);
 return () => window.removeEventListener('keydown', handleEsc);
 }, [showVideoTutorial]);

 const handleDeductCredits = (amount: number, reason: string): boolean => {
 return deductCredits(amount, reason);
 };

 // CLIENT LOOKS - Funções para gerenciar looks salvos

 const loadClientLooks = async (clientId: string) => {
 if (!user) return;
 try {
 const { data, error } = await supabase
 .from('client_looks')
 .select('*')
 .eq('client_id', clientId)
 .eq('user_id', user.id)
 .order('created_at', { ascending: false });

 if (error) throw error;

 const looks: ClientLook[] = (data || []).map(l => ({
 id: l.id,
 clientId: l.client_id,
 userId: l.user_id,
 imageUrl: l.image_url,
 storagePath: l.storage_path,
 lookItems: l.look_items || {},
 notes: l.notes,
 createdAt: l.created_at,
 }));

 setClientLooks(looks);
 } catch (error) {
 console.error('Erro ao carregar looks:', error);
 }
 };

 const saveClientLook = async (client: Client, imageUrl: string, lookItems: LookComposition) => {
 if (!user || !client) return null;

 try {
 // Evitar duplicatas — checar se já existe look com essa imagem
 const existing = clientLooks.find(l => l.imageUrl === imageUrl || l.imageUrl?.includes(imageUrl.split('/').pop() || '__none__'));
 if (existing) return existing;

 // Fazer download da imagem e converter para blob
 const response = await fetch(imageUrl);
 if (!response.ok) {
 throw new Error(`Erro ao baixar imagem: ${response.status} ${response.statusText}`);
 }
 const blob = await response.blob();

 // Gerar nome único para o arquivo
 const fileName = `${Date.now()}.png`;
 const storagePath = `${user.id}/${client.id}/${fileName}`;

 // Upload para o Storage
 const { error: uploadError } = await supabase.storage
 .from('client-looks')
 .upload(storagePath, blob, {
 contentType: 'image/png',
 upsert: false
 });

 if (uploadError) throw uploadError;

 // Obter URL pública
 const { data: urlData } = supabase.storage
 .from('client-looks')
 .getPublicUrl(storagePath);

 const publicUrl = urlData.publicUrl;

 // Salvar no banco
 const { data, error } = await supabase
 .from('client_looks')
 .insert({
 client_id: client.id,
 user_id: user.id,
 image_url: publicUrl,
 storage_path: storagePath,
 look_items: lookItems,
 })
 .select()
 .single();

 if (error) throw error;

 const newLook: ClientLook = {
 id: data.id,
 clientId: data.client_id,
 userId: data.user_id,
 imageUrl: data.image_url,
 storagePath: data.storage_path,
 lookItems: data.look_items || {},
 createdAt: data.created_at,
 };

 setClientLooks(prev => [newLook, ...prev]);
 return newLook;
 } catch (error) {
 console.error('Erro ao salvar look:', error);
 alert('Erro ao salvar look. Tente novamente.');
 return null;
 }
 };

 const deleteClientLook = async (look: ClientLook) => {
 if (!user) return;

 try {
 // Deletar do Storage se tiver path
 if (look.storagePath) {
 await supabase.storage
 .from('client-looks')
 .remove([look.storagePath]);
 }

 // Deletar do banco
 const { error } = await supabase
 .from('client_looks')
 .delete()
 .eq('id', look.id)
 .eq('user_id', user.id);

 if (error) throw error;

 setClientLooks(prev => prev.filter(l => l.id !== look.id));

 if (selectedSavedLook?.id === look.id) {
 setSelectedSavedLook(null);
 }
 } catch (error) {
 console.error('Erro ao deletar look:', error);
 alert('Erro ao deletar look.');
 }
 };

 // Carregar looks quando cliente é selecionado no Provador
 useEffect(() => {
 if (provadorClient) {
 loadClientLooks(provadorClient.id);
 } else {
 setClientLooks([]);
 setSelectedSavedLook(null);
 }
 }, [provadorClient?.id]);

 // Handler para salvar modelo a partir do LookComposer
 const handleSaveModel = (model: SavedModel) => {
 setSavedModels(prev => [...prev, model]);
 };

 const handleLogout = async () => {
 await logout();
 setProducts([]);
 };

 // Provador generation + WhatsApp handlers
 const handleProvadorGenerateForWizard = async (
 client: Client,
 photoType: ClientPhoto['type'],
 look: LookComposition,
 resolution: '2k' | '4k' = '2k'
 ): Promise<string | null> => {
 if (!client || !user || Object.keys(look).length === 0) return null;

 // Calcular créditos baseado na resolução (1 base * multiplicador)
 const resolutionMultiplier = resolution === '4k' ? 2 : 1;
 const creditsNeeded = 1 * resolutionMultiplier;

 // Verificar creditos
 if (!checkCreditsAndShowModal(creditsNeeded, 'provador')) {
 return null;
 }

 setIsGeneratingProvador(true);
 setProvadorProgress(0);
 setProvadorLoadingIndex(0);

 // Salvar geração pendente no localStorage (sobrevive ao F5 / fechamento)
 try {
 localStorage.setItem('vizzu-pending-provador', JSON.stringify({
 clientId: client.id,
 clientName: `${client.firstName} ${client.lastName}`,
 userId: user.id,
 startTime: Date.now(),
 }));
 } catch (e) {
 console.error('Erro ao salvar provador pendente:', e);
 }

 // Animacao de loading
 const loadingInterval = setInterval(() => {
 setProvadorLoadingIndex(prev => (prev + 1) % 11);
 }, 3000);

 const progressInterval = setInterval(() => {
 setProvadorProgress(prev => {
 if (prev >= 95) return prev;
 return prev + Math.random() * 5;
 });
 }, 500);

 try {
 // Obter foto do cliente
 const clientPhotoBase64 = getClientPhoto(client, photoType) || '';
 if (!clientPhotoBase64) {
 throw new Error('Foto do cliente nao encontrada');
 }

 // Remover prefixo data:image/... se existir
 const base64Clean = clientPhotoBase64.replace(/^data:image\/\w+;base64,/, '');

 // Montar lookComposition no formato esperado pelo backend
 const lookCompositionPayload: Record<string, { productId: string; imageId?: string; imageUrl: string; name: string; category: string; attributes?: Record<string, string> }> = {};

 for (const [slot, item] of Object.entries(look)) {
 if (item) {
 const product = products.find(p => p.id === item.productId);
 lookCompositionPayload[slot] = {
 productId: item.productId || '',
 imageId: item.imageId,
 imageUrl: item.image,
 name: item.name,
 category: product?.category || 'roupa',
 attributes: product?.attributes || {}
 };
 }
 }

 const result = await generateProvador({
 userId: user.id,
 clientId: client.id,
 clientName: `${client.firstName} ${client.lastName}`,
 clientPhoto: {
 type: photoType,
 base64: base64Clean
 },
 lookComposition: lookCompositionPayload,
 resolution: resolution
 });

 clearInterval(loadingInterval);
 clearInterval(progressInterval);
 setProvadorProgress(100);

 if (result.success && result.generation) {
 if (result.credits_remaining !== undefined) {
 setCredits(result.credits_remaining);
 }
 addHistoryLog('Provador gerado', `Look para ${client.firstName}`, 'success', [], 'ai', 3);

 // Auto-salvar look no Supabase para não perder se o app fechar
 const imageUrl = result.generation.image_url;
 saveClientLook(client, imageUrl, look).catch(err =>
 console.error('Erro ao auto-salvar look:', err)
 );

 // Limpar pendente e marcar como notificado
 try {
 localStorage.removeItem('vizzu-pending-provador');
 if (result.generation.id) {
 const notifiedKey = `vizzu_bg_notified_${user.id}`;
 const notified = JSON.parse(localStorage.getItem(notifiedKey) || '[]');
 notified.push(`prov-${result.generation.id}`);
 localStorage.setItem(notifiedKey, JSON.stringify(notified.slice(-200)));
 }
 } catch (e) {
 console.error('Erro ao marcar provador notificado:', e);
 }

 return imageUrl;
 } else {
 throw new Error(result.message || 'Erro ao gerar imagem');
 }
 } catch (error: any) {
 clearInterval(loadingInterval);
 clearInterval(progressInterval);
 localStorage.removeItem('vizzu-pending-provador');
 console.error('Erro no Provador:', error);
 alert(error.message || 'Erro ao gerar imagem');
 return null;
 } finally {
 setIsGeneratingProvador(false);
 setProvadorProgress(0);
 }
 };

 const handleProvadorSendWhatsAppForWizard = async (client: Client, imageUrl: string, message: string, look: LookComposition) => {
 // A mensagem já vem formatada do wizard (com nome do cliente e itens do look)
 const finalMessage = message;

 // Confirmação antes de enviar
 const confirmMessage = `Deseja enviar um WhatsApp para ${client.firstName} ${client.lastName}?\n\nMensagem:\n"${finalMessage.substring(0, 200)}${finalMessage.length > 200 ? '...' : ''}"`;

 if (!window.confirm(confirmMessage)) {
 return;
 }

 try {
 // Tenta enviar via Evolution API (envia imagem diretamente no WhatsApp)
 const result = await sendWhatsAppMessage({
 phone: client.whatsapp || '',
 message: finalMessage,
 imageUrl: imageUrl,
 clientName: `${client.firstName} ${client.lastName}`,
 });

 if (result.success) {
 alert('WhatsApp enviado com sucesso!');
 return;
 }

 // Evolution API failed, try fallback
 } catch {
 // Evolution API error, use fallback
 }

 // Fallback: Web Share API (mobile) ou wa.me (desktop)
 try {
 const response = await fetch(imageUrl);
 const blob = await response.blob();
 const file = new File([blob], 'look.png', { type: 'image/png' });

 if (navigator.canShare?.({ files: [file] })) {
 await navigator.share({
 files: [file],
 text: finalMessage
 });
 return;
 }
 } catch {
 // Share API failed, use wa.me
 }

 // Final fallback: WhatsApp with text + image link
 const phone = client.whatsapp?.replace(/\D/g, '') || '';
 const fullPhone = phone.startsWith('55') ? phone : '55' + phone;
 const fullMessage = finalMessage + '\n\n' + imageUrl;
 window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(fullMessage)}`, '_blank');
 };

 const handleProvadorDownloadImage = async (imageUrl: string, clientName: string) => {
 await smartDownload(imageUrl, {
 filename: `vizzu_provador_${clientName.replace(/\s+/g, '_')}_${Date.now()}`,
 shareTitle: 'Vizzu Provador',
 shareText: `Look para ${clientName}`
 });
 };

 const handleProvadorGenerateAIMessage = async (clientName: string): Promise<string> => {
 // Gera uma mensagem personalizada que funciona bem com os itens do look abaixo
 const messages = [
 `Oi ${clientName}! 😍\n\nMontei esse look especial pra você:`,
 `Oi ${clientName}! ✨\n\nOlha só o que separei pra você:`,
 `${clientName}! 💜\n\nPrepara o coração pra esse look:`,
 `Oi ${clientName}! 🛍️\n\nVeja esse visual que criei pra você:`,
 `${clientName}! 🔥\n\nTem que ver esse look que montei:`,
 ];
 return messages[Math.floor(Math.random() * messages.length)];
 };

 const handleUpdateClientForProvador = async (client: Client) => {
 // Atualizar no estado local
 setClients(prev => prev.map(c => c.id === client.id ? client : c));

 // Salvar no localStorage
 const updatedClients = clients.map(c => c.id === client.id ? client : c);
 localStorage.setItem('vizzu_clients', JSON.stringify(updatedClients));

 // Salvar no Supabase se usuario logado
 if (user?.id) {
 try {
 await saveClientToSupabase(client, user.id);
 } catch (error) {
 console.error('Erro ao salvar cliente no Supabase:', error);
 }
 }
 };

 // AUTH CHECK

 if (!isAuthenticated) {
 return (
 <AuthPage
 onLogin={(userData) => {
 login(userData as any);
 }}
 onDemoMode={() => {
 loginDemo();
 setCredits(50);
 }}
 />
 );
 }

 // Renderiza página para swipe adjacente (Instagram-style)
 const renderSwipePage = (page: Page): React.ReactNode => {
   switch (page) {
     case 'dashboard': return <DashboardPage />;
     case 'products': return <ProductsPage productForCreation={productForCreation} setProductForCreation={setProductForCreation} />;
     case 'create': return <CreateHubPage userCredits={userCredits} />;
     case 'models': return <ModelsPage savedModels={savedModels} setSavedModels={setSavedModels} showCreateModel={showCreateModel} setShowCreateModel={setShowCreateModel} userCredits={userCredits} onDeductCredits={deductCredits} />;
     case 'clients': return <ClientsPage showCreateClient={showCreateClient} setShowCreateClient={setShowCreateClient} createClientFromProvador={createClientFromProvador} setCreateClientFromProvador={setCreateClientFromProvador} setProvadorClient={setProvadorClient} />;
     default: return null;
   }
 };

 return (
 <AppLayout
 userCredits={userCredits}
 currentPlan={currentPlan}
 restoreModal={restoreModal}
 onLogout={handleLogout}
 onBuyCredits={() => { setCreditModalContext({ creditsNeeded: 1, actionContext: 'generic' }); setShowCreditModal(true); }}
 renderSwipePage={renderSwipePage}
 >
 {currentPage === 'dashboard' && <DashboardPage />}
 {currentPage === 'create' && <CreateHubPage userCredits={userCredits} />}

 {/* PRODUCT STUDIO - Monta quando ativo ou gerando */}
 {(currentPage === 'product-studio' || isGeneratingProductStudio) && (
 <div style={{ display: currentPage === 'product-studio' ? 'contents' : 'none' }}>
 <Suspense fallback={<LoadingSkeleton theme={theme} />}>
 <ProductStudio
 products={products}
 userCredits={userCredits}
 onUpdateProduct={handleUpdateProduct}
 onDeductCredits={handleDeductCredits}
 onAddHistoryLog={addHistoryLog}
 onImport={() => navigateTo('products')}
 currentPlan={currentPlan}
 theme={theme}
 onCheckCredits={checkCreditsAndShowModal}
 userId={user?.id}
 isGenerating={isGeneratingProductStudio}
 isMinimized={productStudioMinimized}
 generationProgress={productStudioProgress}
 generationText={productStudioLoadingText}
 onSetGenerating={setIsGeneratingProductStudio}
 onSetMinimized={setProductStudioMinimized}
 onSetProgress={setProductStudioProgress}
 onSetLoadingText={setProductStudioLoadingText}
 isAnyGenerationRunning={isAnyGenerationRunning}
 onNavigate={(page) => navigateTo(page)}
 initialProduct={productForCreation}
 onClearInitialProduct={() => setProductForCreation(null)}
 onBack={goBack}
 onOpenPlanModal={() => { navigateTo('settings'); setSettingsTab('plan'); }}
 />
 </Suspense>
 </div>
 )}

 {/* PROVADOR - Monta quando ativo ou gerando */}
 {(currentPage === 'provador' || isGeneratingProvador) && (
 <div style={{ display: currentPage === 'provador' ? 'contents' : 'none' }}>
 <Suspense fallback={<LoadingSkeleton theme={theme} />}>
 <VizzuProvadorWizard
 theme={theme}
 clients={clients}
 products={products}
 collections={COLLECTIONS}
 userCredits={userCredits}
 whatsappTemplates={whatsappTemplates}
 onCreateClient={() => { setCreateClientFromProvador(true); setShowCreateClient(true); navigateTo('clients'); }}
 onUpdateClient={handleUpdateClientForProvador}
 onClientSelect={(client) => {
 setProvadorClient(client);
 if (client) {
 loadClientLooks(client.id);
 } else {
 setClientLooks([]);
 }
 }}
 onGenerate={handleProvadorGenerateForWizard}
 onSendWhatsApp={handleProvadorSendWhatsAppForWizard}
 onDownloadImage={handleProvadorDownloadImage}
 onSaveLook={saveClientLook}
 onDeleteLook={deleteClientLook}
 onGenerateAIMessage={handleProvadorGenerateAIMessage}
 clientLooks={clientLooks}
 isGenerating={isGeneratingProvador}
 isMinimized={provadorMinimized}
 generationProgress={provadorProgress}
 loadingText={provadorLoadingText}
 onSetMinimized={setProvadorMinimized}
 initialProduct={productForCreation}
 onClearInitialProduct={() => setProductForCreation(null)}
 onBack={goBack}
 currentPlan={currentPlan}
 onOpenPlanModal={() => { navigateTo('settings'); setSettingsTab('plan'); }}
 />
 </Suspense>
 </div>
 )}

 {/* LOOK COMPOSER - Monta quando ativo ou gerando */}
 {(currentPage === 'look-composer' || isGeneratingLookComposer) && (
 <div style={{ display: currentPage === 'look-composer' ? 'contents' : 'none' }}>
 <Suspense fallback={<LoadingSkeleton theme={theme} />}>
 <VizzuLookComposer
 products={products}
 userCredits={userCredits}
 onUpdateProduct={handleUpdateProduct}
 onDeductCredits={handleDeductCredits}
 onAddHistoryLog={addHistoryLog}
 onImport={() => navigateTo('products')}
 currentPlan={currentPlan}
 theme={theme}
 onCheckCredits={checkCreditsAndShowModal}
 userId={user?.id}
 savedModels={[...DEFAULT_MODELS, ...savedModels]}
 onSaveModel={handleSaveModel}
 onOpenCreateModel={() => {
 const plan = user?.plan || 'free';
 const limit = plan === 'free' ? 1 : 10;
 if (savedModels.length >= limit) return;
 setShowCreateModel(true);
 }}
 modelLimit={(() => { const plan = user?.plan || 'free'; return plan === 'free' ? 1 : 10; })()}
 isGenerating={isGeneratingLookComposer}
 isMinimized={lookComposerMinimized}
 generationProgress={lookComposerProgress}
 generationText={lookComposerLoadingText}
 onSetGenerating={setIsGeneratingLookComposer}
 onSetMinimized={setLookComposerMinimized}
 onSetProgress={setLookComposerProgress}
 onSetLoadingText={setLookComposerLoadingText}
 isAnyGenerationRunning={isAnyGenerationRunning}
 initialProduct={productForCreation}
 onClearInitialProduct={() => setProductForCreation(null)}
 onBack={goBack}
 onOpenPlanModal={() => { navigateTo('settings'); setSettingsTab('plan'); }}
 />
 </Suspense>
 </div>
 )}

 {/* STILL CRIATIVO - Monta quando ativo ou gerando */}
 {(currentPage === 'creative-still' || isGeneratingCreativeStill) && (
 <div style={{ display: currentPage === 'creative-still' ? 'contents' : 'none' }}>
 <Suspense fallback={<LoadingSkeleton theme={theme} />}>
 <CreativeStill
 theme={theme}
 products={products}
 userCredits={userCredits}
 userId={user?.id}
 onDeductCredits={handleDeductCredits}
 onAddHistoryLog={addHistoryLog}
 onCheckCredits={checkCreditsAndShowModal}
 currentPlan={currentPlan}
 onBack={goBack}
 onOpenPlanModal={() => { navigateTo('settings'); setSettingsTab('plan'); }}
 initialProduct={productForCreation}
 onClearInitialProduct={() => setProductForCreation(null)}
 onSetGenerating={setIsGeneratingCreativeStill}
 onSetProgress={setCreativeStillProgress}
 onSetMinimized={setCreativeStillMinimized}
 isMinimized={creativeStillMinimized}
 />
 </Suspense>
 </div>
 )}

 {/* MODELS */}
 {currentPage === 'models' && <ModelsPage savedModels={savedModels} setSavedModels={setSavedModels} showCreateModel={showCreateModel} setShowCreateModel={setShowCreateModel} userCredits={userCredits} onDeductCredits={deductCredits} />}

 {/* PRODUCTS */}
 {currentPage === 'products' && <ProductsPage productForCreation={productForCreation} setProductForCreation={setProductForCreation} />}

 {/* CLIENTS */}
 {currentPage === 'clients' && <ClientsPage showCreateClient={showCreateClient} setShowCreateClient={setShowCreateClient} createClientFromProvador={createClientFromProvador} setCreateClientFromProvador={setCreateClientFromProvador} setProvadorClient={setProvadorClient} />}

 {currentPage === 'settings' && <SettingsPage userCredits={userCredits} currentPlan={currentPlan} billingPeriod={billingPeriod} daysUntilRenewal={daysUntilRenewal} isCheckoutLoading={isCheckoutLoading} onBuyCredits={handleBuyCredits} onUpgradePlan={handleUpgradePlanFromModal} onSetBillingPeriod={setBillingPeriod} onCancelSubscription={handleCancelSubscription} onLogout={handleLogout} />}

 {/* Modal de Créditos Esgotados */}
 <CreditExhaustedModal
 isOpen={showCreditModal}
 onClose={() => setShowCreditModal(false)}
 creditsNeeded={creditModalContext.creditsNeeded}
 currentCredits={userCredits}
 currentPlan={currentPlan}
 billingPeriod={billingPeriod}
 actionContext={creditModalContext.actionContext}
 daysUntilRenewal={daysUntilRenewal}
 onBuyCredits={handleBuyCredits}
 onUpgradePlan={handleUpgradePlanFromModal}
 onSetBillingPeriod={setBillingPeriod}
 theme={theme}
 />
 </AppLayout>
 );
}

export default App;

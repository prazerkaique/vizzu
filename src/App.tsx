// ═══════════════════════════════════════════════════════════════
// VIZZU - App.tsx (VERSÃO COMPLETA COM MULTI-FOTO E GALERIA ORGANIZADA)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef } from 'react';
import { 
  User, Product, ProductImage, ProductOriginalImages, ProductGeneratedImages,
  GeneratedImageSet, HistoryLog, Client, ClientPhoto, SavedModelProfile,
  LookComposition, WhatsAppTemplate, VisualStudioGeneration, CreditHistoryItem
} from './types';
import { AuthPage } from './components/AuthPage';
import { VisualStudioPage, EditorModal } from './components/Studio';
import { useCredits } from './hooks/useCredits';
import { generateStudioReady, generateCenario, generateModeloIA } from './lib/api/studio';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const CATEGORIES = ['Camisetas', 'Calças', 'Calçados', 'Acessórios', 'Vestidos', 'Shorts', 'Jaquetas', 'Blusas', 'Saias'];
const COLLECTIONS = ['Verão 2025', 'Inverno 2025', 'Básicos', 'Premium', 'Promoção'];
const COLORS = ['Preto', 'Branco', 'Azul', 'Vermelho', 'Verde', 'Amarelo', 'Rosa', 'Cinza', 'Marrom', 'Bege'];
const FITS = ['Slim', 'Regular', 'Oversized', 'Skinny', 'Relaxed'];

const PHOTO_TYPES: { id: ClientPhoto['type']; label: string; icon: string }[] = [
  { id: 'frente', label: 'Frente', icon: 'fa-user' },
  { id: 'costas', label: 'Costas', icon: 'fa-user-slash' },
  { id: 'rosto', label: 'Rosto', icon: 'fa-face-smile' },
];

const DEFAULT_WHATSAPP_TEMPLATES: WhatsAppTemplate[] = [
  { id: '1', name: 'Provador Virtual', message: 'Olá {nome}! 🛍️\n\nPreparei um visual especial para você! Veja como ficou.\n\nO que achou? 😍', isDefault: true },
  { id: '2', name: 'Look Completo', message: 'Oi {nome}! ✨\n\nMontei um look completo pensando em você!\n\nPosso reservar para você?', isDefault: false },
  { id: '3', name: 'Novidades', message: 'Oi {nome}! 👋\n\nTemos novidades que combinam com você! Olha só como ficou:\n\nGostou? Posso separar!', isDefault: false },
];

// ═══════════════════════════════════════════════════════════════
// MAIN APP COMPONENT
// ═══════════════════════════════════════════════════════════════

function App() {
  // ══════════════════════════════════════════════════════════════════
  // AUTH & USER STATE
  // ══════════════════════════════════════════════════════════════════
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  
  // ══════════════════════════════════════════════════════════════════
  // NAVIGATION STATE
  // ══════════════════════════════════════════════════════════════════
  const [currentPage, setCurrentPage] = useState<'home' | 'studio' | 'provador' | 'clients' | 'products' | 'settings'>('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // ══════════════════════════════════════════════════════════════════
  // PRODUCTS STATE
  // ══════════════════════════════════════════════════════════════════
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductEditor, setShowProductEditor] = useState(false);
  
  // ══════════════════════════════════════════════════════════════════
  // ADD PRODUCT MODAL STATE (MULTI-STEP)
  // ══════════════════════════════════════════════════════════════════
  const [showImport, setShowImport] = useState(false);
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [addProductStep, setAddProductStep] = useState<'source' | 'photos' | 'data'>('source');
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [showBackImageWarning, setShowBackImageWarning] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '', brand: '', color: '', fit: '', category: '', collection: ''
  });
  
  // ══════════════════════════════════════════════════════════════════
  // EDIT PRODUCT MODAL STATE
  // ══════════════════════════════════════════════════════════════════
  const [showEditProduct, setShowEditProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editProductData, setEditProductData] = useState({
    name: '', brand: '', color: '', fit: '', category: '', collection: ''
  });
  const [editFrontImage, setEditFrontImage] = useState<string | null>(null);
  const [editBackImage, setEditBackImage] = useState<string | null>(null);
  
  // ══════════════════════════════════════════════════════════════════
  // DELETE PRODUCT MODAL STATE
  // ══════════════════════════════════════════════════════════════════
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  
  // ══════════════════════════════════════════════════════════════════
  // CLIENTS STATE
  // ══════════════════════════════════════════════════════════════════
  const [clients, setClients] = useState<Client[]>([]);
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClient, setNewClient] = useState({
    firstName: '', lastName: '', whatsapp: '', email: '', photos: [] as ClientPhoto[]
  });
  const [uploadingPhotoType, setUploadingPhotoType] = useState<ClientPhoto['type'] | null>(null);
  
  // ══════════════════════════════════════════════════════════════════
  // AI GENERATION STATE
  // ══════════════════════════════════════════════════════════════════
  const [savedModels, setSavedModels] = useState<SavedModelProfile[]>([]);
  const [generations, setGenerations] = useState<VisualStudioGeneration[]>([]);
  
  // ══════════════════════════════════════════════════════════════════
  // CREDITS HOOK
  // ══════════════════════════════════════════════════════════════════
  const { credits, deductCredits, addCredits, history: creditHistory } = useCredits(user?.id || '');
  
  // ══════════════════════════════════════════════════════════════════
  // REFS
  // ══════════════════════════════════════════════════════════════════
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const backImageInputRef = useRef<HTMLInputElement>(null);
  const editFrontInputRef = useRef<HTMLInputElement>(null);
  const editBackInputRef = useRef<HTMLInputElement>(null);

  // ══════════════════════════════════════════════════════════════════
  // AUTH CHECK
  // ══════════════════════════════════════════════════════════════════
  useEffect(() => {
    const savedUser = localStorage.getItem('vizzu_user');
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setUser(userData);
      setIsAuthenticated(true);
      loadUserData(userData.id);
    }
  }, []);

  const loadUserData = async (userId: string) => {
    try {
      // Load products from Supabase
      const response = await fetch(`https://n8nwebhook.brainia.store/webhook/vizzu/produtos-listar?user_id=${userId}`);
      const data = await response.json();
      if (data.products) {
        setProducts(data.products.map((p: any) => ({
          ...p,
          images: p.images || [{ name: p.name, url: p.image_url }],
          originalImages: p.original_images || (p.image_url ? { front: { name: p.name, url: p.image_url } } : undefined),
          generatedImages: p.generated_images || { studioReady: [], cenarioCriativo: [], modeloIA: [] },
          hasBackImage: p.has_back_image || false
        })));
      }
      
      // Load clients
      const clientsResponse = await fetch(`https://n8nwebhook.brainia.store/webhook/vizzu/clientes-listar?user_id=${userId}`);
      const clientsData = await clientsResponse.json();
      if (clientsData.clients) {
        setClients(clientsData.clients);
      }
      
      // Load saved models
      const modelsResponse = await fetch(`https://n8nwebhook.brainia.store/webhook/vizzu/modelos-listar?user_id=${userId}`);
      const modelsData = await modelsResponse.json();
      if (modelsData.models) {
        setSavedModels(modelsData.models);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  // ══════════════════════════════════════════════════════════════════
  // AUTH HANDLERS
  // ══════════════════════════════════════════════════════════════════
  const handleLogin = (userData: User) => {
    setUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem('vizzu_user', JSON.stringify(userData));
    loadUserData(userData.id);
  };

  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('vizzu_user');
    setProducts([]);
    setClients([]);
    setSavedModels([]);
  };

  // ══════════════════════════════════════════════════════════════════
  // PRODUCT HANDLERS
  // ══════════════════════════════════════════════════════════════════
  const handleUpdateProduct = (productId: string, updates: Partial<Product>) => {
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, ...updates } : p));
  };

  const handleDeductCredits = (amount: number, reason: string): boolean => {
    return deductCredits(amount, reason);
  };

  // ══════════════════════════════════════════════════════════════════
  // ADD PRODUCT - MULTI-STEP HANDLERS
  // ══════════════════════════════════════════════════════════════════
  const handleFrontImageSelect = (files: FileList) => {
    if (files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setFrontImage(reader.result as string);
        setShowImport(false);
        setAddProductStep('photos');
        setShowCreateProduct(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBackImageSelect = (files: FileList) => {
    if (files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setBackImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNextToDataStep = () => {
    if (!backImage) {
      setShowBackImageWarning(true);
    } else {
      setAddProductStep('data');
    }
  };

  const handleConfirmWithoutBack = () => {
    setShowBackImageWarning(false);
    setAddProductStep('data');
  };

  const handleCreateProduct = async () => {
    if (!frontImage || !newProduct.name || !newProduct.category) {
      alert('Preencha pelo menos o nome e a categoria do produto');
      return;
    }

    setIsCreatingProduct(true);

    try {
      const response = await fetch('https://n8nwebhook.brainia.store/webhook/vizzu/produto-importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id,
          sku: 'SKU-' + Date.now().toString().slice(-6),
          name: newProduct.name,
          brand: newProduct.brand || null,
          color: newProduct.color || null,
          fit: newProduct.fit || null,
          category: newProduct.category,
          collection: newProduct.collection || null,
          front_image_base64: frontImage,
          back_image_base64: backImage || null,
          has_back_image: !!backImage
        })
      });

      const data = await response.json();

      if (data.success) {
        const product: Product = {
          id: data.product.id,
          sku: data.product.sku,
          name: data.product.name,
          brand: newProduct.brand,
          color: newProduct.color,
          fit: newProduct.fit,
          category: newProduct.category,
          collection: newProduct.collection,
          images: [
            { name: `${newProduct.name}-frente.jpg`, base64: frontImage, url: data.product.front_image_url, type: 'front' },
            ...(backImage ? [{ name: `${newProduct.name}-costas.jpg`, base64: backImage, url: data.product.back_image_url, type: 'back' as const }] : [])
          ],
          originalImages: {
            front: { name: `${newProduct.name}-frente.jpg`, base64: frontImage, url: data.product.front_image_url },
            ...(backImage ? { back: { name: `${newProduct.name}-costas.jpg`, base64: backImage, url: data.product.back_image_url } } : {})
          },
          generatedImages: { studioReady: [], cenarioCriativo: [], modeloIA: [] },
          hasBackImage: !!backImage
        };

        setProducts(prev => [...prev, product]);
        resetAddProductModal();
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

  const resetAddProductModal = () => {
    setShowCreateProduct(false);
    setShowImport(false);
    setFrontImage(null);
    setBackImage(null);
    setAddProductStep('source');
    setShowBackImageWarning(false);
    setNewProduct({ name: '', brand: '', color: '', fit: '', category: '', collection: '' });
  };

  // ══════════════════════════════════════════════════════════════════
  // EDIT PRODUCT HANDLERS
  // ══════════════════════════════════════════════════════════════════
  const openEditProduct = (product: Product) => {
    setEditingProduct(product);
    setEditProductData({
      name: product.name,
      brand: product.brand || '',
      color: product.color || '',
      fit: product.fit || '',
      category: product.category,
      collection: product.collection || ''
    });
    setEditFrontImage(product.originalImages?.front?.base64 || product.originalImages?.front?.url || product.images[0]?.base64 || product.images[0]?.url || null);
    setEditBackImage(product.originalImages?.back?.base64 || product.originalImages?.back?.url || null);
    setShowEditProduct(true);
  };

  const handleEditFrontImageSelect = (files: FileList) => {
    if (files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setEditFrontImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditBackImageSelect = (files: FileList) => {
    if (files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setEditBackImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveEditProduct = async () => {
    if (!editingProduct) return;

    try {
      const response = await fetch('https://n8nwebhook.brainia.store/webhook/vizzu/produto-atualizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: editingProduct.id,
          user_id: user?.id,
          name: editProductData.name,
          brand: editProductData.brand || null,
          color: editProductData.color || null,
          fit: editProductData.fit || null,
          category: editProductData.category,
          collection: editProductData.collection || null,
          front_image_base64: editFrontImage?.startsWith('data:') ? editFrontImage : null,
          back_image_base64: editBackImage?.startsWith('data:') ? editBackImage : null,
          has_back_image: !!editBackImage
        })
      });

      const data = await response.json();

      if (data.success) {
        setProducts(prev => prev.map(p => {
          if (p.id === editingProduct.id) {
            return {
              ...p,
              ...editProductData,
              images: [
                { name: `${editProductData.name}-frente.jpg`, base64: editFrontImage?.startsWith('data:') ? editFrontImage : undefined, url: data.product?.front_image_url || p.originalImages?.front?.url, type: 'front' as const },
                ...(editBackImage ? [{ name: `${editProductData.name}-costas.jpg`, base64: editBackImage?.startsWith('data:') ? editBackImage : undefined, url: data.product?.back_image_url || p.originalImages?.back?.url, type: 'back' as const }] : [])
              ],
              originalImages: {
                front: { name: `${editProductData.name}-frente.jpg`, base64: editFrontImage?.startsWith('data:') ? editFrontImage : undefined, url: data.product?.front_image_url || p.originalImages?.front?.url },
                ...(editBackImage ? { back: { name: `${editProductData.name}-costas.jpg`, base64: editBackImage?.startsWith('data:') ? editBackImage : undefined, url: data.product?.back_image_url || p.originalImages?.back?.url } } : {})
              },
              hasBackImage: !!editBackImage
            };
          }
          return p;
        }));
        setShowEditProduct(false);
        setEditingProduct(null);
      } else {
        alert('Erro ao atualizar produto: ' + (data.error || 'Tente novamente'));
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao atualizar produto. Verifique sua conexão.');
    }
  };

  // ══════════════════════════════════════════════════════════════════
  // DELETE PRODUCT HANDLERS
  // ══════════════════════════════════════════════════════════════════
  const openDeleteConfirm = (product: Product) => {
    setProductToDelete(product);
    setShowDeleteConfirm(true);
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;

    try {
      const response = await fetch('https://n8nwebhook.brainia.store/webhook/vizzu/produto-excluir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productToDelete.id,
          user_id: user?.id
        })
      });

      const data = await response.json();

      if (data.success) {
        setProducts(prev => prev.filter(p => p.id !== productToDelete.id));
        setShowDeleteConfirm(false);
        setProductToDelete(null);
        if (selectedProduct?.id === productToDelete.id) {
          setSelectedProduct(null);
          setShowProductEditor(false);
        }
      } else {
        alert('Erro ao excluir produto: ' + (data.error || 'Tente novamente'));
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao excluir produto. Verifique sua conexão.');
    }
  };

  // ══════════════════════════════════════════════════════════════════
  // AI GENERATION HANDLERS
  // ══════════════════════════════════════════════════════════════════
  const handleGenerateImage = async (
    product: Product,
    type: 'studio' | 'cenario' | 'lifestyle' | 'provador' | 'refine',
    prompt?: string,
    options?: any
  ): Promise<{ image: string | null; generationId: string | null; backImage?: string | null }> => {
    try {
      const frontImageBase64 = product.originalImages?.front?.base64 || product.originalImages?.front?.url || product.images[0]?.base64 || product.images[0]?.url;
      const backImageBase64 = product.originalImages?.back?.base64 || product.originalImages?.back?.url;
      
      let result: { image: string | null; generationId: string | null; backImage?: string | null } = { image: null, generationId: null };

      if (type === 'studio') {
        // Generate front
        const frontResult = await generateStudioReady(frontImageBase64!, user?.id || '', product.id);
        result.image = frontResult.image;
        result.generationId = frontResult.generationId;
        
        // Generate back if exists (same 1 credit for both)
        if (backImageBase64) {
          const backResult = await generateStudioReady(backImageBase64, user?.id || '', product.id, true);
          result.backImage = backResult.image;
        }
      } else if (type === 'cenario') {
        const frontResult = await generateCenario(frontImageBase64!, prompt || '', user?.id || '', product.id);
        result.image = frontResult.image;
        result.generationId = frontResult.generationId;
        
        if (backImageBase64) {
          const backResult = await generateCenario(backImageBase64, prompt || '', user?.id || '', product.id, true);
          result.backImage = backResult.image;
        }
      } else if (type === 'lifestyle') {
        const frontResult = await generateModeloIA(frontImageBase64!, user?.id || '', product.id, options);
        result.image = frontResult.image;
        result.generationId = frontResult.generationId;
        
        if (backImageBase64) {
          const backResult = await generateModeloIA(backImageBase64, user?.id || '', product.id, { ...options, isBackImage: true });
          result.backImage = backResult.image;
        }
      }

      // Save generation to state
      if (result.image) {
        const generation: VisualStudioGeneration = {
          id: result.generationId || `gen-${Date.now()}`,
          productId: product.id,
          productSku: product.sku,
          productName: product.name,
          type,
          prompt,
          originalImage: frontImageBase64!,
          generatedImage: result.image,
          generatedImages: result.backImage ? { front: result.image, back: result.backImage } : undefined,
          credits: options?.lookMode === 'composer' ? 2 : 1,
          createdAt: new Date().toISOString(),
          saved: false
        };
        setGenerations(prev => [generation, ...prev]);

        // Update product's generated images
        const generatedSet: GeneratedImageSet = {
          id: result.generationId || `gen-${Date.now()}`,
          createdAt: new Date().toISOString(),
          tool: type === 'lifestyle' ? 'lifestyle' : type,
          images: {
            front: result.image,
            ...(result.backImage ? { back: result.backImage } : {})
          },
          metadata: { prompt, ...options }
        };

        setProducts(prev => prev.map(p => {
          if (p.id === product.id) {
            const updatedGeneratedImages = p.generatedImages || { studioReady: [], cenarioCriativo: [], modeloIA: [] };
            if (type === 'studio') {
              updatedGeneratedImages.studioReady = [generatedSet, ...updatedGeneratedImages.studioReady];
            } else if (type === 'cenario') {
              updatedGeneratedImages.cenarioCriativo = [generatedSet, ...updatedGeneratedImages.cenarioCriativo];
            } else if (type === 'lifestyle') {
              updatedGeneratedImages.modeloIA = [generatedSet, ...updatedGeneratedImages.modeloIA];
            }
            return { ...p, generatedImages: updatedGeneratedImages };
          }
          return p;
        }));
      }

      return result;
    } catch (error) {
      console.error('Generation error:', error);
      return { image: null, generationId: null };
    }
  };

  // ══════════════════════════════════════════════════════════════════
  // CLIENT HANDLERS
  // ══════════════════════════════════════════════════════════════════
  const handleClientPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadingPhotoType) {
      const reader = new FileReader();
      reader.onload = () => {
        const newPhoto: ClientPhoto = {
          type: uploadingPhotoType,
          base64: reader.result as string,
          createdAt: new Date().toISOString()
        };
        setNewClient(prev => ({
          ...prev,
          photos: [...prev.photos.filter(p => p.type !== uploadingPhotoType), newPhoto]
        }));
        setUploadingPhotoType(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveClientPhoto = (type: ClientPhoto['type']) => {
    setNewClient(prev => ({ ...prev, photos: prev.photos.filter(p => p.type !== type) }));
  };

  const handleCreateClient = async () => {
    if (!newClient.firstName || !newClient.lastName || !newClient.whatsapp) {
      alert('Preencha nome, sobrenome e WhatsApp');
      return;
    }

    try {
      const response = await fetch('https://n8nwebhook.brainia.store/webhook/vizzu/cliente-criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id,
          first_name: newClient.firstName,
          last_name: newClient.lastName,
          whatsapp: newClient.whatsapp.replace(/\D/g, ''),
          email: newClient.email || null,
          photos: newClient.photos
        })
      });

      const data = await response.json();

      if (data.success) {
        const client: Client = {
          id: data.client.id,
          firstName: newClient.firstName,
          lastName: newClient.lastName,
          whatsapp: newClient.whatsapp.replace(/\D/g, ''),
          email: newClient.email || undefined,
          photos: newClient.photos.length > 0 ? newClient.photos : undefined,
          hasProvadorIA: newClient.photos.length > 0,
          createdAt: new Date().toISOString(),
          status: 'active'
        };
        setClients(prev => [...prev, client]);
        setShowAddClient(false);
        setNewClient({ firstName: '', lastName: '', whatsapp: '', email: '', photos: [] });
      } else {
        alert('Erro ao criar cliente: ' + (data.error || 'Tente novamente'));
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao criar cliente. Verifique sua conexão.');
    }
  };

  // ══════════════════════════════════════════════════════════════════
  // SAVED MODEL HANDLERS
  // ══════════════════════════════════════════════════════════════════
  const handleSaveModel = async (profile: SavedModelProfile) => {
    try {
      const response = await fetch('https://n8nwebhook.brainia.store/webhook/vizzu/modelo-salvar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id,
          ...profile
        })
      });

      const data = await response.json();

      if (data.success) {
        setSavedModels(prev => [...prev, { ...profile, id: data.model.id }]);
      }
    } catch (error) {
      console.error('Error saving model:', error);
    }
  };

  const handleDeleteModel = async (modelId: string) => {
    try {
      await fetch('https://n8nwebhook.brainia.store/webhook/vizzu/modelo-excluir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_id: modelId, user_id: user?.id })
      });
      setSavedModels(prev => prev.filter(m => m.id !== modelId));
    } catch (error) {
      console.error('Error deleting model:', error);
    }
  };

  const handleMarkSaved = (generationId: string) => {
    setGenerations(prev => prev.map(g => g.id === generationId ? { ...g, saved: true } : g));
  };

  // ══════════════════════════════════════════════════════════════════
  // WHATSAPP HANDLER
  // ══════════════════════════════════════════════════════════════════
  const handleSendWhatsApp = (client: Client, message: string, imageUrl?: string) => {
    const phone = client.whatsapp.replace(/\D/g, '');
    const formattedMessage = message.replace('{nome}', client.firstName);
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(formattedMessage)}`;
    window.open(url, '_blank');
  };

  // ══════════════════════════════════════════════════════════════════
  // RENDER: AUTH CHECK
  // ══════════════════════════════════════════════════════════════════
  if (!isAuthenticated) {
    return <AuthPage onLogin={handleLogin} theme={theme} />;
  }

  const isDark = theme === 'dark';

  // ══════════════════════════════════════════════════════════════════
  // RENDER: MAIN APP
  // ══════════════════════════════════════════════════════════════════
  return (
    <div className={`min-h-screen ${isDark ? 'bg-black text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Hidden File Inputs */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && handleFrontImageSelect(e.target.files)} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files && handleFrontImageSelect(e.target.files)} />
      <input ref={backImageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && handleBackImageSelect(e.target.files)} />
      <input ref={editFrontInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && handleEditFrontImageSelect(e.target.files)} />
      <input ref={editBackInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && handleEditBackImageSelect(e.target.files)} />

      {/* HEADER */}
      <header className={`sticky top-0 z-40 ${isDark ? 'bg-black/80 border-neutral-800' : 'bg-white/80 border-gray-200'} backdrop-blur-xl border-b`}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden">
              <i className="fas fa-bars text-lg"></i>
            </button>
            <img src="/logo.png" alt="Vizzu" className="h-8" />
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${isDark ? 'bg-amber-500/10' : 'bg-amber-100'}`}>
              <i className="fas fa-bolt text-amber-500 text-sm"></i>
              <span className="font-bold text-amber-500">{credits}</span>
            </div>
            <button onClick={() => setTheme(isDark ? 'light' : 'dark')} className={`w-9 h-9 rounded-full flex items-center justify-center ${isDark ? 'bg-neutral-800' : 'bg-gray-100'}`}>
              <i className={`fas ${isDark ? 'fa-sun text-amber-400' : 'fa-moon text-gray-600'}`}></i>
            </button>
            <button onClick={handleLogout} className={`w-9 h-9 rounded-full flex items-center justify-center ${isDark ? 'bg-neutral-800 text-neutral-400' : 'bg-gray-100 text-gray-600'}`}>
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {currentPage === 'home' && (
          <div className="space-y-6">
            {/* Welcome */}
            <div className="text-center py-8">
              <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Olá, {user?.name?.split(' ')[0]}! 👋
              </h1>
              <p className={isDark ? 'text-neutral-400' : 'text-gray-500'}>O que vamos criar hoje?</p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button onClick={() => setCurrentPage('studio')} className={`p-6 rounded-2xl ${isDark ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30' : 'bg-gradient-to-br from-purple-100 to-pink-100 border border-purple-200'} text-left transition-all hover:scale-105`}>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-3">
                  <i className="fas fa-magic text-white text-xl"></i>
                </div>
                <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Vizzu Studio</h3>
                <p className={`text-sm ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>Gere fotos com IA</p>
              </button>

              <button onClick={() => setCurrentPage('provador')} className={`p-6 rounded-2xl ${isDark ? 'bg-gradient-to-br from-pink-500/20 to-orange-500/20 border border-pink-500/30' : 'bg-gradient-to-br from-pink-100 to-orange-100 border border-pink-200'} text-left transition-all hover:scale-105`}>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center mb-3">
                  <i className="fas fa-shirt text-white text-xl"></i>
                </div>
                <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Provador IA</h3>
                <p className={`text-sm ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>Vista clientes</p>
              </button>

              <button onClick={() => setCurrentPage('products')} className={`p-6 rounded-2xl ${isDark ? 'bg-neutral-900 border border-neutral-800' : 'bg-white border border-gray-200'} text-left transition-all hover:scale-105`}>
                <div className={`w-12 h-12 rounded-xl ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'} flex items-center justify-center mb-3`}>
                  <i className={`fas fa-box ${isDark ? 'text-blue-400' : 'text-blue-600'} text-xl`}></i>
                </div>
                <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Produtos</h3>
                <p className={`text-sm ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>{products.length} cadastrados</p>
              </button>

              <button onClick={() => setCurrentPage('clients')} className={`p-6 rounded-2xl ${isDark ? 'bg-neutral-900 border border-neutral-800' : 'bg-white border border-gray-200'} text-left transition-all hover:scale-105`}>
                <div className={`w-12 h-12 rounded-xl ${isDark ? 'bg-green-500/20' : 'bg-green-100'} flex items-center justify-center mb-3`}>
                  <i className={`fas fa-users ${isDark ? 'text-green-400' : 'text-green-600'} text-xl`}></i>
                </div>
                <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Clientes</h3>
                <p className={`text-sm ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>{clients.length} cadastrados</p>
              </button>
            </div>

            {/* Recent Products */}
            {products.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Produtos Recentes</h2>
                  <button onClick={() => setCurrentPage('products')} className="text-pink-500 text-sm font-medium">Ver todos →</button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {products.slice(0, 6).map(product => (
                    <div
                      key={product.id}
                      onClick={() => { setSelectedProduct(product); setShowProductEditor(true); }}
                      className={`rounded-xl overflow-hidden cursor-pointer transition-all hover:scale-105 ${isDark ? 'bg-neutral-900 border border-neutral-800' : 'bg-white border border-gray-200'}`}
                    >
                      <div className="aspect-square relative">
                        <img
                          src={product.originalImages?.front?.url || product.originalImages?.front?.base64 || product.images[0]?.url || product.images[0]?.base64}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                        {product.hasBackImage && (
                          <div className="absolute top-2 right-2 bg-green-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold">
                            F+C
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className={`font-medium text-sm truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{product.name}</p>
                        <p className={`text-xs ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>{product.sku}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STUDIO PAGE */}
        {currentPage === 'studio' && (
          <VisualStudioPage
            products={products}
            userCredits={credits}
            savedModels={savedModels}
            clients={clients}
            onBack={() => setCurrentPage('home')}
            onImport={() => setShowImport(true)}
            onSelectProduct={(product) => { setSelectedProduct(product); setShowProductEditor(true); }}
            onSaveModel={handleSaveModel}
            onDeleteModel={handleDeleteModel}
            onUpdateProduct={handleUpdateProduct}
            onDeductCredits={handleDeductCredits}
            onGenerateImage={handleGenerateImage}
            onMarkSaved={handleMarkSaved}
            onSendWhatsApp={handleSendWhatsApp}
            theme={theme}
            userId={user?.id}
          />
        )}

        {/* PRODUCTS PAGE */}
        {currentPage === 'products' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <button onClick={() => setCurrentPage('home')} className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-neutral-800' : 'bg-gray-100'}`}>
                  <i className="fas fa-arrow-left"></i>
                </button>
                <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Produtos</h1>
              </div>
              <button
                onClick={() => setShowImport(true)}
                className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold rounded-xl text-sm flex items-center gap-2"
              >
                <i className="fas fa-plus"></i> Adicionar
              </button>
            </div>

            {products.length === 0 ? (
              <div className={`text-center py-16 ${isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200'} border rounded-2xl`}>
                <div className={`w-16 h-16 rounded-full ${isDark ? 'bg-neutral-800' : 'bg-gray-100'} flex items-center justify-center mx-auto mb-4`}>
                  <i className={`fas fa-box text-2xl ${isDark ? 'text-neutral-600' : 'text-gray-400'}`}></i>
                </div>
                <p className={isDark ? 'text-neutral-400' : 'text-gray-500'}>Nenhum produto cadastrado</p>
                <button
                  onClick={() => setShowImport(true)}
                  className="mt-4 px-6 py-2 bg-pink-500 text-white font-bold rounded-xl text-sm"
                >
                  Cadastrar primeiro produto
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {products.map(product => (
                  <div
                    key={product.id}
                    className={`rounded-xl overflow-hidden ${isDark ? 'bg-neutral-900 border border-neutral-800' : 'bg-white border border-gray-200'} group`}
                  >
                    <div
                      className="aspect-square relative cursor-pointer"
                      onClick={() => { setSelectedProduct(product); setShowProductEditor(true); }}
                    >
                      <img
                        src={product.originalImages?.front?.url || product.originalImages?.front?.base64 || product.images[0]?.url || product.images[0]?.base64}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                      {product.hasBackImage && (
                        <div className="absolute top-2 right-2 bg-green-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold">
                          F+C
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                        <span className="text-white text-sm font-medium">Abrir Editor</span>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className={`font-medium text-sm truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{product.name}</p>
                      <p className={`text-xs ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>{product.sku}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); openEditProduct(product); }}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-medium ${isDark ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                          <i className="fas fa-edit mr-1"></i> Editar
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); openDeleteConfirm(product); }}
                          className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500/20"
                        >
                          <i className="fas fa-trash text-xs"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CLIENTS PAGE */}
        {currentPage === 'clients' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <button onClick={() => setCurrentPage('home')} className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-neutral-800' : 'bg-gray-100'}`}>
                  <i className="fas fa-arrow-left"></i>
                </button>
                <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Clientes</h1>
              </div>
              <button
                onClick={() => setShowAddClient(true)}
                className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold rounded-xl text-sm flex items-center gap-2"
              >
                <i className="fas fa-plus"></i> Adicionar
              </button>
            </div>

            {clients.length === 0 ? (
              <div className={`text-center py-16 ${isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200'} border rounded-2xl`}>
                <div className={`w-16 h-16 rounded-full ${isDark ? 'bg-neutral-800' : 'bg-gray-100'} flex items-center justify-center mx-auto mb-4`}>
                  <i className={`fas fa-users text-2xl ${isDark ? 'text-neutral-600' : 'text-gray-400'}`}></i>
                </div>
                <p className={isDark ? 'text-neutral-400' : 'text-gray-500'}>Nenhum cliente cadastrado</p>
                <button
                  onClick={() => setShowAddClient(true)}
                  className="mt-4 px-6 py-2 bg-pink-500 text-white font-bold rounded-xl text-sm"
                >
                  Cadastrar primeiro cliente
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clients.map(client => (
                  <div key={client.id} className={`p-4 rounded-xl ${isDark ? 'bg-neutral-900 border border-neutral-800' : 'bg-white border border-gray-200'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full ${isDark ? 'bg-neutral-800' : 'bg-gray-100'} flex items-center justify-center overflow-hidden`}>
                        {client.photos?.[0]?.base64 ? (
                          <img src={client.photos[0].base64} alt={client.firstName} className="w-full h-full object-cover" />
                        ) : (
                          <i className={`fas fa-user ${isDark ? 'text-neutral-600' : 'text-gray-400'}`}></i>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{client.firstName} {client.lastName}</p>
                        <p className={`text-sm ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>{client.whatsapp}</p>
                      </div>
                      {client.hasProvadorIA && (
                        <span className="px-2 py-1 bg-green-500/10 text-green-500 text-xs font-bold rounded-full">
                          Provador ✓
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ══════════════════════════════════════════════════════════════════
          MODALS
          ══════════════════════════════════════════════════════════════════ */}

      {/* IMPORT SOURCE MODAL */}
      {showImport && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <div className={`${isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200'} rounded-t-2xl md:rounded-2xl border w-full max-w-sm p-5`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Adicionar Produto</h3>
              <button onClick={() => setShowImport(false)} className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? 'bg-neutral-800 text-neutral-400' : 'bg-gray-100 text-gray-500'}`}>
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>
            <p className={`text-xs mb-4 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Escolha como adicionar a foto de frente:</p>
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex flex-col items-center gap-2 p-4 border border-dashed rounded-xl transition-all cursor-pointer ${isDark ? 'border-neutral-700 hover:border-pink-500/50 hover:bg-neutral-800' : 'border-gray-300 hover:border-pink-400 hover:bg-pink-50'}`}>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && handleFrontImageSelect(e.target.files)} />
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-neutral-800' : 'bg-pink-100'}`}>
                  <i className={`fas fa-images text-sm ${isDark ? 'text-neutral-400' : 'text-pink-500'}`}></i>
                </div>
                <span className={`text-[10px] font-medium ${isDark ? 'text-neutral-300' : 'text-gray-700'}`}>Galeria</span>
              </label>
              <label className={`flex flex-col items-center gap-2 p-4 border border-dashed rounded-xl transition-all cursor-pointer ${isDark ? 'border-neutral-700 hover:border-pink-500/50 hover:bg-neutral-800' : 'border-gray-300 hover:border-pink-400 hover:bg-pink-50'}`}>
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files && handleFrontImageSelect(e.target.files)} />
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-neutral-800' : 'bg-pink-100'}`}>
                  <i className={`fas fa-camera text-sm ${isDark ? 'text-neutral-400' : 'text-pink-500'}`}></i>
                </div>
                <span className={`text-[10px] font-medium ${isDark ? 'text-neutral-300' : 'text-gray-700'}`}>Câmera</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* CREATE PRODUCT MODAL (MULTI-STEP) */}
      {showCreateProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <div className={`${isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200'} rounded-t-2xl md:rounded-2xl border w-full max-w-md p-5 max-h-[90vh] overflow-y-auto`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {addProductStep !== 'photos' && (
                  <button
                    onClick={() => {
                      if (addProductStep === 'data') setAddProductStep('photos');
                      else resetAddProductModal();
                    }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-neutral-800 text-neutral-400' : 'bg-gray-100 text-gray-500'}`}
                  >
                    <i className="fas fa-arrow-left text-xs"></i>
                  </button>
                )}
                <h3 className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {addProductStep === 'photos' ? 'Fotos do Produto' : 'Dados do Produto'}
                </h3>
              </div>
              <button onClick={resetAddProductModal} className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? 'bg-neutral-800 text-neutral-400' : 'bg-gray-100 text-gray-500'}`}>
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center gap-2 mb-6">
              <div className={`flex-1 h-1 rounded-full ${addProductStep === 'photos' || addProductStep === 'data' ? 'bg-pink-500' : isDark ? 'bg-neutral-700' : 'bg-gray-200'}`}></div>
              <div className={`flex-1 h-1 rounded-full ${addProductStep === 'data' ? 'bg-pink-500' : isDark ? 'bg-neutral-700' : 'bg-gray-200'}`}></div>
            </div>

            {/* STEP: Photos */}
            {addProductStep === 'photos' && (
              <div className="space-y-4">
                {/* Front Image */}
                <div>
                  <label className={`block text-[9px] font-medium uppercase tracking-wide mb-2 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>
                    Foto de Frente *
                  </label>
                  <div className={`relative aspect-square rounded-xl overflow-hidden ${isDark ? 'bg-neutral-800 border-neutral-700' : 'bg-gray-100 border-gray-200'} border`}>
                    {frontImage && <img src={frontImage} alt="Frente" className="w-full h-full object-contain" />}
                    <div className="absolute bottom-2 right-2">
                      <label className="w-8 h-8 rounded-full bg-pink-500 text-white flex items-center justify-center cursor-pointer">
                        <i className="fas fa-camera text-xs"></i>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && handleFrontImageSelect(e.target.files)} />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Back Image */}
                <div>
                  <label className={`block text-[9px] font-medium uppercase tracking-wide mb-2 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>
                    Foto de Costas (opcional)
                  </label>
                  <div
                    onClick={() => backImageInputRef.current?.click()}
                    className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer transition-all ${
                      backImage
                        ? ''
                        : isDark
                        ? 'bg-neutral-800 border-neutral-700 border-2 border-dashed hover:border-pink-500/50'
                        : 'bg-gray-100 border-gray-300 border-2 border-dashed hover:border-pink-400'
                    }`}
                  >
                    {backImage ? (
                      <>
                        <img src={backImage} alt="Costas" className="w-full h-full object-contain" />
                        <button
                          onClick={(e) => { e.stopPropagation(); setBackImage(null); }}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center"
                        >
                          <i className="fas fa-times text-xs"></i>
                        </button>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className={`w-12 h-12 rounded-full ${isDark ? 'bg-neutral-700' : 'bg-gray-200'} flex items-center justify-center mb-2`}>
                          <i className={`fas fa-plus ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}></i>
                        </div>
                        <span className={`text-xs ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Adicionar foto de costas</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className={`p-3 rounded-xl ${isDark ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'}`}>
                  <div className="flex items-start gap-2">
                    <i className="fas fa-info-circle text-blue-500 mt-0.5"></i>
                    <p className={`text-xs ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                      Adicionar foto de costas permite gerar imagens de ambos os lados com <strong>1 crédito</strong>.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleNextToDataStep}
                  className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold rounded-xl text-sm"
                >
                  Próximo <i className="fas fa-arrow-right ml-2"></i>
                </button>
              </div>
            )}

            {/* STEP: Data */}
            {addProductStep === 'data' && (
              <div className="space-y-3">
                {/* Preview */}
                <div className="flex gap-3 mb-4">
                  <div className={`w-20 h-20 rounded-lg overflow-hidden ${isDark ? 'border-neutral-700' : 'border-gray-200'} border`}>
                    <img src={frontImage!} alt="Frente" className="w-full h-full object-cover" />
                  </div>
                  {backImage && (
                    <div className={`w-20 h-20 rounded-lg overflow-hidden ${isDark ? 'border-neutral-700' : 'border-gray-200'} border`}>
                      <img src={backImage} alt="Costas" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <div>
                  <label className={`block text-[9px] font-medium uppercase tracking-wide mb-1 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Nome do Produto *</label>
                  <input
                    type="text"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg text-sm ${isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                    placeholder="Ex: Camiseta Básica Branca"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-[9px] font-medium uppercase tracking-wide mb-1 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Categoria *</label>
                    <select
                      value={newProduct.category}
                      onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg text-sm ${isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                    >
                      <option value="">Selecione</option>
                      {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={`block text-[9px] font-medium uppercase tracking-wide mb-1 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Marca</label>
                    <input
                      type="text"
                      value={newProduct.brand}
                      onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg text-sm ${isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-[9px] font-medium uppercase tracking-wide mb-1 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Cor</label>
                    <select
                      value={newProduct.color}
                      onChange={(e) => setNewProduct({ ...newProduct, color: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg text-sm ${isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                    >
                      <option value="">Selecione</option>
                      {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={`block text-[9px] font-medium uppercase tracking-wide mb-1 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Caimento</label>
                    <select
                      value={newProduct.fit}
                      onChange={(e) => setNewProduct({ ...newProduct, fit: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg text-sm ${isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                    >
                      <option value="">Selecione</option>
                      {FITS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={`block text-[9px] font-medium uppercase tracking-wide mb-1 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Coleção</label>
                  <select
                    value={newProduct.collection}
                    onChange={(e) => setNewProduct({ ...newProduct, collection: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg text-sm ${isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                  >
                    <option value="">Selecione</option>
                    {COLLECTIONS.map(col => <option key={col} value={col}>{col}</option>)}
                  </select>
                </div>

                <button
                  onClick={handleCreateProduct}
                  disabled={isCreatingProduct || !newProduct.name || !newProduct.category}
                  className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isCreatingProduct ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Salvando...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check"></i> Salvar Produto
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* WARNING: No Back Image */}
      {showBackImageWarning && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`${isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200'} rounded-2xl border w-full max-w-sm p-5`}>
            <div className="text-center mb-4">
              <div className={`w-16 h-16 rounded-full ${isDark ? 'bg-amber-500/20' : 'bg-amber-100'} flex items-center justify-center mx-auto mb-3`}>
                <i className="fas fa-exclamation-triangle text-amber-500 text-2xl"></i>
              </div>
              <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Sem foto de costas</h3>
              <p className={`text-sm ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
                O produto não tem foto de costas. A IA pode não conseguir gerar resultados precisos para visualizações de costas.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowBackImageWarning(false)}
                className={`flex-1 py-2.5 rounded-xl font-medium text-sm ${isDark ? 'bg-neutral-800 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                Voltar
              </button>
              <button
                onClick={handleConfirmWithoutBack}
                className="flex-1 py-2.5 bg-pink-500 text-white rounded-xl font-bold text-sm"
              >
                Continuar assim
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PRODUCT MODAL */}
      {showEditProduct && editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <div className={`${isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200'} rounded-t-2xl md:rounded-2xl border w-full max-w-md p-5 max-h-[90vh] overflow-y-auto`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Editar Produto</h3>
              <button onClick={() => { setShowEditProduct(false); setEditingProduct(null); }} className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? 'bg-neutral-800 text-neutral-400' : 'bg-gray-100 text-gray-500'}`}>
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>

            <div className="space-y-4">
              {/* Images */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[9px] font-medium uppercase tracking-wide mb-2 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Frente</label>
                  <div
                    onClick={() => editFrontInputRef.current?.click()}
                    className={`aspect-square rounded-xl overflow-hidden cursor-pointer ${isDark ? 'bg-neutral-800 border-neutral-700' : 'bg-gray-100 border-gray-200'} border relative`}
                  >
                    {editFrontImage && <img src={editFrontImage} alt="Frente" className="w-full h-full object-contain" />}
                    <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-all flex items-center justify-center">
                      <i className="fas fa-camera text-white text-xl"></i>
                    </div>
                  </div>
                </div>
                <div>
                  <label className={`block text-[9px] font-medium uppercase tracking-wide mb-2 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Costas</label>
                  <div
                    onClick={() => editBackInputRef.current?.click()}
                    className={`aspect-square rounded-xl overflow-hidden cursor-pointer ${isDark ? 'bg-neutral-800 border-neutral-700 border-2 border-dashed' : 'bg-gray-100 border-gray-300 border-2 border-dashed'} relative`}
                  >
                    {editBackImage ? (
                      <>
                        <img src={editBackImage} alt="Costas" className="w-full h-full object-contain" />
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditBackImage(null); }}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center"
                        >
                          <i className="fas fa-times text-xs"></i>
                        </button>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <i className={`fas fa-plus ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}></i>
                        <span className={`text-[10px] mt-1 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Adicionar</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Form fields */}
              <div>
                <label className={`block text-[9px] font-medium uppercase tracking-wide mb-1 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Nome *</label>
                <input
                  type="text"
                  value={editProductData.name}
                  onChange={(e) => setEditProductData({ ...editProductData, name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg text-sm ${isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[9px] font-medium uppercase tracking-wide mb-1 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Categoria *</label>
                  <select
                    value={editProductData.category}
                    onChange={(e) => setEditProductData({ ...editProductData, category: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg text-sm ${isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                  >
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block text-[9px] font-medium uppercase tracking-wide mb-1 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Marca</label>
                  <input
                    type="text"
                    value={editProductData.brand}
                    onChange={(e) => setEditProductData({ ...editProductData, brand: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg text-sm ${isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[9px] font-medium uppercase tracking-wide mb-1 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Cor</label>
                  <select
                    value={editProductData.color}
                    onChange={(e) => setEditProductData({ ...editProductData, color: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg text-sm ${isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                  >
                    <option value="">Selecione</option>
                    {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block text-[9px] font-medium uppercase tracking-wide mb-1 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Caimento</label>
                  <select
                    value={editProductData.fit}
                    onChange={(e) => setEditProductData({ ...editProductData, fit: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg text-sm ${isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                  >
                    <option value="">Selecione</option>
                    {FITS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>

              <button
                onClick={handleSaveEditProduct}
                className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold rounded-xl text-sm"
              >
                <i className="fas fa-save mr-2"></i> Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteConfirm && productToDelete && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`${isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200'} rounded-2xl border w-full max-w-sm p-5`}>
            <div className="text-center mb-4">
              <div className={`w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-3`}>
                <i className="fas fa-trash text-red-500 text-2xl"></i>
              </div>
              <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Excluir Produto?</h3>
              <p className={`text-sm ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
                Tem certeza que deseja excluir <strong>{productToDelete.name}</strong>? Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteConfirm(false); setProductToDelete(null); }}
                className={`flex-1 py-2.5 rounded-xl font-medium text-sm ${isDark ? 'bg-neutral-800 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteProduct}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-bold text-sm"
              >
                <i className="fas fa-trash mr-2"></i> Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD CLIENT MODAL */}
      {showAddClient && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <div className={`${isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200'} rounded-t-2xl md:rounded-2xl border w-full max-w-md p-5 max-h-[90vh] overflow-y-auto`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Novo Cliente</h3>
              <button onClick={() => setShowAddClient(false)} className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? 'bg-neutral-800 text-neutral-400' : 'bg-gray-100 text-gray-500'}`}>
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[9px] font-medium uppercase tracking-wide mb-1 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Nome *</label>
                  <input
                    type="text"
                    value={newClient.firstName}
                    onChange={(e) => setNewClient({ ...newClient, firstName: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg text-sm ${isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                  />
                </div>
                <div>
                  <label className={`block text-[9px] font-medium uppercase tracking-wide mb-1 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Sobrenome *</label>
                  <input
                    type="text"
                    value={newClient.lastName}
                    onChange={(e) => setNewClient({ ...newClient, lastName: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg text-sm ${isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-[9px] font-medium uppercase tracking-wide mb-1 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>WhatsApp *</label>
                <input
                  type="tel"
                  value={newClient.whatsapp}
                  onChange={(e) => setNewClient({ ...newClient, whatsapp: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg text-sm ${isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div>
                <label className={`block text-[9px] font-medium uppercase tracking-wide mb-1 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Email</label>
                <input
                  type="email"
                  value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg text-sm ${isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                />
              </div>

              {/* Photos for Provador */}
              <div>
                <label className={`block text-[9px] font-medium uppercase tracking-wide mb-2 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Fotos para Provador IA</label>
                <div className="grid grid-cols-3 gap-2">
                  {PHOTO_TYPES.map(photoType => {
                    const photo = newClient.photos.find(p => p.type === photoType.id);
                    return (
                      <div key={photoType.id} className="text-center">
                        <div
                          onClick={() => { setUploadingPhotoType(photoType.id); document.getElementById(`client-photo-${photoType.id}`)?.click(); }}
                          className={`aspect-square rounded-lg overflow-hidden cursor-pointer ${
                            photo ? '' : isDark ? 'bg-neutral-800 border border-neutral-700 border-dashed' : 'bg-gray-100 border border-gray-300 border-dashed'
                          } relative`}
                        >
                          {photo ? (
                            <>
                              <img src={photo.base64} alt={photoType.label} className="w-full h-full object-cover" />
                              <button
                                onClick={(e) => { e.stopPropagation(); handleRemoveClientPhoto(photoType.id); }}
                                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center"
                              >
                                <i className="fas fa-times text-[8px]"></i>
                              </button>
                            </>
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <i className={`fas ${photoType.icon} ${isDark ? 'text-neutral-600' : 'text-gray-400'}`}></i>
                            </div>
                          )}
                        </div>
                        <span className={`text-[9px] ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>{photoType.label}</span>
                        <input
                          id={`client-photo-${photoType.id}`}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleClientPhotoUpload}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleCreateClient}
                disabled={!newClient.firstName || !newClient.lastName || !newClient.whatsapp}
                className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold rounded-xl text-sm disabled:opacity-50"
              >
                <i className="fas fa-user-plus mr-2"></i> Cadastrar Cliente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDITOR MODAL */}
      {showProductEditor && selectedProduct && (
        <EditorModal
          product={selectedProduct}
          products={products}
          userCredits={credits}
          savedModels={savedModels}
          clients={clients}
          onSaveModel={handleSaveModel}
          onDeleteModel={handleDeleteModel}
          onClose={() => { setShowProductEditor(false); setSelectedProduct(null); }}
          onUpdateProduct={handleUpdateProduct}
          onDeductCredits={handleDeductCredits}
          onGenerateImage={handleGenerateImage}
          onMarkSaved={handleMarkSaved}
          onSendWhatsApp={handleSendWhatsApp}
          theme={theme}
          userId={user?.id}
        />
      )}

      {/* BOTTOM NAV (Mobile) */}
      <nav className={`fixed bottom-0 left-0 right-0 ${isDark ? 'bg-black/90 border-neutral-800' : 'bg-white/90 border-gray-200'} backdrop-blur-xl border-t md:hidden z-30`}>
        <div className="flex justify-around py-2">
          {[
            { id: 'home', icon: 'fa-home', label: 'Início' },
            { id: 'studio', icon: 'fa-magic', label: 'Studio' },
            { id: 'products', icon: 'fa-box', label: 'Produtos' },
            { id: 'clients', icon: 'fa-users', label: 'Clientes' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id as any)}
              className={`flex flex-col items-center gap-1 px-4 py-1 ${currentPage === item.id ? 'text-pink-500' : isDark ? 'text-neutral-500' : 'text-gray-400'}`}
            >
              <i className={`fas ${item.icon} text-lg`}></i>
              <span className="text-[9px]">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

export default App;

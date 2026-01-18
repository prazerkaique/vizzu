// ═══════════════════════════════════════════════════════════════
// VIZZU - App.tsx (VERSÃO CORRIGIDA - TYPESCRIPT ERRORS FIXED)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef } from 'react';
import { 
  User, Product, ProductImage, ProductOriginalImages, ProductGeneratedImages,
  GeneratedImageSet, HistoryLog, Client, ClientPhoto, SavedModelProfile,
  LookComposition, WhatsAppTemplate, VisualStudioGeneration, CreditHistoryItem
} from './types';
import { AuthPage } from './components/AuthPage';
import { EditorModal } from './components/Studio';
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
  // CREDITS HOOK - FIXED: Use userCredits instead of credits
  // ══════════════════════════════════════════════════════════════════
  const { userCredits, deductCredits, currentPlan, setCredits } = useCredits(user?.id || '');
  
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
          name: newProduct.name,
          brand: newProduct.brand,
          color: newProduct.color,
          fit: newProduct.fit,
          category: newProduct.category,
          collection: newProduct.collection,
          front_image: frontImage,
          back_image: backImage,
          has_back_image: !!backImage
        })
      });

      const data = await response.json();
      
      if (data.product) {
        setProducts(prev => [data.product, ...prev]);
        resetProductCreation();
      }
    } catch (error) {
      console.error('Error creating product:', error);
      alert('Erro ao criar produto');
    } finally {
      setIsCreatingProduct(false);
    }
  };

  const resetProductCreation = () => {
    setShowCreateProduct(false);
    setAddProductStep('source');
    setFrontImage(null);
    setBackImage(null);
    setNewProduct({ name: '', brand: '', color: '', fit: '', category: '', collection: '' });
  };

  // ══════════════════════════════════════════════════════════════════
  // EDIT PRODUCT HANDLERS
  // ══════════════════════════════════════════════════════════════════
  const handleOpenEditProduct = (product: Product) => {
    setEditingProduct(product);
    setEditProductData({
      name: product.name,
      brand: product.brand || '',
      color: product.color || '',
      fit: product.fit || '',
      category: product.category || '',
      collection: product.collection || ''
    });
    setEditFrontImage(product.originalImages?.front?.base64 || product.originalImages?.front?.url || product.images[0]?.url || null);
    setEditBackImage(product.originalImages?.back?.base64 || product.originalImages?.back?.url || null);
    setShowEditProduct(true);
  };

  const handleEditFrontImageSelect = (files: FileList) => {
    if (files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = () => setEditFrontImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleEditBackImageSelect = (files: FileList) => {
    if (files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = () => setEditBackImage(reader.result as string);
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
          brand: editProductData.brand,
          color: editProductData.color,
          fit: editProductData.fit,
          category: editProductData.category,
          collection: editProductData.collection,
          front_image: editFrontImage,
          back_image: editBackImage,
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
              originalImages: {
                front: editFrontImage ? { name: editProductData.name, base64: editFrontImage } : p.originalImages?.front,
                back: editBackImage ? { name: editProductData.name, base64: editBackImage } : undefined
              },
              hasBackImage: !!editBackImage
            };
          }
          return p;
        }));
        setShowEditProduct(false);
        setEditingProduct(null);
      }
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Erro ao atualizar produto');
    }
  };

  // ══════════════════════════════════════════════════════════════════
  // DELETE PRODUCT HANDLERS
  // ══════════════════════════════════════════════════════════════════
  const handleDeleteProduct = async () => {
    if (!productToDelete) return;

    try {
      await fetch('https://n8nwebhook.brainia.store/webhook/vizzu/produto-deletar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productToDelete.id,
          user_id: user?.id
        })
      });

      setProducts(prev => prev.filter(p => p.id !== productToDelete.id));
      setShowDeleteConfirm(false);
      setProductToDelete(null);
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Erro ao deletar produto');
    }
  };

  // ══════════════════════════════════════════════════════════════════
  // CLIENT HANDLERS
  // ══════════════════════════════════════════════════════════════════
  const handleClientPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && uploadingPhotoType) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        const newPhoto: ClientPhoto = {
          type: uploadingPhotoType,
          base64: reader.result as string,
          uploadedAt: new Date().toISOString()
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

  const handleRemoveClientPhoto = (photoType: ClientPhoto['type']) => {
    setNewClient(prev => ({
      ...prev,
      photos: prev.photos.filter(p => p.type !== photoType)
    }));
  };

  const handleCreateClient = async () => {
    if (!newClient.firstName || !newClient.lastName || !newClient.whatsapp) return;

    try {
      const response = await fetch('https://n8nwebhook.brainia.store/webhook/vizzu/cliente-criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id,
          first_name: newClient.firstName,
          last_name: newClient.lastName,
          whatsapp: newClient.whatsapp,
          email: newClient.email,
          photos: newClient.photos
        })
      });

      const data = await response.json();
      
      if (data.client) {
        setClients(prev => [data.client, ...prev]);
        setShowAddClient(false);
        setNewClient({ firstName: '', lastName: '', whatsapp: '', email: '', photos: [] });
      }
    } catch (error) {
      console.error('Error creating client:', error);
      alert('Erro ao criar cliente');
    }
  };

  // ══════════════════════════════════════════════════════════════════
  // AI GENERATION HANDLER - FIXED: Correct function signatures
  // ══════════════════════════════════════════════════════════════════
  const handleGenerateImage = async (
    product: Product,
    type: 'studio' | 'cenario' | 'lifestyle',
    prompt?: string,
    options?: any
  ): Promise<{ image: string | null; generationId: string | null; backImage?: string | null }> => {
    try {
      const frontImageBase64 = product.originalImages?.front?.base64 || product.originalImages?.front?.url || product.images[0]?.base64 || product.images[0]?.url;
      const backImageBase64 = product.originalImages?.back?.base64 || product.originalImages?.back?.url;
      
      let result: { image: string | null; generationId: string | null; backImage?: string | null } = { image: null, generationId: null };

      if (type === 'studio') {
        // Generate front - FIXED: Pass single object parameter
        const frontResult = await generateStudioReady({
          imageBase64: frontImageBase64!,
          userId: user?.id || '',
          productId: product.id
        });
        result.image = frontResult.imageUrl || null;
        result.generationId = frontResult.generation?.id || null;
        
        // Generate back if exists (same 1 credit for both)
        if (backImageBase64) {
          const backResult = await generateStudioReady({
            imageBase64: backImageBase64,
            userId: user?.id || '',
            productId: product.id,
            isBackImage: true
          });
          result.backImage = backResult.imageUrl || null;
        }
      } else if (type === 'cenario') {
        const frontResult = await generateCenario({
          imageBase64: frontImageBase64!,
          prompt: prompt || '',
          userId: user?.id || '',
          productId: product.id
        });
        result.image = frontResult.imageUrl || null;
        result.generationId = frontResult.generation?.id || null;
        
        if (backImageBase64) {
          const backResult = await generateCenario({
            imageBase64: backImageBase64,
            prompt: prompt || '',
            userId: user?.id || '',
            productId: product.id,
            isBackImage: true
          });
          result.backImage = backResult.imageUrl || null;
        }
      } else if (type === 'lifestyle') {
        const frontResult = await generateModeloIA({
          imageBase64: frontImageBase64!,
          userId: user?.id || '',
          productId: product.id,
          options
        });
        result.image = frontResult.imageUrl || null;
        result.generationId = frontResult.generation?.id || null;
        
        if (backImageBase64) {
          const backResult = await generateModeloIA({
            imageBase64: backImageBase64,
            userId: user?.id || '',
            productId: product.id,
            options: { ...options, isBackImage: true }
          });
          result.backImage = backResult.imageUrl || null;
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
          tool: type,
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
      console.error('Error generating image:', error);
      return { image: null, generationId: null };
    }
  };

  // ══════════════════════════════════════════════════════════════════
  // SAVED MODELS HANDLERS
  // ══════════════════════════════════════════════════════════════════
  const handleSaveModel = async (model: SavedModelProfile) => {
    try {
      await fetch('https://n8nwebhook.brainia.store/webhook/vizzu/modelo-salvar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id,
          model
        })
      });
      setSavedModels(prev => [model, ...prev]);
    } catch (error) {
      console.error('Error saving model:', error);
    }
  };

  const handleDeleteModel = async (modelId: string) => {
    try {
      await fetch('https://n8nwebhook.brainia.store/webhook/vizzu/modelo-deletar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id,
          model_id: modelId
        })
      });
      setSavedModels(prev => prev.filter(m => m.id !== modelId));
    } catch (error) {
      console.error('Error deleting model:', error);
    }
  };

  // ══════════════════════════════════════════════════════════════════
  // MARK SAVED HANDLER
  // ══════════════════════════════════════════════════════════════════
  const handleMarkSaved = (generationId: string) => {
    setGenerations(prev => prev.map(g => 
      g.id === generationId ? { ...g, saved: true } : g
    ));
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
  // RENDER: AUTH CHECK - FIXED: Remove theme prop from AuthPage
  // ══════════════════════════════════════════════════════════════════
  if (!isAuthenticated) {
    return <AuthPage onLogin={handleLogin} />;
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
            {/* Credits Display - FIXED: Use userCredits */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-gray-100 border-gray-200'} border`}>
              <i className="fas fa-coins text-yellow-500 text-sm"></i>
              <span className="text-sm font-medium">{userCredits}</span>
            </div>
            
            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className={`w-9 h-9 rounded-full flex items-center justify-center ${isDark ? 'bg-neutral-900 text-yellow-400' : 'bg-gray-100 text-gray-600'}`}
            >
              <i className={`fas ${isDark ? 'fa-sun' : 'fa-moon'}`}></i>
            </button>
            
            {/* User Avatar */}
            <button onClick={handleLogout} className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
              {user?.name?.charAt(0) || 'U'}
            </button>
          </div>
        </div>
      </header>

      {/* SIDEBAR (Desktop) */}
      <aside className={`hidden md:flex fixed left-0 top-16 bottom-0 w-64 flex-col ${isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-white border-gray-200'} border-r z-30`}>
        <nav className="flex-1 p-4 space-y-1">
          {[
            { id: 'home', icon: 'fa-home', label: 'Início' },
            { id: 'studio', icon: 'fa-magic', label: 'Visual Studio' },
            { id: 'products', icon: 'fa-box', label: 'Produtos' },
            { id: 'clients', icon: 'fa-users', label: 'Clientes' },
            { id: 'settings', icon: 'fa-cog', label: 'Configurações' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                currentPage === item.id 
                  ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-pink-500' 
                  : isDark ? 'text-neutral-400 hover:bg-neutral-900' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <i className={`fas ${item.icon}`}></i>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
        
        {/* Plan Info */}
        <div className={`p-4 border-t ${isDark ? 'border-neutral-800' : 'border-gray-200'}`}>
          <div className={`p-4 rounded-xl ${isDark ? 'bg-neutral-900' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <i className="fas fa-crown text-yellow-500"></i>
              <span className="font-medium text-sm">{currentPlan?.name || 'Plano Básico'}</span>
            </div>
            <div className="text-xs text-neutral-500">
              {userCredits} créditos disponíveis
            </div>
          </div>
        </div>
      </aside>

      {/* MOBILE SIDEBAR */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)}></div>
          <aside className={`absolute left-0 top-0 bottom-0 w-72 ${isDark ? 'bg-neutral-950' : 'bg-white'} p-4`}>
            <div className="flex items-center justify-between mb-6">
              <img src="/logo.png" alt="Vizzu" className="h-8" />
              <button onClick={() => setSidebarOpen(false)}>
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            <nav className="space-y-1">
              {[
                { id: 'home', icon: 'fa-home', label: 'Início' },
                { id: 'studio', icon: 'fa-magic', label: 'Visual Studio' },
                { id: 'products', icon: 'fa-box', label: 'Produtos' },
                { id: 'clients', icon: 'fa-users', label: 'Clientes' },
                { id: 'settings', icon: 'fa-cog', label: 'Configurações' },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => { setCurrentPage(item.id as any); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    currentPage === item.id 
                      ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-pink-500' 
                      : isDark ? 'text-neutral-400' : 'text-gray-600'
                  }`}
                >
                  <i className={`fas ${item.icon}`}></i>
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* MAIN CONTENT */}
      <main className="md:ml-64 pb-20 md:pb-8">
        <div className="max-w-6xl mx-auto p-4">
          
          {/* HOME PAGE */}
          {currentPage === 'home' && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <h1 className="text-3xl font-bold mb-2">
                  Olá, <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">{user?.name?.split(' ')[0]}</span>!
                </h1>
                <p className={`${isDark ? 'text-neutral-400' : 'text-gray-600'}`}>O que você quer criar hoje?</p>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: 'fa-wand-magic-sparkles', label: 'Studio Ready', color: 'from-pink-500 to-rose-500', action: () => setCurrentPage('studio') },
                  { icon: 'fa-image', label: 'Cenário Criativo', color: 'from-purple-500 to-indigo-500', action: () => setCurrentPage('studio') },
                  { icon: 'fa-user', label: 'Modelo IA', color: 'from-blue-500 to-cyan-500', action: () => setCurrentPage('studio') },
                  { icon: 'fa-shirt', label: 'Provador Virtual', color: 'from-green-500 to-emerald-500', action: () => setCurrentPage('provador') },
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={item.action}
                    className={`p-6 rounded-2xl bg-gradient-to-br ${item.color} text-white text-center`}
                  >
                    <i className={`fas ${item.icon} text-2xl mb-2`}></i>
                    <div className="font-medium text-sm">{item.label}</div>
                  </button>
                ))}
              </div>

              {/* Recent Products */}
              {products.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold">Produtos Recentes</h2>
                    <button onClick={() => setCurrentPage('products')} className="text-pink-500 text-sm font-medium">Ver todos</button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {products.slice(0, 4).map(product => (
                      <div
                        key={product.id}
                        onClick={() => { setSelectedProduct(product); setShowProductEditor(true); }}
                        className={`rounded-xl overflow-hidden cursor-pointer ${isDark ? 'bg-neutral-900' : 'bg-white'} shadow-lg`}
                      >
                        <div className="aspect-square">
                          <img
                            src={product.originalImages?.front?.base64 || product.originalImages?.front?.url || product.images[0]?.url}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="p-3">
                          <div className="font-medium text-sm truncate">{product.name}</div>
                          <div className={`text-xs ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>{product.category}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PRODUCTS PAGE */}
          {currentPage === 'products' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold">Produtos</h1>
                <button
                  onClick={() => setShowImport(true)}
                  className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold rounded-xl text-sm"
                >
                  <i className="fas fa-plus mr-2"></i> Adicionar
                </button>
              </div>

              {products.length === 0 ? (
                <div className={`text-center py-16 ${isDark ? 'bg-neutral-900' : 'bg-white'} rounded-2xl`}>
                  <i className="fas fa-box-open text-4xl text-neutral-500 mb-4"></i>
                  <h3 className="font-bold mb-2">Nenhum produto ainda</h3>
                  <p className={`text-sm ${isDark ? 'text-neutral-500' : 'text-gray-500'} mb-4`}>Adicione seu primeiro produto para começar</p>
                  <button
                    onClick={() => setShowImport(true)}
                    className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold rounded-xl text-sm"
                  >
                    <i className="fas fa-plus mr-2"></i> Adicionar Produto
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {products.map(product => (
                    <div
                      key={product.id}
                      className={`rounded-xl overflow-hidden ${isDark ? 'bg-neutral-900' : 'bg-white'} shadow-lg group relative`}
                    >
                      <div 
                        className="aspect-square cursor-pointer"
                        onClick={() => { setSelectedProduct(product); setShowProductEditor(true); }}
                      >
                        <img
                          src={product.originalImages?.front?.base64 || product.originalImages?.front?.url || product.images[0]?.url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-3">
                        <div className="font-medium text-sm truncate">{product.name}</div>
                        <div className={`text-xs ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>{product.category}</div>
                      </div>
                      
                      {/* Product Actions */}
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenEditProduct(product)}
                          className="w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center"
                        >
                          <i className="fas fa-pen text-xs"></i>
                        </button>
                        <button
                          onClick={() => { setProductToDelete(product); setShowDeleteConfirm(true); }}
                          className="w-7 h-7 rounded-full bg-red-500/80 text-white flex items-center justify-center"
                        >
                          <i className="fas fa-trash text-xs"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CLIENTS PAGE */}
          {currentPage === 'clients' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold">Clientes</h1>
                <button
                  onClick={() => setShowAddClient(true)}
                  className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold rounded-xl text-sm"
                >
                  <i className="fas fa-user-plus mr-2"></i> Novo Cliente
                </button>
              </div>

              {clients.length === 0 ? (
                <div className={`text-center py-16 ${isDark ? 'bg-neutral-900' : 'bg-white'} rounded-2xl`}>
                  <i className="fas fa-users text-4xl text-neutral-500 mb-4"></i>
                  <h3 className="font-bold mb-2">Nenhum cliente ainda</h3>
                  <p className={`text-sm ${isDark ? 'text-neutral-500' : 'text-gray-500'} mb-4`}>Cadastre seus clientes para usar o Provador Virtual</p>
                  <button
                    onClick={() => setShowAddClient(true)}
                    className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold rounded-xl text-sm"
                  >
                    <i className="fas fa-user-plus mr-2"></i> Cadastrar Cliente
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {clients.map(client => (
                    <div
                      key={client.id}
                      className={`p-4 rounded-xl ${isDark ? 'bg-neutral-900' : 'bg-white'} shadow-lg`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold">
                          {client.firstName.charAt(0)}{client.lastName.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{client.firstName} {client.lastName}</div>
                          <div className={`text-sm ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>{client.whatsapp}</div>
                        </div>
                        <button
                          onClick={() => {
                            const phone = client.whatsapp.replace(/\D/g, '');
                            window.open(`https://wa.me/${phone}`, '_blank');
                          }}
                          className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center"
                        >
                          <i className="fab fa-whatsapp"></i>
                        </button>
                      </div>
                      
                      {/* Client Photos */}
                      {client.photos && client.photos.length > 0 && (
                        <div className="flex gap-2 mt-3">
                          {client.photos.map((photo, i) => (
                            <div key={i} className="w-10 h-10 rounded-lg overflow-hidden">
                              <img src={photo.base64} alt={photo.type} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STUDIO PAGE */}
          {currentPage === 'studio' && (
            <div className="space-y-4">
              <h1 className="text-xl font-bold">Visual Studio</h1>
              <p className={`${isDark ? 'text-neutral-400' : 'text-gray-600'}`}>
                Selecione um produto para começar a criar imagens profissionais
              </p>
              
              {products.length === 0 ? (
                <div className={`text-center py-16 ${isDark ? 'bg-neutral-900' : 'bg-white'} rounded-2xl`}>
                  <i className="fas fa-box-open text-4xl text-neutral-500 mb-4"></i>
                  <h3 className="font-bold mb-2">Nenhum produto ainda</h3>
                  <p className={`text-sm ${isDark ? 'text-neutral-500' : 'text-gray-500'} mb-4`}>Adicione produtos para usar o Visual Studio</p>
                  <button
                    onClick={() => { setCurrentPage('products'); setShowImport(true); }}
                    className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold rounded-xl text-sm"
                  >
                    <i className="fas fa-plus mr-2"></i> Adicionar Produto
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {products.map(product => (
                    <div
                      key={product.id}
                      onClick={() => { setSelectedProduct(product); setShowProductEditor(true); }}
                      className={`rounded-xl overflow-hidden cursor-pointer ${isDark ? 'bg-neutral-900 hover:bg-neutral-800' : 'bg-white hover:bg-gray-50'} shadow-lg transition-colors`}
                    >
                      <div className="aspect-square">
                        <img
                          src={product.originalImages?.front?.base64 || product.originalImages?.front?.url || product.images[0]?.url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-3">
                        <div className="font-medium text-sm truncate">{product.name}</div>
                        <div className={`text-xs ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>
                          {(product.generatedImages?.studioReady?.length || 0) + 
                           (product.generatedImages?.cenarioCriativo?.length || 0) + 
                           (product.generatedImages?.modeloIA?.length || 0)} imagens geradas
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SETTINGS PAGE */}
          {currentPage === 'settings' && (
            <div className="space-y-4">
              <h1 className="text-xl font-bold">Configurações</h1>
              
              <div className={`p-4 rounded-xl ${isDark ? 'bg-neutral-900' : 'bg-white'} space-y-4`}>
                {/* Theme Setting */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Tema</div>
                    <div className={`text-sm ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Escolha entre claro e escuro</div>
                  </div>
                  <button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className={`px-4 py-2 rounded-lg ${isDark ? 'bg-neutral-800' : 'bg-gray-100'}`}
                  >
                    <i className={`fas ${isDark ? 'fa-sun text-yellow-400' : 'fa-moon text-gray-600'} mr-2`}></i>
                    {isDark ? 'Claro' : 'Escuro'}
                  </button>
                </div>
                
                {/* Logout */}
                <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
                  <div>
                    <div className="font-medium">Sair da conta</div>
                    <div className={`text-sm ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Desconectar do Vizzu</div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 rounded-lg bg-red-500/20 text-red-500"
                  >
                    <i className="fas fa-sign-out-alt mr-2"></i>
                    Sair
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ADD PRODUCT - SOURCE MODAL */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowImport(false)}></div>
          <div className={`relative w-full md:max-w-md ${isDark ? 'bg-neutral-950' : 'bg-white'} rounded-t-3xl md:rounded-2xl p-6`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Adicionar Produto</h3>
              <button onClick={() => setShowImport(false)} className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-neutral-800 text-neutral-400' : 'bg-gray-100 text-gray-500'}`}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`w-full p-4 rounded-xl flex items-center gap-4 ${isDark ? 'bg-neutral-900 hover:bg-neutral-800' : 'bg-gray-50 hover:bg-gray-100'}`}
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white">
                  <i className="fas fa-image"></i>
                </div>
                <div className="text-left">
                  <div className="font-medium">Galeria</div>
                  <div className={`text-sm ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Escolha da galeria</div>
                </div>
              </button>

              <button
                onClick={() => cameraInputRef.current?.click()}
                className={`w-full p-4 rounded-xl flex items-center gap-4 ${isDark ? 'bg-neutral-900 hover:bg-neutral-800' : 'bg-gray-50 hover:bg-gray-100'}`}
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white">
                  <i className="fas fa-camera"></i>
                </div>
                <div className="text-left">
                  <div className="font-medium">Câmera</div>
                  <div className={`text-sm ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Tire uma foto agora</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD PRODUCT - PHOTOS & DATA MODAL */}
      {showCreateProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={resetProductCreation}></div>
          <div className={`relative w-full max-w-lg ${isDark ? 'bg-neutral-950' : 'bg-white'} rounded-2xl p-6 max-h-[90vh] overflow-y-auto`}>
            
            {/* Step: Photos */}
            {addProductStep === 'photos' && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Fotos do Produto</h3>
                  <button onClick={resetProductCreation} className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-neutral-800 text-neutral-400' : 'bg-gray-100 text-gray-500'}`}>
                    <i className="fas fa-times"></i>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  {/* Front Image */}
                  <div>
                    <label className={`block text-xs font-medium mb-2 ${isDark ? 'text-neutral-400' : 'text-gray-600'}`}>Frente *</label>
                    <div className="aspect-square rounded-xl overflow-hidden bg-neutral-900">
                      {frontImage && <img src={frontImage} alt="Frente" className="w-full h-full object-cover" />}
                    </div>
                  </div>

                  {/* Back Image */}
                  <div>
                    <label className={`block text-xs font-medium mb-2 ${isDark ? 'text-neutral-400' : 'text-gray-600'}`}>Costas (opcional)</label>
                    <div
                      onClick={() => backImageInputRef.current?.click()}
                      className={`aspect-square rounded-xl overflow-hidden cursor-pointer ${
                        backImage ? '' : isDark ? 'bg-neutral-900 border-2 border-dashed border-neutral-700' : 'bg-gray-100 border-2 border-dashed border-gray-300'
                      } flex items-center justify-center`}
                    >
                      {backImage ? (
                        <img src={backImage} alt="Costas" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center">
                          <i className="fas fa-plus text-2xl text-neutral-500 mb-2"></i>
                          <div className={`text-xs ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Adicionar</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleNextToDataStep}
                  className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold rounded-xl"
                >
                  Continuar <i className="fas fa-arrow-right ml-2"></i>
                </button>
              </>
            )}

            {/* Step: Data */}
            {addProductStep === 'data' && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <button onClick={() => setAddProductStep('photos')} className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-neutral-800 text-neutral-400' : 'bg-gray-100 text-gray-500'}`}>
                    <i className="fas fa-arrow-left"></i>
                  </button>
                  <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Dados do Produto</h3>
                  <button onClick={resetProductCreation} className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-neutral-800 text-neutral-400' : 'bg-gray-100 text-gray-500'}`}>
                    <i className="fas fa-times"></i>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-neutral-400' : 'text-gray-600'}`}>Nome *</label>
                    <input
                      type="text"
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                      className={`w-full px-4 py-3 rounded-xl ${isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} border`}
                      placeholder="Ex: Camiseta Básica Preta"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-neutral-400' : 'text-gray-600'}`}>Categoria *</label>
                      <select
                        value={newProduct.category}
                        onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                        className={`w-full px-4 py-3 rounded-xl ${isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} border`}
                      >
                        <option value="">Selecione</option>
                        {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-neutral-400' : 'text-gray-600'}`}>Coleção</label>
                      <select
                        value={newProduct.collection}
                        onChange={(e) => setNewProduct({ ...newProduct, collection: e.target.value })}
                        className={`w-full px-4 py-3 rounded-xl ${isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} border`}
                      >
                        <option value="">Selecione</option>
                        {COLLECTIONS.map(col => <option key={col} value={col}>{col}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-neutral-400' : 'text-gray-600'}`}>Cor</label>
                      <select
                        value={newProduct.color}
                        onChange={(e) => setNewProduct({ ...newProduct, color: e.target.value })}
                        className={`w-full px-4 py-3 rounded-xl ${isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} border`}
                      >
                        <option value="">Selecione</option>
                        {COLORS.map(color => <option key={color} value={color}>{color}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-neutral-400' : 'text-gray-600'}`}>Modelagem</label>
                      <select
                        value={newProduct.fit}
                        onChange={(e) => setNewProduct({ ...newProduct, fit: e.target.value })}
                        className={`w-full px-4 py-3 rounded-xl ${isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} border`}
                      >
                        <option value="">Selecione</option>
                        {FITS.map(fit => <option key={fit} value={fit}>{fit}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-neutral-400' : 'text-gray-600'}`}>Marca</label>
                    <input
                      type="text"
                      value={newProduct.brand}
                      onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                      className={`w-full px-4 py-3 rounded-xl ${isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} border`}
                      placeholder="Ex: Nike, Adidas..."
                    />
                  </div>
                </div>

                <button
                  onClick={handleCreateProduct}
                  disabled={isCreatingProduct || !newProduct.name || !newProduct.category}
                  className="w-full py-3 mt-6 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold rounded-xl disabled:opacity-50"
                >
                  {isCreatingProduct ? (
                    <><i className="fas fa-spinner fa-spin mr-2"></i> Criando...</>
                  ) : (
                    <><i className="fas fa-check mr-2"></i> Criar Produto</>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* BACK IMAGE WARNING MODAL */}
      {showBackImageWarning && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60"></div>
          <div className={`relative w-full max-w-sm ${isDark ? 'bg-neutral-900' : 'bg-white'} rounded-2xl p-6 text-center`}>
            <i className="fas fa-exclamation-triangle text-4xl text-yellow-500 mb-4"></i>
            <h3 className="font-bold text-lg mb-2">Foto de costas não adicionada</h3>
            <p className={`text-sm ${isDark ? 'text-neutral-400' : 'text-gray-600'} mb-6`}>
              Algumas ferramentas funcionam melhor com fotos de frente e costas. Deseja continuar sem a foto de costas?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowBackImageWarning(false)}
                className={`flex-1 py-3 rounded-xl ${isDark ? 'bg-neutral-800' : 'bg-gray-100'}`}
              >
                Voltar
              </button>
              <button
                onClick={handleConfirmWithoutBack}
                className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold rounded-xl"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PRODUCT MODAL */}
      {showEditProduct && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowEditProduct(false)}></div>
          <div className={`relative w-full max-w-lg ${isDark ? 'bg-neutral-950' : 'bg-white'} rounded-2xl p-6 max-h-[90vh] overflow-y-auto`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Editar Produto</h3>
              <button onClick={() => setShowEditProduct(false)} className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-neutral-800 text-neutral-400' : 'bg-gray-100 text-gray-500'}`}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Images */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className={`block text-xs font-medium mb-2 ${isDark ? 'text-neutral-400' : 'text-gray-600'}`}>Frente</label>
                <div
                  onClick={() => editFrontInputRef.current?.click()}
                  className="aspect-square rounded-xl overflow-hidden cursor-pointer bg-neutral-900"
                >
                  {editFrontImage && <img src={editFrontImage} alt="Frente" className="w-full h-full object-cover" />}
                </div>
              </div>
              <div>
                <label className={`block text-xs font-medium mb-2 ${isDark ? 'text-neutral-400' : 'text-gray-600'}`}>Costas</label>
                <div
                  onClick={() => editBackInputRef.current?.click()}
                  className={`aspect-square rounded-xl overflow-hidden cursor-pointer ${
                    editBackImage ? '' : isDark ? 'bg-neutral-900 border-2 border-dashed border-neutral-700' : 'bg-gray-100 border-2 border-dashed border-gray-300'
                  } flex items-center justify-center`}
                >
                  {editBackImage ? (
                    <img src={editBackImage} alt="Costas" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <i className="fas fa-plus text-2xl text-neutral-500 mb-2"></i>
                      <div className={`text-xs ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Adicionar</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div>
                <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-neutral-400' : 'text-gray-600'}`}>Nome</label>
                <input
                  type="text"
                  value={editProductData.name}
                  onChange={(e) => setEditProductData({ ...editProductData, name: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl ${isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} border`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-neutral-400' : 'text-gray-600'}`}>Categoria</label>
                  <select
                    value={editProductData.category}
                    onChange={(e) => setEditProductData({ ...editProductData, category: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl ${isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} border`}
                  >
                    <option value="">Selecione</option>
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-neutral-400' : 'text-gray-600'}`}>Coleção</label>
                  <select
                    value={editProductData.collection}
                    onChange={(e) => setEditProductData({ ...editProductData, collection: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl ${isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} border`}
                  >
                    <option value="">Selecione</option>
                    {COLLECTIONS.map(col => <option key={col} value={col}>{col}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-neutral-400' : 'text-gray-600'}`}>Cor</label>
                  <select
                    value={editProductData.color}
                    onChange={(e) => setEditProductData({ ...editProductData, color: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl ${isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} border`}
                  >
                    <option value="">Selecione</option>
                    {COLORS.map(color => <option key={color} value={color}>{color}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-neutral-400' : 'text-gray-600'}`}>Modelagem</label>
                  <select
                    value={editProductData.fit}
                    onChange={(e) => setEditProductData({ ...editProductData, fit: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl ${isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} border`}
                  >
                    <option value="">Selecione</option>
                    {FITS.map(fit => <option key={fit} value={fit}>{fit}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-neutral-400' : 'text-gray-600'}`}>Marca</label>
                <input
                  type="text"
                  value={editProductData.brand}
                  onChange={(e) => setEditProductData({ ...editProductData, brand: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl ${isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} border`}
                />
              </div>
            </div>

            <button
              onClick={handleSaveEditProduct}
              className="w-full py-3 mt-6 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold rounded-xl"
            >
              <i className="fas fa-save mr-2"></i> Salvar Alterações
            </button>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {showDeleteConfirm && productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowDeleteConfirm(false)}></div>
          <div className={`relative w-full max-w-sm ${isDark ? 'bg-neutral-900' : 'bg-white'} rounded-2xl p-6 text-center`}>
            <i className="fas fa-trash text-4xl text-red-500 mb-4"></i>
            <h3 className="font-bold text-lg mb-2">Deletar Produto?</h3>
            <p className={`text-sm ${isDark ? 'text-neutral-400' : 'text-gray-600'} mb-6`}>
              Esta ação não pode ser desfeita. O produto "{productToDelete.name}" e todas as suas imagens geradas serão removidos.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className={`flex-1 py-3 rounded-xl ${isDark ? 'bg-neutral-800' : 'bg-gray-100'}`}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteProduct}
                className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl"
              >
                Deletar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD CLIENT MODAL */}
      {showAddClient && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowAddClient(false)}></div>
          <div className={`relative w-full md:max-w-md ${isDark ? 'bg-neutral-950' : 'bg-white'} rounded-t-3xl md:rounded-2xl p-6`}>
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

      {/* EDITOR MODAL - FIXED: Use userCredits */}
      {showProductEditor && selectedProduct && (
        <EditorModal
          product={selectedProduct}
          products={products}
          userCredits={userCredits}
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

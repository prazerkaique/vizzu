import React, { useState, useEffect, useMemo } from 'react';
import { Client, ClientPhoto, ClientLook, LookComposition } from '../types';
import { useUI } from '../contexts/UIContext';
import { useAuth } from '../contexts/AuthContext';
import { useClients } from '../contexts/ClientsContext';
import { useHistory } from '../contexts/HistoryContext';
import { useDebounce } from '../hooks/useDebounce';
import { supabase } from '../services/supabaseClient';
import { sendWhatsAppMessage } from '../lib/api/studio';
import heic2any from 'heic2any';
import { OptimizedImage } from '../components/OptimizedImage';

const PHOTO_TYPES: { id: ClientPhoto['type']; label: string; icon: string }[] = [
 { id: 'frente', label: 'Frente', icon: 'fa-user' },
 { id: 'costas', label: 'Costas', icon: 'fa-user-slash' },
 { id: 'rosto', label: 'Rosto', icon: 'fa-face-smile' },
];

interface ClientsPageProps {
 showCreateClient: boolean;
 setShowCreateClient: (v: boolean) => void;
 createClientFromProvador: boolean;
 setCreateClientFromProvador: (v: boolean) => void;
 setProvadorClient: (client: Client | null) => void;
}

export const ClientsPage: React.FC<ClientsPageProps> = ({
 showCreateClient,
 setShowCreateClient,
 createClientFromProvador,
 setCreateClientFromProvador,
 setProvadorClient,
}) => {
 const { theme, navigateTo, showToast, successNotification, setSuccessNotification } = useUI();
 const { user } = useAuth();
 const { clients, setClients, saveClientToSupabase, deleteClientFromSupabase, uploadClientPhoto, saveClientPhotoToDb, getClientPhoto } = useClients();
 const { addHistoryLog } = useHistory();

 // States
 const [showClientDetail, setShowClientDetail] = useState<Client | null>(null);
 const [clientDetailLooks, setClientDetailLooks] = useState<ClientLook[]>([]);
 const [showWhatsAppLookModal, setShowWhatsAppLookModal] = useState<Client | null>(null);
 const [selectedLookForWhatsApp, setSelectedLookForWhatsApp] = useState<ClientLook | null>(null);
 const [whatsAppLookMessage, setWhatsAppLookMessage] = useState('');
 const [isSendingWhatsAppLook, setIsSendingWhatsAppLook] = useState(false);
 const [editingClient, setEditingClient] = useState<Client | null>(null);
 const [editClientPhotos, setEditClientPhotos] = useState<ClientPhoto[]>([]);
 const [clientSearchTerm, setClientSearchTerm] = useState('');
 const debouncedClientSearchTerm = useDebounce(clientSearchTerm, 300);
 const [newClient, setNewClient] = useState({ firstName: '', lastName: '', whatsapp: '', email: '', gender: '' as 'male' | 'female' | '', photos: [] as ClientPhoto[], notes: '' });
 const [uploadingPhotoType, setUploadingPhotoType] = useState<ClientPhoto['type'] | null>(null);
 const [processingClientPhoto, setProcessingClientPhoto] = useState(false);
 const [showClientPhotoSourcePicker, setShowClientPhotoSourcePicker] = useState<{ photoType: ClientPhoto['type']; mode: 'create' | 'edit' } | null>(null);
 const [isSavingClient, setIsSavingClient] = useState(false);

 // Memos
 const filteredClients = useMemo(() => clients.filter(client => {
  const fullName = (client.firstName + ' ' + client.lastName).toLowerCase();
  return fullName.includes(debouncedClientSearchTerm.toLowerCase()) || client.whatsapp.includes(debouncedClientSearchTerm) || (client.email && client.email.toLowerCase().includes(debouncedClientSearchTerm.toLowerCase()));
 }), [clients, debouncedClientSearchTerm]);

 const clientsWithProvador = useMemo(() => clients.filter(c => c.hasProvadorIA && (c.photos?.length || c.photo)), [clients]);

 // ESC handler
 useEffect(() => {
  const handleEsc = (e: KeyboardEvent) => {
   if (e.key === 'Escape') {
    if (showCreateClient) setShowCreateClient(false);
    else if (showClientDetail) setShowClientDetail(null);
    else if (editingClient) { setEditingClient(null); setEditClientPhotos([]); }
    else if (showWhatsAppLookModal) { setShowWhatsAppLookModal(null); setSelectedLookForWhatsApp(null); setWhatsAppLookMessage(''); }
   }
  };
  window.addEventListener('keydown', handleEsc);
  return () => window.removeEventListener('keydown', handleEsc);
 }, [showCreateClient, showClientDetail, editingClient, showWhatsAppLookModal]);

 // Carregar looks quando abre detalhe do cliente
 useEffect(() => {
  const loadLooksForDetail = async () => {
   if (showClientDetail && user) {
    try {
     const { data, error } = await supabase
      .from('client_looks')
      .select('*')
      .eq('client_id', showClientDetail.id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

     if (!error && data) {
      const looks: ClientLook[] = data.map(l => ({
       id: l.id,
       clientId: l.client_id,
       userId: l.user_id,
       imageUrl: l.image_url,
       storagePath: l.storage_path,
       lookItems: l.look_items || {},
       createdAt: l.created_at,
      }));
      setClientDetailLooks(looks);
     }
    } catch (error) {
     console.error('Erro ao carregar looks do cliente:', error);
    }
   } else {
    setClientDetailLooks([]);
   }
  };
  loadLooksForDetail();
 }, [showClientDetail?.id, user]);

 // Utility
 const formatWhatsApp = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
   return '(' + digits.slice(0,2) + ') ' + digits.slice(2,7) + '-' + digits.slice(7);
  }
  return phone;
 };

 const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
  e.preventDefault();
  e.stopPropagation();
 };

 // Photo handlers
 const handleRemoveClientPhoto = (type: ClientPhoto['type']) => {
  setNewClient(prev => ({ ...prev, photos: prev.photos.filter(p => p.type !== type) }));
 };

 const processClientPhotoFile = async (file: File, photoType: ClientPhoto['type']) => {
  setProcessingClientPhoto(true);

  try {
   let processedFile: File | Blob = file;

   const fileName = file.name.toLowerCase();
   const isHeic = file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    fileName.endsWith('.heic') ||
    fileName.endsWith('.heif') ||
    (file.type === '' && (fileName.endsWith('.heic') || fileName.endsWith('.heif')));

   if (isHeic) {
    try {
     const convertedBlob = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.85
     });
     processedFile = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
    } catch (heicError: any) {
     if (heicError.message?.includes('already a jpeg') || heicError.message?.includes('already')) {
      processedFile = file;
     } else {
      throw new Error('Não foi possível converter a imagem HEIC. Tente tirar a foto diretamente pelo app ou converter para JPG antes.');
     }
    }
   }

   const reader = new FileReader();
   reader.onload = () => {
    const base64 = reader.result as string;

    if (!base64 || base64.length < 100) {
     alert('Erro ao processar a imagem. Tente novamente.');
     setUploadingPhotoType(null);
     setProcessingClientPhoto(false);
     return;
    }

    const newPhoto: ClientPhoto = {
     type: photoType,
     base64,
     createdAt: new Date().toISOString()
    };
    setNewClient(prev => ({
     ...prev,
     photos: [...prev.photos.filter(p => p.type !== photoType), newPhoto]
    }));
    setUploadingPhotoType(null);
    setProcessingClientPhoto(false);
   };
   reader.onerror = (error) => {
    console.error('[processClientPhotoFile] Erro ao ler arquivo:', error);
    alert('Erro ao ler a imagem. Tente novamente.');
    setUploadingPhotoType(null);
    setProcessingClientPhoto(false);
   };
   reader.readAsDataURL(processedFile);
  } catch (error: any) {
   console.error('[processClientPhotoFile] Erro ao processar foto:', error);
   alert(error.message || 'Erro ao processar a imagem. Tente outro formato (JPG ou PNG).');
   setUploadingPhotoType(null);
   setProcessingClientPhoto(false);
  }
 };

 const processEditClientPhoto = async (file: File, photoType: ClientPhoto['type']) => {
  setProcessingClientPhoto(true);
  try {
   let processedFile: File | Blob = file;
   const fileName = file.name.toLowerCase();
   const isHeic = file.type === 'image/heic' || file.type === 'image/heif' ||
    fileName.endsWith('.heic') || fileName.endsWith('.heif') ||
    (file.type === '' && (fileName.endsWith('.heic') || fileName.endsWith('.heif')));

   if (isHeic) {
    try {
     const convertedBlob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 });
     processedFile = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
    } catch (heicError: any) {
     if (!heicError.message?.includes('already')) throw heicError;
    }
   }

   const reader = new FileReader();
   reader.onload = () => {
    const base64 = reader.result as string;
    if (!base64 || base64.length < 100) {
     alert('Erro ao processar a imagem.');
     setProcessingClientPhoto(false);
     return;
    }
    const newPhoto: ClientPhoto = { type: photoType, base64, createdAt: new Date().toISOString() };
    setEditClientPhotos(prev => [...prev.filter(p => p.type !== photoType), newPhoto]);
    setProcessingClientPhoto(false);
   };
   reader.onerror = () => {
    alert('Erro ao ler a imagem.');
    setProcessingClientPhoto(false);
   };
   reader.readAsDataURL(processedFile);
  } catch (error: any) {
   alert(error.message || 'Erro ao processar a imagem.');
   setProcessingClientPhoto(false);
  }
 };

 const handleClientPhotoDrop = (e: React.DragEvent<HTMLDivElement>, photoType: ClientPhoto['type']) => {
  e.preventDefault();
  e.stopPropagation();
  const file = e.dataTransfer.files?.[0];
  if (file && (file.type.startsWith('image/') || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif'))) {
   processClientPhotoFile(file, photoType);
  }
 };

 const handleEditClientPhotoDrop = (e: React.DragEvent<HTMLDivElement>, photoType: ClientPhoto['type']) => {
  e.preventDefault();
  e.stopPropagation();
  const file = e.dataTransfer.files?.[0];
  if (file && (file.type.startsWith('image/') || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif'))) {
   processEditClientPhoto(file, photoType);
  }
 };

 // CRUD
 const handleCreateClient = async () => {
  if (!newClient.firstName || !newClient.lastName || !newClient.whatsapp) {
   alert('Preencha nome, sobrenome e WhatsApp');
   return;
  }

  setIsSavingClient(true);

  try {
   const clientId = crypto.randomUUID();
   const photosToUpload = [...newClient.photos];

   const client: Client = {
    id: clientId,
    firstName: newClient.firstName,
    lastName: newClient.lastName,
    whatsapp: newClient.whatsapp.replace(/\D/g, ''),
    email: newClient.email || undefined,
    gender: newClient.gender || undefined,
    photos: photosToUpload.length > 0 ? photosToUpload : undefined,
    photo: photosToUpload[0]?.base64,
    hasProvadorIA: photosToUpload.length > 0,
    notes: newClient.notes || undefined,
    status: 'active',
    createdAt: new Date().toISOString(),
    totalOrders: 0
   };

   setClients(prev => [...prev, client]);

   if (user?.id) {
    await saveClientToSupabase(client, user.id);

    if (photosToUpload.length > 0) {
     const uploadResults = await Promise.all(
      photosToUpload.map(async (photo) => {
       const result = await uploadClientPhoto(user.id, clientId, photo);
       if (result) {
        await saveClientPhotoToDb(user.id, clientId, photo, result.url, result.storagePath);
        return { ...photo, base64: result.url } as ClientPhoto;
       }
       return null;
      })
     );

     const uploadedPhotos = uploadResults.filter((p): p is ClientPhoto => p !== null);

     if (uploadedPhotos.length > 0) {
      setClients(prev => prev.map(c =>
       c.id === clientId
        ? { ...c, photos: uploadedPhotos, photo: uploadedPhotos[0]?.base64 }
        : c
      ));
     }

     if (uploadedPhotos.length < photosToUpload.length) {
      showToast(`${photosToUpload.length - uploadedPhotos.length} foto(s) não foram salvas. Verifique o console.`, 'error');
     }
    }
   }

   addHistoryLog('Cliente cadastrado', `${client.firstName} ${client.lastName} foi adicionado`, 'success', [], 'manual', 0);

   setShowCreateClient(false);
   setNewClient({ firstName: '', lastName: '', whatsapp: '', email: '', gender: '', photos: [], notes: '' });

   setSuccessNotification('Cliente cadastrado com sucesso!');
   setTimeout(() => setSuccessNotification(null), 3000);

   if (createClientFromProvador) {
    setProvadorClient(client);
    navigateTo('provador');
    setCreateClientFromProvador(false);
   } else {
    navigateTo('clients');
   }
  } catch (error) {
   console.error('Erro ao salvar cliente:', error);
   alert('Erro ao salvar cliente. Tente novamente.');
  } finally {
   setIsSavingClient(false);
  }
 };

 const handleDeleteClient = (clientId: string) => {
  const client = clients.find(c => c.id === clientId);
  if (confirm('Tem certeza que deseja excluir este cliente?')) {
   setClients(prev => prev.filter(c => c.id !== clientId));
   setShowClientDetail(null);

   deleteClientFromSupabase(clientId);

   if (client) {
    addHistoryLog('Cliente excluído', `${client.firstName} ${client.lastName} foi removido`, 'success', [], 'manual', 0);
   }
  }
 };

 const startEditingClient = (client: Client) => {
  setEditingClient({ ...client });
  setEditClientPhotos(client.photos ? [...client.photos] : []);
  setShowClientDetail(null);
 };

 const saveEditingClient = async () => {
  if (!editingClient) return;

  const updatedClient: Client = {
   ...editingClient,
   photos: editClientPhotos.length > 0 ? editClientPhotos : undefined,
   photo: editClientPhotos[0]?.base64,
   hasProvadorIA: editClientPhotos.length > 0
  };

  setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));

  if (user?.id) {
   await saveClientToSupabase(updatedClient, user.id);

   for (const photo of editClientPhotos) {
    if (photo.base64.startsWith('data:')) {
     const result = await uploadClientPhoto(user.id, updatedClient.id, photo);
     if (result) {
      await saveClientPhotoToDb(user.id, updatedClient.id, photo, result.url, result.storagePath);
     }
    }
   }
  }

  setEditingClient(null);
  setEditClientPhotos([]);
  setSuccessNotification('Cliente atualizado com sucesso!');
  setTimeout(() => setSuccessNotification(null), 3000);
 };

 // WhatsApp look functions
 const formatLookItemsForMessage = (lookItems: LookComposition): string => {
  const lookEmojis: Record<string, string> = {
   head: '🧢',
   top: '👕',
   bottom: '👖',
   feet: '👟',
   accessory1: '💼',
   accessory2: '⌚',
  };
  const items: string[] = [];
  const lookKeys = ['head', 'top', 'bottom', 'feet', 'accessory1', 'accessory2'] as const;
  lookKeys.forEach(key => {
   const item = lookItems[key];
   if (item && item.name) {
    const emoji = lookEmojis[key] || '👔';
    items.push(`${emoji} ${item.name} — Consulte`);
   }
  });
  return items.join('\n');
 };

 const generateWhatsAppLookMessage = (client: Client, look: ClientLook): string => {
  const baseMessage = `Oi ${client.firstName}! 😍\n\nMontei esse look especial pra você:`;
  const lookItems = formatLookItemsForMessage(look.lookItems);
  return lookItems ? `${baseMessage}\n\n${lookItems}` : baseMessage;
 };

 const openWhatsAppLookModal = (client: Client) => {
  setShowWhatsAppLookModal(client);
  if (clientDetailLooks.length === 1) {
   const look = clientDetailLooks[0];
   setSelectedLookForWhatsApp(look);
   setWhatsAppLookMessage(generateWhatsAppLookMessage(client, look));
  } else if (clientDetailLooks.length > 1) {
   setSelectedLookForWhatsApp(null);
   setWhatsAppLookMessage('');
  } else {
   setWhatsAppLookMessage(`Oi ${client.firstName}! 😍`);
  }
 };

 const sendWhatsAppWithLook = async () => {
  if (!showWhatsAppLookModal) return;
  const client = showWhatsAppLookModal;
  const imageUrl = selectedLookForWhatsApp?.imageUrl;

  setIsSendingWhatsAppLook(true);

  try {
   const result = await sendWhatsAppMessage({
    phone: client.whatsapp || '',
    message: whatsAppLookMessage,
    imageUrl: imageUrl,
    clientName: `${client.firstName} ${client.lastName}`,
   });

   if (result.success) {
    alert('WhatsApp enviado com sucesso!');
    setShowWhatsAppLookModal(null);
    setSelectedLookForWhatsApp(null);
    setWhatsAppLookMessage('');
    setIsSendingWhatsAppLook(false);
    return;
   }
  } catch {
   // Evolution API error, use fallback
  }

  // Fallback: Web Share API (mobile) ou wa.me (desktop)
  if (imageUrl) {
   try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const file = new File([blob], 'look.png', { type: 'image/png' });

    if (navigator.canShare?.({ files: [file] })) {
     await navigator.share({
      files: [file],
      text: whatsAppLookMessage
     });
     setShowWhatsAppLookModal(null);
     setSelectedLookForWhatsApp(null);
     setWhatsAppLookMessage('');
     setIsSendingWhatsAppLook(false);
     return;
    }
   } catch {
    // Share API failed, use wa.me
   }
  }

  // Final fallback: WhatsApp with text + image link
  const phone = client.whatsapp?.replace(/\D/g, '') || '';
  const fullPhone = phone.startsWith('55') ? phone : '55' + phone;
  const fullMessage = imageUrl ? whatsAppLookMessage + '\n\n' + imageUrl : whatsAppLookMessage;
  window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(fullMessage)}`, '_blank');

  setShowWhatsAppLookModal(null);
  setSelectedLookForWhatsApp(null);
  setWhatsAppLookMessage('');
  setIsSendingWhatsAppLook(false);
 };

 return (
  <>
   {/* CLIENTS LIST */}
   <div className="flex-1 overflow-y-auto p-4 md:p-6">
    <div className="max-w-5xl mx-auto">
     <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
       <div className={'w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-xl ' + (theme === 'dark' ? 'bg-white/10 border border-white/15' : 'bg-white/60 border border-gray-200/60 shadow-sm')}>
        <i className={'fas fa-users text-sm ' + (theme === 'dark' ? 'text-neutral-200' : 'text-[#1A1A1A]')}></i>
       </div>
       <div>
        <h1 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-extrabold'}>Clientes</h1>
        <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs font-serif italic'}>Gerencie seus clientes</p>
       </div>
      </div>
      <button onClick={() => setShowCreateClient(true)} className="px-3 py-2 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-lg font-medium text-xs">
       <i className="fas fa-plus mr-1.5"></i>Novo Cliente
      </button>
     </div>

     <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
      <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 ') + ' rounded-xl p-3 border'}>
       <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-xl font-bold'}>{clients.length}</p>
       <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>Total</p>
      </div>
      <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 ') + ' rounded-xl p-3 border'}>
       <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-xl font-bold'}>{clients.filter(c => c.status === 'active').length}</p>
       <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>Ativos</p>
      </div>
      <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 ') + ' rounded-xl p-3 border'}>
       <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-xl font-bold'}>{clientsWithProvador.length}</p>
       <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>Provador IA</p>
      </div>
      <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 ') + ' rounded-xl p-3 border'}>
       <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-xl font-bold'}>{clients.filter(c => c.status === 'vip').length}</p>
       <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>VIP</p>
      </div>
     </div>

     {clients.length > 0 && (
      <div className="mb-4">
       <div className="relative">
        <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs'}></i>
        <input type="text" id="client-search" name="clientSearch" placeholder="Buscar por nome, WhatsApp ou e-mail..." value={clientSearchTerm} onChange={(e) => setClientSearchTerm(e.target.value)} className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-gray-200 text-gray-900 ') + ' w-full pl-9 pr-3 py-2.5 border rounded-xl text-sm'} />
       </div>
      </div>
     )}

     {clients.length === 0 ? (
      <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 ') + ' rounded-xl border p-8 text-center'}>
       <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-purple-100') + ' w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3'}>
        <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-purple-400') + ' fas fa-users text-xl'}></i>
       </div>
       <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-medium mb-1'}>Nenhum cliente cadastrado</h3>
       <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs mb-4'}>Adicione clientes para usar o Vizzu Provador®</p>
       <button onClick={() => setShowCreateClient(true)} className="px-4 py-2 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-lg font-medium text-xs">
        <i className="fas fa-plus mr-1.5"></i>Adicionar Cliente
       </button>
      </div>
     ) : (
      <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 ') + ' rounded-xl border overflow-hidden'}>
       <div className={'divide-y ' + (theme === 'dark' ? 'divide-neutral-800' : 'divide-gray-100')}>
        {filteredClients.map(client => (
         <div key={client.id} className={(theme === 'dark' ? 'hover:bg-neutral-800/50' : 'hover:bg-gray-50') + ' p-3 transition-colors cursor-pointer'} onClick={() => { setProvadorClient(client); navigateTo('provador'); }}>
          <div className="flex items-center gap-3">
           <div className="relative">
            {getClientPhoto(client) ? (
             <OptimizedImage src={getClientPhoto(client)} alt={client.firstName} className="w-10 h-10 rounded-full" size="thumb" />
            ) : (
             <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100') + ' w-10 h-10 rounded-full flex items-center justify-center'}>
              <span className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' text-sm font-medium'}>{client.firstName[0]}{client.lastName[0]}</span>
             </div>
            )}
            {client.hasProvadorIA && (
             <div className={'absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center backdrop-blur-xl ' + (theme === 'dark' ? 'bg-white/10 border border-white/15' : 'bg-white/60 border border-gray-200/60 shadow-sm')}>
              <i className={'fas fa-camera text-[6px] ' + (theme === 'dark' ? 'text-neutral-200' : 'text-[#1A1A1A]')}></i>
             </div>
            )}
           </div>
           <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
             <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium text-sm truncate'}>{client.firstName} {client.lastName}</h3>
             {client.photos && client.photos.length > 1 && (
              <span className={(theme === 'dark' ? 'bg-neutral-800 text-neutral-400' : 'bg-purple-100 text-purple-600') + ' text-[8px] px-1.5 py-0.5 rounded-full'}>{client.photos.length} fotos</span>
             )}
            </div>
            <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>{formatWhatsApp(client.whatsapp)}</p>
           </div>
           <div className="flex items-center gap-1.5">
            <button onClick={(e) => { e.stopPropagation(); startEditingClient(client); }} className={(theme === 'dark' ? 'bg-neutral-800 hover:bg-gray-300' : 'bg-gray-100 hover:bg-gray-200') + ' w-8 h-8 rounded-lg flex items-center justify-center transition-colors ' + (theme === 'dark' ? 'text-neutral-400' : 'text-gray-500')} title="Editar">
             <i className="fas fa-pen text-xs"></i>
            </button>
            <button onClick={(e) => { e.stopPropagation(); if (confirm('Excluir cliente ' + client.firstName + ' ' + client.lastName + '?')) handleDeleteClient(client.id); }} className={(theme === 'dark' ? 'bg-neutral-800 hover:bg-red-500/20' : 'bg-gray-100 hover:bg-red-100') + ' w-8 h-8 rounded-lg text-red-500 flex items-center justify-center transition-colors'} title="Excluir">
             <i className="fas fa-trash text-xs"></i>
            </button>
           </div>
          </div>
         </div>
        ))}
       </div>
      </div>
     )}
    </div>
   </div>

   {/* CREATE CLIENT MODAL */}
   {showCreateClient && (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => { setShowCreateClient(false); setNewClient({ firstName: '', lastName: '', whatsapp: '', email: '', gender: '', photos: [], notes: '' }); }}>
     <div className={(theme === 'dark' ? 'bg-neutral-900/95 backdrop-blur-2xl border-neutral-800' : 'bg-white/95 backdrop-blur-2xl border-gray-200') + ' rounded-t-2xl md:rounded-2xl border w-full max-w-md max-h-[90vh] overflow-y-auto safe-area-bottom-sheet'} onClick={(e) => e.stopPropagation()}>
      {/* Drag handle - mobile */}
      <div className="md:hidden pt-3 pb-1 flex justify-center">
       <div className={(theme === 'dark' ? 'bg-gray-300' : 'bg-gray-300') + ' w-10 h-1 rounded-full'}></div>
      </div>
      <div className={'sticky top-0 border-b px-4 py-3 flex items-center justify-between z-10 ' + (theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200')}>
       <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-medium'}>Novo Cliente</h3>
       <button onClick={() => { setShowCreateClient(false); setNewClient({ firstName: '', lastName: '', whatsapp: '', email: '', gender: '', photos: [], notes: '' }); }} className={(theme === 'dark' ? 'bg-neutral-800 text-neutral-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-700') + ' hidden md:flex w-7 h-7 rounded-full items-center justify-center transition-colors'}>
        <i className="fas fa-times text-xs"></i>
       </button>
      </div>
      <div className="p-4 space-y-4">
       <div>
        <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px] font-medium uppercase tracking-wide mb-2 block'}>
         <i className="fas fa-camera text-[#FF6B6B] mr-1"></i>Fotos para Provador IA
        </label>
        <div className="grid grid-cols-3 gap-2">
         {PHOTO_TYPES.map(photoType => {
          const existingPhoto = newClient.photos.find(p => p.type === photoType.id);
          return (
           <div key={photoType.id} className="text-center">
            <div
             onClick={() => { if (existingPhoto) return; setShowClientPhotoSourcePicker({ photoType: photoType.id, mode: 'create' }); }}
             onDragOver={handleDragOver}
             onDrop={(e) => handleClientPhotoDrop(e, photoType.id)}
             className={'relative aspect-square rounded-lg overflow-hidden border border-dashed transition-all cursor-pointer ' + (existingPhoto ? 'border-[#FF9F43]/50 bg-[#FF9F43]/10' : (theme === 'dark' ? 'border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800' : 'border-gray-300 hover:border-neutral-500 hover:bg-gray-50'))}
            >
             {existingPhoto ? (
              <>
               <img src={existingPhoto.base64} alt={photoType.label} className="w-full h-full object-cover" />
               <button onClick={(e) => { e.stopPropagation(); handleRemoveClientPhoto(photoType.id); }} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[9px] hover:bg-red-600"><i className="fas fa-times"></i></button>
               <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white text-[8px] py-0.5 font-medium"><i className="fas fa-check mr-0.5"></i>{photoType.label}</div>
              </>
             ) : (
              <div className={(theme === 'dark' ? 'text-neutral-600' : 'text-purple-400') + ' flex flex-col items-center justify-center h-full'}>
               <i className={'fas ' + photoType.icon + ' text-lg mb-1'}></i>
               <span className="text-[9px] font-medium">{photoType.label}</span>
               <span className="text-[7px] opacity-60 mt-0.5">ou arraste</span>
              </div>
             )}
            </div>
           </div>
          );
         })}
        </div>
        {processingClientPhoto && (
         <div className="flex items-center gap-2 mt-2 px-2.5 py-2 bg-blue-500/10 text-blue-400 rounded-lg">
          <i className="fas fa-spinner fa-spin text-sm"></i>
          <span className="text-[10px] font-medium">Processando imagem... (pode levar alguns segundos)</span>
         </div>
        )}
        {!processingClientPhoto && newClient.photos.length > 0 && (
         <div className="flex items-center gap-1.5 mt-2 px-2.5 py-1.5 bg-[#FF6B6B]/10 text-[#FF6B6B] rounded-lg">
          <i className="fas fa-check text-[10px]"></i>
          <span className="text-[10px] font-medium">Provador IA ativado - {newClient.photos.length} foto(s)</span>
         </div>
        )}
       </div>
       <div className="grid grid-cols-2 gap-3">
        <div>
         <label htmlFor="client-firstName" className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px] font-medium uppercase tracking-wide mb-1 block'}>Nome *</label>
         <input type="text" id="client-firstName" name="firstName" autoComplete="given-name" value={newClient.firstName} onChange={(e) => setNewClient(prev => ({ ...prev, firstName: e.target.value }))} placeholder="Maria" className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm'} />
        </div>
        <div>
         <label htmlFor="client-lastName" className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px] font-medium uppercase tracking-wide mb-1 block'}>Sobrenome *</label>
         <input type="text" id="client-lastName" name="lastName" autoComplete="family-name" value={newClient.lastName} onChange={(e) => setNewClient(prev => ({ ...prev, lastName: e.target.value }))} placeholder="Silva" className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm'} />
        </div>
       </div>
       <div>
        <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px] font-medium uppercase tracking-wide mb-1 block'}>Gênero *</label>
        <div className="flex gap-2">
         <button type="button" onClick={() => setNewClient(prev => ({ ...prev, gender: 'female' }))} className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${newClient.gender === 'female' ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white' : (theme === 'dark' ? 'bg-neutral-800 border border-neutral-700 text-neutral-400 hover:border-neutral-500' : 'bg-gray-50 border border-gray-200 text-gray-600 hover:border-neutral-500')}`}>
          <i className="fas fa-venus mr-1.5"></i>Feminino
         </button>
         <button type="button" onClick={() => setNewClient(prev => ({ ...prev, gender: 'male' }))} className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${newClient.gender === 'male' ? 'bg-blue-500 text-white' : (theme === 'dark' ? 'bg-neutral-800 border border-neutral-700 text-neutral-400 hover:border-blue-500/50' : 'bg-gray-50 border border-gray-200 text-gray-600 hover:border-blue-400')}`}>
          <i className="fas fa-mars mr-1.5"></i>Masculino
         </button>
        </div>
       </div>
       <div>
        <label htmlFor="client-whatsapp" className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px] font-medium uppercase tracking-wide mb-1 block'}>WhatsApp *</label>
        <div className="relative">
         <i className="fab fa-whatsapp absolute left-3 top-1/2 -translate-y-1/2 text-green-500 text-sm"></i>
         <input type="tel" id="client-whatsapp" name="whatsapp" autoComplete="tel" value={newClient.whatsapp} onChange={(e) => setNewClient(prev => ({ ...prev, whatsapp: e.target.value }))} placeholder="(11) 99999-9999" className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full pl-9 pr-3 py-2 border rounded-lg text-sm'} />
        </div>
       </div>
       <div>
        <label htmlFor="client-email" className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px] font-medium uppercase tracking-wide mb-1 block'}>E-mail (opcional)</label>
        <div className="relative">
         <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-envelope absolute left-3 top-1/2 -translate-y-1/2 text-xs'}></i>
         <input type="email" id="client-email" name="email" autoComplete="email" value={newClient.email} onChange={(e) => setNewClient(prev => ({ ...prev, email: e.target.value }))} placeholder="maria@email.com" className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full pl-9 pr-3 py-2 border rounded-lg text-sm'} />
        </div>
       </div>
       <div>
        <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px] font-medium uppercase tracking-wide mb-1 block'}>Observações (opcional)</label>
        <textarea value={newClient.notes} onChange={(e) => setNewClient(prev => ({ ...prev, notes: e.target.value }))} placeholder="Preferências, tamanhos, etc..." rows={2} className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm resize-none'} />
       </div>
       {/* Botões de ação */}
       <div className="flex gap-2 pt-2">
        <button onClick={() => { setShowCreateClient(false); setNewClient({ firstName: '', lastName: '', whatsapp: '', email: '', gender: '', photos: [], notes: '' }); }} className={(theme === 'dark' ? 'bg-neutral-800 text-neutral-300 hover:bg-gray-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200') + ' flex-1 py-3 rounded-xl font-medium text-sm transition-colors md:hidden'}>
         Cancelar
        </button>
        <button onClick={handleCreateClient} disabled={!newClient.firstName || !newClient.lastName || !newClient.whatsapp || isSavingClient || processingClientPhoto} className="flex-1 md:w-full py-3 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed">
         {isSavingClient ? (
          <><i className="fas fa-spinner fa-spin mr-2"></i>Salvando...</>
         ) : (
          <><i className="fas fa-user-plus mr-2"></i>Cadastrar</>
         )}
        </button>
       </div>
      </div>
     </div>
    </div>
   )}

   {/* CLIENT DETAIL MODAL */}
   {showClientDetail && (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setShowClientDetail(null)}>
     <div className="bg-neutral-900 rounded-t-2xl md:rounded-2xl border border-neutral-800 w-full max-w-md max-h-[90vh] overflow-y-auto safe-area-bottom-sheet cursor-pointer" onClick={(e) => { e.stopPropagation(); setProvadorClient(showClientDetail); setShowClientDetail(null); navigateTo('provador'); }}>
      {/* Drag handle - mobile */}
      <div className="md:hidden pt-3 pb-1 flex justify-center">
       <div className="bg-gray-300 w-10 h-1 rounded-full"></div>
      </div>
      <div className="bg-neutral-800 px-4 py-5 text-center relative border-b border-neutral-700">
       <button onClick={(e) => { e.stopPropagation(); setShowClientDetail(null); }} className="absolute top-3 right-3 w-7 h-7 rounded-full bg-gray-300 hidden md:flex items-center justify-center text-neutral-400 hover:text-white transition-colors">
        <i className="fas fa-times text-xs"></i>
       </button>
       <div className="relative inline-block">
        {getClientPhoto(showClientDetail) ? (
         <OptimizedImage src={getClientPhoto(showClientDetail)} alt={showClientDetail.firstName} className="w-16 h-16 rounded-full border-2 border-neutral-600 mx-auto" size="thumb" />
        ) : (
         <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center mx-auto">
          <span className="text-xl font-medium text-neutral-400">{showClientDetail.firstName[0]}{showClientDetail.lastName[0]}</span>
         </div>
        )}
        {showClientDetail.hasProvadorIA && (
         <div className={'absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center backdrop-blur-xl border-2 ' + (theme === 'dark' ? 'bg-white/10 border-white/15' : 'bg-white/60 border-gray-200/60 shadow-sm')}>
          <i className={'fas fa-camera text-[8px] ' + (theme === 'dark' ? 'text-neutral-200' : 'text-[#1A1A1A]')}></i>
         </div>
        )}
       </div>
       <h2 className="text-base font-semibold text-white mt-2">{showClientDetail.firstName} {showClientDetail.lastName}</h2>
       <p className="text-neutral-400 text-xs">{formatWhatsApp(showClientDetail.whatsapp)}</p>
      </div>
      <div className="p-4 space-y-3">
       {showClientDetail.photos && showClientDetail.photos.length > 0 && (
        <div>
         <p className="text-[9px] font-medium text-neutral-500 uppercase tracking-wide mb-2">Fotos Cadastradas</p>
         <div className="flex gap-2">
          {showClientDetail.photos.map(photo => (
           <div key={photo.type} className="relative">
            <img src={photo.base64} alt={photo.type} loading="lazy" className="w-14 h-14 rounded-lg object-cover" />
            <span className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[7px] py-0.5 text-center font-medium capitalize">{photo.type}</span>
           </div>
          ))}
         </div>
        </div>
       )}
       <div className="flex flex-wrap gap-1.5">
        <span className={'px-2 py-1 rounded-full text-[10px] font-medium ' + (showClientDetail.status === 'active' ? 'bg-green-500/20 text-green-400' : showClientDetail.status === 'vip' ? 'bg-amber-500/20 text-amber-400' : 'bg-neutral-800 text-neutral-400')}>
         {showClientDetail.status === 'active' ? 'Ativo' : showClientDetail.status === 'vip' ? 'VIP' : 'Inativo'}
        </span>
        {showClientDetail.hasProvadorIA && (
         <span className="px-2 py-1 bg-[#FF6B6B]/20 text-[#FF6B6B] rounded-full text-[10px] font-medium">
          <i className="fas fa-camera mr-1"></i>Vizzu Provador®
         </span>
        )}
       </div>
       {showClientDetail.email && (
        <div className="flex items-center gap-2.5 p-2.5 bg-neutral-800 rounded-lg">
         <i className="fas fa-envelope text-neutral-500 text-xs"></i>
         <span className="text-xs text-neutral-300">{showClientDetail.email}</span>
        </div>
       )}
       {showClientDetail.notes && (
        <div className="p-2.5 bg-neutral-800 rounded-lg">
         <p className="text-[9px] font-medium text-neutral-500 uppercase tracking-wide mb-1">Observações</p>
         <p className="text-xs text-neutral-300">{showClientDetail.notes}</p>
        </div>
       )}
       {/* Looks Salvos */}
       {clientDetailLooks.length > 0 && (
        <div>
         <p className="text-[9px] font-medium text-neutral-500 uppercase tracking-wide mb-2 flex items-center gap-1">
          <i className="fas fa-images text-[#FF6B6B]"></i>
          Looks Gerados ({clientDetailLooks.length})
         </p>
         <div className="grid grid-cols-4 gap-2">
          {clientDetailLooks.map(look => (
           <div key={look.id} className="relative group">
            <OptimizedImage
             src={look.imageUrl}
             alt="Look"
             className="w-full aspect-[3/4] rounded-lg border border-neutral-700 cursor-pointer hover:border-neutral-500 transition-colors"
             onClick={() => window.open(look.imageUrl, '_blank')}
             size="preview"
            />
            <div className="absolute bottom-1 left-1 right-1 bg-black/70 text-white text-[8px] py-0.5 px-1 rounded text-center truncate">
             {new Date(look.createdAt).toLocaleDateString('pt-BR')}
            </div>
           </div>
          ))}
         </div>
        </div>
       )}
       <div className="grid grid-cols-2 gap-2 pt-2">
        <button onClick={(e) => { e.stopPropagation(); startEditingClient(showClientDetail); }} className="py-2.5 bg-neutral-800 hover:bg-gray-300 text-blue-400 border border-neutral-700 rounded-lg font-medium text-xs flex items-center justify-center gap-2 transition-colors">
         <i className="fas fa-pen text-[10px]"></i>Editar
        </button>
        <button onClick={(e) => { e.stopPropagation(); handleDeleteClient(showClientDetail.id); }} className="py-2.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg font-medium text-xs flex items-center justify-center gap-2 transition-colors">
         <i className="fas fa-trash text-[10px]"></i>Excluir
        </button>
       </div>
      </div>
     </div>
    </div>
   )}

   {/* WHATSAPP LOOK MODAL */}
   {showWhatsAppLookModal && (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => { setShowWhatsAppLookModal(null); setSelectedLookForWhatsApp(null); setWhatsAppLookMessage(''); }}>
     <div className="bg-neutral-900 rounded-t-2xl md:rounded-2xl border border-neutral-800 w-full max-w-md max-h-[90vh] overflow-y-auto safe-area-bottom-sheet" onClick={(e) => e.stopPropagation()}>
      {/* Drag handle - mobile */}
      <div className="md:hidden pt-3 pb-1 flex justify-center">
       <div className="bg-gray-300 w-10 h-1 rounded-full"></div>
      </div>
      <div className="sticky top-0 border-b px-4 py-3 flex items-center justify-between z-10 bg-neutral-900 border-neutral-800">
       <h3 className="text-white text-sm font-medium flex items-center gap-2">
        <i className="fab fa-whatsapp text-green-500"></i>
        Enviar Look via WhatsApp
       </h3>
       <button onClick={() => { setShowWhatsAppLookModal(null); setSelectedLookForWhatsApp(null); setWhatsAppLookMessage(''); }} className="w-7 h-7 rounded-full bg-neutral-800 hidden md:flex items-center justify-center text-neutral-400 hover:text-white transition-colors">
        <i className="fas fa-times text-xs"></i>
       </button>
      </div>
      <div className="p-4 space-y-4">
       {/* Info do cliente */}
       <div className="flex items-center gap-3">
        {getClientPhoto(showWhatsAppLookModal) ? (
         <OptimizedImage src={getClientPhoto(showWhatsAppLookModal)} alt="" className="w-10 h-10 rounded-full border border-neutral-700" size="thumb" />
        ) : (
         <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center">
          <span className="text-sm text-neutral-400">{showWhatsAppLookModal.firstName[0]}</span>
         </div>
        )}
        <div>
         <p className="text-white text-sm font-medium">{showWhatsAppLookModal.firstName} {showWhatsAppLookModal.lastName}</p>
         <p className="text-neutral-400 text-xs">{formatWhatsApp(showWhatsAppLookModal.whatsapp)}</p>
        </div>
       </div>

       {/* Seleção de Look */}
       {clientDetailLooks.length > 0 ? (
        <div>
         <p className="text-[10px] font-medium text-neutral-500 uppercase tracking-wide mb-2">
          {clientDetailLooks.length === 1 ? 'Look que será enviado' : 'Selecione o look para enviar'}
         </p>
         <div className={`grid gap-2 ${clientDetailLooks.length === 1 ? 'grid-cols-1' : 'grid-cols-3'}`}>
          {clientDetailLooks.map(look => (
           <div
            key={look.id}
            onClick={() => {
             setSelectedLookForWhatsApp(look);
             setWhatsAppLookMessage(generateWhatsAppLookMessage(showWhatsAppLookModal, look));
            }}
            className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
             selectedLookForWhatsApp?.id === look.id
              ? 'border-green-500 ring-2 ring-green-500/30'
              : 'border-neutral-700 hover:border-neutral-600'
            }`}
           >
            <OptimizedImage
             src={look.imageUrl}
             alt="Look"
             className={`w-full ${clientDetailLooks.length === 1 ? 'max-h-[300px] bg-neutral-800' : 'aspect-[3/4]'}`}
             objectFit={clientDetailLooks.length === 1 ? 'contain' : 'cover'}
             size="preview"
            />
            {selectedLookForWhatsApp?.id === look.id && (
             <div className="absolute top-1 right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
              <i className="fas fa-check text-white text-[8px]"></i>
             </div>
            )}
            <div className="absolute bottom-1 left-1 right-1 bg-black/70 text-white text-[8px] py-0.5 px-1 rounded text-center">
             {new Date(look.createdAt).toLocaleDateString('pt-BR')}
            </div>
           </div>
          ))}
         </div>
        </div>
       ) : (
        <div className="text-center py-4">
         <i className="fas fa-images text-neutral-600 text-2xl mb-2"></i>
         <p className="text-neutral-400 text-xs">Nenhum look gerado ainda</p>
         <p className="text-neutral-500 text-[10px]">Gere looks no Vizzu Provador®</p>
        </div>
       )}

       {/* Mensagem */}
       {(selectedLookForWhatsApp || clientDetailLooks.length === 0) && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3">
         <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-medium text-green-400 uppercase tracking-wide flex items-center gap-1">
           <i className="fab fa-whatsapp text-green-500"></i>
           Mensagem
          </p>
         </div>
         <textarea
          value={whatsAppLookMessage}
          onChange={(e) => setWhatsAppLookMessage(e.target.value)}
          rows={6}
          className="w-full px-3 py-2 bg-neutral-800/50 border border-green-500/20 rounded-lg text-xs text-white placeholder-neutral-500 resize-none"
          placeholder="Digite sua mensagem..."
         />
        </div>
       )}

       {/* Botão de enviar */}
       <button
        onClick={sendWhatsAppWithLook}
        disabled={(clientDetailLooks.length > 0 && !selectedLookForWhatsApp) || isSendingWhatsAppLook}
        className={`w-full py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all ${
         (clientDetailLooks.length > 0 && !selectedLookForWhatsApp) || isSendingWhatsAppLook
          ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
          : 'bg-green-500 hover:bg-green-600 text-white'
        }`}
       >
        {isSendingWhatsAppLook ? (
         <><i className="fas fa-spinner fa-spin"></i>Enviando...</>
        ) : (
         <><i className="fab fa-whatsapp"></i>Enviar pelo WhatsApp</>
        )}
       </button>
      </div>
     </div>
    </div>
   )}

   {/* EDIT CLIENT MODAL */}
   {editingClient && (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => { setEditingClient(null); setEditClientPhotos([]); }}>
     <div className="bg-neutral-900 rounded-t-2xl md:rounded-2xl border border-neutral-800 w-full max-w-md max-h-[90vh] overflow-y-auto safe-area-bottom-sheet" onClick={(e) => e.stopPropagation()}>
      {/* Drag handle - mobile */}
      <div className="md:hidden pt-3 pb-1 flex justify-center">
       <div className="bg-gray-300 w-10 h-1 rounded-full"></div>
      </div>
      <div className="sticky top-0 border-b px-4 py-3 flex items-center justify-between z-10 bg-neutral-900 border-neutral-800">
       <h3 className="text-white text-sm font-medium">Editar Cliente</h3>
       <button onClick={() => { setEditingClient(null); setEditClientPhotos([]); }} className="w-7 h-7 rounded-full bg-neutral-800 hidden md:flex items-center justify-center text-neutral-400 hover:text-white transition-colors">
        <i className="fas fa-times text-xs"></i>
       </button>
      </div>
      <div className="p-4 space-y-4">
       {/* Fotos */}
       <div>
        <label className="text-neutral-500 text-[9px] font-medium uppercase tracking-wide mb-2 block">
         <i className="fas fa-camera text-[#FF6B6B] mr-1"></i>Fotos para Provador IA
        </label>
        <div className="grid grid-cols-3 gap-2">
         {PHOTO_TYPES.map(photoType => {
          const existingPhoto = editClientPhotos.find(p => p.type === photoType.id);
          return (
           <div key={photoType.id} className="text-center">
            <div
             onClick={() => { if (existingPhoto) return; setShowClientPhotoSourcePicker({ photoType: photoType.id, mode: 'edit' }); }}
             onDragOver={handleDragOver}
             onDrop={(e) => handleEditClientPhotoDrop(e, photoType.id)}
             className={'relative aspect-square rounded-lg overflow-hidden border border-dashed transition-all cursor-pointer ' + (existingPhoto ? 'border-[#FF9F43]/50 bg-[#FF9F43]/10' : 'border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800')}
            >
             {existingPhoto ? (
              <>
               <img src={existingPhoto.base64} alt={photoType.label} className="w-full h-full object-cover" />
               <button onClick={(e) => { e.stopPropagation(); setEditClientPhotos(prev => prev.filter(p => p.type !== photoType.id)); }} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[9px] hover:bg-red-600"><i className="fas fa-times"></i></button>
               <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white text-[8px] py-0.5 font-medium text-center"><i className="fas fa-check mr-0.5"></i>{photoType.label}</div>
              </>
             ) : (
              <div className="flex flex-col items-center justify-center h-full text-neutral-600">
               <i className={'fas ' + photoType.icon + ' text-lg mb-1'}></i>
               <span className="text-[9px] font-medium">{photoType.label}</span>
               <span className="text-[7px] opacity-60 mt-0.5">ou arraste</span>
              </div>
             )}
            </div>
           </div>
          );
         })}
        </div>
        {processingClientPhoto && (
         <div className="flex items-center gap-2 mt-2 px-2.5 py-2 bg-blue-500/10 text-blue-400 rounded-lg">
          <i className="fas fa-spinner fa-spin text-sm"></i>
          <span className="text-[10px] font-medium">Processando imagem...</span>
         </div>
        )}
       </div>
       {/* Nome */}
       <div className="grid grid-cols-2 gap-3">
        <div>
         <label className="text-neutral-500 text-[9px] font-medium uppercase tracking-wide mb-1 block">Nome *</label>
         <input type="text" id="edit-client-firstName" name="firstName" autoComplete="given-name" value={editingClient.firstName} onChange={(e) => setEditingClient(prev => prev ? { ...prev, firstName: e.target.value } : null)} className="bg-neutral-800 border-neutral-700 text-white w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
        <div>
         <label className="text-neutral-500 text-[9px] font-medium uppercase tracking-wide mb-1 block">Sobrenome *</label>
         <input type="text" id="edit-client-lastName" name="lastName" autoComplete="family-name" value={editingClient.lastName} onChange={(e) => setEditingClient(prev => prev ? { ...prev, lastName: e.target.value } : null)} className="bg-neutral-800 border-neutral-700 text-white w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
       </div>
       {/* Gênero */}
       <div>
        <label className="text-neutral-500 text-[9px] font-medium uppercase tracking-wide mb-1 block">Gênero</label>
        <div className="flex gap-2">
         <button type="button" onClick={() => setEditingClient(prev => prev ? { ...prev, gender: 'female' } : null)} className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${editingClient.gender === 'female' ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white' : 'bg-neutral-800 border border-neutral-700 text-neutral-400 hover:border-neutral-500'}`}>
          <i className="fas fa-venus mr-1.5"></i>Feminino
         </button>
         <button type="button" onClick={() => setEditingClient(prev => prev ? { ...prev, gender: 'male' } : null)} className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${editingClient.gender === 'male' ? 'bg-blue-500 text-white' : 'bg-neutral-800 border border-neutral-700 text-neutral-400 hover:border-blue-500/50'}`}>
          <i className="fas fa-mars mr-1.5"></i>Masculino
         </button>
        </div>
       </div>
       {/* WhatsApp */}
       <div>
        <label className="text-neutral-500 text-[9px] font-medium uppercase tracking-wide mb-1 block">WhatsApp *</label>
        <div className="relative">
         <i className="fab fa-whatsapp absolute left-3 top-1/2 -translate-y-1/2 text-green-500 text-sm"></i>
         <input type="tel" id="edit-client-whatsapp" name="whatsapp" autoComplete="tel" value={editingClient.whatsapp} onChange={(e) => setEditingClient(prev => prev ? { ...prev, whatsapp: e.target.value } : null)} className="bg-neutral-800 border-neutral-700 text-white w-full pl-9 pr-3 py-2 border rounded-lg text-sm" />
        </div>
       </div>
       {/* Email */}
       <div>
        <label className="text-neutral-500 text-[9px] font-medium uppercase tracking-wide mb-1 block">E-mail (opcional)</label>
        <input type="email" id="edit-client-email" name="email" autoComplete="email" value={editingClient.email || ''} onChange={(e) => setEditingClient(prev => prev ? { ...prev, email: e.target.value } : null)} className="bg-neutral-800 border-neutral-700 text-white w-full px-3 py-2 border rounded-lg text-sm" />
       </div>
       {/* Observações */}
       <div>
        <label className="text-neutral-500 text-[9px] font-medium uppercase tracking-wide mb-1 block">Observações</label>
        <textarea value={editingClient.notes || ''} onChange={(e) => setEditingClient(prev => prev ? { ...prev, notes: e.target.value } : null)} rows={2} className="bg-neutral-800 border-neutral-700 text-white w-full px-3 py-2 border rounded-lg text-sm resize-none" />
       </div>
       {/* Botões */}
       <div className="flex gap-2 pt-2">
        <button onClick={() => { setEditingClient(null); setEditClientPhotos([]); }} className="flex-1 py-3 bg-neutral-800 text-neutral-300 rounded-xl font-medium text-sm">
         Cancelar
        </button>
        <button onClick={saveEditingClient} disabled={!editingClient.firstName || !editingClient.lastName || !editingClient.whatsapp || processingClientPhoto} className="flex-1 py-3 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-xl font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed">
         <i className="fas fa-check mr-2"></i>Salvar
        </button>
       </div>
      </div>
     </div>
    </div>
   )}

   {/* CLIENT PHOTO SOURCE PICKER */}
   {showClientPhotoSourcePicker && (
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-end justify-center" onClick={() => setShowClientPhotoSourcePicker(null)}>
     <div className={(theme === 'dark' ? 'bg-neutral-900/95 backdrop-blur-2xl border-neutral-800' : 'bg-white/95 backdrop-blur-2xl border-gray-200') + ' rounded-t-2xl w-full max-w-md p-5 pb-8 border-t'} onClick={(e) => e.stopPropagation()}>
      <div className={(theme === 'dark' ? 'bg-gray-300' : 'bg-gray-300') + ' w-10 h-1 rounded-full mx-auto mb-4'}></div>
      <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-medium text-center mb-4'}>
       Adicionar foto - {PHOTO_TYPES.find(p => p.id === showClientPhotoSourcePicker.photoType)?.label}
      </h3>
      <div className="grid grid-cols-2 gap-3">
       <label className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 hover:border-neutral-500' : 'bg-gray-50 border-gray-200 hover:border-neutral-500') + ' border rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer transition-all'}>
        <div className={(theme === 'dark' ? 'bg-gray-300' : 'bg-[#FF6B6B]/15') + ' w-12 h-12 rounded-full flex items-center justify-center'}>
         <i className="fas fa-images text-[#FF6B6B]"></i>
        </div>
        <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>Galeria</span>
        <input
         type="file"
         accept="image/*,.heic,.heif"
         className="hidden"
         onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file && showClientPhotoSourcePicker) {
           if (showClientPhotoSourcePicker.mode === 'create') {
            processClientPhotoFile(file, showClientPhotoSourcePicker.photoType);
           } else {
            processEditClientPhoto(file, showClientPhotoSourcePicker.photoType);
           }
           setShowClientPhotoSourcePicker(null);
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
         capture="user"
         className="hidden"
         onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file && showClientPhotoSourcePicker) {
           if (showClientPhotoSourcePicker.mode === 'create') {
            processClientPhotoFile(file, showClientPhotoSourcePicker.photoType);
           } else {
            processEditClientPhoto(file, showClientPhotoSourcePicker.photoType);
           }
           setShowClientPhotoSourcePicker(null);
          }
         }}
        />
       </label>
      </div>
      <button onClick={() => setShowClientPhotoSourcePicker(null)} className={(theme === 'dark' ? 'text-neutral-500 hover:text-white' : 'text-gray-500 hover:text-gray-700') + ' w-full mt-4 py-2 text-xs font-medium'}>
       Cancelar
      </button>
     </div>
    </div>
   )}
  </>
 );
};

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Client, ClientPhoto, ClientLook } from '../types';
import { supabase } from '../services/supabaseClient';
import { useUI } from './UIContext';

interface ClientsContextType {
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  clientLooks: ClientLook[];
  setClientLooks: React.Dispatch<React.SetStateAction<ClientLook[]>>;
  loadUserClients: (userId: string) => Promise<void>;
  saveClientToSupabase: (client: Client, userId: string) => Promise<void>;
  deleteClientFromSupabase: (clientId: string) => Promise<void>;
  uploadClientPhoto: (userId: string, clientId: string, photo: ClientPhoto) => Promise<{ url: string; storagePath: string } | null>;
  saveClientPhotoToDb: (userId: string, clientId: string, photo: ClientPhoto, url: string, storagePath: string) => Promise<void>;
  loadClientPhotos: (clientId: string) => Promise<ClientPhoto[]>;
  getClientPhoto: (client: Client, type?: ClientPhoto['type']) => string | undefined;
}

const ClientsContext = createContext<ClientsContextType | null>(null);

export function ClientsProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useUI();

  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem('vizzu_clients');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const isValidUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        let needsMigration = false;
        const migrated = parsed.map((client: Client) => {
          if (!isValidUUID(client.id)) {
            needsMigration = true;
            return { ...client, id: crypto.randomUUID() };
          }
          return client;
        });
        if (needsMigration) {
          localStorage.setItem('vizzu_clients', JSON.stringify(migrated));
        }
        return migrated;
      } catch { }
    }
    return [];
  });

  const [clientLooks, setClientLooks] = useState<ClientLook[]>([]);

  // Persist clients (without photos)
  useEffect(() => {
    try {
      const clientsWithoutPhotos = clients.map(c => ({
        ...c,
        photo: undefined,
        photos: []
      }));
      localStorage.setItem('vizzu_clients', JSON.stringify(clientsWithoutPhotos));
    } catch (e) {
      console.warn('Não foi possível salvar clientes no localStorage:', e);
    }
  }, [clients]);

  const saveClientToSupabase = useCallback(async (client: Client, userId: string) => {
    try {
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(client.id);
      if (!isValidUUID) {
        console.warn('ID de cliente inválido (não é UUID), ignorando sync:', client.id);
        return;
      }
      const { error } = await supabase
        .from('clients')
        .upsert({
          id: client.id,
          user_id: userId,
          first_name: client.firstName,
          last_name: client.lastName,
          whatsapp: client.whatsapp,
          email: client.email || null,
          gender: client.gender || null,
          has_provador_ia: client.hasProvadorIA || false,
          notes: client.notes || null,
          created_at: client.createdAt,
          updated_at: client.updatedAt || null,
          last_contact_at: client.lastContactAt || null,
          total_orders: client.totalOrders || 0,
          status: client.status,
        }, { onConflict: 'id' });

      if (error) {
        console.error('Erro ao salvar cliente no Supabase:', error.message, error);
      }
    } catch (err) {
      console.error('Erro inesperado ao salvar cliente:', err);
    }
  }, []);

  const deleteClientFromSupabase = useCallback(async (clientId: string) => {
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (error) {
        // Silently ignore - table may not exist
      }
    } catch {
      // Silently ignore
    }
  }, []);

  const loadUserClients = useCallback(async (userId: string) => {
    try {
      const { data: clientsData, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        return;
      }

      const { data: photosData } = await supabase
        .from('client_photos')
        .select('*')
        .eq('user_id', userId);

      const photosByClient: Record<string, ClientPhoto[]> = {};
      if (photosData) {
        for (const p of photosData) {
          if (!photosByClient[p.client_id]) {
            photosByClient[p.client_id] = [];
          }
          photosByClient[p.client_id].push({
            type: p.type as ClientPhoto['type'],
            base64: p.url,
            createdAt: p.created_at
          });
        }
      }

      const localClients: Client[] = JSON.parse(localStorage.getItem('vizzu_clients') || '[]');

      if (clientsData && clientsData.length > 0) {
        const formattedClients: Client[] = clientsData.map(c => {
          const clientPhotos = photosByClient[c.id] || [];
          return {
            id: c.id,
            firstName: c.first_name,
            lastName: c.last_name,
            whatsapp: c.whatsapp,
            email: c.email || undefined,
            gender: c.gender || undefined,
            photo: clientPhotos[0]?.base64 || undefined,
            photos: clientPhotos,
            hasProvadorIA: clientPhotos.length > 0 || c.has_provador_ia || false,
            notes: c.notes || undefined,
            tags: c.tags || [],
            createdAt: c.created_at,
            updatedAt: c.updated_at || undefined,
            lastContactAt: c.last_contact_at || undefined,
            totalOrders: c.total_orders || 0,
            status: c.status || 'active',
          };
        });

        const serverIds = new Set(formattedClients.map(c => c.id));
        const localOnly = localClients.filter(c => !serverIds.has(c.id));
        localOnly.forEach(localClient => {
          saveClientToSupabase(localClient, userId);
        });

        setClients([...formattedClients, ...localOnly]);
      } else {
        const validLocalClients = localClients;
        if (validLocalClients.length > 0) {
          for (const client of validLocalClients) {
            await saveClientToSupabase(client, userId);
          }
        } else {
          setClients([]);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  }, [saveClientToSupabase]);

  const uploadClientPhoto = useCallback(async (userId: string, clientId: string, photo: ClientPhoto): Promise<{ url: string; storagePath: string } | null> => {
    try {
      const base64Data = photo.base64.replace(/^data:image\/\w+;base64,/, '');
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);

      const mimeType = photo.base64.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';
      const extension = mimeType.split('/')[1] || 'jpg';
      const blob = new Blob([byteArray], { type: mimeType });

      const storagePath = `${userId}/${clientId}/${photo.type}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from('client-photos')
        .upload(storagePath, blob, { upsert: true });

      if (uploadError) {
        console.error('Erro no upload da foto:', uploadError.message, uploadError);
        showToast('Erro ao fazer upload da foto: ' + uploadError.message, 'error');
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('client-photos')
        .getPublicUrl(storagePath);

      return { url: urlData.publicUrl, storagePath };
    } catch (error) {
      console.error('Erro ao fazer upload da foto:', error);
      return null;
    }
  }, [showToast]);

  const saveClientPhotoToDb = useCallback(async (userId: string, clientId: string, photo: ClientPhoto, url: string, storagePath: string) => {
    try {
      const { error } = await supabase
        .from('client_photos')
        .upsert({
          client_id: clientId,
          user_id: userId,
          type: photo.type,
          storage_path: storagePath,
          url: url
        }, { onConflict: 'client_id,type' });

      if (error) {
        console.error('Erro ao salvar foto no banco:', error.message, error);
        showToast('Erro ao salvar foto do cliente', 'error');
      }
    } catch (err) {
      console.error('Erro inesperado ao salvar foto:', err);
      showToast('Erro ao salvar foto do cliente', 'error');
    }
  }, [showToast]);

  const loadClientPhotos = useCallback(async (clientId: string): Promise<ClientPhoto[]> => {
    try {
      const { data, error } = await supabase
        .from('client_photos')
        .select('*')
        .eq('client_id', clientId);

      if (error || !data) return [];

      return data.map(p => ({
        type: p.type as ClientPhoto['type'],
        base64: p.url,
        createdAt: p.created_at
      }));
    } catch (error) {
      console.error('Erro ao carregar fotos:', error);
      return [];
    }
  }, []);

  const getClientPhoto = useCallback((client: Client, type?: ClientPhoto['type']): string | undefined => {
    if (type && client.photos) {
      const photo = client.photos.find(p => p.type === type);
      if (photo) return photo.base64;
    }
    if (client.photos?.length) return client.photos[0].base64;
    return client.photo;
  }, []);

  return (
    <ClientsContext.Provider value={{
      clients, setClients,
      clientLooks, setClientLooks,
      loadUserClients,
      saveClientToSupabase, deleteClientFromSupabase,
      uploadClientPhoto, saveClientPhotoToDb, loadClientPhotos,
      getClientPhoto,
    }}>
      {children}
    </ClientsContext.Provider>
  );
}

export function useClients(): ClientsContextType {
  const context = useContext(ClientsContext);
  if (!context) throw new Error('useClients must be used within ClientsProvider');
  return context;
}

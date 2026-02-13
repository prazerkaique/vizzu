import type { VizzuTheme } from '../../contexts/UIContext';
import React, { useEffect, useRef, useState } from 'react';
import type { BulkProduct, ImportResults } from './types';
import { buildImportPayload, delay, formatTimeRemaining } from './utils';

interface StepImportingProps {
  theme: VizzuTheme;
  products: BulkProduct[];
  setProducts: React.Dispatch<React.SetStateAction<BulkProduct[]>>;
  userId?: string;
  onComplete: (results: ImportResults) => void;
}

const IMPORT_DELAY_MS = 3000;

// Pedir permissão de notificação
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function sendNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico' });
  }
}

export function StepImporting({ theme, products, setProducts, userId, onComplete }: StepImportingProps) {
  const isDark = theme !== 'light';
  const startedRef = useRef(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [avgTime, setAvgTime] = useState(0);

  const selectedProducts = products.filter(p => p.selected && p.importStatus !== 'success');
  const total = selectedProducts.length;

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    // Pedir permissão de push ao iniciar importação
    requestNotificationPermission();

    const importAll = async () => {
      if (!userId) {
        onComplete({ success: [], failed: [{ name: 'Todos', error: 'Usuário não autenticado' }] });
        return;
      }

      const n8nUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;
      if (!n8nUrl) {
        onComplete({ success: [], failed: [{ name: 'Todos', error: 'URL do webhook não configurada' }] });
        return;
      }

      const results: ImportResults = { success: [], failed: [] };
      const times: number[] = [];

      for (let i = 0; i < selectedProducts.length; i++) {
        const product = selectedProducts[i];
        setCurrentIndex(i);

        // Marcar como importando
        setProducts(prev => prev.map(p =>
          p.id === product.id ? { ...p, importStatus: 'importing' } : p
        ));

        const startTime = Date.now();

        try {
          const body = buildImportPayload(product, userId);

          // Verificar se tem pelo menos imagem de frente
          if (!body.image_front_base64) {
            throw new Error('Sem imagem de frente');
          }

          const response = await fetch(`${n8nUrl}/vizzu/produto-importar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });

          const data = await response.json();

          if (data.success) {
            results.success.push(product.name);
            setProducts(prev => prev.map(p =>
              p.id === product.id ? { ...p, importStatus: 'success' } : p
            ));
          } else {
            const error = data.error || 'Erro desconhecido';
            results.failed.push({ name: product.name, error });
            setProducts(prev => prev.map(p =>
              p.id === product.id ? { ...p, importStatus: 'error', importError: error } : p
            ));
          }
        } catch (err: any) {
          const error = err.message || 'Erro de rede';
          results.failed.push({ name: product.name, error });
          setProducts(prev => prev.map(p =>
            p.id === product.id ? { ...p, importStatus: 'error', importError: error } : p
          ));
        }

        times.push((Date.now() - startTime) / 1000);
        setAvgTime(times.reduce((a, b) => a + b, 0) / times.length);

        // Throttle entre importações
        if (i < selectedProducts.length - 1) {
          await delay(IMPORT_DELAY_MS);
        }
      }

      // Notificação push ao finalizar
      if (results.failed.length > 0) {
        sendNotification('Vizzu — Importação finalizada', `${results.success.length} importados, ${results.failed.length} falhas`);
      } else {
        sendNotification('Vizzu — Importação concluída!', `${results.success.length} produtos importados com sucesso`);
      }

      onComplete(results);
    };

    importAll();

    // NÃO abortar no unmount — importação continua em background
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const progress = total > 0 ? Math.round(((currentIndex + 1) / total) * 100) : 0;
  const remaining = avgTime > 0
    ? (total - currentIndex - 1) * (avgTime + IMPORT_DELAY_MS / 1000)
    : (total - currentIndex - 1) * (5 + IMPORT_DELAY_MS / 1000);

  const currentProduct = selectedProducts[currentIndex];

  return (
    <div className="space-y-5">
      {/* Progress header */}
      <div className="text-center space-y-3">
        <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
          <i className="fas fa-cloud-arrow-up text-2xl text-[#FF6B6B] animate-pulse"></i>
        </div>
        <div>
          <h4 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Importando produtos...
          </h4>
          <p className={`text-sm mt-1 ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
            Produto {currentIndex + 1} de {total}
            {remaining > 0 && (
              <span> — ~{formatTimeRemaining(remaining)} restantes</span>
            )}
          </p>
        </div>
        <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Current product */}
      {currentProduct && (
        <div className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? 'bg-[#FF6B6B]/5 border border-[#FF6B6B]/20' : 'bg-[#FF6B6B]/5 border border-[#FF6B6B]/10'}`}>
          <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-gray-200">
            <img src={currentProduct.rawImages[0]?.base64} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{currentProduct.name}</p>
            <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>Enviando para o servidor...</p>
          </div>
          <div className="w-6 h-6 rounded-full border-2 border-[#FF6B6B] border-t-transparent animate-spin shrink-0" />
        </div>
      )}

      {/* Completed list */}
      <div className="space-y-1.5 max-h-[250px] overflow-y-auto">
        {selectedProducts.slice(0, currentIndex).map(product => (
          <div key={product.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${isDark ? 'bg-white/[0.02]' : 'bg-gray-50/50'}`}>
            <div className="w-7 h-7 rounded overflow-hidden shrink-0 bg-gray-200">
              <img src={product.rawImages[0]?.base64} alt="" className="w-full h-full object-cover" />
            </div>
            <span className={`text-xs flex-1 truncate ${isDark ? 'text-neutral-400' : 'text-gray-600'}`}>{product.name}</span>
            {product.importStatus === 'success' ? (
              <i className="fas fa-check text-emerald-500 text-xs"></i>
            ) : (
              <i className="fas fa-xmark text-red-500 text-xs" title={product.importError}></i>
            )}
          </div>
        ))}
      </div>

      {/* Info — pode fechar */}
      <div className={`flex items-start gap-2.5 p-3 rounded-xl ${isDark ? 'bg-[#FF9F43]/10 border border-[#FF9F43]/20' : 'bg-[#FF9F43]/5 border border-[#FF9F43]/15'}`}>
        <i className={`fas fa-bell text-sm mt-0.5 ${isDark ? 'text-[#FF9F43]' : 'text-[#FF9F43]'}`}></i>
        <p className={`text-xs ${isDark ? 'text-[#FF9F43]/80' : 'text-[#FF9F43]/90'}`}>
          Você pode fechar esta janela. A importação continuará em segundo plano e você será notificado quando terminar.
        </p>
      </div>
    </div>
  );
}

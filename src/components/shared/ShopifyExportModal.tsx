import React, { useState } from 'react';
import { exportImageToShopify, type ExportImageParams } from '../../lib/api/shopify';
import type { VizzuTheme } from '../../contexts/UIContext';

interface ShopifyExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  productId: string;
  userId: string;
  tool: string;
  generationId?: string;
  theme: VizzuTheme;
  onSuccess?: () => void;
}

type ExportType = 'add' | 'replace' | 'set_primary';

const EXPORT_OPTIONS: { value: ExportType; label: string; desc: string; icon: string }[] = [
  {
    value: 'add',
    label: 'Adicionar',
    desc: 'Adiciona como nova foto do produto',
    icon: 'fa-plus',
  },
  {
    value: 'replace',
    label: 'Substituir todas',
    desc: 'Remove fotos existentes e usa apenas esta',
    icon: 'fa-arrows-rotate',
  },
  {
    value: 'set_primary',
    label: 'Definir como principal',
    desc: 'Adiciona e define como foto de capa',
    icon: 'fa-star',
  },
];

export function ShopifyExportModal({
  isOpen,
  onClose,
  imageUrl,
  productId,
  userId,
  tool,
  generationId,
  theme,
  onSuccess,
}: ShopifyExportModalProps) {
  const [exportType, setExportType] = useState<ExportType>('add');
  const [isExporting, setIsExporting] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const isDark = theme !== 'light';

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    setResult(null);

    try {
      await exportImageToShopify({
        userId,
        vizzuProductId: productId,
        imageUrl,
        exportType,
        tool,
        generationId,
      });

      setResult('success');
      setTimeout(() => {
        onClose();
        onSuccess?.();
      }, 1500);
    } catch (err: any) {
      setResult('error');
      setErrorMsg(err.message || 'Erro ao exportar');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={
          (isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200') +
          ' rounded-2xl border shadow-xl max-w-sm w-[90%] overflow-hidden'
        }
      >
        {/* Header */}
        <div className={'flex items-center justify-between px-4 py-3 border-b ' + (isDark ? 'border-neutral-800' : 'border-gray-100')}>
          <div className="flex items-center gap-2">
            <i className={'fab fa-shopify text-sm ' + (isDark ? 'text-green-400' : 'text-green-600')} />
            <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' font-semibold text-sm'}>
              Enviar para Shopify
            </h3>
          </div>
          <button onClick={onClose} className={(isDark ? 'text-neutral-500 hover:text-white' : 'text-gray-400 hover:text-gray-700') + ' transition-colors'}>
            <i className="fas fa-times text-sm" />
          </button>
        </div>

        {/* Preview */}
        <div className="px-4 pt-3">
          <div className={(isDark ? 'bg-neutral-800' : 'bg-gray-50') + ' rounded-xl overflow-hidden h-32 flex items-center justify-center'}>
            <img src={imageUrl} alt="Preview" className="h-full w-full object-contain" />
          </div>
        </div>

        {/* Export Options */}
        <div className="px-4 py-3 space-y-2">
          {EXPORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setExportType(opt.value)}
              disabled={isExporting}
              className={
                'w-full text-left p-2.5 rounded-xl border transition-all flex items-center gap-3 ' +
                (exportType === opt.value
                  ? 'border-[#FF6B6B] ' + (isDark ? 'bg-neutral-800' : 'bg-orange-50')
                  : (isDark ? 'border-neutral-800 bg-neutral-900 hover:bg-neutral-800' : 'border-gray-200 bg-white hover:bg-gray-50'))
              }
            >
              <div
                className={
                  'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ' +
                  (exportType === opt.value
                    ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white'
                    : (isDark ? 'bg-neutral-700 text-neutral-400' : 'bg-gray-100 text-gray-500'))
                }
              >
                <i className={`fas ${opt.icon} text-xs`} />
              </div>
              <div>
                <p className={(isDark ? 'text-white' : 'text-gray-900') + ' font-medium text-xs'}>
                  {opt.label}
                </p>
                <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>
                  {opt.desc}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Result Messages */}
        {result === 'success' && (
          <div className="mx-4 mb-3 p-2.5 rounded-xl bg-green-500/10 border border-green-500/20">
            <p className="text-green-500 text-xs font-medium text-center">
              <i className="fas fa-check mr-1.5" />
              Imagem enviada com sucesso!
            </p>
          </div>
        )}

        {result === 'error' && (
          <div className="mx-4 mb-3 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
            <p className="text-red-500 text-xs text-center">{errorMsg}</p>
          </div>
        )}

        {/* CTA */}
        <div className={'px-4 py-3 border-t ' + (isDark ? 'border-neutral-800' : 'border-gray-100')}>
          <button
            onClick={handleExport}
            disabled={isExporting || result === 'success'}
            className={
              'w-full py-2.5 rounded-xl font-semibold text-xs text-white transition-all ' +
              (isExporting || result === 'success'
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] hover:opacity-90')
            }
          >
            {isExporting ? (
              <>
                <i className="fas fa-spinner fa-spin mr-1.5" />
                Enviando...
              </>
            ) : result === 'success' ? (
              <>
                <i className="fas fa-check mr-1.5" />
                Enviado!
              </>
            ) : (
              <>
                <i className="fab fa-shopify mr-1.5" />
                Enviar para Shopify
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

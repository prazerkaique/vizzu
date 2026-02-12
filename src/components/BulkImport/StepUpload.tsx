import React, { useState, useRef, useCallback } from 'react';
import { downloadTemplateCsv } from './utils';

interface StepUploadProps {
  theme: 'light' | 'dark';
  onZipParsed: (file: File) => Promise<void>;
}

export function StepUpload({ theme, onZipParsed }: StepUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const isDark = theme === 'dark';

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.zip')) {
      setError('Por favor, selecione um arquivo .zip');
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      setError('Arquivo muito grande (max 500 MB)');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await onZipParsed(file);
    } catch (err: any) {
      setError(err.message || 'Erro ao processar ZIP');
    } finally {
      setIsLoading(false);
    }
  }, [onZipParsed]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="space-y-5">
      {/* Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-[#FF6B6B] bg-[#FF6B6B]/5'
            : isDark ? 'border-white/15 hover:border-white/30 hover:bg-white/5' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }`}
      >
        <input ref={fileRef} type="file" accept=".zip" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        {isLoading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full border-2 border-[#FF6B6B] border-t-transparent animate-spin" />
            <p className={`text-sm ${isDark ? 'text-neutral-300' : 'text-gray-600'}`}>Processando ZIP...</p>
          </div>
        ) : (
          <>
            <div className={`w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
              <i className={`fas fa-file-zipper text-2xl ${isDark ? 'text-neutral-400' : 'text-gray-400'}`}></i>
            </div>
            <p className={`font-medium mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Arraste seu ZIP aqui</p>
            <p className={`text-sm ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>ou clique para selecionar (max 500 MB)</p>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-500 text-sm">
          <i className="fas fa-circle-exclamation"></i>
          <span>{error}</span>
        </div>
      )}

      {/* Guia */}
      <div className={`rounded-xl p-4 ${isDark ? 'bg-white/5 border border-white/10' : 'bg-[#FF9F43]/5 border border-[#FF9F43]/15'}`}>
        <h4 className={`font-medium text-sm mb-3 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          <i className={`fas fa-lightbulb text-xs ${isDark ? 'text-amber-400' : 'text-amber-500'}`}></i>
          Como organizar seu ZIP
        </h4>
        <div className={`text-xs space-y-2 ${isDark ? 'text-neutral-400' : 'text-gray-600'}`}>
          <div className={`font-mono text-[11px] p-3 rounded-lg ${isDark ? 'bg-black/40' : 'bg-white'}`}>
            <div className={isDark ? 'text-neutral-300' : 'text-gray-700'}>meus-produtos.zip</div>
            <div className="ml-3">
              <div className="text-[#FF6B6B]">Camiseta Polo/</div>
              <div className="ml-4">foto1.jpg <span className={isDark ? 'text-neutral-500' : 'text-gray-400'}>← frente</span></div>
              <div className="ml-4">foto2.jpg <span className={isDark ? 'text-neutral-500' : 'text-gray-400'}>← costas</span></div>
              <div className="ml-4">foto3.jpg <span className={isDark ? 'text-neutral-500' : 'text-gray-400'}>← detalhe</span></div>
              <div className="text-[#FF6B6B]">Bermuda Jeans/</div>
              <div className="ml-4">frente.jpg</div>
              <div className="ml-4">costas.jpg</div>
              <div className={`${isDark ? 'text-[#FF9F43]' : 'text-[#FF9F43]'}`}>dados.csv <span className={isDark ? 'text-neutral-500' : 'text-gray-400'}>← opcional (preços, SKUs)</span></div>
            </div>
          </div>
          <ul className="space-y-1 ml-1">
            <li><span className="text-[#FF6B6B] font-medium">1 pasta = 1 produto</span> — nome da pasta = nome do produto</li>
            <li>Fotos são atribuídas aos ângulos na ordem (1ª = frente, 2ª = costas...)</li>
            <li>A IA detecta automaticamente categoria, cor, marca e mais</li>
            <li>O <code className={`px-1 py-0.5 rounded ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>dados.csv</code> é opcional para preços e SKUs</li>
          </ul>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); downloadTemplateCsv(); }}
          className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isDark ? 'bg-white/10 hover:bg-white/15 text-neutral-200' : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'}`}
        >
          <i className="fas fa-download text-[10px]"></i>
          Baixar modelo CSV
        </button>
      </div>
    </div>
  );
}

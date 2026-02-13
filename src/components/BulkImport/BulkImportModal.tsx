import React, { useState, useCallback } from 'react';
import type { VizzuTheme } from '../../contexts/UIContext';
import type { BulkProduct, BulkStep, ImportResults } from './types';
import { parseZipFolders } from './utils';
import { StepUpload } from './StepUpload';
import { StepAnalyzing } from './StepAnalyzing';
import { StepReview } from './StepReview';
import { StepImporting } from './StepImporting';
import { StepValidation } from './StepValidation';
import { StepDone } from './StepDone';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (products: any[]) => void; // compat legacy
  onComplete?: () => void;
  userId?: string;
  theme: VizzuTheme;
}

const STEPS: { key: BulkStep; label: string }[] = [
  { key: 'upload', label: 'Upload' },
  { key: 'analyzing', label: 'Análise IA' },
  { key: 'review', label: 'Revisar' },
  { key: 'importing', label: 'Importar' },
  { key: 'validation', label: 'Validar' },
  { key: 'done', label: 'Pronto' },
];

export function BulkImportModal({ isOpen, onClose, onComplete, userId, theme }: BulkImportModalProps) {
  const [step, setStep] = useState<BulkStep>('upload');
  const [products, setProducts] = useState<BulkProduct[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [importResults, setImportResults] = useState<ImportResults>({ success: [], failed: [] });

  const isDark = theme !== 'light';

  const handleReset = useCallback(() => {
    setStep('upload');
    setProducts([]);
    setWarnings([]);
    setImportResults({ success: [], failed: [] });
  }, []);

  const handleClose = useCallback(() => {
    // Pode fechar livremente — a importação continua em background
    if (step !== 'importing') {
      handleReset();
    }
    onClose();
  }, [step, handleReset, onClose]);

  const handleZipParsed = useCallback(async (file: File) => {
    const result = await parseZipFolders(file);
    setProducts(result.products);
    setWarnings(result.warnings);
    setStep('analyzing');
  }, []);

  const handleAnalysisComplete = useCallback(() => {
    setStep('review');
  }, []);

  const handleStartImport = useCallback(() => {
    setStep('importing');
  }, []);

  const handleImportComplete = useCallback((results: ImportResults) => {
    setImportResults(results);
    if (results.success.length > 0) {
      onComplete?.();
    }
    setStep('validation');
  }, [onComplete]);

  const handleValidationComplete = useCallback(() => {
    setStep('done');
  }, []);

  // Reimportar apenas os que falharam (mantém dados, preços, etc.)
  const handleRetryFailed = useCallback(() => {
    setProducts(prev => prev.map(p =>
      p.importStatus === 'error'
        ? { ...p, importStatus: 'pending', importError: undefined }
        : p
    ));
    setImportResults({ success: [], failed: [] });
    setStep('importing');
  }, []);

  if (!isOpen) return null;

  const currentStepIndex = STEPS.findIndex(s => s.key === step);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 safe-area-all">
      <div className={`${isDark ? 'bg-neutral-900 border-white/10' : 'bg-white border-gray-200'} border rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-white/10' : 'border-gray-200'} shrink-0`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-white/10 border border-white/15' : 'bg-gray-50 border border-gray-200 shadow-sm'}`}>
              <i className={`fas fa-bolt text-sm ${isDark ? 'text-neutral-200' : 'text-[#1A1A1A]'}`}></i>
            </div>
            <div>
              <h3 className={`${isDark ? 'text-white' : 'text-gray-900'} font-semibold text-sm sm:text-base`}>Upload Express</h3>
              <p className={`${isDark ? 'text-neutral-400' : 'text-gray-500'} text-xs`}>Importação em massa com IA</p>
            </div>
          </div>
          <button onClick={handleClose} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isDark ? 'hover:bg-white/10 text-neutral-400' : 'hover:bg-gray-100 text-gray-400'}`}>
            <i className="fas fa-xmark"></i>
          </button>
        </div>

        {/* Step badges */}
        <div className={`flex items-center gap-1 px-4 py-3 border-b ${isDark ? 'border-white/10' : 'border-gray-100'} overflow-x-auto shrink-0`}>
          {STEPS.map((s, i) => {
            const isActive = i === currentStepIndex;
            const isCompleted = i < currentStepIndex;
            return (
              <div key={s.key} className="flex items-center gap-1 shrink-0">
                {i > 0 && <div className={`w-4 h-px ${isCompleted ? 'bg-[#FF6B6B]' : isDark ? 'bg-white/10' : 'bg-gray-200'}`} />}
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#FF6B6B]/15 text-[#FF6B6B]'
                    : isCompleted
                      ? isDark ? 'bg-white/5 text-neutral-300' : 'bg-gray-50 text-gray-600'
                      : isDark ? 'text-neutral-500' : 'text-gray-400'
                }`}>
                  {isCompleted ? (
                    <i className="fas fa-check text-[10px] text-[#FF6B6B]"></i>
                  ) : (
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                      isActive ? 'bg-[#FF6B6B] text-white' : isDark ? 'bg-white/10' : 'bg-gray-200'
                    }`}>{i + 1}</span>
                  )}
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {step === 'upload' && (
            <StepUpload theme={theme} onZipParsed={handleZipParsed} />
          )}
          {step === 'analyzing' && (
            <StepAnalyzing
              theme={theme}
              products={products}
              setProducts={setProducts}
              userId={userId}
              onComplete={handleAnalysisComplete}
            />
          )}
          {step === 'review' && (
            <StepReview
              theme={theme}
              products={products}
              setProducts={setProducts}
              warnings={warnings}
              onStartImport={handleStartImport}
              onBack={() => setStep('upload')}
            />
          )}
          {step === 'importing' && (
            <StepImporting
              theme={theme}
              products={products}
              setProducts={setProducts}
              userId={userId}
              onComplete={handleImportComplete}
            />
          )}
          {step === 'validation' && (
            <StepValidation
              theme={theme}
              products={products}
              importResults={importResults}
              onComplete={handleValidationComplete}
            />
          )}
          {step === 'done' && (
            <StepDone
              theme={theme}
              importResults={importResults}
              onClose={handleClose}
              onNewImport={handleReset}
              onRetryFailed={handleRetryFailed}
            />
          )}
        </div>
      </div>
    </div>
  );
}

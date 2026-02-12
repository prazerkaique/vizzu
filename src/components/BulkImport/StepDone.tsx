import React, { useState } from 'react';
import type { ImportResults } from './types';

interface StepDoneProps {
  theme: 'light' | 'dark';
  importResults: ImportResults;
  onClose: () => void;
  onNewImport: () => void;
  onRetryFailed?: () => void;
}

export function StepDone({ theme, importResults, onClose, onNewImport, onRetryFailed }: StepDoneProps) {
  const isDark = theme === 'dark';
  const [showErrors, setShowErrors] = useState(false);
  const hasFailures = importResults.failed.length > 0;
  const allFailed = importResults.success.length === 0 && hasFailures;

  return (
    <div className="space-y-5 text-center">
      {/* Icon */}
      <div className={`w-20 h-20 rounded-2xl mx-auto flex items-center justify-center ${
        allFailed
          ? 'bg-red-500/10'
          : hasFailures
            ? 'bg-amber-500/10'
            : 'bg-emerald-500/10'
      }`}>
        <i className={`fas ${allFailed ? 'fa-circle-xmark text-red-500' : hasFailures ? 'fa-triangle-exclamation text-amber-500' : 'fa-circle-check text-emerald-500'} text-4xl`}></i>
      </div>

      {/* Mensagem */}
      <div>
        <h4 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {allFailed
            ? 'Importação falhou'
            : hasFailures
              ? 'Importação parcial'
              : 'Importação concluída!'
          }
        </h4>
        <p className={`text-sm mt-1 ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
          {importResults.success.length > 0 && (
            <span className="text-emerald-500 font-medium">{importResults.success.length} produto{importResults.success.length !== 1 ? 's' : ''} importado{importResults.success.length !== 1 ? 's' : ''}</span>
          )}
          {importResults.success.length > 0 && hasFailures && ' · '}
          {hasFailures && (
            <span className="text-red-500 font-medium">{importResults.failed.length} falha{importResults.failed.length !== 1 ? 's' : ''}</span>
          )}
        </p>
      </div>

      {/* Lista de falhas */}
      {hasFailures && (
        <div className={`text-left rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
          <button
            onClick={() => setShowErrors(!showErrors)}
            className={`w-full flex items-center justify-between p-3 text-sm font-medium ${isDark ? 'text-neutral-300' : 'text-gray-700'}`}
          >
            <span><i className="fas fa-circle-exclamation text-red-500 mr-2"></i>Ver detalhes das falhas</span>
            <i className={`fas fa-chevron-${showErrors ? 'up' : 'down'} text-xs`}></i>
          </button>
          {showErrors && (
            <div className={`px-3 pb-3 space-y-2 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              {importResults.failed.map((f, i) => (
                <div key={i} className={`flex items-start gap-2 pt-2 text-xs ${isDark ? 'text-neutral-400' : 'text-gray-600'}`}>
                  <i className="fas fa-xmark text-red-400 mt-0.5 shrink-0"></i>
                  <div>
                    <span className="font-medium">{f.name}</span>
                    <span className="mx-1">—</span>
                    <span>{f.error}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
        {hasFailures && onRetryFailed && (
          <button
            onClick={onRetryFailed}
            className="px-4 py-2.5 rounded-xl text-sm font-medium bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors"
          >
            <i className="fas fa-rotate-right mr-2"></i>
            Reimportar {importResults.failed.length} falha{importResults.failed.length !== 1 ? 's' : ''}
          </button>
        )}
        <button
          onClick={onNewImport}
          className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${isDark ? 'bg-white/10 hover:bg-white/15 text-neutral-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
        >
          <i className="fas fa-plus mr-2"></i>Nova importação
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white hover:opacity-90 transition-opacity"
        >
          <i className="fas fa-grid-2 mr-2"></i>Ver meus produtos
        </button>
      </div>
    </div>
  );
}

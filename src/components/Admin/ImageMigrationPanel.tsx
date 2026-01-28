/**
 * ═══════════════════════════════════════════════════════════════
 * VIZZU - Painel de Migração de Imagens
 * ═══════════════════════════════════════════════════════════════
 *
 * Componente para executar a migração de compressão de imagens
 * existentes no banco de dados e no Supabase Storage.
 */

import React, { useState } from 'react';
import {
  runFullMigration,
  runProductMigration,
  runStorageMigration,
  MigrationProgress,
  MigrationLog,
} from '../../utils/imageMigration';
import { formatFileSize, COMPRESSION_ENABLED, COMPRESSION_QUALITY } from '../../utils/imageCompression';

interface Props {
  userId?: string;
  onClose?: () => void;
  theme?: 'dark' | 'light';
}

export const ImageMigrationPanel: React.FC<Props> = ({ userId, onClose, theme = 'dark' }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [dryRun, setDryRun] = useState(true); // Começa em modo simulação por segurança
  const [migrationType, setMigrationType] = useState<'full' | 'products' | 'storage'>('full');

  const isDark = theme === 'dark';

  const handleRunMigration = async () => {
    if (isRunning) return;

    // Confirmação adicional se não for dry-run
    if (!dryRun) {
      const confirmed = window.confirm(
        '⚠️ ATENÇÃO: Você está prestes a executar a migração em MODO PRODUÇÃO.\n\n' +
        'Isso irá:\n' +
        '• Baixar todas as imagens existentes\n' +
        '• Comprimir e substituir cada uma\n' +
        '• Consumir egress temporariamente\n\n' +
        'Tem certeza que deseja continuar?'
      );
      if (!confirmed) return;
    }

    setIsRunning(true);
    setProgress(null);

    try {
      let result: MigrationProgress;

      switch (migrationType) {
        case 'products':
          result = await runProductMigration(userId, dryRun, setProgress);
          break;
        case 'storage':
          result = await runStorageMigration(undefined, userId, dryRun, setProgress);
          break;
        default:
          result = await runFullMigration(userId, dryRun, setProgress);
      }

      setProgress(result);
    } catch (error) {
      console.error('Erro na migração:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getLogColor = (type: MigrationLog['type']) => {
    switch (type) {
      case 'success': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return isDark ? 'text-neutral-400' : 'text-gray-500';
    }
  };

  const getLogIcon = (type: MigrationLog['type']) => {
    switch (type) {
      case 'success': return 'fa-check-circle';
      case 'warning': return 'fa-exclamation-triangle';
      case 'error': return 'fa-times-circle';
      default: return 'fa-info-circle';
    }
  };

  return (
    <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200'}`}>
      {/* Header */}
      <div className={`p-4 border-b ${isDark ? 'border-neutral-800' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-gradient-to-br from-pink-500/20 to-orange-500/20' : 'bg-gradient-to-br from-pink-100 to-orange-100'}`}>
              <i className="fas fa-compress-arrows-alt text-pink-500"></i>
            </div>
            <div>
              <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Migração de Compressão
              </h3>
              <p className={`text-xs ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>
                Comprimir imagens existentes para economizar bandwidth
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'hover:bg-neutral-800 text-neutral-400' : 'hover:bg-gray-100 text-gray-500'}`}
            >
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>
      </div>

      {/* Configurações */}
      <div className={`p-4 border-b ${isDark ? 'border-neutral-800' : 'border-gray-200'}`}>
        {/* Status da compressão */}
        <div className={`p-3 rounded-lg mb-4 ${isDark ? 'bg-neutral-800' : 'bg-gray-50'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-medium ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
              Compressão
            </span>
            <span className={`text-xs font-bold ${COMPRESSION_ENABLED ? 'text-green-400' : 'text-red-400'}`}>
              {COMPRESSION_ENABLED ? 'ATIVA' : 'DESATIVADA'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className={`text-xs ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}>
              Qualidade: {Math.round(COMPRESSION_QUALITY * 100)}%
            </span>
            <span className={`text-xs ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}>
              Formato: WebP
            </span>
          </div>
        </div>

        {/* Tipo de migração */}
        <div className="mb-4">
          <label className={`block text-xs font-medium mb-2 ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
            O que migrar:
          </label>
          <div className="flex gap-2">
            {[
              { value: 'full', label: 'Tudo', icon: 'fa-layer-group' },
              { value: 'products', label: 'Produtos', icon: 'fa-box' },
              { value: 'storage', label: 'Storage', icon: 'fa-cloud' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setMigrationType(option.value as typeof migrationType)}
                disabled={isRunning}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 ${
                  migrationType === option.value
                    ? 'bg-gradient-to-r from-pink-500 to-orange-400 text-white'
                    : isDark
                    ? 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                } disabled:opacity-50`}
              >
                <i className={`fas ${option.icon}`}></i>
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Modo */}
        <div className="flex items-center justify-between">
          <div>
            <label className={`block text-xs font-medium ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
              Modo de execução:
            </label>
            <p className={`text-[10px] ${isDark ? 'text-neutral-600' : 'text-gray-400'}`}>
              {dryRun ? 'Simulação (não salva alterações)' : 'Produção (altera dados reais)'}
            </p>
          </div>
          <button
            onClick={() => setDryRun(!dryRun)}
            disabled={isRunning}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              dryRun
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            } disabled:opacity-50`}
          >
            {dryRun ? 'SIMULAÇÃO' : 'PRODUÇÃO'}
          </button>
        </div>
      </div>

      {/* Progresso */}
      {progress && (
        <div className={`p-4 border-b ${isDark ? 'border-neutral-800' : 'border-gray-200'}`}>
          {/* Barra de progresso */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
                {progress.phase === 'done' ? 'Concluído' : `Processando ${progress.currentBucket || 'produtos'}...`}
              </span>
              <span className={`text-xs font-mono ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
                {progress.processed}/{progress.total}
              </span>
            </div>
            <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-neutral-800' : 'bg-gray-200'}`}>
              <div
                className="h-full bg-gradient-to-r from-pink-500 to-orange-400 transition-all duration-300"
                style={{ width: progress.total > 0 ? `${(progress.processed / progress.total) * 100}%` : '0%' }}
              />
            </div>
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-4 gap-2">
            <div className={`p-2 rounded-lg text-center ${isDark ? 'bg-neutral-800' : 'bg-gray-50'}`}>
              <div className="text-green-400 text-lg font-bold">{progress.compressed}</div>
              <div className={`text-[10px] ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}>Comprimidas</div>
            </div>
            <div className={`p-2 rounded-lg text-center ${isDark ? 'bg-neutral-800' : 'bg-gray-50'}`}>
              <div className="text-yellow-400 text-lg font-bold">{progress.skipped}</div>
              <div className={`text-[10px] ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}>Puladas</div>
            </div>
            <div className={`p-2 rounded-lg text-center ${isDark ? 'bg-neutral-800' : 'bg-gray-50'}`}>
              <div className="text-red-400 text-lg font-bold">{progress.errors}</div>
              <div className={`text-[10px] ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}>Erros</div>
            </div>
            <div className={`p-2 rounded-lg text-center ${isDark ? 'bg-neutral-800' : 'bg-gray-50'}`}>
              <div className="text-pink-400 text-lg font-bold">{formatFileSize(progress.totalSavings)}</div>
              <div className={`text-[10px] ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}>Economizado</div>
            </div>
          </div>
        </div>
      )}

      {/* Logs */}
      {progress && progress.logs.length > 0 && (
        <div className={`p-4 border-b max-h-48 overflow-y-auto ${isDark ? 'border-neutral-800' : 'border-gray-200'}`}>
          <div className={`text-xs font-medium mb-2 ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
            Logs ({progress.logs.length})
          </div>
          <div className="space-y-1 font-mono text-[10px]">
            {progress.logs.slice(-20).map((log, i) => (
              <div key={i} className={`flex items-start gap-2 ${getLogColor(log.type)}`}>
                <i className={`fas ${getLogIcon(log.type)} mt-0.5`}></i>
                <span className="break-all">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ações */}
      <div className="p-4">
        <button
          onClick={handleRunMigration}
          disabled={isRunning}
          className={`w-full py-3 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 ${
            isRunning
              ? 'bg-neutral-700 text-neutral-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-pink-500 to-orange-400 text-white hover:opacity-90'
          }`}
        >
          {isRunning ? (
            <>
              <i className="fas fa-spinner fa-spin"></i>
              Processando...
            </>
          ) : progress?.phase === 'done' ? (
            <>
              <i className="fas fa-redo"></i>
              Executar Novamente
            </>
          ) : (
            <>
              <i className="fas fa-play"></i>
              {dryRun ? 'Simular Migração' : 'Executar Migração'}
            </>
          )}
        </button>

        {!dryRun && !isRunning && (
          <p className={`text-center text-[10px] mt-2 ${isDark ? 'text-red-400' : 'text-red-500'}`}>
            <i className="fas fa-exclamation-triangle mr-1"></i>
            Modo produção: as alterações serão permanentes
          </p>
        )}
      </div>
    </div>
  );
};

export default ImageMigrationPanel;

// ═══════════════════════════════════════════════════════════════
// VIZZU - ConfirmModal (Modal de confirmação genérico)
// Substitui confirm() nativo por modal branded para ações destrutivas
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useRef } from 'react';
import type { VizzuTheme } from '../../contexts/UIContext';

interface ConfirmModalProps {
 isOpen: boolean;
 onConfirm: () => void;
 onCancel: () => void;
 title: string;
 description?: string;
 consequences?: string[];
 confirmLabel?: string;
 cancelLabel?: string;
 variant?: 'danger' | 'warning' | 'default';
 isLoading?: boolean;
 theme?: VizzuTheme;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
 isOpen,
 onConfirm,
 onCancel,
 title,
 description,
 consequences,
 confirmLabel = 'Confirmar',
 cancelLabel = 'Cancelar',
 variant = 'default',
 isLoading = false,
 theme = 'dark',
}) => {
 const cancelRef = useRef<HTMLButtonElement>(null);

 // Focus no botão seguro ao abrir (padrão NNGroup: nenhum botão destrutivo com focus)
 useEffect(() => {
 if (isOpen && cancelRef.current) {
 cancelRef.current.focus();
 }
 }, [isOpen]);

 // Fechar com ESC (só se não estiver loading)
 useEffect(() => {
 if (!isOpen) return;
 const handleEsc = (e: KeyboardEvent) => {
 if (e.key === 'Escape' && !isLoading) onCancel();
 };
 window.addEventListener('keydown', handleEsc);
 return () => window.removeEventListener('keydown', handleEsc);
 }, [isOpen, isLoading, onCancel]);

 if (!isOpen) return null;

 const isDanger = variant === 'danger';
 const isWarning = variant === 'warning';

 const iconConfig = isDanger
 ? { icon: 'fa-triangle-exclamation', bg: theme !== 'light' ? 'bg-red-500/10' : 'bg-red-50', color: 'text-red-500' }
 : isWarning
 ? { icon: 'fa-triangle-exclamation', bg: theme !== 'light' ? 'bg-yellow-500/10' : 'bg-yellow-50', color: 'text-yellow-500' }
 : { icon: 'fa-circle-question', bg: theme !== 'light' ? 'bg-neutral-800' : 'bg-gray-100', color: theme !== 'light' ? 'text-neutral-300' : 'text-gray-600' };

 const confirmBtnClass = isDanger
 ? 'bg-red-600 hover:bg-red-700 text-white'
 : isWarning
 ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
 : 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] hover:opacity-90 text-white';

 return (
 <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
 {/* Backdrop */}
 <div
 className="absolute inset-0 bg-black/60 backdrop-blur-sm"
 onClick={isLoading ? undefined : onCancel}
 />

 {/* Modal */}
 <div className={
 'relative w-full max-w-sm rounded-2xl border p-6 shadow-2xl ' +
 (theme !== 'light' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200')
 }>
 {/* Icon */}
 <div className={'w-12 h-12 rounded-xl flex items-center justify-center mb-4 ' + iconConfig.bg}>
 <i className={'fas ' + iconConfig.icon + ' text-lg ' + iconConfig.color}></i>
 </div>

 {/* Title */}
 <h3 className={(theme !== 'light' ? 'text-white' : 'text-gray-900') + ' text-base font-bold mb-1'}>
 {title}
 </h3>

 {/* Description */}
 {description && (
 <p className={(theme !== 'light' ? 'text-neutral-400' : 'text-gray-500') + ' text-sm mb-3'}>
 {description}
 </p>
 )}

 {/* Consequences */}
 {consequences && consequences.length > 0 && (
 <div className={
 'rounded-lg p-3 mb-4 ' +
 (isDanger
 ? (theme !== 'light' ? 'bg-red-500/5 border border-red-500/20' : 'bg-red-50 border border-red-100')
 : (theme !== 'light' ? 'bg-neutral-800 border border-neutral-700' : 'bg-gray-50 border border-gray-200'))
 }>
 <ul className="space-y-1">
 {consequences.map((c, i) => (
 <li key={i} className={(theme !== 'light' ? 'text-neutral-300' : 'text-gray-600') + ' text-xs flex items-start gap-2'}>
 <i className={'fas fa-circle text-[4px] mt-1.5 shrink-0 ' + (isDanger ? 'text-red-400' : (theme !== 'light' ? 'text-neutral-500' : 'text-gray-400'))}></i>
 {c}
 </li>
 ))}
 </ul>
 </div>
 )}

 {/* Buttons */}
 <div className="flex gap-3 mt-4">
 <button
 ref={cancelRef}
 onClick={isLoading ? undefined : onCancel}
 disabled={isLoading}
 className={
 'flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ' +
 (theme !== 'light'
 ? 'bg-neutral-800 text-white hover:bg-neutral-700 border border-neutral-700'
 : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200')
 }
 >
 {cancelLabel}
 </button>
 <button
 onClick={isLoading ? undefined : onConfirm}
 disabled={isLoading}
 className={
 'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ' +
 confirmBtnClass +
 (isLoading ? ' opacity-70 cursor-not-allowed' : '')
 }
 >
 {isLoading ? (
 <>
 <i className="fas fa-circle-notch fa-spin text-xs"></i>
 Processando...
 </>
 ) : confirmLabel}
 </button>
 </div>
 </div>
 </div>
 );
};

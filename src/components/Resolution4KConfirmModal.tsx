// ═══════════════════════════════════════════════════════════════
// VIZZU - Resolution 4K Confirmation Modal
// Modal de confirmação para primeira seleção de resolução 4K
// ═══════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import type { VizzuTheme } from '../contexts/UIContext';

// localStorage keys
const STORAGE_KEY_CONFIRMED = 'vizzu_4k_confirmed';
const STORAGE_KEY_PREFERRED = 'vizzu_preferred_resolution';

interface Resolution4KConfirmModalProps {
 isOpen: boolean;
 onConfirm: () => void;
 onCancel: () => void;
 theme?: VizzuTheme;
}

// Helper para verificar se usuário já confirmou o aviso do 4K
export const has4KConfirmation = (): boolean => {
 try {
 return localStorage.getItem(STORAGE_KEY_CONFIRMED) === 'true';
 } catch {
 return false;
 }
};

// Helper para salvar confirmação do 4K
export const save4KConfirmation = (dontAskAgain: boolean): void => {
 try {
 if (dontAskAgain) {
 localStorage.setItem(STORAGE_KEY_CONFIRMED, 'true');
 }
 } catch (e) {
 console.error('Erro ao salvar confirmação 4K:', e);
 }
};

// Helper para salvar preferência de resolução
export const savePreferredResolution = (resolution: '2k' | '4k'): void => {
 try {
 localStorage.setItem(STORAGE_KEY_PREFERRED, resolution);
 } catch (e) {
 console.error('Erro ao salvar preferência de resolução:', e);
 }
};

// Helper para obter preferência de resolução
export const getPreferredResolution = (): '2k' | '4k' => {
 try {
 const saved = localStorage.getItem(STORAGE_KEY_PREFERRED);
 if (saved === '4k') return '4k';
 } catch {
 // Ignore
 }
 return '2k';
};

export const Resolution4KConfirmModal: React.FC<Resolution4KConfirmModalProps> = ({
 isOpen,
 onConfirm,
 onCancel,
 theme = 'dark',
}) => {
 const [dontAskAgain, setDontAskAgain] = useState(false);
 const isDark = theme !== 'light';

 if (!isOpen) return null;

 const handleConfirm = () => {
 save4KConfirmation(dontAskAgain);
 onConfirm();
 };

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
 {/* Backdrop */}
 <div
 className="absolute inset-0 bg-black/70 backdrop-blur-sm"
 onClick={onCancel}
 />

 {/* Modal */}
 <div className={`relative w-full max-w-sm rounded-2xl ${
 isDark ? 'bg-neutral-900 border border-neutral-800' : 'bg-white border border-gray-200'
 }`}>
 {/* Header */}
 <div className="p-5 text-center">
 <div className={`w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center ${
 isDark ? 'bg-purple-500/20' : 'bg-purple-100'
 }`}>
 <i className="fas fa-expand text-2xl text-purple-500"></i>
 </div>

 <h3 className={`text-lg font-bold font-serif mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
 Resolução 4K
 </h3>

 <p className={`text-sm ${isDark ? 'text-neutral-400' : 'text-gray-600'}`}>
 A resolução 4K oferece imagens com <span className="font-semibold text-purple-400">4x mais pixels</span>,
 ideal para impressões grandes e materiais de alta qualidade.
 </p>
 </div>

 {/* Info Box */}
 <div className={`mx-5 mb-4 p-3 rounded-xl ${isDark ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200'}`}>
 <div className="flex items-start gap-2">
 <i className="fas fa-info-circle text-amber-500 mt-0.5"></i>
 <div>
 <p className={`text-xs font-medium ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
 Custo dobrado
 </p>
 <p className={`text-xs ${isDark ? 'text-amber-500/80' : 'text-amber-600'}`}>
 Imagens em 4K consomem 2x os créditos da resolução padrão (2K).
 </p>
 </div>
 </div>
 </div>

 {/* Checkbox */}
 <div className="px-5 mb-4">
 <label className="flex items-center gap-2 cursor-pointer group">
 <input
 type="checkbox"
 checked={dontAskAgain}
 onChange={(e) => setDontAskAgain(e.target.checked)}
 className={`w-4 h-4 rounded border-2 appearance-none cursor-pointer transition-all ${
 dontAskAgain
 ? 'bg-purple-500 border-[#A855F7]'
 : isDark
 ? 'border-neutral-600 hover:border-neutral-500'
 : 'border-gray-300 hover:border-gray-400'
 }`}
 style={{
 backgroundImage: dontAskAgain ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='white'%3E%3Cpath fill-rule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clip-rule='evenodd'/%3E%3C/svg%3E")` : 'none',
 backgroundSize: '14px',
 backgroundPosition: 'center',
 backgroundRepeat: 'no-repeat',
 }}
 />
 <span className={`text-xs ${isDark ? 'text-neutral-400 group-hover:text-neutral-300' : 'text-gray-600 group-hover:text-gray-700'}`}>
 Não perguntar novamente
 </span>
 </label>
 </div>

 {/* Buttons */}
 <div className="flex gap-2 p-4 border-t ${isDark ? 'border-neutral-800' : 'border-gray-200'}">
 <button
 onClick={onCancel}
 className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
 isDark
 ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
 : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
 }`}
 >
 Cancelar
 </button>
 <button
 onClick={handleConfirm}
 className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-[#A855F7] to-[#FF6B9D] text-white hover:opacity-90 transition-all"
 >
 Usar 4K
 </button>
 </div>
 </div>
 </div>
 );
};

export default Resolution4KConfirmModal;

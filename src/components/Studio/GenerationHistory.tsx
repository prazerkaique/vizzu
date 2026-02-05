// ═══════════════════════════════════════════════════════════════
// VIZZU - Generation History Component
// ═══════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { VisualStudioGeneration } from '../../types';
import { smartDownload } from '../../utils/downloadHelper';
import { OptimizedImage } from '../OptimizedImage';
import { useImageViewer } from '../ImageViewer';

interface Props {
 generations: VisualStudioGeneration[];
 onView?: (generation: VisualStudioGeneration) => void;
 onDelete?: (id: string) => void;
}

export const GenerationHistory: React.FC<Props> = ({ generations, onView, onDelete }) => {
 const [isExpanded, setIsExpanded] = useState(true);
 const { openViewer } = useImageViewer();

 const groupedByDate = generations.reduce((acc, gen) => {
 const date = new Date(gen.createdAt).toLocaleDateString('pt-BR');
 if (!acc[date]) acc[date] = [];
 acc[date].push(gen);
 return acc;
 }, {} as Record<string, VisualStudioGeneration[]>);

 const getTypeLabel = (type: string) => {
 switch (type) {
 case 'studio': return { label: 'Studio', color: 'bg-purple-100 text-purple-700', icon: 'fa-store' };
 case 'cenario': return { label: 'Cenário', color: 'bg-[#FF6B6B]/15 text-[#FF6B6B]', icon: 'fa-film' };
 case 'lifestyle': return { label: 'Modelo', color: 'bg-orange-100 text-orange-700', icon: 'fa-user' };
 case 'refine': return { label: 'Refinado', color: 'bg-blue-100 text-blue-700', icon: 'fa-magic' };
 default: return { label: type, color: 'bg-slate-100 text-slate-700', icon: 'fa-image' };
 }
 };

 const handleDownload = async (imageData: string, productName?: string) => {
 await smartDownload(imageData, {
 filename: `vizzu-${productName || 'image'}-${Date.now()}.png`,
 shareTitle: 'Vizzu Studio',
 shareText: productName ? `${productName}` : 'Imagem gerada'
 });
 };

 if (generations.length === 0) return null;

 return (
 <>
 <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
 <button
 onClick={() => setIsExpanded(!isExpanded)}
 className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
 >
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-xl bg-white/60 border border-gray-200/60 shadow-sm">
 <i className="fas fa-history text-[#1A1A1A]"></i>
 </div>
 <div className="text-left">
 <h3 className="font-bold text-slate-800">Histórico de Gerações</h3>
 <p className="text-xs text-slate-500">{generations.length} imagens geradas</p>
 </div>
 </div>
 <div className="flex items-center gap-3">
 <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-bold">
 {generations.length}
 </span>
 <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-slate-400`}></i>
 </div>
 </button>

 {isExpanded && (
 <div className="border-t border-slate-100 p-4 max-h-[500px] overflow-y-auto">
 {Object.entries(groupedByDate).map(([date, gens]) => (
 <div key={date} className="mb-6 last:mb-0">
 <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
 <i className="fas fa-calendar text-slate-300"></i>
 {date}
 </h4>
 <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
 {gens.map(gen => {
 const typeInfo = getTypeLabel(gen.type);
 return (
 <div key={gen.id} className="group relative">
 <div className="aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
 <OptimizedImage
 src={gen.generatedImage}
 alt={gen.productName || 'Generated'}
 className="w-full h-full cursor-pointer hover:scale-105 transition-transform"
 onClick={() => openViewer(gen.generatedImage, { alt: gen.productName || 'Geração' })}
 size="thumb"
 />
 </div>
 
 {/* Type Badge */}
 <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${typeInfo.color}`}>
 <i className={`fas ${typeInfo.icon} mr-1`}></i>
 {typeInfo.label}
 </div>

 {/* Credits Badge */}
 <div className="absolute top-2 right-2 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold">
 {gen.credits} créd.
 </div>

 {/* Saved Badge */}
 {gen.saved && (
 <div className="absolute bottom-2 left-2 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center">
 <i className="fas fa-check text-[10px]"></i>
 </div>
 )}

 {/* Actions */}
 <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
 <button
 onClick={() => openViewer(gen.generatedImage, { alt: gen.productName || 'Geração' })}
 className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-100"
 title="Ver"
 >
 <i className="fas fa-search-plus text-sm"></i>
 </button>
 <button
 onClick={() => handleDownload(gen.generatedImage, gen.productName)}
 className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-100"
 title="Download"
 >
 <i className="fas fa-download text-sm"></i>
 </button>
 {onDelete && (
 <button
 onClick={() => onDelete(gen.id)}
 className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600"
 title="Excluir"
 >
 <i className="fas fa-trash text-sm"></i>
 </button>
 )}
 </div>

 {/* Product Name */}
 <p className="mt-2 text-[10px] text-slate-500 truncate px-1">
 {gen.productName || gen.productSku || 'Produto'}
 </p>
 </div>
 );
 })}
 </div>
 </div>
 ))}
 </div>
 )}
 </div>

 </>
 );
};

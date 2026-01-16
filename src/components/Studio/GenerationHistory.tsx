import React, { useState } from 'react';
import { VisualStudioGeneration } from '../../types';

interface Props {
  generations: VisualStudioGeneration[];
  onView: (g: VisualStudioGeneration) => void;
  onDelete: (id: string) => void;
}

const TYPE_CFG = {
  studio: { label: 'Studio', icon: 'fa-store', bg: 'bg-slate-100', text: 'text-slate-600' },
  cenario: { label: 'Cenário', icon: 'fa-film', bg: 'bg-purple-100', text: 'text-purple-600' },
  lifestyle: { label: 'Lifestyle', icon: 'fa-user', bg: 'bg-pink-100', text: 'text-pink-600' },
  refine: { label: 'Refine', icon: 'fa-pen', bg: 'bg-blue-100', text: 'text-blue-600' }
};

export const GenerationHistory: React.FC<Props> = ({ generations, onView, onDelete }) => {
  const [open, setOpen] = useState(false);
  if (!generations.length) return null;

  const grouped = generations.reduce((acc, g) => {
    const d = new Date(g.createdAt).toLocaleDateString('pt-BR');
    (acc[d] = acc[d] || []).push(g);
    return acc;
  }, {} as Record<string, VisualStudioGeneration[]>);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div onClick={() => setOpen(!open)} className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-slate-200 px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold text-slate-800"><i className="fas fa-history text-purple-500 mr-2"></i>Histórico</h3>
          <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2 py-1 rounded-full">{generations.length}</span>
        </div>
        <i className={`fas fa-chevron-down text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}></i>
      </div>

      {open && (
        <div className="max-h-[400px] overflow-y-auto">
          {Object.entries(grouped).map(([date, gens]) => (
            <div key={date}>
              <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 sticky top-0">
                <span className="text-[10px] font-bold text-slate-500 uppercase">{date}</span>
              </div>
              {gens.map(g => {
                const cfg = TYPE_CFG[g.type];
                return (
                  <div key={g.id} className="flex items-center gap-3 p-4 border-b border-slate-100 hover:bg-slate-50 group">
                    <div onClick={() => onView(g)} className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 cursor-pointer relative group/thumb">
                      <img src={g.generatedImage} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/30 flex items-center justify-center">
                        <i className="fas fa-expand text-white opacity-0 group-hover/thumb:opacity-100 text-xs"></i>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}><i className={`fas ${cfg.icon} mr-1`}></i>{cfg.label}</span>
                        {g.saved && <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full"><i className="fas fa-check mr-1"></i>Salvo</span>}
                        <span className="text-[10px] text-amber-600 font-bold">-{g.credits}</span>
                      </div>
                      <p className="text-sm font-bold text-slate-800 truncate">{g.productName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{g.productSku}</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                      <button onClick={() => onView(g)} className="w-7 h-7 rounded bg-slate-100 hover:bg-purple-100 text-slate-500 hover:text-purple-600 flex items-center justify-center"><i className="fas fa-eye text-[10px]"></i></button>
                      <button onClick={() => { const a = document.createElement('a'); a.href = g.generatedImage; a.download = `${g.productSku}.png`; a.click(); }} className="w-7 h-7 rounded bg-slate-100 hover:bg-green-100 text-slate-500 hover:text-green-600 flex items-center justify-center"><i className="fas fa-download text-[10px]"></i></button>
                      <button onClick={() => onDelete(g.id)} className="w-7 h-7 rounded bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 flex items-center justify-center"><i className="fas fa-trash text-[10px]"></i></button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

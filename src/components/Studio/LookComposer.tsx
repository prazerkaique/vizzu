import React, { useState } from 'react';
import { Product, LookComposition } from '../../types';

interface Props {
  products: Product[];
  composition: LookComposition;
  onChange: (c: LookComposition) => void;
}

const SLOTS = [
  { id: 'head' as const, label: 'Cabeça', icon: 'fa-hat-cowboy' },
  { id: 'top' as const, label: 'Topo', icon: 'fa-tshirt' },
  { id: 'bottom' as const, label: 'Baixo', icon: 'fa-socks' },
  { id: 'feet' as const, label: 'Pés', icon: 'fa-shoe-prints' },
  { id: 'accessory1' as const, label: 'Acess. 1', icon: 'fa-clock' },
  { id: 'accessory2' as const, label: 'Acess. 2', icon: 'fa-bag-shopping' },
];

export const LookComposer: React.FC<Props> = ({ products, composition, onChange }) => {
  const [expandedSlot, setExpandedSlot] = useState<keyof LookComposition | null>(null);
  const [search, setSearch] = useState('');

  const productsWithImages = products.filter(p => p.images?.length > 0 && (p.images[0]?.base64 || p.images[0]?.url));
  const filtered = productsWithImages.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()));

  const selectProduct = (slot: keyof LookComposition, product: Product) => {
    const img = product.images[0]?.base64 || product.images[0]?.url;
    if (img) onChange({ ...composition, [slot]: { image: img, name: product.name, sku: product.sku } });
    setExpandedSlot(null);
    setSearch('');
  };

  const removeSlot = (slot: keyof LookComposition, e: React.MouseEvent) => {
    e.stopPropagation();
    const c = { ...composition };
    delete c[slot];
    onChange(c);
  };

  return (
    <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold text-slate-700"><i className="fas fa-layer-group text-indigo-500 mr-2"></i>Composição de Look</h4>
        {Object.keys(composition).length > 0 && (
          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-2 py-1 rounded-full">{Object.keys(composition).length} itens</span>
        )}
      </div>
      
      <div className="grid grid-cols-3 gap-2">
        {SLOTS.map(slot => {
          const item = composition[slot.id];
          return (
            <div key={slot.id} onClick={() => !item && setExpandedSlot(expandedSlot === slot.id ? null : slot.id)}
              className={`aspect-square rounded-lg border-2 border-dashed cursor-pointer flex flex-col items-center justify-center relative overflow-hidden group transition-all ${item ? 'border-indigo-400 bg-white' : expandedSlot === slot.id ? 'border-indigo-500 bg-indigo-100' : 'border-slate-300 bg-white/50 hover:border-indigo-400'}`}>
              {item ? (
                <>
                  <img src={item.image} alt={item.name} className="w-full h-full object-contain p-1" />
                  <button onClick={(e) => removeSlot(slot.id, e)} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 text-[8px]"><i className="fas fa-times"></i></button>
                  <div className="absolute top-1 left-1 bg-indigo-600 text-white text-[7px] font-bold px-1 rounded">{slot.label}</div>
                </>
              ) : (
                <>
                  <i className={`fas ${slot.icon} text-lg ${expandedSlot === slot.id ? 'text-indigo-600' : 'text-slate-400'}`}></i>
                  <span className={`text-[9px] font-bold mt-1 ${expandedSlot === slot.id ? 'text-indigo-700' : 'text-slate-500'}`}>{slot.label}</span>
                </>
              )}
            </div>
          );
        })}
      </div>

      {expandedSlot && (
        <div className="mt-3 bg-white rounded-lg border border-indigo-200 overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded" autoFocus />
          </div>
          <div className="p-2 max-h-32 overflow-y-auto grid grid-cols-4 gap-1">
            {filtered.slice(0, 16).map(p => (
              <div key={p.id} onClick={() => selectProduct(expandedSlot, p)} className="aspect-square rounded border border-slate-200 overflow-hidden cursor-pointer hover:border-indigo-500">
                <img src={p.images[0]?.base64 || p.images[0]?.url} alt={p.name} className="w-full h-full object-contain p-0.5" />
              </div>
            ))}
          </div>
        </div>
      )}
      
      {Object.keys(composition).length > 0 && (
        <button onClick={() => onChange({})} className="mt-2 text-[10px] text-red-500 hover:text-red-600 font-medium w-full text-right">
          <i className="fas fa-trash-alt mr-1"></i>Limpar
        </button>
      )}
    </div>
  );
};

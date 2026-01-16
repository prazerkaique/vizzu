import React, { useState } from 'react';
import { Product, LookComposition } from '../../types';

interface Props {
  products: Product[];
  composition: LookComposition;
  onChange: (c: LookComposition) => void;
  collections?: string[];
}

const SLOTS = [
  { id: 'head' as const, label: 'Cabeça', icon: 'fa-hat-cowboy' },
  { id: 'top' as const, label: 'Topo', icon: 'fa-tshirt' },
  { id: 'bottom' as const, label: 'Baixo', icon: 'fa-socks' },
  { id: 'feet' as const, label: 'Pés', icon: 'fa-shoe-prints' },
  { id: 'accessory1' as const, label: 'Acess. 1', icon: 'fa-clock' },
  { id: 'accessory2' as const, label: 'Acess. 2', icon: 'fa-bag-shopping' },
];

export const LookComposer: React.FC<Props> = ({ products, composition, onChange, collections = [] }) => {
  const [expandedSlot, setExpandedSlot] = useState<keyof LookComposition | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCollection, setSelectedCollection] = useState<string>('');

  const productsWithImages = products.filter(p => p.images?.length > 0 && (p.images[0]?.base64 || p.images[0]?.url));
  
  const filtered = productsWithImages.filter(p => {
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCollection = !selectedCollection || p.collection === selectedCollection;
    return matchesSearch && matchesCollection;
  });

  // Extrair coleções únicas dos produtos se não fornecidas
  const availableCollections = collections.length > 0 
    ? collections 
    : [...new Set(productsWithImages.map(p => p.collection).filter(Boolean))] as string[];

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
              className={'aspect-square rounded-lg border-2 border-dashed cursor-pointer flex flex-col items-center justify-center relative overflow-hidden group transition-all ' + (item ? 'border-indigo-400 bg-white' : expandedSlot === slot.id ? 'border-indigo-500 bg-indigo-100' : 'border-slate-300 bg-white/50 hover:border-indigo-400')}>
              {item ? (
                <>
                  <img src={item.image} alt={item.name} className="w-full h-full object-contain p-1" />
                  <button onClick={(e) => removeSlot(slot.id, e)} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 text-[8px]"><i className="fas fa-times"></i></button>
                  <div className="absolute top-1 left-1 bg-indigo-600 text-white text-[7px] font-bold px-1 rounded">{slot.label}</div>
                </>
              ) : (
                <>
                  <i className={'fas ' + slot.icon + ' text-lg ' + (expandedSlot === slot.id ? 'text-indigo-600' : 'text-slate-400')}></i>
                  <span className={'text-[9px] font-bold mt-1 ' + (expandedSlot === slot.id ? 'text-indigo-700' : 'text-slate-500')}>{slot.label}</span>
                </>
              )}
            </div>
          );
        })}
      </div>

      {expandedSlot && (
        <div className="mt-3 bg-white rounded-lg border border-indigo-200 overflow-hidden">
          <div className="p-2 border-b border-slate-100 space-y-2">
            {/* Filtro de Coleção */}
            {availableCollections.length > 0 && (
              <div className="flex gap-1 overflow-x-auto pb-1">
                <button 
                  onClick={() => setSelectedCollection('')}
                  className={'px-2 py-1 text-[10px] font-bold rounded-full whitespace-nowrap transition-all ' + (!selectedCollection ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}
                >
                  Todos
                </button>
                {availableCollections.map(col => (
                  <button 
                    key={col}
                    onClick={() => setSelectedCollection(col)}
                    className={'px-2 py-1 text-[10px] font-bold rounded-full whitespace-nowrap transition-all ' + (selectedCollection === col ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}
                  >
                    {col}
                  </button>
                ))}
              </div>
            )}
            {/* Busca */}
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar produto..." className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded" autoFocus />
          </div>
          <div className="p-2 max-h-40 overflow-y-auto">
            {filtered.length > 0 ? (
              <div className="grid grid-cols-4 gap-1">
                {filtered.slice(0, 20).map(p => (
                  <div key={p.id} onClick={() => selectProduct(expandedSlot, p)} className="aspect-square rounded border border-slate-200 overflow-hidden cursor-pointer hover:border-indigo-500 relative group">
                    <img src={p.images[0]?.base64 || p.images[0]?.url} alt={p.name} className="w-full h-full object-contain p-0.5" />
                    <div className="absolute inset-x-0 bottom-0 bg-black/70 text-white text-[7px] p-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">{p.name}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-slate-400">
                <i className="fas fa-search text-lg mb-1"></i>
                <p className="text-xs">Nenhum produto encontrado</p>
              </div>
            )}
          </div>
          {filtered.length > 20 && (
            <div className="px-2 py-1 border-t border-slate-100 text-center">
              <span className="text-[10px] text-slate-500">Mostrando 20 de {filtered.length} produtos</span>
            </div>
          )}
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

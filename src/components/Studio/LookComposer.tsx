import React, { useState, useCallback } from 'react';
import { Product, LookComposition } from '../../types';
import { BaseballCap, TShirt, Pants, Sneaker, Watch, Handbag } from '@phosphor-icons/react';

interface Props {
  products: Product[];
  composition: LookComposition;
  onChange: (c: LookComposition) => void;
  collections?: string[];
  theme?: 'dark' | 'light';
}

// Mapeamento de slots para categorias de produtos
const SLOT_CATEGORY_MAP: Record<string, string[]> = {
  head: ['Bonés', 'Chapéus', 'Tiaras', 'Lenços', 'Acessórios'],
  top: ['Camisetas', 'Blusas', 'Regatas', 'Tops', 'Camisas', 'Jaquetas', 'Casacos', 'Blazers', 'Moletons', 'Bodies'],
  bottom: ['Calças', 'Shorts', 'Bermudas', 'Saias', 'Leggings', 'Shorts Fitness'],
  feet: ['Tênis', 'Sandálias', 'Botas', 'Calçados'],
  accessory1: ['Acessórios', 'Bolsas', 'Cintos', 'Relógios', 'Óculos', 'Bijuterias'],
  accessory2: ['Acessórios', 'Bolsas', 'Cintos', 'Relógios', 'Óculos', 'Bijuterias'],
};

const SLOTS = [
  { id: 'head' as const, label: 'Cabeça', Icon: BaseballCap },
  { id: 'top' as const, label: 'Topo', Icon: TShirt },
  { id: 'bottom' as const, label: 'Baixo', Icon: Pants },
  { id: 'feet' as const, label: 'Pés', Icon: Sneaker },
  { id: 'accessory1' as const, label: 'Acess. 1', Icon: Watch },
  { id: 'accessory2' as const, label: 'Acess. 2', Icon: Handbag },
];

export const LookComposer: React.FC<Props> = ({ products, composition, onChange, collections = [], theme = 'dark' }) => {
  const [expandedSlot, setExpandedSlot] = useState<keyof LookComposition | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCollection, setSelectedCollection] = useState<string>('');
  const [isDragging, setIsDragging] = useState<keyof LookComposition | null>(null);

  const productsWithImages = products.filter(p => p.images?.length > 0 && (p.images[0]?.base64 || p.images[0]?.url));

  // Filtra produtos por categoria do slot
  const getFilteredProducts = () => {
    let filtered = productsWithImages;

    // Filtrar por categoria do slot se estiver expandido
    if (expandedSlot) {
      const allowedCategories = SLOT_CATEGORY_MAP[expandedSlot] || [];
      if (allowedCategories.length > 0) {
        filtered = filtered.filter(p => allowedCategories.includes(p.category));
      }
    }

    // Filtrar por busca
    if (search) {
      filtered = filtered.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    }

    // Filtrar por coleção
    if (selectedCollection) {
      filtered = filtered.filter(p => p.collection === selectedCollection);
    }

    return filtered;
  };

  const filtered = getFilteredProducts();

  // Extrair coleções únicas dos produtos se não fornecidas
  const availableCollections = collections.length > 0
    ? collections
    : [...new Set(productsWithImages.map(p => p.collection).filter(Boolean))] as string[];

  const selectProduct = (slot: keyof LookComposition, product: Product) => {
    const img = product.images[0]?.base64 || product.images[0]?.url;
    if (img) onChange({
      ...composition,
      [slot]: {
        image: img,
        name: product.name,
        sku: product.sku,
        productId: product.id,
        imageId: product.images[0]?.id
      }
    });
    setExpandedSlot(null);
    setSearch('');
  };

  const removeSlot = (slot: keyof LookComposition, e: React.MouseEvent) => {
    e.stopPropagation();
    const c = { ...composition };
    delete c[slot];
    onChange(c);
  };

  // Drag and Drop handlers
  const handleDragOver = useCallback((e: React.DragEvent, slot: keyof LookComposition) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(slot);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(null);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, slot: keyof LookComposition) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(null);

    // Verificar se há arquivos de imagem
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          onChange({ ...composition, [slot]: { image: base64, name: file.name, sku: 'external' } });
        };
        reader.readAsDataURL(file);
        return;
      }
    }

    // Verificar se há URL de imagem (ex: arrastando do Google)
    const html = e.dataTransfer.getData('text/html');
    const imgSrcMatch = html.match(/<img[^>]+src="([^">]+)"/);
    if (imgSrcMatch && imgSrcMatch[1]) {
      const imageUrl = imgSrcMatch[1];
      // Para imagens externas, usamos a URL diretamente
      onChange({ ...composition, [slot]: { image: imageUrl, name: 'Imagem externa', sku: 'external' } });
      return;
    }

    // Tentar pegar URL direta
    const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    if (url && (url.match(/\.(jpg|jpeg|png|gif|webp)$/i) || url.includes('images'))) {
      onChange({ ...composition, [slot]: { image: url, name: 'Imagem externa', sku: 'external' } });
    }
  }, [composition, onChange]);

  // Paste handler para colar imagens
  const handlePaste = useCallback(async (e: React.ClipboardEvent, slot: keyof LookComposition) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64 = event.target?.result as string;
            onChange({ ...composition, [slot]: { image: base64, name: 'Imagem colada', sku: 'external' } });
          };
          reader.readAsDataURL(file);
          return;
        }
      }
    }
  }, [composition, onChange]);

  return (
    <div className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-purple-200 shadow-sm') + ' rounded-lg border p-3'}>
      <div className="flex items-center justify-between mb-2">
        <h4 className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-[10px] font-medium'}>
          <i className="fas fa-layer-group text-pink-400 mr-1.5"></i>Composição de Look
        </h4>
        {Object.keys(composition).length > 0 && (
          <span className="text-[9px] font-medium text-pink-500 bg-pink-500/20 px-1.5 py-0.5 rounded-full">
            {Object.keys(composition).length} itens
          </span>
        )}
      </div>

      {/* Dica de uso */}
      <div className={`mb-2 p-2.5 rounded-lg text-[10px] leading-relaxed ${theme === 'dark' ? 'bg-neutral-700/50 text-neutral-400' : 'bg-purple-50 text-purple-600'}`}>
        <i className="fas fa-lightbulb mr-1.5"></i>
        <span className="font-medium">Clique no slot</span> para escolher um produto cadastrado, ou <span className="font-medium">arraste imagens</span> do Google / <span className="font-medium">cole (Ctrl+V)</span>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {SLOTS.map(slot => {
          const item = composition[slot.id];
          return (
            <div
              key={slot.id}
              onClick={() => !item && setExpandedSlot(expandedSlot === slot.id ? null : slot.id)}
              onDragOver={(e) => handleDragOver(e, slot.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, slot.id)}
              onPaste={(e) => handlePaste(e, slot.id)}
              tabIndex={0}
              className={'aspect-square rounded-lg border border-dashed cursor-pointer flex flex-col items-center justify-center relative overflow-hidden group transition-all ' +
                (isDragging === slot.id
                  ? 'border-pink-500 bg-pink-500/20 scale-105'
                  : item
                    ? 'border-pink-500/50 ' + (theme === 'dark' ? 'bg-neutral-900' : 'bg-pink-50')
                    : expandedSlot === slot.id
                      ? 'border-pink-500 bg-pink-500/10'
                      : (theme === 'dark' ? 'border-neutral-600 bg-neutral-900/50 hover:border-pink-500/50' : 'border-purple-300 bg-purple-50/50 hover:border-pink-400')
                )
              }
            >
              {item ? (
                <>
                  <img src={item.image} alt={item.name} className="w-full h-full object-contain p-1" />
                  <button
                    onClick={(e) => removeSlot(slot.id, e)}
                    className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 text-[7px] transition-opacity"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                  <div className="absolute top-0.5 left-0.5 bg-pink-500 text-white text-[6px] font-medium px-1 rounded">
                    {slot.label}
                  </div>
                  {item.sku === 'external' && (
                    <div className="absolute bottom-0.5 right-0.5 bg-purple-500 text-white text-[6px] font-medium px-1 rounded">
                      <i className="fas fa-external-link-alt"></i>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {isDragging === slot.id ? (
                    <i className="fas fa-download text-pink-500 text-lg animate-bounce"></i>
                  ) : (
                    <slot.Icon size={18} weight="duotone" className={expandedSlot === slot.id ? 'text-pink-500' : (theme === 'dark' ? 'text-neutral-600' : 'text-purple-400')} />
                  )}
                  <span className={'text-[8px] font-medium mt-0.5 ' + (isDragging === slot.id ? 'text-pink-500' : expandedSlot === slot.id ? 'text-pink-500' : (theme === 'dark' ? 'text-neutral-500' : 'text-purple-500'))}>
                    {isDragging === slot.id ? 'Soltar aqui' : slot.label}
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>

      {expandedSlot && (
        <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-700' : 'bg-gray-50 border-purple-200') + ' mt-2 rounded-lg border overflow-hidden'}>
          <div className={(theme === 'dark' ? 'border-neutral-800' : 'border-purple-100') + ' p-2 border-b space-y-1.5'}>
            {/* Header com categoria */}
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-medium ${theme === 'dark' ? 'text-pink-400' : 'text-pink-600'}`}>
                <i className="fas fa-filter mr-1"></i>
                {SLOTS.find(s => s.id === expandedSlot)?.label}: {SLOT_CATEGORY_MAP[expandedSlot]?.slice(0, 3).join(', ')}...
              </span>
              <span className={`text-[9px] ${theme === 'dark' ? 'text-neutral-500' : 'text-gray-500'}`}>
                {filtered.length} produtos
              </span>
            </div>

            {/* Filtro de Coleção */}
            {availableCollections.length > 0 && (
              <div className="flex gap-1 overflow-x-auto pb-1">
                <button
                  onClick={() => setSelectedCollection('')}
                  className={'px-2 py-1 text-[9px] font-medium rounded-full whitespace-nowrap transition-all ' +
                    (!selectedCollection
                      ? 'bg-pink-500 text-white'
                      : (theme === 'dark' ? 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700' : 'bg-purple-100 text-purple-600 hover:bg-purple-200')
                    )
                  }
                >
                  Todos
                </button>
                {availableCollections.map(col => (
                  <button
                    key={col}
                    onClick={() => setSelectedCollection(col)}
                    className={'px-2 py-1 text-[9px] font-medium rounded-full whitespace-nowrap transition-all ' +
                      (selectedCollection === col
                        ? 'bg-pink-500 text-white'
                        : (theme === 'dark' ? 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700' : 'bg-purple-100 text-purple-600 hover:bg-purple-200')
                      )
                    }
                  >
                    {col}
                  </button>
                ))}
              </div>
            )}
            {/* Busca */}
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar produto..."
              className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500' : 'bg-white border-purple-200 text-gray-900 placeholder-gray-400') + ' w-full px-2 py-1.5 text-[10px] border rounded-lg'}
              autoFocus
            />
          </div>
          <div className="p-2 max-h-32 overflow-y-auto">
            {filtered.length > 0 ? (
              <div className="grid grid-cols-4 gap-1">
                {filtered.slice(0, 20).map(p => (
                  <div
                    key={p.id}
                    onClick={() => selectProduct(expandedSlot, p)}
                    className={(theme === 'dark' ? 'border-neutral-700 hover:border-pink-500' : 'border-purple-200 hover:border-pink-400 bg-white') + ' aspect-square rounded-lg border overflow-hidden cursor-pointer relative group transition-colors'}
                  >
                    <img src={p.images[0]?.base64 || p.images[0]?.url} alt={p.name} className="w-full h-full object-contain p-0.5" />
                    <div className="absolute inset-x-0 bottom-0 bg-black/80 text-white text-[6px] p-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                      {p.name}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' text-center py-4'}>
                <i className="fas fa-search text-sm mb-1"></i>
                <p className="text-[10px]">Nenhum produto encontrado para esta categoria</p>
                <p className={`text-[9px] mt-1 ${theme === 'dark' ? 'text-neutral-500' : 'text-gray-500'}`}>
                  Tente arrastar uma imagem do Google
                </p>
              </div>
            )}
          </div>
          {filtered.length > 20 && (
            <div className={(theme === 'dark' ? 'border-neutral-800 text-neutral-500' : 'border-purple-100 text-gray-500') + ' px-2 py-1 border-t text-center'}>
              <span className="text-[9px]">Mostrando 20 de {filtered.length} produtos</span>
            </div>
          )}
        </div>
      )}

      {Object.keys(composition).length > 0 && (
        <button
          onClick={() => onChange({})}
          className="mt-2 text-[9px] text-red-500 hover:text-red-400 font-medium w-full text-right transition-colors"
        >
          <i className="fas fa-trash-alt mr-1"></i>Limpar
        </button>
      )}
    </div>
  );
};

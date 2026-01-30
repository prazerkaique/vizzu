import React, { useState, useRef, useCallback } from 'react';
import { Product, ProductImage } from '../types';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (products: Partial<Product>[]) => void;
  theme: 'light' | 'dark';
}

type ImportMethod = 'google' | 'xml' | 'zip' | null;
type ImportStep = 'select' | 'configure' | 'preview' | 'importing' | 'done';

interface ParsedProduct {
  id: string;
  name: string;
  description?: string;
  brand?: string;
  color?: string;
  category?: string;
  collection?: string;
  imageUrl?: string;
  imageBase64?: string;
  selected: boolean;
}

const CATEGORIES = ['Camisetas', 'Blusas', 'Regatas', 'Tops', 'Camisas', 'Bodies', 'Jaquetas', 'Casacos', 'Blazers', 'Moletons', 'Calças', 'Shorts', 'Bermudas', 'Saias', 'Leggings', 'Shorts Fitness', 'Vestidos', 'Macacões', 'Jardineiras', 'Biquínis', 'Maiôs', 'Calçados', 'Tênis', 'Sandálias', 'Botas', 'Bolsas', 'Cintos', 'Relógios', 'Óculos', 'Bijuterias', 'Acessórios', 'Bonés', 'Chapéus', 'Tiaras', 'Lenços', 'Outros Acessórios'];

export function BulkImportModal({ isOpen, onClose, onImport, theme }: BulkImportModalProps) {
  const [method, setMethod] = useState<ImportMethod>(null);
  const [step, setStep] = useState<ImportStep>('select');
  const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importedCount, setImportedCount] = useState(0);

  // Google Sheets state
  const [spreadsheetUrl, setSpreadsheetUrl] = useState('');
  const [driveFolder, setDriveFolder] = useState('');

  // ZIP state
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [zipFileName, setZipFileName] = useState('');

  // XML state
  const [xmlFile, setXmlFile] = useState<File | null>(null);
  const [xmlFileName, setXmlFileName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  const isDark = theme === 'dark';
  const bgCard = isDark ? 'bg-neutral-900' : 'bg-white';
  const bgMuted = isDark ? 'bg-neutral-800' : 'bg-gray-50';
  const bgHover = isDark ? 'hover:bg-neutral-700' : 'hover:bg-gray-100';
  const borderColor = isDark ? 'border-neutral-800' : 'border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-neutral-400' : 'text-gray-500';
  const textMuted = isDark ? 'text-neutral-500' : 'text-gray-400';

  const reset = useCallback(() => {
    setMethod(null);
    setStep('select');
    setParsedProducts([]);
    setIsLoading(false);
    setError(null);
    setImportProgress(0);
    setImportedCount(0);
    setSpreadsheetUrl('');
    setDriveFolder('');
    setZipFile(null);
    setZipFileName('');
    setXmlFile(null);
    setXmlFileName('');
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

  // Parse XML file (Google Shopping format)
  const parseXmlFile = async (file: File): Promise<ParsedProduct[]> => {
    const text = await file.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, 'text/xml');

    const items = xmlDoc.querySelectorAll('item');
    const products: ParsedProduct[] = [];

    items.forEach((item, index) => {
      const getTextContent = (selector: string): string => {
        const el = item.querySelector(selector);
        return el?.textContent?.trim() || '';
      };

      // Support both namespaced and non-namespaced tags
      const getId = () => getTextContent('g\\:id, id') || `import-${Date.now()}-${index}`;
      const getTitle = () => getTextContent('g\\:title, title');
      const getDescription = () => getTextContent('g\\:description, description');
      const getImageLink = () => getTextContent('g\\:image_link, image_link, g\\:image-link, image-link');
      const getBrand = () => getTextContent('g\\:brand, brand');
      const getColor = () => getTextContent('g\\:color, color');
      const getProductType = () => getTextContent('g\\:product_type, product_type, g\\:product-type, product-type, category');

      const name = getTitle();
      if (name) {
        products.push({
          id: getId(),
          name,
          description: getDescription(),
          brand: getBrand(),
          color: getColor(),
          category: matchCategory(getProductType()),
          imageUrl: getImageLink(),
          selected: true
        });
      }
    });

    return products;
  };

  // Match product type to available categories
  const matchCategory = (productType: string): string => {
    if (!productType) return '';
    const lowerType = productType.toLowerCase();

    for (const cat of CATEGORIES) {
      if (lowerType.includes(cat.toLowerCase())) {
        return cat;
      }
    }

    // Common mappings
    const mappings: Record<string, string> = {
      'shirt': 'Camisetas',
      't-shirt': 'Camisetas',
      'tshirt': 'Camisetas',
      'blouse': 'Blusas',
      'pants': 'Calças',
      'jeans': 'Calças',
      'dress': 'Vestidos',
      'skirt': 'Saias',
      'jacket': 'Jaquetas',
      'coat': 'Casacos',
      'shoe': 'Calçados',
      'sneaker': 'Tênis',
      'bag': 'Bolsas',
      'accessory': 'Acessórios',
      'accessories': 'Acessórios',
      'swimsuit': 'Biquínis',
      'bikini': 'Biquínis',
    };

    for (const [key, value] of Object.entries(mappings)) {
      if (lowerType.includes(key)) {
        return value;
      }
    }

    return '';
  };

  // Parse ZIP file
  const parseZipFile = async (file: File): Promise<ParsedProduct[]> => {
    // Dynamic import of JSZip
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(file);

    const products: ParsedProduct[] = [];
    let csvData: string | null = null;
    let jsonData: any | null = null;
    const imageFiles: Record<string, string> = {};

    // First pass: find data files and images
    for (const [filename, zipEntry] of Object.entries(zip.files)) {
      if (zipEntry.dir) continue;

      const lowerName = filename.toLowerCase();

      if (lowerName.endsWith('.csv')) {
        csvData = await zipEntry.async('string');
      } else if (lowerName.endsWith('.json')) {
        const jsonStr = await zipEntry.async('string');
        try {
          jsonData = JSON.parse(jsonStr);
        } catch (e) {
          console.error('Error parsing JSON:', e);
        }
      } else if (/\.(jpg|jpeg|png|webp|gif)$/i.test(filename)) {
        const base64 = await zipEntry.async('base64');
        const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
        const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
        imageFiles[filename.split('/').pop() || filename] = `data:${mimeType};base64,${base64}`;
      }
    }

    // Parse CSV if found
    if (csvData) {
      const lines = csvData.split('\n').filter(l => l.trim());
      if (lines.length > 1) {
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          const row: Record<string, string> = {};
          headers.forEach((h, idx) => {
            row[h] = values[idx] || '';
          });

          const name = row.name || row.title || row.nome || row.produto;
          if (name) {
            const imageKey = row.image || row.imagem || row.foto || row.image_link || '';
            const imageBase64 = imageFiles[imageKey] || imageFiles[imageKey.split('/').pop() || ''];

            products.push({
              id: row.id || row.sku || `zip-${Date.now()}-${i}`,
              name,
              description: row.description || row.descricao || '',
              brand: row.brand || row.marca || '',
              color: row.color || row.cor || '',
              category: matchCategory(row.category || row.categoria || row.product_type || ''),
              collection: row.collection || row.colecao || '',
              imageBase64,
              selected: true
            });
          }
        }
      }
    }

    // Parse JSON if found and no CSV
    if (jsonData && products.length === 0) {
      const items = Array.isArray(jsonData) ? jsonData : jsonData.products || jsonData.items || [];

      items.forEach((item: any, index: number) => {
        const name = item.name || item.title || item.nome;
        if (name) {
          const imageKey = item.image || item.imagem || item.foto || item.image_link || '';
          const imageBase64 = imageFiles[imageKey] || imageFiles[imageKey.split('/').pop() || ''];

          products.push({
            id: item.id || item.sku || `zip-${Date.now()}-${index}`,
            name,
            description: item.description || item.descricao || '',
            brand: item.brand || item.marca || '',
            color: item.color || item.cor || '',
            category: matchCategory(item.category || item.categoria || item.product_type || ''),
            collection: item.collection || item.colecao || '',
            imageBase64,
            selected: true
          });
        }
      });
    }

    // If no data file found, just import images with filenames as product names
    if (products.length === 0 && Object.keys(imageFiles).length > 0) {
      Object.entries(imageFiles).forEach(([filename, base64], index) => {
        const name = filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
        products.push({
          id: `zip-${Date.now()}-${index}`,
          name: name.charAt(0).toUpperCase() + name.slice(1),
          imageBase64: base64,
          selected: true
        });
      });
    }

    return products;
  };

  // Handle XML file selection
  const handleXmlFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setXmlFile(file);
    setXmlFileName(file.name);
    setIsLoading(true);
    setError(null);

    try {
      const products = await parseXmlFile(file);
      if (products.length === 0) {
        setError('Nenhum produto encontrado no arquivo XML. Verifique se está no formato Google Shopping.');
      } else {
        setParsedProducts(products);
        setStep('preview');
      }
    } catch (err) {
      setError('Erro ao processar arquivo XML. Verifique se o formato está correto.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle ZIP file selection
  const handleZipFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setZipFile(file);
    setZipFileName(file.name);
    setIsLoading(true);
    setError(null);

    try {
      const products = await parseZipFile(file);
      if (products.length === 0) {
        setError('Nenhum produto encontrado no arquivo ZIP. Inclua um arquivo CSV ou JSON com os dados dos produtos.');
      } else {
        setParsedProducts(products);
        setStep('preview');
      }
    } catch (err) {
      setError('Erro ao processar arquivo ZIP. Verifique se o formato está correto.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google Sheets connection
  const handleGoogleConnect = async () => {
    if (!spreadsheetUrl.trim()) {
      setError('Insira a URL da planilha do Google Sheets');
      return;
    }

    setIsLoading(true);
    setError(null);

    // Extract spreadsheet ID from URL
    const match = spreadsheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      setError('URL inválida. Use o link de compartilhamento do Google Sheets.');
      setIsLoading(false);
      return;
    }

    // For now, show a message that this feature requires backend setup
    setTimeout(() => {
      setError('Esta funcionalidade requer configuração do Google API no backend. Entre em contato para ativar esta integração.');
      setIsLoading(false);
    }, 1500);
  };

  // Toggle product selection
  const toggleProduct = (id: string) => {
    setParsedProducts(prev =>
      prev.map(p => p.id === id ? { ...p, selected: !p.selected } : p)
    );
  };

  // Toggle all products
  const toggleAll = () => {
    const allSelected = parsedProducts.every(p => p.selected);
    setParsedProducts(prev => prev.map(p => ({ ...p, selected: !allSelected })));
  };

  // Update product field
  const updateProduct = (id: string, field: keyof ParsedProduct, value: string) => {
    setParsedProducts(prev =>
      prev.map(p => p.id === id ? { ...p, [field]: value } : p)
    );
  };

  // Convert image URL to base64
  const urlToBase64 = async (url: string): Promise<string | null> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  // Import products
  const handleImport = async () => {
    const selectedProducts = parsedProducts.filter(p => p.selected);
    if (selectedProducts.length === 0) {
      setError('Selecione pelo menos um produto para importar');
      return;
    }

    setStep('importing');
    setImportProgress(0);
    setImportedCount(0);

    const productsToImport: Partial<Product>[] = [];

    for (let i = 0; i < selectedProducts.length; i++) {
      const p = selectedProducts[i];

      // Try to get image as base64
      let imageBase64 = p.imageBase64;
      if (!imageBase64 && p.imageUrl) {
        imageBase64 = await urlToBase64(p.imageUrl) || undefined;
      }

      const images: ProductImage[] = imageBase64 ? [{
        name: 'imported',
        base64: imageBase64,
        type: 'front'
      }] : [];

      productsToImport.push({
        id: `prod-${Date.now()}-${i}`,
        sku: p.id || `SKU-${Date.now()}-${i}`,
        name: p.name,
        description: p.description,
        brand: p.brand,
        color: p.color,
        category: p.category || '',
        collection: p.collection,
        images,
        originalImages: imageBase64 ? {
          front: { name: 'imported', base64: imageBase64, type: 'front' }
        } : undefined,
        createdAt: new Date().toISOString(),
      });

      setImportProgress(Math.round(((i + 1) / selectedProducts.length) * 100));
      setImportedCount(i + 1);

      // Small delay for visual feedback
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    onImport(productsToImport);
    setStep('done');
  };

  if (!isOpen) return null;

  const selectedCount = parsedProducts.filter(p => p.selected).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 safe-area-all">
      <div className={`${bgCard} rounded-2xl border ${borderColor} w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${borderColor} shrink-0`}>
          <div className="flex items-center gap-3">
            <div className={'w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-xl ' + (isDark ? 'bg-white/10 border border-white/15' : 'bg-white/60 border border-gray-200/60 shadow-sm')}>
              <i className={'fas fa-file-import text-sm ' + (isDark ? 'text-neutral-200' : 'text-[#1A1A1A]')}></i>
            </div>
            <div>
              <h3 className={`${textPrimary} font-semibold text-sm sm:text-base`}>Importação em Massa</h3>
              <p className={`${textSecondary} text-xs`}>
                {step === 'select' && 'Escolha o método de importação'}
                {step === 'configure' && method === 'google' && 'Google Sheets + Drive'}
                {step === 'configure' && method === 'xml' && 'XML Google Shopping'}
                {step === 'configure' && method === 'zip' && 'Arquivo ZIP'}
                {step === 'preview' && `${parsedProducts.length} produtos encontrados`}
                {step === 'importing' && `Importando ${importedCount}/${selectedCount}...`}
                {step === 'done' && `${importedCount} produtos importados!`}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className={`${isDark ? 'bg-neutral-800 text-neutral-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-700'} w-8 h-8 rounded-lg flex items-center justify-center transition-colors`}
          >
            <i className="fas fa-times text-xs"></i>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {/* Step 1: Select Method */}
          {step === 'select' && (
            <div className="space-y-3">
              {/* Google Sheets + Drive */}
              <button
                onClick={() => { setMethod('google'); setStep('configure'); }}
                className={`w-full p-4 rounded-xl border ${borderColor} ${bgHover} transition-all text-left group`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl ${isDark ? 'bg-green-500/20' : 'bg-green-100'} flex items-center justify-center shrink-0`}>
                    <i className={`fab fa-google-drive text-xl ${isDark ? 'text-green-400' : 'text-green-600'}`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className={`${textPrimary} font-medium text-sm sm:text-base`}>Google Sheets + Drive</h4>
                      <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white text-[10px] font-medium">Recomendado</span>
                    </div>
                    <p className={`${textSecondary} text-xs mt-1`}>
                      Importe direto de uma planilha Google com link para imagens no Drive
                    </p>
                    <div className={`${textMuted} text-[10px] mt-2 flex flex-wrap gap-2`}>
                      <span><i className="fas fa-check text-green-500 mr-1"></i>Sincronização automática</span>
                      <span><i className="fas fa-check text-green-500 mr-1"></i>Imagens do Drive</span>
                    </div>
                  </div>
                  <i className={`fas fa-chevron-right ${textMuted} group-hover:translate-x-1 transition-transform`}></i>
                </div>
              </button>

              {/* XML */}
              <button
                onClick={() => { setMethod('xml'); setStep('configure'); }}
                className={`w-full p-4 rounded-xl border ${borderColor} ${bgHover} transition-all text-left group`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl ${isDark ? 'bg-purple-500/20' : 'bg-purple-100'} flex items-center justify-center shrink-0`}>
                    <i className={`fas fa-code text-xl ${isDark ? 'text-purple-400' : 'text-purple-600'}`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`${textPrimary} font-medium text-sm sm:text-base`}>XML Google Shopping</h4>
                    <p className={`${textSecondary} text-xs mt-1`}>
                      Arquivo XML no formato padrão de feed do Google Shopping
                    </p>
                    <div className={`${textMuted} text-[10px] mt-2 flex flex-wrap gap-2`}>
                      <span><i className="fas fa-check text-green-500 mr-1"></i>Feed de e-commerce</span>
                      <span><i className="fas fa-check text-green-500 mr-1"></i>URLs de imagens</span>
                    </div>
                  </div>
                  <i className={`fas fa-chevron-right ${textMuted} group-hover:translate-x-1 transition-transform`}></i>
                </div>
              </button>

              {/* ZIP */}
              <button
                onClick={() => { setMethod('zip'); setStep('configure'); }}
                className={`w-full p-4 rounded-xl border ${borderColor} ${bgHover} transition-all text-left group`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'} flex items-center justify-center shrink-0`}>
                    <i className={`fas fa-file-archive text-xl ${isDark ? 'text-blue-400' : 'text-blue-600'}`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`${textPrimary} font-medium text-sm sm:text-base`}>Arquivo ZIP</h4>
                    <p className={`${textSecondary} text-xs mt-1`}>
                      ZIP contendo CSV/JSON + imagens dos produtos
                    </p>
                    <div className={`${textMuted} text-[10px] mt-2 flex flex-wrap gap-2`}>
                      <span><i className="fas fa-check text-green-500 mr-1"></i>Imagens locais</span>
                      <span><i className="fas fa-check text-green-500 mr-1"></i>Offline</span>
                    </div>
                  </div>
                  <i className={`fas fa-chevron-right ${textMuted} group-hover:translate-x-1 transition-transform`}></i>
                </div>
              </button>
            </div>
          )}

          {/* Step 2: Configure */}
          {step === 'configure' && (
            <div>
              {/* Google Sheets Config */}
              {method === 'google' && (
                <div className="space-y-4">
                  <div>
                    <label className={`${textSecondary} text-xs font-medium mb-2 block`}>
                      <i className="fas fa-table mr-2"></i>URL da Planilha Google Sheets
                    </label>
                    <input
                      type="url"
                      value={spreadsheetUrl}
                      onChange={(e) => setSpreadsheetUrl(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      className={`w-full px-4 py-3 ${bgMuted} ${textPrimary} rounded-xl border ${borderColor} text-sm focus:outline-none focus:ring-2 focus:ring-[#E91E8C]/50`}
                    />
                  </div>

                  <div>
                    <label className={`${textSecondary} text-xs font-medium mb-2 block`}>
                      <i className="fab fa-google-drive mr-2"></i>Pasta do Google Drive (opcional)
                    </label>
                    <input
                      type="url"
                      value={driveFolder}
                      onChange={(e) => setDriveFolder(e.target.value)}
                      placeholder="https://drive.google.com/drive/folders/..."
                      className={`w-full px-4 py-3 ${bgMuted} ${textPrimary} rounded-xl border ${borderColor} text-sm focus:outline-none focus:ring-2 focus:ring-[#E91E8C]/50`}
                    />
                    <p className={`${textMuted} text-[10px] mt-1.5`}>
                      Se as imagens estão em uma pasta do Drive, cole o link aqui
                    </p>
                  </div>

                  {/* Expected format info */}
                  <div className={`${isDark ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-200'} rounded-xl p-4 border`}>
                    <p className={`${isDark ? 'text-green-400' : 'text-green-700'} text-xs font-medium mb-2`}>
                      <i className="fas fa-info-circle mr-2"></i>Formato esperado da planilha:
                    </p>
                    <div className={`${isDark ? 'bg-neutral-900' : 'bg-white'} rounded-lg p-3 overflow-x-auto`}>
                      <table className="text-[10px] w-full">
                        <thead>
                          <tr className={textSecondary}>
                            <th className="text-left pr-3">name</th>
                            <th className="text-left pr-3">brand</th>
                            <th className="text-left pr-3">color</th>
                            <th className="text-left pr-3">category</th>
                            <th className="text-left">image</th>
                          </tr>
                        </thead>
                        <tbody className={textMuted}>
                          <tr>
                            <td className="pr-3">Camiseta Básica</td>
                            <td className="pr-3">Marca X</td>
                            <td className="pr-3">Preto</td>
                            <td className="pr-3">Camisetas</td>
                            <td>produto1.jpg</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                      <p className="text-red-500 text-xs flex items-center gap-2">
                        <i className="fas fa-exclamation-circle"></i>
                        {error}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* XML Config */}
              {method === 'xml' && (
                <div className="space-y-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xml"
                    onChange={handleXmlFile}
                    className="hidden"
                  />

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed ${isDark ? 'border-neutral-700 hover:border-[#E91E8C]/50' : 'border-gray-300 hover:border-[#E91E8C]/50'} rounded-xl p-8 text-center cursor-pointer transition-all ${bgMuted}`}
                  >
                    {xmlFileName ? (
                      <>
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#FF6B6B] to-[#FF9F43] flex items-center justify-center mx-auto mb-3">
                          <i className="fas fa-check text-white text-xl"></i>
                        </div>
                        <p className={`${textPrimary} font-medium text-sm mb-1`}>{xmlFileName}</p>
                        <p className={`${textSecondary} text-xs`}>Clique para trocar o arquivo</p>
                      </>
                    ) : (
                      <>
                        <div className={`w-14 h-14 rounded-full ${isDark ? 'bg-neutral-700' : 'bg-purple-100'} flex items-center justify-center mx-auto mb-3`}>
                          <i className={`fas fa-cloud-upload-alt text-xl ${isDark ? 'text-neutral-400' : 'text-purple-500'}`}></i>
                        </div>
                        <p className={`${textPrimary} font-medium text-sm mb-1`}>Arraste seu arquivo XML aqui</p>
                        <p className={`${textSecondary} text-xs mb-3`}>ou clique para selecionar</p>
                        <span className={`inline-block px-4 py-2 rounded-lg text-xs font-medium ${isDark ? 'bg-neutral-700 text-white' : 'bg-white text-gray-700 border border-gray-200'}`}>
                          Selecionar Arquivo
                        </span>
                      </>
                    )}
                  </div>

                  {/* XML format info */}
                  <details className={`${bgMuted} rounded-xl border ${borderColor}`}>
                    <summary className={`${textSecondary} text-xs cursor-pointer p-3 hover:${textPrimary} transition-colors`}>
                      <i className="fas fa-code mr-2"></i>Ver exemplo de estrutura XML
                    </summary>
                    <pre className={`${isDark ? 'bg-neutral-900 text-neutral-300' : 'bg-gray-100 text-gray-700'} m-3 mt-0 p-3 rounded-lg text-[10px] overflow-x-auto`}>
{`<rss>
  <channel>
    <item>
      <g:id>SKU-001</g:id>
      <g:title>Camiseta Básica</g:title>
      <g:image_link>https://...</g:image_link>
      <g:brand>Marca</g:brand>
      <g:color>Preto</g:color>
      <g:product_type>Camisetas</g:product_type>
    </item>
  </channel>
</rss>`}
                    </pre>
                  </details>

                  {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                      <p className="text-red-500 text-xs flex items-center gap-2">
                        <i className="fas fa-exclamation-circle"></i>
                        {error}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ZIP Config */}
              {method === 'zip' && (
                <div className="space-y-4">
                  <input
                    ref={zipInputRef}
                    type="file"
                    accept=".zip"
                    onChange={handleZipFile}
                    className="hidden"
                  />

                  <div
                    onClick={() => zipInputRef.current?.click()}
                    className={`border-2 border-dashed ${isDark ? 'border-neutral-700 hover:border-[#E91E8C]/50' : 'border-gray-300 hover:border-[#E91E8C]/50'} rounded-xl p-8 text-center cursor-pointer transition-all ${bgMuted}`}
                  >
                    {zipFileName ? (
                      <>
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#FF6B6B] to-[#FF9F43] flex items-center justify-center mx-auto mb-3">
                          <i className="fas fa-check text-white text-xl"></i>
                        </div>
                        <p className={`${textPrimary} font-medium text-sm mb-1`}>{zipFileName}</p>
                        <p className={`${textSecondary} text-xs`}>Clique para trocar o arquivo</p>
                      </>
                    ) : (
                      <>
                        <div className={`w-14 h-14 rounded-full ${isDark ? 'bg-neutral-700' : 'bg-blue-100'} flex items-center justify-center mx-auto mb-3`}>
                          <i className={`fas fa-file-archive text-xl ${isDark ? 'text-neutral-400' : 'text-blue-500'}`}></i>
                        </div>
                        <p className={`${textPrimary} font-medium text-sm mb-1`}>Arraste seu arquivo ZIP aqui</p>
                        <p className={`${textSecondary} text-xs mb-3`}>ou clique para selecionar</p>
                        <span className={`inline-block px-4 py-2 rounded-lg text-xs font-medium ${isDark ? 'bg-neutral-700 text-white' : 'bg-white text-gray-700 border border-gray-200'}`}>
                          Selecionar Arquivo
                        </span>
                      </>
                    )}
                  </div>

                  {/* ZIP format info */}
                  <div className={`${isDark ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-200'} rounded-xl p-4 border`}>
                    <p className={`${isDark ? 'text-blue-400' : 'text-blue-700'} text-xs font-medium mb-2`}>
                      <i className="fas fa-info-circle mr-2"></i>Estrutura esperada do ZIP:
                    </p>
                    <div className={`${isDark ? 'text-blue-300' : 'text-blue-600'} text-[10px] space-y-1 font-mono`}>
                      <p>📁 meus-produtos.zip</p>
                      <p className="ml-4">├── produtos.csv <span className={textMuted}>(ou .json)</span></p>
                      <p className="ml-4">├── produto1.jpg</p>
                      <p className="ml-4">├── produto2.jpg</p>
                      <p className="ml-4">└── ...</p>
                    </div>
                  </div>

                  {/* CSV format example */}
                  <details className={`${bgMuted} rounded-xl border ${borderColor}`}>
                    <summary className={`${textSecondary} text-xs cursor-pointer p-3 hover:${textPrimary} transition-colors`}>
                      <i className="fas fa-file-csv mr-2"></i>Ver exemplo de CSV
                    </summary>
                    <pre className={`${isDark ? 'bg-neutral-900 text-neutral-300' : 'bg-gray-100 text-gray-700'} m-3 mt-0 p-3 rounded-lg text-[10px] overflow-x-auto`}>
{`name,brand,color,category,image
Camiseta Básica,Marca X,Preto,Camisetas,produto1.jpg
Vestido Floral,Marca Y,Rosa,Vestidos,produto2.jpg`}
                    </pre>
                  </details>

                  {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                      <p className="text-red-500 text-xs flex items-center gap-2">
                        <i className="fas fa-exclamation-circle"></i>
                        {error}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              {/* Select all / count */}
              <div className="flex items-center justify-between">
                <button
                  onClick={toggleAll}
                  className={`${textSecondary} text-xs hover:${textPrimary} transition-colors flex items-center gap-2`}
                >
                  <i className={`${parsedProducts.every(p => p.selected) ? 'fas fa-check-square text-[#E91E8C]' : 'far fa-square'}`}></i>
                  Selecionar todos
                </button>
                <span className={`${textMuted} text-xs`}>
                  {selectedCount} de {parsedProducts.length} selecionados
                </span>
              </div>

              {/* Products list */}
              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                {parsedProducts.map((product) => (
                  <div
                    key={product.id}
                    className={`p-3 rounded-xl border ${borderColor} ${product.selected ? (isDark ? 'bg-[#E91E8C]/10 border-[#E91E8C]/30' : 'bg-[#E91E8C]/10 border-[#E91E8C]/20') : bgMuted} transition-all`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleProduct(product.id)}
                        className="mt-1 shrink-0"
                      >
                        <i className={`${product.selected ? 'fas fa-check-square text-[#E91E8C]' : `far fa-square ${textMuted}`} text-lg`}></i>
                      </button>

                      {/* Image preview */}
                      <div className={`w-12 h-12 rounded-lg ${bgMuted} overflow-hidden shrink-0`}>
                        {product.imageBase64 || product.imageUrl ? (
                          <img
                            src={product.imageBase64 || product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '';
                              (e.target as HTMLImageElement).className = 'hidden';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <i className={`fas fa-image ${textMuted} text-sm`}></i>
                          </div>
                        )}
                      </div>

                      {/* Product info */}
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={product.name}
                          onChange={(e) => updateProduct(product.id, 'name', e.target.value)}
                          className={`w-full ${textPrimary} font-medium text-sm bg-transparent border-none p-0 focus:outline-none focus:ring-0`}
                        />
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {product.brand && (
                            <span className={`${textMuted} text-[10px]`}>
                              <i className="fas fa-tag mr-1"></i>{product.brand}
                            </span>
                          )}
                          {product.color && (
                            <span className={`${textMuted} text-[10px]`}>
                              <i className="fas fa-palette mr-1"></i>{product.color}
                            </span>
                          )}
                          <select
                            value={product.category || ''}
                            onChange={(e) => updateProduct(product.id, 'category', e.target.value)}
                            className={`text-[10px] ${textSecondary} bg-transparent border-none p-0 cursor-pointer focus:outline-none`}
                          >
                            <option value="">Selecionar categoria</option>
                            {CATEGORIES.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                  <p className="text-red-500 text-xs flex items-center gap-2">
                    <i className="fas fa-exclamation-circle"></i>
                    {error}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Importing */}
          {step === 'importing' && (
            <div className="py-8 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FF6B6B] to-[#FF9F43] flex items-center justify-center mx-auto mb-4 animate-pulse">
                <i className="fas fa-sync-alt text-white text-2xl animate-spin"></i>
              </div>
              <h4 className={`${textPrimary} font-semibold text-lg mb-2`}>Importando produtos...</h4>
              <p className={`${textSecondary} text-sm mb-4`}>
                {importedCount} de {selectedCount} produtos
              </p>
              <div className={`w-full ${bgMuted} rounded-full h-2 overflow-hidden`}>
                <div
                  className="h-full bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] transition-all duration-300"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
              <p className={`${textMuted} text-xs mt-2`}>{importProgress}%</p>
            </div>
          )}

          {/* Step 5: Done */}
          {step === 'done' && (
            <div className="py-8 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-400 flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-check text-white text-3xl"></i>
              </div>
              <h4 className={`${textPrimary} font-semibold text-lg mb-2`}>Importação concluída!</h4>
              <p className={`${textSecondary} text-sm`}>
                {importedCount} produtos foram adicionados ao seu catálogo
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-4 border-t ${borderColor} flex gap-2 shrink-0`}>
          {step === 'select' && (
            <button
              onClick={handleClose}
              className={`flex-1 py-2.5 rounded-lg font-medium text-sm ${isDark ? 'bg-neutral-700 text-white hover:bg-neutral-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} transition-colors`}
            >
              Cancelar
            </button>
          )}

          {step === 'configure' && (
            <>
              <button
                onClick={() => { setStep('select'); setMethod(null); setError(null); }}
                className={`flex-1 py-2.5 rounded-lg font-medium text-sm ${isDark ? 'bg-neutral-700 text-white hover:bg-neutral-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} transition-colors`}
              >
                <i className="fas fa-arrow-left mr-2"></i>Voltar
              </button>
              {method === 'google' && (
                <button
                  onClick={handleGoogleConnect}
                  disabled={isLoading || !spreadsheetUrl.trim()}
                  className="flex-1 py-2.5 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-lg font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <><i className="fas fa-spinner animate-spin"></i>Conectando...</>
                  ) : (
                    <><i className="fab fa-google"></i>Conectar</>
                  )}
                </button>
              )}
            </>
          )}

          {step === 'preview' && (
            <>
              <button
                onClick={() => { setStep('configure'); setParsedProducts([]); setError(null); }}
                className={`flex-1 py-2.5 rounded-lg font-medium text-sm ${isDark ? 'bg-neutral-700 text-white hover:bg-neutral-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} transition-colors`}
              >
                <i className="fas fa-arrow-left mr-2"></i>Voltar
              </button>
              <button
                onClick={handleImport}
                disabled={selectedCount === 0}
                className="flex-1 py-2.5 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-lg font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <i className="fas fa-upload"></i>
                Importar {selectedCount} {selectedCount === 1 ? 'produto' : 'produtos'}
              </button>
            </>
          )}

          {step === 'done' && (
            <button
              onClick={handleClose}
              className="flex-1 py-2.5 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-lg font-medium text-sm hover:opacity-90 transition-opacity"
            >
              <i className="fas fa-check mr-2"></i>Concluir
            </button>
          )}
        </div>

        {/* Loading overlay */}
        {isLoading && step === 'configure' && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <div className={`${bgCard} rounded-xl p-6 text-center`}>
              <i className="fas fa-spinner animate-spin text-[#E91E8C] text-2xl mb-3"></i>
              <p className={`${textPrimary} text-sm`}>Processando arquivo...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

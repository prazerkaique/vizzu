import JSZip from 'jszip';
import { getProductType, UPLOAD_SLOTS_CONFIG, angleToApiField } from '../../lib/productConfig';
import type { ProductType } from '../../lib/productConfig';
import type { BulkProduct, BulkRawImage, CsvProductData } from './types';

// ── Mapeamento IA type → categoria Vizzu ──────────────────────────
// Extraído de ProductsPage.tsx applyDetectedProduct()
export const AI_TYPE_TO_CATEGORY: Record<string, string> = {
  'Boné': 'Bonés', 'Chapéu': 'Chapéus', 'Tiara': 'Tiaras', 'Lenço': 'Lenços',
  'Camiseta': 'Camisetas', 'Blusa': 'Blusas', 'Regata': 'Regatas', 'Top': 'Tops',
  'Camisa': 'Camisas', 'Body': 'Bodies', 'Jaqueta': 'Jaquetas', 'Casaco': 'Casacos',
  'Blazer': 'Blazers', 'Moletom': 'Moletons', 'Cropped': 'Tops', 'Suéter': 'Moletons',
  'Cardigan': 'Casacos', 'Colete': 'Casacos',
  'Calça': 'Calças', 'Shorts': 'Shorts', 'Bermuda': 'Bermudas', 'Saia': 'Saias',
  'Legging': 'Leggings', 'Short Fitness': 'Shorts Fitness',
  'Vestido': 'Vestidos', 'Macacão': 'Macacões', 'Jardineira': 'Jardineiras',
  'Biquíni': 'Biquínis', 'Maiô': 'Maiôs',
  'Tênis': 'Tênis', 'Sandália': 'Sandálias', 'Bota': 'Botas', 'Sapato': 'Calçados',
  'Chinelo': 'Sandálias', 'Sapatilha': 'Calçados',
  'Bolsa': 'Bolsas', 'Mochila': 'Bolsas', 'Cinto': 'Cintos', 'Relógio': 'Relógios',
  'Óculos': 'Óculos', 'Brinco': 'Bijuterias', 'Colar': 'Bijuterias', 'Pulseira': 'Bijuterias',
  'Anel': 'Bijuterias', 'Bijuteria': 'Bijuterias',
  'Gorro': 'Gorros', 'Viseira': 'Viseiras',
  'Pochete': 'Bolsas', 'Necessaire': 'Bolsas',
};

// ── Todas as categorias agrupadas ─────────────────────────────────
export const ALL_CATEGORIES = [
  'Camisetas', 'Blusas', 'Regatas', 'Tops', 'Camisas', 'Bodies',
  'Jaquetas', 'Casacos', 'Blazers', 'Moletons', 'Calças', 'Shorts',
  'Bermudas', 'Saias', 'Leggings', 'Vestidos', 'Macacões', 'Jardineiras',
  'Biquínis', 'Maiôs', 'Shorts Fitness',
  'Calçados', 'Tênis', 'Sandálias', 'Botas', 'Sapatos', 'Chinelos',
  'Bonés', 'Chapéus', 'Gorros', 'Viseiras',
  'Bolsas', 'Mochilas', 'Pochetes', 'Necessaires',
  'Óculos', 'Bijuterias', 'Relógios', 'Cintos', 'Acessórios', 'Tiaras', 'Lenços', 'Outros Acessórios',
];

// ── Normalização de texto ─────────────────────────────────────────
export function normalizeText(text: string): string {
  return text.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// ── Extensões de imagem aceitas ───────────────────────────────────
const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|heic|heif|avif)$/i;

function isImageFile(filename: string): boolean {
  return IMAGE_EXTENSIONS.test(filename);
}

// ── Parser de ZIP com subpastas ───────────────────────────────────
export interface ParseZipResult {
  products: BulkProduct[];
  csvData: Map<string, CsvProductData> | null;
  warnings: string[];
}

export async function parseZipFolders(file: File): Promise<ParseZipResult> {
  const zip = await JSZip.loadAsync(file);
  const warnings: string[] = [];

  // Agrupar arquivos por pasta
  const folderMap = new Map<string, { path: string; zipEntry: JSZip.JSZipObject }[]>();
  let csvContent: string | null = null;

  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;

    // Ignorar __MACOSX e arquivos ocultos
    if (path.startsWith('__MACOSX') || path.includes('/._') || path.startsWith('.')) continue;

    // Verificar se é o dados.csv na raiz
    const parts = path.split('/');
    const filename = parts[parts.length - 1];

    if (filename.toLowerCase() === 'dados.csv' && parts.length <= 2) {
      csvContent = await entry.async('string');
      continue;
    }

    if (!isImageFile(filename)) continue;

    // Determinar pasta: se tem subpasta, usar nome da subpasta; senão, agrupar por nome
    let folderName: string;
    if (parts.length >= 2) {
      // Tem subpasta: ex "Camiseta Polo/foto1.jpg" → pasta = "Camiseta Polo"
      // Suporta ZIP com pasta raiz: ex "meus-produtos/Camiseta Polo/foto1.jpg" → pasta = "Camiseta Polo"
      folderName = parts.length === 2 ? parts[0] : parts[parts.length - 2];
    } else {
      // Arquivo na raiz: agrupar por pattern de nome
      folderName = '__root__';
    }

    if (!folderMap.has(folderName)) {
      folderMap.set(folderName, []);
    }
    folderMap.get(folderName)!.push({ path, zipEntry: entry });
  }

  // Se todos os arquivos estão na raiz, tentar agrupar por pattern de nome
  if (folderMap.size === 1 && folderMap.has('__root__')) {
    const rootFiles = folderMap.get('__root__')!;
    const grouped = detectNamePattern(rootFiles.map(f => ({ path: f.path, filename: f.path.split('/').pop()! })));

    if (grouped.size > 0) {
      folderMap.delete('__root__');
      for (const [groupName, filenames] of grouped) {
        const entries = rootFiles.filter(f => filenames.includes(f.path.split('/').pop()!));
        folderMap.set(groupName, entries);
      }
    } else {
      warnings.push('ZIP sem subpastas e sem padrão de nomes detectável. Cada imagem será tratada como um produto separado.');
      // Cada arquivo = um produto
      folderMap.delete('__root__');
      for (const f of rootFiles) {
        const name = f.path.split('/').pop()!.replace(/\.[^.]+$/, '');
        folderMap.set(name, [f]);
      }
    }
  }

  // Converter cada pasta em BulkProduct
  const products: BulkProduct[] = [];
  let idx = 0;

  for (const [folderName, files] of folderMap) {
    // Ordenar arquivos por nome para ordem consistente
    files.sort((a, b) => a.path.localeCompare(b.path));

    const rawImages: BulkRawImage[] = [];
    for (const f of files) {
      try {
        const data = await f.zipEntry.async('base64');
        const ext = f.path.split('.').pop()?.toLowerCase() || 'jpg';
        const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
        rawImages.push({
          filename: f.path.split('/').pop()!,
          base64: `data:${mimeType};base64,${data}`,
        });
      } catch {
        warnings.push(`Falha ao ler: ${f.path}`);
      }
    }

    if (rawImages.length === 0) continue;

    // Atribuir ângulos (default: clothing até a IA detectar)
    const angleAssignment = assignAngles(rawImages, 'clothing');

    products.push({
      id: `bulk-${idx++}`,
      folderName,
      name: folderName,
      rawImages,
      angleAssignment,
      aiAnalyzed: false,
      selected: true,
    });
  }

  // Parsear CSV se existir
  const csvData = csvContent ? parseDadosCsv(csvContent) : null;

  // Match CSV → produtos
  if (csvData) {
    matchCsvToProducts(products, csvData);
  }

  return { products, csvData, warnings };
}

// ── Detecção de padrão de nomes ───────────────────────────────────
// Ex: "camiseta_1.jpg", "camiseta_2.jpg" → grupo "camiseta"
function detectNamePattern(files: { path: string; filename: string }[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();

  // Tentar pattern: nome_numero.ext ou nome-numero.ext ou nome numero.ext
  const pattern = /^(.+?)[_\- ](\d+)\.[^.]+$/;

  for (const f of files) {
    const match = f.filename.match(pattern);
    if (match) {
      const groupName = match[1].trim();
      if (!groups.has(groupName)) groups.set(groupName, []);
      groups.get(groupName)!.push(f.filename);
    }
  }

  // Só aceitar se pelo menos metade dos arquivos seguem o pattern
  const totalGrouped = Array.from(groups.values()).reduce((sum, g) => sum + g.length, 0);
  if (totalGrouped < files.length * 0.5) {
    return new Map();
  }

  // Ordenar arquivos dentro de cada grupo pelo número
  for (const [, filenames] of groups) {
    filenames.sort((a, b) => {
      const numA = parseInt(a.match(/(\d+)\.[^.]+$/)?.[1] || '0');
      const numB = parseInt(b.match(/(\d+)\.[^.]+$/)?.[1] || '0');
      return numA - numB;
    });
  }

  return groups;
}

// ── Parser do dados.csv ───────────────────────────────────────────
export function parseDadosCsv(csvContent: string): Map<string, CsvProductData> {
  const map = new Map<string, CsvProductData>();
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) return map;

  const headerRaw = lines[0].split(/[,;]/).map(h => normalizeText(h));

  // Detectar índices das colunas
  const nameIdx = headerRaw.findIndex(h => ['nome', 'name', 'produto', 'product'].includes(h));
  const priceIdx = headerRaw.findIndex(h => ['preco', 'price', 'valor'].includes(h));
  const brandIdx = headerRaw.findIndex(h => ['marca', 'brand'].includes(h));
  const skuIdx = headerRaw.findIndex(h => ['sku', 'codigo', 'code', 'ref', 'referencia'].includes(h));
  const colorIdx = headerRaw.findIndex(h => ['cor', 'color', 'colour'].includes(h));

  if (nameIdx === -1) return map; // Sem coluna de nome = inválido

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(/[,;]/);
    const name = cols[nameIdx]?.trim();
    if (!name) continue;

    const data: CsvProductData = { name };
    if (priceIdx >= 0 && cols[priceIdx]) {
      const priceStr = cols[priceIdx].trim().replace(',', '.');
      const price = parseFloat(priceStr);
      if (!isNaN(price)) data.price = price;
    }
    if (brandIdx >= 0 && cols[brandIdx]?.trim()) data.brand = cols[brandIdx].trim();
    if (skuIdx >= 0 && cols[skuIdx]?.trim()) data.sku = cols[skuIdx].trim();
    if (colorIdx >= 0 && cols[colorIdx]?.trim()) data.color = cols[colorIdx].trim();

    map.set(normalizeText(name), data);
  }

  return map;
}

// ── Match CSV → produtos por nome normalizado ────────────────────
function matchCsvToProducts(products: BulkProduct[], csvData: Map<string, CsvProductData>): void {
  for (const product of products) {
    const normalized = normalizeText(product.folderName);
    const csvRow = csvData.get(normalized);
    if (csvRow) {
      if (csvRow.price !== undefined) product.price = csvRow.price;
      if (csvRow.brand) product.brand = csvRow.brand;
      if (csvRow.sku) product.sku = csvRow.sku;
      if (csvRow.color) product.color = csvRow.color;
    }
  }
}

// ── Atribuição de ângulos por tipo de produto ─────────────────────
export function assignAngles(rawImages: BulkRawImage[], productType: ProductType): Record<string, number> {
  const slots = UPLOAD_SLOTS_CONFIG[productType];
  const assignment: Record<string, number> = {};

  for (let i = 0; i < Math.min(rawImages.length, slots.length); i++) {
    assignment[slots[i].angle] = i;
  }

  return assignment;
}

// ── Montar payload para /vizzu/produto-importar ───────────────────
export function buildImportPayload(product: BulkProduct, userId: string): Record<string, any> {
  const body: Record<string, any> = {
    user_id: userId,
    name: product.name,
    brand: product.brand || null,
    color: product.color || null,
    category: product.category || null,
    description: null,
    sku: product.sku || null,
    price: product.price || null,
    fit: product.fit || null,
    material: product.material || null,
  };

  // Adicionar imagens por ângulo
  for (const [angle, imageIndex] of Object.entries(product.angleAssignment)) {
    const img = product.rawImages[imageIndex];
    if (img) {
      body[angleToApiField(angle)] = img.base64;
    }
  }

  return body;
}

// ── Delay helper ──────────────────────────────────────────────────
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Formatar tempo restante ───────────────────────────────────────
export function formatTimeRemaining(seconds: number): string {
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const min = Math.floor(seconds / 60);
  const sec = Math.ceil(seconds % 60);
  return sec > 0 ? `${min}min ${sec}s` : `${min}min`;
}

// ── Template CSV para download ────────────────────────────────────
export function downloadTemplateCsv(): void {
  const csv = `nome;preco;marca;sku;cor
Camiseta Polo;89.90;Nike;POLO-001;Branco
Bermuda Jeans;129.90;Levis;;Azul
Tênis Runner;299.90;Adidas;RUN-42;Preto`;

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'dados-modelo.csv';
  a.click();
  URL.revokeObjectURL(url);
}

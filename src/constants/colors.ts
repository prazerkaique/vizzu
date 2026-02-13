// ═══════════════════════════════════════════════════════════════
// VIZZU — Constantes de cor centralizadas
// Usado pelo Colorize, ProductsPage, ProductStudio, etc.
// ═══════════════════════════════════════════════════════════════

export interface ColorSwatch {
  name: string;
  hex: string;
  family: string;
}

export interface ColorFamily {
  id: string;
  label: string;
  icon: string;
  colors: ColorSwatch[];
}

export const COLOR_FAMILIES: ColorFamily[] = [
  {
    id: 'neutros', label: 'Neutros', icon: 'fa-circle-half-stroke',
    colors: [
      { name: 'Preto', hex: '#1A1A1A', family: 'neutros' },
      { name: 'Branco', hex: '#FFFFFF', family: 'neutros' },
      { name: 'Cinza', hex: '#808080', family: 'neutros' },
      { name: 'Cinza Claro', hex: '#C0C0C0', family: 'neutros' },
      { name: 'Cinza Escuro', hex: '#404040', family: 'neutros' },
      { name: 'Chumbo', hex: '#36454F', family: 'neutros' },
      { name: 'Prata', hex: '#C0C0C0', family: 'neutros' },
    ],
  },
  {
    id: 'azuis', label: 'Azuis', icon: 'fa-droplet',
    colors: [
      { name: 'Azul', hex: '#2563EB', family: 'azuis' },
      { name: 'Azul Marinho', hex: '#001F5B', family: 'azuis' },
      { name: 'Azul Royal', hex: '#4169E1', family: 'azuis' },
      { name: 'Azul Claro', hex: '#87CEEB', family: 'azuis' },
      { name: 'Azul Bebê', hex: '#89CFF0', family: 'azuis' },
      { name: 'Azul Petróleo', hex: '#006D6F', family: 'azuis' },
      { name: 'Azul Turquesa', hex: '#40E0D0', family: 'azuis' },
      { name: 'Índigo', hex: '#4B0082', family: 'azuis' },
    ],
  },
  {
    id: 'vermelhos', label: 'Vermelhos', icon: 'fa-fire',
    colors: [
      { name: 'Vermelho', hex: '#DC2626', family: 'vermelhos' },
      { name: 'Vermelho Escuro', hex: '#8B0000', family: 'vermelhos' },
      { name: 'Bordô', hex: '#800020', family: 'vermelhos' },
      { name: 'Vinho', hex: '#722F37', family: 'vermelhos' },
      { name: 'Carmim', hex: '#960018', family: 'vermelhos' },
      { name: 'Terracota', hex: '#E2725B', family: 'vermelhos' },
    ],
  },
  {
    id: 'verdes', label: 'Verdes', icon: 'fa-leaf',
    colors: [
      { name: 'Verde', hex: '#16A34A', family: 'verdes' },
      { name: 'Verde Escuro', hex: '#006400', family: 'verdes' },
      { name: 'Verde Militar', hex: '#4B5320', family: 'verdes' },
      { name: 'Verde Musgo', hex: '#8A9A5B', family: 'verdes' },
      { name: 'Verde Menta', hex: '#98FB98', family: 'verdes' },
      { name: 'Verde Água', hex: '#7FFFD4', family: 'verdes' },
      { name: 'Verde Oliva', hex: '#808000', family: 'verdes' },
      { name: 'Verde Limão', hex: '#32CD32', family: 'verdes' },
      { name: 'Esmeralda', hex: '#50C878', family: 'verdes' },
    ],
  },
  {
    id: 'quentes', label: 'Quentes', icon: 'fa-sun',
    colors: [
      { name: 'Amarelo', hex: '#EAB308', family: 'quentes' },
      { name: 'Amarelo Ouro', hex: '#DAA520', family: 'quentes' },
      { name: 'Mostarda', hex: '#FFDB58', family: 'quentes' },
      { name: 'Dourado', hex: '#FFD700', family: 'quentes' },
      { name: 'Laranja', hex: '#F97316', family: 'quentes' },
      { name: 'Laranja Escuro', hex: '#FF8C00', family: 'quentes' },
      { name: 'Pêssego', hex: '#FFDAB9', family: 'quentes' },
    ],
  },
  {
    id: 'rosas', label: 'Rosas', icon: 'fa-heart',
    colors: [
      { name: 'Rosa', hex: '#F472B6', family: 'rosas' },
      { name: 'Rosa Claro', hex: '#FFB6C1', family: 'rosas' },
      { name: 'Rosa Pink', hex: '#FF69B4', family: 'rosas' },
      { name: 'Rosa Chá', hex: '#DDC4A8', family: 'rosas' },
      { name: 'Magenta', hex: '#FF00FF', family: 'rosas' },
      { name: 'Fúcsia', hex: '#E040A0', family: 'rosas' },
      { name: 'Rosê', hex: '#BC8F8F', family: 'rosas' },
      { name: 'Salmão', hex: '#FA8072', family: 'rosas' },
      { name: 'Coral', hex: '#FF7F50', family: 'rosas' },
    ],
  },
  {
    id: 'roxos', label: 'Roxos', icon: 'fa-gem',
    colors: [
      { name: 'Roxo', hex: '#7C3AED', family: 'roxos' },
      { name: 'Lilás', hex: '#C8A2C8', family: 'roxos' },
      { name: 'Lavanda', hex: '#E6E6FA', family: 'roxos' },
      { name: 'Violeta', hex: '#EE82EE', family: 'roxos' },
      { name: 'Púrpura', hex: '#9B30FF', family: 'roxos' },
      { name: 'Berinjela', hex: '#614051', family: 'roxos' },
    ],
  },
  {
    id: 'terrosos', label: 'Terrosos', icon: 'fa-mug-saucer',
    colors: [
      { name: 'Marrom', hex: '#8B4513', family: 'terrosos' },
      { name: 'Caramelo', hex: '#FFD59A', family: 'terrosos' },
      { name: 'Café', hex: '#6F4E37', family: 'terrosos' },
      { name: 'Chocolate', hex: '#7B3F00', family: 'terrosos' },
      { name: 'Ferrugem', hex: '#B7410E', family: 'terrosos' },
      { name: 'Tabaco', hex: '#71573B', family: 'terrosos' },
      { name: 'Areia', hex: '#C2B280', family: 'terrosos' },
      { name: 'Nude', hex: '#F2D2BD', family: 'terrosos' },
      { name: 'Bege', hex: '#F5F5DC', family: 'terrosos' },
      { name: 'Creme', hex: '#FFFDD0', family: 'terrosos' },
      { name: 'Off-White', hex: '#FAF9F6', family: 'terrosos' },
      { name: 'Marfim', hex: '#FFFFF0', family: 'terrosos' },
    ],
  },
  {
    id: 'jeans', label: 'Jeans', icon: 'fa-vest',
    colors: [
      { name: 'Jeans Claro', hex: '#A4C8E1', family: 'jeans' },
      { name: 'Jeans Médio', hex: '#6E8B9E', family: 'jeans' },
      { name: 'Jeans Escuro', hex: '#2C3E50', family: 'jeans' },
      { name: 'Jeans Black', hex: '#1A1A2E', family: 'jeans' },
    ],
  },
];

// Padrões/estampas — mantidos para filtros de produto (não usados no Colorize)
export const PATTERNS = [
  'Estampado', 'Tie-Dye', 'Xadrez', 'Listrado', 'Floral', 'Animal Print', 'Camuflado', 'Multicolor',
];

// Array flat de todos os nomes de cor (compatibilidade com COLORS existente)
export const ALL_COLOR_NAMES = [
  ...COLOR_FAMILIES.flatMap(f => f.colors.map(c => c.name)),
  ...PATTERNS,
];

// Lookup rápido nome → hex
export const COLOR_HEX_MAP: Record<string, string> = Object.fromEntries(
  COLOR_FAMILIES.flatMap(f => f.colors.map(c => [c.name, c.hex]))
);

// Cores que precisam borda visual (muito claras no fundo branco)
export const LIGHT_COLORS = new Set([
  'Branco', 'Off-White', 'Marfim', 'Creme', 'Lavanda', 'Rosa Claro',
  'Verde Menta', 'Azul Bebê', 'Pêssego', 'Bege',
]);

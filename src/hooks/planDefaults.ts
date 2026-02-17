// ═══════════════════════════════════════════════════════════════
// PLAN DEFAULTS (fallback quando Supabase não responde)
// ═══════════════════════════════════════════════════════════════

export interface Plan {
  id: string;
  name: string;
  limit: number;
  productLimit: number;
  priceMonthly: number;
  priceYearly: number;
  creditPrice: number;
  maxResolution: '2k' | '4k';
  hasWatermark: boolean;
  badge?: string;
  badgeColor?: string;
  features: string[];
  highlight?: boolean;
}

export const FREE_PLAN: Plan = {
  id: 'free',
  name: 'Trial',
  limit: 5,
  productLimit: 50,
  priceMonthly: 0,
  priceYearly: 0,
  creditPrice: 0,
  maxResolution: '2k',
  hasWatermark: true,
  features: [
    '5 gerações para testar (uso único)',
    'Até 50 produtos',
    'Resolução 2K',
    'Marca d\'água nas imagens',
    'Não renova mensalmente',
    'Todas as ferramentas básicas'
  ]
};

export const PLANS: Plan[] = [
  {
    id: 'basic',
    name: 'Basic',
    limit: 40,
    productLimit: 5000,
    priceMonthly: 127,
    priceYearly: 107,
    creditPrice: 3.50,
    maxResolution: '2k',
    hasWatermark: false,
    features: [
      '40 gerações/mês',
      'Até 5.000 produtos',
      'Resolução 2K',
      'Vizzu Product Studio',
      'Vizzu Provador',
      'Look Composer',
      'Fundo de Estúdio',
      'Cenário Criativo',
      'Modelo IA sob medida',
      'Dashboard',
      'Fotos para Reels e Stories',
      'Gerador de Legendas IA',
      'Catálogo Virtual + WhatsApp',
      'Atendente Receptivo WhatsApp',
      'Suporte por Email'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    limit: 100,
    productLimit: 10000,
    priceMonthly: 187,
    priceYearly: 157,
    creditPrice: 3.00,
    maxResolution: '4k',
    hasWatermark: false,
    badge: 'MAIS POPULAR',
    badgeColor: 'fuchsia',
    features: [
      '100 gerações/mês',
      'Até 10.000 produtos',
      'Resolução 2K + 4K',
      'Tudo do Basic, mais:',
      'Geração em 4K',
      'Geração de Vídeos Instagram',
      'Agente Ativo WhatsApp',
      '4K consome 2 créditos'
    ],
    highlight: true
  },
  {
    id: 'premier',
    name: 'Premier',
    limit: 200,
    productLimit: 50000,
    priceMonthly: 327,
    priceYearly: 267,
    creditPrice: 2.50,
    maxResolution: '4k',
    hasWatermark: false,
    badge: 'MELHOR VALOR',
    badgeColor: 'amber',
    features: [
      '200 gerações/mês',
      'Até 50.000 produtos',
      'Resolução 2K + 4K',
      'Tudo do Pro, mais:',
      'Integração E-commerce',
      'Suporte Prioritário'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    limit: -1,
    productLimit: -1,
    priceMonthly: 0,
    priceYearly: 0,
    creditPrice: 0,
    maxResolution: '4k',
    hasWatermark: false,
    badge: 'ENTERPRISE',
    badgeColor: 'purple',
    features: [
      'Gerações sob consulta',
      'Produtos ilimitados',
      'Resolução 2K + 4K',
      'Tudo do Premier, mais:',
      'API Dedicada',
      'Account Manager',
      'Suporte VIP'
    ]
  }
];

// Plano interno para testes — acesso total, sem Stripe, sem renovação
export const TEST_PLAN: Plan = {
  id: 'test',
  name: 'Test',
  limit: 9999,
  productLimit: -1,
  priceMonthly: 0,
  priceYearly: 0,
  creditPrice: 0,
  maxResolution: '4k',
  hasWatermark: false,
  features: [
    'Acesso total (interno)',
    'Produtos ilimitados',
    'Resolução 2K + 4K',
    'Sem marca d\'água',
    'Sem renovação automática',
  ]
};

export const CREDIT_PACKAGES = [10, 25, 50, 100];

export const DEFAULT_MASTER_FEATURES = [
  'Vizzu Product Studio®',
  'Vizzu Look Composer®',
  'Vizzu Still Criativo®',
  'Vizzu Provador®',
  'Geração de Imagens em 2K e 4K',
  'Modelos IA personalizados',
  'Agente WhatsApp',
  'Imagens sem marca d\'água',
  'Integração e-commerce',
  'Suporte prioritário',
  'Produtos ilimitados',
  'API dedicada',
];

export const DEFAULT_PLAN_PERSONA: Record<string, string> = {
  free: 'Teste grátis, sem compromisso',
  basic: 'Para quem está começando',
  pro: 'Para criadores e freelancers',
  premier: 'Para equipes de marketing',
  enterprise: 'Para operações de alto volume',
  test: 'Plano interno para testes',
};

export const DEFAULT_PLAN_CTA: Record<string, string> = {
  free: 'Testar grátis',
  basic: 'Começar agora',
  pro: 'Escolher Pro',
  premier: 'Desbloquear Premier',
  enterprise: 'Falar com especialista',
  test: '',
};

export const DEFAULT_PLAN_INCLUDED: Record<string, string[]> = {
  free: ['Vizzu Product Studio®', 'Vizzu Look Composer®', 'Vizzu Still Criativo®'],
  basic: ['Vizzu Product Studio®', 'Vizzu Look Composer®', 'Vizzu Still Criativo®', 'Vizzu Provador®', 'Agente WhatsApp', 'Imagens sem marca d\'água'],
  pro: ['Vizzu Product Studio®', 'Vizzu Look Composer®', 'Vizzu Still Criativo®', 'Vizzu Provador®', 'Geração de Imagens em 2K e 4K', 'Modelos IA personalizados', 'Agente WhatsApp', 'Imagens sem marca d\'água'],
  premier: ['Vizzu Product Studio®', 'Vizzu Look Composer®', 'Vizzu Still Criativo®', 'Vizzu Provador®', 'Geração de Imagens em 2K e 4K', 'Modelos IA personalizados', 'Agente WhatsApp', 'Imagens sem marca d\'água', 'Integração e-commerce', 'Suporte prioritário'],
  enterprise: ['Vizzu Product Studio®', 'Vizzu Look Composer®', 'Vizzu Still Criativo®', 'Vizzu Provador®', 'Geração de Imagens em 2K e 4K', 'Modelos IA personalizados', 'Agente WhatsApp', 'Imagens sem marca d\'água', 'Integração e-commerce', 'Suporte prioritário', 'Produtos ilimitados', 'API dedicada'],
  test: ['Vizzu Product Studio®', 'Vizzu Look Composer®', 'Vizzu Still Criativo®', 'Vizzu Provador®', 'Geração de Imagens em 2K e 4K', 'Modelos IA personalizados', 'Agente WhatsApp', 'Imagens sem marca d\'água', 'Integração e-commerce', 'Suporte prioritário', 'Produtos ilimitados'],
};

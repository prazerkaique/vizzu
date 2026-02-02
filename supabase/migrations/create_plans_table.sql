-- ═══════════════════════════════════════════════════════════════
-- VIZZU - TABELA DE PLANOS
-- ═══════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS public.plans CASCADE;

CREATE TABLE public.plans (
  id                      TEXT PRIMARY KEY,
  name                    TEXT NOT NULL,
  generation_limit        INTEGER NOT NULL DEFAULT 0,
  product_limit           INTEGER NOT NULL DEFAULT 0,
  price_monthly           NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_yearly            NUMERIC(10,2) NOT NULL DEFAULT 0,
  credit_price            NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_resolution          TEXT NOT NULL DEFAULT '2k' CHECK (max_resolution IN ('2k', '4k')),
  has_watermark           BOOLEAN NOT NULL DEFAULT false,
  badge                   TEXT,
  badge_color             TEXT,
  features                JSONB NOT NULL DEFAULT '[]'::jsonb,
  highlight               BOOLEAN NOT NULL DEFAULT false,
  persona                 TEXT,
  cta_label               TEXT,
  included_features       JSONB NOT NULL DEFAULT '[]'::jsonb,
  stripe_product_id       TEXT,
  stripe_price_monthly_id TEXT,
  stripe_price_yearly_id  TEXT,
  sort_order              INTEGER NOT NULL DEFAULT 0,
  active                  BOOLEAN NOT NULL DEFAULT true,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plans are publicly readable" ON public.plans FOR SELECT USING (true);

CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- APP CONFIG
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.app_config (
  key   TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "App config is publicly readable" ON public.app_config FOR SELECT USING (true);

-- ═══════════════════════════════════════════════════════════════
-- SEED PLANOS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO public.plans (id, name, generation_limit, product_limit, price_monthly, price_yearly, credit_price, max_resolution, has_watermark, badge, badge_color, features, highlight, persona, cta_label, included_features, sort_order) VALUES ('free', 'Trial', 5, 50, 0, 0, 0, '2k', true, NULL, NULL, '["5 gera\u00e7\u00f5es para testar (uso \u00fanico)","At\u00e9 50 produtos","Resolu\u00e7\u00e3o 2K","Marca d\u0027\u00e1gua nas imagens","N\u00e3o renova mensalmente","Todas as ferramentas b\u00e1sicas"]', false, 'Teste grátis, sem compromisso', 'Testar grátis', '["Vizzu Product Studio\u00ae","Vizzu Look Composer\u00ae","Vizzu Still Criativo\u00ae"]', 0);

INSERT INTO public.plans (id, name, generation_limit, product_limit, price_monthly, price_yearly, credit_price, max_resolution, has_watermark, badge, badge_color, features, highlight, persona, cta_label, included_features, sort_order) VALUES ('basic', 'Basic', 40, 5000, 127, 107, 3.50, '2k', false, NULL, NULL, '["40 gera\u00e7\u00f5es/m\u00eas","At\u00e9 5.000 produtos","Resolu\u00e7\u00e3o 2K","Vizzu Product Studio","Vizzu Provador","Look Composer","Fundo de Est\u00fadio","Cen\u00e1rio Criativo","Modelo IA sob medida","Dashboard","Fotos para Reels e Stories","Gerador de Legendas IA","Cat\u00e1logo Virtual + WhatsApp","Atendente Receptivo WhatsApp","Suporte por Email"]', false, 'Para quem está começando', 'Começar agora', '["Vizzu Product Studio\u00ae","Vizzu Look Composer\u00ae","Vizzu Still Criativo\u00ae","Vizzu Provador\u00ae","Agente WhatsApp","Imagens sem marca d\u0027\u00e1gua"]', 1);

INSERT INTO public.plans (id, name, generation_limit, product_limit, price_monthly, price_yearly, credit_price, max_resolution, has_watermark, badge, badge_color, features, highlight, persona, cta_label, included_features, sort_order) VALUES ('pro', 'Pro', 100, 10000, 187, 157, 3.00, '4k', false, 'MAIS POPULAR', 'fuchsia', '["100 gera\u00e7\u00f5es/m\u00eas","At\u00e9 10.000 produtos","Resolu\u00e7\u00e3o 2K + 4K","Tudo do Basic, mais:","Gera\u00e7\u00e3o em 4K","Gera\u00e7\u00e3o de V\u00eddeos Instagram","Agente Ativo WhatsApp","4K consome 2 cr\u00e9ditos"]', true, 'Para criadores e freelancers', 'Escolher Pro', '["Vizzu Product Studio\u00ae","Vizzu Look Composer\u00ae","Vizzu Still Criativo\u00ae","Vizzu Provador\u00ae","Gera\u00e7\u00e3o de Imagens em 2K e 4K","Modelos IA personalizados","Agente WhatsApp","Imagens sem marca d\u0027\u00e1gua"]', 2);

INSERT INTO public.plans (id, name, generation_limit, product_limit, price_monthly, price_yearly, credit_price, max_resolution, has_watermark, badge, badge_color, features, highlight, persona, cta_label, included_features, sort_order) VALUES ('premier', 'Premier', 200, 50000, 327, 267, 2.50, '4k', false, 'MELHOR VALOR', 'amber', '["200 gera\u00e7\u00f5es/m\u00eas","At\u00e9 50.000 produtos","Resolu\u00e7\u00e3o 2K + 4K","Tudo do Pro, mais:","Integra\u00e7\u00e3o E-commerce","Suporte Priorit\u00e1rio"]', false, 'Para equipes de marketing', 'Desbloquear Premier', '["Vizzu Product Studio\u00ae","Vizzu Look Composer\u00ae","Vizzu Still Criativo\u00ae","Vizzu Provador\u00ae","Gera\u00e7\u00e3o de Imagens em 2K e 4K","Modelos IA personalizados","Agente WhatsApp","Imagens sem marca d\u0027\u00e1gua","Integra\u00e7\u00e3o e-commerce","Suporte priorit\u00e1rio"]', 3);

INSERT INTO public.plans (id, name, generation_limit, product_limit, price_monthly, price_yearly, credit_price, max_resolution, has_watermark, badge, badge_color, features, highlight, persona, cta_label, included_features, sort_order) VALUES ('enterprise', 'Enterprise', 400, -1, 677, 547, 2.00, '4k', false, 'ENTERPRISE', 'purple', '["400 gera\u00e7\u00f5es/m\u00eas","Produtos ilimitados","Resolu\u00e7\u00e3o 2K + 4K","Tudo do Premier, mais:","API Dedicada","Account Manager","Suporte VIP"]', false, 'Para operações de alto volume', 'Falar com especialista', '["Vizzu Product Studio\u00ae","Vizzu Look Composer\u00ae","Vizzu Still Criativo\u00ae","Vizzu Provador\u00ae","Gera\u00e7\u00e3o de Imagens em 2K e 4K","Modelos IA personalizados","Agente WhatsApp","Imagens sem marca d\u0027\u00e1gua","Integra\u00e7\u00e3o e-commerce","Suporte priorit\u00e1rio","Produtos ilimitados","API dedicada"]', 4);

-- ═══════════════════════════════════════════════════════════════
-- SEED MASTER FEATURES
-- ═══════════════════════════════════════════════════════════════

INSERT INTO public.app_config (key, value) VALUES ('master_features', '["Vizzu Product Studio\u00ae","Vizzu Look Composer\u00ae","Vizzu Still Criativo\u00ae","Vizzu Provador\u00ae","Gera\u00e7\u00e3o de Imagens em 2K e 4K","Modelos IA personalizados","Agente WhatsApp","Imagens sem marca d\u0027\u00e1gua","Integra\u00e7\u00e3o e-commerce","Suporte priorit\u00e1rio","Produtos ilimitados","API dedicada"]');

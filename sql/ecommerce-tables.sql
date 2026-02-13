-- ============================================================
-- Vizzu — Tabelas de Integração E-commerce + Session Shopify
-- Rodar no Supabase SQL Editor
-- Data: 2026-02-13
-- ============================================================

-- ============================================================
-- 0. Session (Prisma — gerenciada pelo Shopify SDK)
-- Armazena sessões OAuth do Shopify
-- ============================================================

CREATE TABLE IF NOT EXISTS "Session" (
  "id" TEXT PRIMARY KEY,
  "shop" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "isOnline" BOOLEAN NOT NULL DEFAULT false,
  "scope" TEXT,
  "expires" TIMESTAMPTZ,
  "accessToken" TEXT NOT NULL,
  "userId" BIGINT,
  "firstName" TEXT,
  "lastName" TEXT,
  "email" TEXT,
  "accountOwner" BOOLEAN,
  "locale" TEXT,
  "collaborator" BOOLEAN,
  "emailVerified" BOOLEAN,
  "refreshToken" TEXT,
  "refreshTokenExpires" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "Session_shop_idx" ON "Session"("shop");

-- ============================================================
-- 1. ecommerce_connections
-- Conexões com plataformas de e-commerce (Shopify, Magento, VTEX...)
-- ============================================================

CREATE TABLE ecommerce_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  platform TEXT NOT NULL,                    -- 'shopify' | 'magento' | 'vtex'

  -- Identificação da loja
  store_domain TEXT NOT NULL,                -- "minha-loja.myshopify.com"
  store_name TEXT,                           -- Nome amigável da loja

  -- Autenticação (criptografado no gateway)
  access_token_encrypted TEXT NOT NULL,      -- AES-256-GCM
  scopes TEXT NOT NULL,                      -- "read_products,write_products,write_files,read_files"

  -- Configurações
  auto_sync BOOLEAN DEFAULT false,           -- Sync automático via webhooks?
  sync_frequency TEXT DEFAULT 'realtime',    -- 'realtime' | 'hourly' | 'daily'

  -- Status
  status TEXT DEFAULT 'active'
    CHECK (status IN ('active', 'uninstalled', 'error', 'pending')),
  installed_at TIMESTAMPTZ DEFAULT now(),
  uninstalled_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,

  -- Metadata flexível por plataforma
  metadata JSONB DEFAULT '{}',               -- { "shopify_app_id": "xxx", "api_version": "2026-01" }

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(platform, store_domain)
);

-- Índices
CREATE INDEX idx_ecomm_conn_user ON ecommerce_connections(user_id);
CREATE INDEX idx_ecomm_conn_platform ON ecommerce_connections(platform);
CREATE INDEX idx_ecomm_conn_status ON ecommerce_connections(status);

-- RLS
ALTER TABLE ecommerce_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own connections"
  ON ecommerce_connections FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own connections"
  ON ecommerce_connections FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own connections"
  ON ecommerce_connections FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users delete own connections"
  ON ecommerce_connections FOR DELETE
  USING (user_id = auth.uid());

-- Trigger updated_at
CREATE TRIGGER update_ecommerce_connections_updated_at
  BEFORE UPDATE ON ecommerce_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 2. ecommerce_product_map
-- Mapeamento: produto externo ↔ produto Vizzu
-- ============================================================

CREATE TABLE ecommerce_product_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES ecommerce_connections(id) ON DELETE CASCADE,

  -- IDs do e-commerce externo
  external_product_id TEXT NOT NULL,          -- "gid://shopify/Product/123"
  external_variant_id TEXT,                   -- "gid://shopify/ProductVariant/456"

  -- ID do Vizzu
  vizzu_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

  -- Sync tracking
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  sync_status TEXT DEFAULT 'synced'
    CHECK (sync_status IN ('synced', 'pending', 'conflict', 'error')),
  sync_direction TEXT DEFAULT 'import'
    CHECK (sync_direction IN ('import', 'export', 'bidirectional')),

  -- Hash para detectar mudanças (evita sync desnecessário)
  external_data_hash TEXT,                    -- MD5 dos dados do produto

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(connection_id, external_product_id)
);

-- Índices
CREATE INDEX idx_ecomm_map_connection ON ecommerce_product_map(connection_id);
CREATE INDEX idx_ecomm_map_vizzu ON ecommerce_product_map(vizzu_product_id);
CREATE INDEX idx_ecomm_map_external ON ecommerce_product_map(external_product_id);
CREATE INDEX idx_ecomm_map_sync_status ON ecommerce_product_map(sync_status);

-- RLS (via connection ownership)
ALTER TABLE ecommerce_product_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own mappings"
  ON ecommerce_product_map FOR SELECT
  USING (connection_id IN (
    SELECT id FROM ecommerce_connections WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users insert own mappings"
  ON ecommerce_product_map FOR INSERT
  WITH CHECK (connection_id IN (
    SELECT id FROM ecommerce_connections WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users update own mappings"
  ON ecommerce_product_map FOR UPDATE
  USING (connection_id IN (
    SELECT id FROM ecommerce_connections WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users delete own mappings"
  ON ecommerce_product_map FOR DELETE
  USING (connection_id IN (
    SELECT id FROM ecommerce_connections WHERE user_id = auth.uid()
  ));

-- Trigger updated_at
CREATE TRIGGER update_ecommerce_product_map_updated_at
  BEFORE UPDATE ON ecommerce_product_map
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 3. ecommerce_image_exports
-- Log de imagens exportadas do Vizzu → e-commerce
-- ============================================================

CREATE TABLE ecommerce_image_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES ecommerce_connections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Origem (Vizzu)
  vizzu_product_id UUID NOT NULL REFERENCES products(id),
  vizzu_image_url TEXT NOT NULL,              -- URL no Supabase Storage
  vizzu_generation_id UUID,                   -- Referência à geração (se aplicável)
  vizzu_tool TEXT,                            -- 'product-studio' | 'creative-still' | 'look-composer' | etc

  -- Destino (e-commerce)
  external_product_id TEXT NOT NULL,          -- "gid://shopify/Product/123"
  external_media_id TEXT,                     -- "gid://shopify/MediaImage/456" (após upload)

  -- Configuração
  export_type TEXT NOT NULL
    CHECK (export_type IN ('add', 'replace', 'set_primary')),

  -- Status
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'uploading', 'processing', 'done', 'failed')),
  error_message TEXT,

  exported_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Índices
CREATE INDEX idx_ecomm_export_connection ON ecommerce_image_exports(connection_id);
CREATE INDEX idx_ecomm_export_user ON ecommerce_image_exports(user_id);
CREATE INDEX idx_ecomm_export_status ON ecommerce_image_exports(status);
CREATE INDEX idx_ecomm_export_product ON ecommerce_image_exports(vizzu_product_id);

-- RLS
ALTER TABLE ecommerce_image_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own exports"
  ON ecommerce_image_exports FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own exports"
  ON ecommerce_image_exports FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own exports"
  ON ecommerce_image_exports FOR UPDATE
  USING (user_id = auth.uid());

-- ============================================================
-- 4. ecommerce_sync_log
-- Log de eventos de sincronização
-- ============================================================

CREATE TABLE ecommerce_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES ecommerce_connections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),

  event_type TEXT NOT NULL
    CHECK (event_type IN (
      'import_all', 'import_selected',
      'webhook_create', 'webhook_update', 'webhook_delete',
      'export_image', 'bulk_finish',
      'full_sync', 'error'
    )),
  products_affected INTEGER DEFAULT 0,

  status TEXT DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'failed', 'partial')),
  details JSONB,                              -- Erros, warnings, stats

  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Índices
CREATE INDEX idx_ecomm_sync_connection ON ecommerce_sync_log(connection_id);
CREATE INDEX idx_ecomm_sync_user ON ecommerce_sync_log(user_id);
CREATE INDEX idx_ecomm_sync_event ON ecommerce_sync_log(event_type);
CREATE INDEX idx_ecomm_sync_status ON ecommerce_sync_log(status);

-- RLS
ALTER TABLE ecommerce_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own sync logs"
  ON ecommerce_sync_log FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own sync logs"
  ON ecommerce_sync_log FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own sync logs"
  ON ecommerce_sync_log FOR UPDATE
  USING (user_id = auth.uid());

-- ============================================================
-- Verificação final
-- ============================================================

-- Confirma que as 5 tabelas foram criadas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (table_name LIKE 'ecommerce_%' OR table_name = 'Session')
ORDER BY table_name;

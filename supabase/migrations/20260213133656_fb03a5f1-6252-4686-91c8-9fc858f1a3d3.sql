-- Add unique index on external_id for upsert support
CREATE UNIQUE INDEX IF NOT EXISTS financial_products_external_id_key ON public.financial_products (external_id) WHERE external_id IS NOT NULL;
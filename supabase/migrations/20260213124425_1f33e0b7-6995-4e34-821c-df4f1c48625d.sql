-- Add unique constraint on external_id for upsert support
CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_products_external_id 
ON public.financial_products (external_id) 
WHERE external_id IS NOT NULL;
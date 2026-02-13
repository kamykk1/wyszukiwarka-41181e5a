-- Drop overly restrictive category constraint to allow subcategories
ALTER TABLE public.financial_products DROP CONSTRAINT IF EXISTS financial_products_category_check;
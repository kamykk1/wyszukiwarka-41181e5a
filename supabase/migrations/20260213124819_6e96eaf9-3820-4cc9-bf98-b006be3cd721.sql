ALTER TABLE public.points_transactions DROP CONSTRAINT points_transactions_type_check;
ALTER TABLE public.points_transactions ADD CONSTRAINT points_transactions_type_check 
CHECK (type = ANY (ARRAY['earned'::text, 'redeemed'::text, 'adjusted'::text, 'click'::text, 'purchase'::text, 'partner_task'::text]));
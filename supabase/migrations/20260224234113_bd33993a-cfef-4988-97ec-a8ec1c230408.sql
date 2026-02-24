ALTER TABLE public.points_transactions DROP CONSTRAINT points_transactions_type_check;

ALTER TABLE public.points_transactions ADD CONSTRAINT points_transactions_type_check 
CHECK (type = ANY (ARRAY['earned', 'redeemed', 'adjusted', 'click', 'purchase', 'partner_task', 'wheel', 'streak', 'referral', 'mailing']));

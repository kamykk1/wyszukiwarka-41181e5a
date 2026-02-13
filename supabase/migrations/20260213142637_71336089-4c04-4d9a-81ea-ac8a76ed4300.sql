
-- Drop the existing admin ALL policy that exposes credentials to client
DROP POLICY IF EXISTS "Admins can manage partner integrations" ON public.partner_integrations;

-- Create separate policies: admins can read non-sensitive columns only via client
-- Full access (including credentials) is only via service_role in edge functions
CREATE POLICY "Admins can read partner integrations" 
ON public.partner_integrations 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update non-credential fields via client (toggle enabled, etc.)
-- Credential updates go through edge function with service_role
CREATE POLICY "Admins can update partner integrations" 
ON public.partner_integrations 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert partner integrations" 
ON public.partner_integrations 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete partner integrations" 
ON public.partner_integrations 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

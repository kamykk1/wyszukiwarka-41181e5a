
CREATE TABLE public.mailing_send_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.mailing_campaigns(id) ON DELETE CASCADE,
  recipient_user_id UUID,
  recipient_email TEXT,
  status TEXT NOT NULL CHECK (status IN ('sent','failed','skipped_no_email','validation_error')),
  error_message TEXT,
  sent_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.mailing_send_audit TO authenticated;
GRANT ALL ON public.mailing_send_audit TO service_role;

ALTER TABLE public.mailing_send_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view mailing audit"
ON public.mailing_send_audit
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_mailing_send_audit_campaign ON public.mailing_send_audit(campaign_id, created_at DESC);
CREATE INDEX idx_mailing_send_audit_status ON public.mailing_send_audit(status) WHERE status <> 'sent';

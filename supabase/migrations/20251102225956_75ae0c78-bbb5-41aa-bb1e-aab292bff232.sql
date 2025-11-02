-- Create risk findings table
CREATE TABLE IF NOT EXISTS public.risk_findings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  finding_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  recommendations TEXT,
  related_entry_id UUID REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.risk_findings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own risk findings"
  ON public.risk_findings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own risk findings"
  ON public.risk_findings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own risk findings"
  ON public.risk_findings
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own risk findings"
  ON public.risk_findings
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_risk_findings_user_id ON public.risk_findings(user_id);
CREATE INDEX idx_risk_findings_status ON public.risk_findings(status);
CREATE INDEX idx_risk_findings_severity ON public.risk_findings(severity);

-- Create trigger for updated_at
CREATE TRIGGER update_risk_findings_updated_at
  BEFORE UPDATE ON public.risk_findings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
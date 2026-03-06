-- Shopping sessions: one active session per user per day
CREATE TABLE public.shopping_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.shopping_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own sessions"
ON public.shopping_sessions FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Session items: products the user interacted with
CREATE TABLE public.session_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.shopping_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  product_url text NOT NULL,
  product_title text,
  product_image text,
  product_price text,
  retailer_domain text,
  interaction_type text NOT NULL DEFAULT 'viewed',
  in_cart boolean NOT NULL DEFAULT false,
  tryon_request_id uuid REFERENCES public.tryon_requests(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.session_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own session items"
ON public.session_items FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Enable realtime for session_items
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_items;

-- Cleanup functions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.shopping_sessions WHERE expires_at < now();
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_tryons()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.tryon_requests WHERE created_at < now() - interval '24 hours';
$$;

-- Updated_at trigger for session_items
CREATE TRIGGER update_session_items_updated_at
  BEFORE UPDATE ON public.session_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
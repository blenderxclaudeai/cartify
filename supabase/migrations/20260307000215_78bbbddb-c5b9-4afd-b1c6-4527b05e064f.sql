
-- Add new photo_category enum values for expanded body parts
ALTER TYPE photo_category ADD VALUE IF NOT EXISTS 'lower_body';
ALTER TYPE photo_category ADD VALUE IF NOT EXISTS 'feet';
ALTER TYPE photo_category ADD VALUE IF NOT EXISTS 'eyes';
ALTER TYPE photo_category ADD VALUE IF NOT EXISTS 'lips';
ALTER TYPE photo_category ADD VALUE IF NOT EXISTS 'brows';
ALTER TYPE photo_category ADD VALUE IF NOT EXISTS 'arms';
ALTER TYPE photo_category ADD VALUE IF NOT EXISTS 'back';
ALTER TYPE photo_category ADD VALUE IF NOT EXISTS 'lower_back';
ALTER TYPE photo_category ADD VALUE IF NOT EXISTS 'head';

-- Create retailer_coupons table
CREATE TABLE public.retailer_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL,
  code text NOT NULL,
  description text,
  discount_type text DEFAULT 'percentage',
  discount_value text,
  min_purchase text,
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.retailer_coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active coupons"
ON public.retailer_coupons FOR SELECT TO authenticated
USING (is_active = true);

CREATE POLICY "Admins can manage coupons"
ON public.retailer_coupons FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

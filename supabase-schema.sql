-- ============================================================
-- Famly – Family Expense Tracker
-- Supabase SQL Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Categories ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.categories (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  icon         TEXT,
  color        TEXT,
  is_default   BOOLEAN NOT NULL DEFAULT FALSE,
  budget_limit NUMERIC(12, 2),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read/write categories
CREATE POLICY "auth_all_categories" ON public.categories
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ── Expenses ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.expenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount      NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  paid_by     TEXT NOT NULL CHECK (paid_by IN ('husband', 'wife')),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read/write expenses
CREATE POLICY "auth_all_expenses" ON public.expenses
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON public.expenses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON public.expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_paid_by ON public.expenses(paid_by);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Seed: Default Categories ──────────────────────────────────
INSERT INTO public.categories (name, icon, color, is_default) VALUES
  ('Home Grocery',               '🛒', '#43C59E', TRUE),
  ('Outside Food',               '🍽️', '#FF6584', TRUE),
  ('Movies',                     '🎬', '#6C63FF', TRUE),
  ('Tea',                        '🍵', '#FFB547', TRUE),
  ('Coffee & Juice',             '☕', '#FF8C42', TRUE),
  ('Snacks & Sweets',            '🍰', '#F06292', TRUE),
  ('Luxury',                     '💎', '#AB47BC', TRUE),
  ('Needed Accessories (Personal)', '🧴', '#26C6DA', TRUE),
  ('Wanted Accessories (Personal)', '🛍️', '#EF5350', TRUE),
  ('Needed Accessories (Home)',  '🏠', '#42A5F5', TRUE),
  ('Wanted Accessories (Home)',  '✨', '#7E57C2', TRUE),
  ('Clothing & Shoes Shopping',  '👗', '#EC407A', TRUE),
  ('Miscellaneous',              '📦', '#8B8BA7', TRUE)
ON CONFLICT DO NOTHING;

-- ── Realtime ──────────────────────────────────────────────────
-- Enable realtime on the expenses table
-- (Do this in Supabase Dashboard → Database → Replication → Tables)
-- Or via SQL:
ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;

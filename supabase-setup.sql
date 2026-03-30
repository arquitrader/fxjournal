-- ============================================================
-- FXJournal — Ejecuta este SQL en Supabase
-- Dashboard → SQL Editor → New query → Pega esto → Run
-- ============================================================

-- 1. Tabla de operaciones
CREATE TABLE trades (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date        DATE NOT NULL,
  pair        TEXT NOT NULL,
  direction   TEXT NOT NULL CHECK (direction IN ('BUY', 'SELL')),
  entry       NUMERIC,
  exit        NUMERIC,
  lots        NUMERIC,
  pnl         NUMERIC DEFAULT 0,
  emotion     TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Seguridad: cada usuario solo ve sus propios trades
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own trades"
  ON trades
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

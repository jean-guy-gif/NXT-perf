-- 028: Performance imports + subscriptions tables

CREATE TABLE IF NOT EXISTS performance_imports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT,
  file_type TEXT,
  status TEXT DEFAULT 'pending',
  extracted_data JSONB,
  periods_detected TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE performance_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_imports" ON performance_imports
  FOR ALL USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  plan TEXT DEFAULT 'free',
  status TEXT DEFAULT 'active',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_end TIMESTAMPTZ,
  seats INTEGER DEFAULT 1,
  price_per_seat INTEGER DEFAULT 900,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_subscription" ON subscriptions
  FOR ALL USING (user_id = auth.uid());

-- 043: Tighten RLS insert/update policies that were using USING(true)
-- Replace with proper admin role checks

-- Helper: reusable admin check
CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  );
$$;

-- daily_dhwani: admin-only insert/update
DROP POLICY IF EXISTS "Admin insert daily_dhwani" ON daily_dhwani;
DROP POLICY IF EXISTS "Admin update daily_dhwani" ON daily_dhwani;
CREATE POLICY "Admin insert daily_dhwani" ON daily_dhwani FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update daily_dhwani" ON daily_dhwani FOR UPDATE USING (is_admin());

-- battle_royale_events: admin-only insert/update
DROP POLICY IF EXISTS "Admin create battle events" ON battle_royale_events;
DROP POLICY IF EXISTS "Admin update battle events" ON battle_royale_events;
CREATE POLICY "Admin create battle events" ON battle_royale_events FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update battle events" ON battle_royale_events FOR UPDATE USING (is_admin());

-- territory_ownership: admin-only insert/update
DROP POLICY IF EXISTS "Admin insert ownership" ON territory_ownership;
DROP POLICY IF EXISTS "Admin update ownership" ON territory_ownership;
CREATE POLICY "Admin insert ownership" ON territory_ownership FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update ownership" ON territory_ownership FOR UPDATE USING (is_admin());

-- isa_payments: user can insert own payments (via contract ownership), admin can insert any
DROP POLICY IF EXISTS "Admin insert payments" ON isa_payments;
DROP POLICY IF EXISTS "Admin update payments" ON isa_payments;
CREATE POLICY "Users insert own payments" ON isa_payments FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT user_id FROM isa_contracts WHERE id = contract_id)
  OR is_admin()
);
CREATE POLICY "Admin update payments" ON isa_payments FOR UPDATE USING (is_admin());

-- astra_scripts: admin-only insert/update
DROP POLICY IF EXISTS "Admin insert astra scripts" ON astra_scripts;
DROP POLICY IF EXISTS "Admin update astra scripts" ON astra_scripts;
CREATE POLICY "Admin insert astra scripts" ON astra_scripts FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update astra scripts" ON astra_scripts FOR UPDATE USING (is_admin());

-- white_label_tenants: admin-only manage
DROP POLICY IF EXISTS "Admin manage tenants" ON white_label_tenants;
CREATE POLICY "Admin manage tenants" ON white_label_tenants FOR ALL USING (is_admin());

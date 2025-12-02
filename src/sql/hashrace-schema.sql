-- ============================================
-- HashRace Christmas Raffle 2025
-- Supabase Database Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========== TABLE: profiles ==========
-- Default Supabase profiles table (extends auth.users)
-- This table is usually auto-created by Supabase

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== TABLE: participants ==========
-- Stores active HashRace participants with verification status

CREATE TABLE IF NOT EXISTS public.participants (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT NOT NULL,
    gomining_user_id TEXT,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_participants_gomining_user_id 
    ON public.participants(gomining_user_id);

CREATE INDEX IF NOT EXISTS idx_participants_is_active 
    ON public.participants(is_active);

-- ========== TABLE: tickets ==========
-- Stores total ticket count per user

CREATE TABLE IF NOT EXISTS public.tickets (
    user_id UUID REFERENCES public.participants(id) PRIMARY KEY,
    tickets INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== TABLE: system_stats ==========
-- Stores global raffle statistics (single row)

CREATE TABLE IF NOT EXISTS public.system_stats (
    id INTEGER PRIMARY KEY DEFAULT 1,
    total_tickets INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT system_stats_single_row CHECK (id = 1)
);

-- Insert initial row
INSERT INTO public.system_stats (id, total_tickets) 
VALUES (1, 0) 
ON CONFLICT (id) DO NOTHING;

-- ========== TABLE: ticket_history ==========
-- Optional: Track ticket earning history per user

CREATE TABLE IF NOT EXISTS public.ticket_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.participants(id) ON DELETE CASCADE,
    reason TEXT NOT NULL, -- 'registration', 'spend', 'referral', 'share'
    tickets_earned INTEGER NOT NULL,
    order_id TEXT, -- Optional reference to GoMining order
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_history_user_id 
    ON public.ticket_history(user_id);

CREATE INDEX IF NOT EXISTS idx_ticket_history_created_at 
    ON public.ticket_history(created_at);

-- ========== TABLE: admin_actions ==========
-- Audit log for admin operations

CREATE TABLE IF NOT EXISTS public.admin_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action TEXT NOT NULL, -- 'import_csv', 'manual_edit', 'recalculate', etc.
    details JSONB,
    performed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at 
    ON public.admin_actions(created_at);

CREATE INDEX IF NOT EXISTS idx_admin_actions_action 
    ON public.admin_actions(action);

-- ========== ROW LEVEL SECURITY (RLS) ==========

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

-- ========== RLS POLICIES ==========

-- PROFILES: Users can read their own profile
CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

-- PROFILES: Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- PARTICIPANTS: Users can read their own participant record
CREATE POLICY "Users can read own participant data"
    ON public.participants FOR SELECT
    USING (auth.uid() = id);

-- TICKETS: Users can read their own tickets
CREATE POLICY "Users can read own tickets"
    ON public.tickets FOR SELECT
    USING (auth.uid() = user_id);

-- SYSTEM_STATS: Readable by everyone (public data)
CREATE POLICY "System stats readable by all"
    ON public.system_stats FOR SELECT
    TO authenticated, anon
    USING (true);

-- TICKET_HISTORY: Users can read their own ticket history
CREATE POLICY "Users can read own ticket history"
    ON public.ticket_history FOR SELECT
    USING (auth.uid() = user_id);

-- ADMIN_ACTIONS: Readable only by admins
-- Note: You need to implement admin check (e.g., via custom claim or email whitelist)
CREATE POLICY "Admin actions readable by admins only"
    ON public.admin_actions FOR SELECT
    USING (
        auth.jwt() ->> 'email' IN (
            'admin@yourdomain.com', 
            'another-admin@yourdomain.com'
        )
    );

CREATE POLICY "Admin actions writable by admins only"
    ON public.admin_actions FOR INSERT
    WITH CHECK (
        auth.jwt() ->> 'email' IN (
            'admin@yourdomain.com',
            'another-admin@yourdomain.com'
        )
    );

-- ========== FUNCTIONS ==========

-- Function: Recalculate total tickets in system_stats
CREATE OR REPLACE FUNCTION recalculate_total_tickets()
RETURNS VOID AS $$
BEGIN
    UPDATE public.system_stats
    SET total_tickets = (
        SELECT COALESCE(SUM(tickets), 0) 
        FROM public.tickets
    ),
    updated_at = NOW()
    WHERE id = 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get current prize tier based on total tickets
CREATE OR REPLACE FUNCTION get_current_tier()
RETURNS JSONB AS $$
DECLARE
    total INT;
    tier_data JSONB;
BEGIN
    SELECT total_tickets INTO total FROM public.system_stats WHERE id = 1;
    
    IF total BETWEEN 0 AND 100 THEN
        tier_data = jsonb_build_object(
            'tier', 1,
            'min', 0,
            'max', 100,
            'winners', 1,
            'prizes', '50 GMT'
        );
    ELSIF total BETWEEN 101 AND 200 THEN
        tier_data = jsonb_build_object(
            'tier', 2,
            'min', 101,
            'max', 200,
            'winners', 2,
            'prizes', '50 GMT + 25 GMT'
        );
    ELSIF total BETWEEN 201 AND 300 THEN
        tier_data = jsonb_build_object(
            'tier', 3,
            'min', 201,
            'max', 300,
            'winners', 3,
            'prizes', '100 GMT/2TH + 50 + 25 GMT'
        );
    ELSE
        tier_data = jsonb_build_object(
            'tier', 4,
            'min', 301,
            'max', null,
            'winners', 5,
            'prizes', '100/2TH + 50 + 50 + 25 + 25 GMT'
        );
    END IF;
    
    RETURN tier_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== TRIGGERS ==========

-- Trigger: Update updated_at on participants table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_participants_updated_at
    BEFORE UPDATE ON public.participants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at
    BEFORE UPDATE ON public.tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========== SAMPLE DATA (OPTIONAL FOR TESTING) ==========

-- Uncomment below to add sample data

/*
-- Sample participant (replace with real UUID from auth.users)
INSERT INTO public.participants (id, email, gomining_user_id, is_active)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'user1@example.com', 'GM_USER_123', true),
    ('00000000-0000-0000-0000-000000000002', 'user2@example.com', 'GM_USER_456', true),
    ('00000000-0000-0000-0000-000000000003', 'user3@example.com', 'GM_USER_789', false);

-- Sample tickets
INSERT INTO public.tickets (user_id, tickets)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 15),
    ('00000000-0000-0000-0000-000000000002', 8);

-- Update system stats
SELECT recalculate_total_tickets();

-- Sample ticket history
INSERT INTO public.ticket_history (user_id, reason, tickets_earned, notes)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'registration', 1, 'Initial signup'),
    ('00000000-0000-0000-0000-000000000001', 'spend', 10, 'Spent $100 on GoMining'),
    ('00000000-0000-0000-0000-000000000001', 'referral', 2, 'Referred a friend'),
    ('00000000-0000-0000-0000-000000000001', 'share', 2, 'Shared on social media');
*/

-- ========== GRANTS ==========

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.participants TO authenticated;
GRANT SELECT ON public.tickets TO authenticated;
GRANT SELECT ON public.system_stats TO authenticated, anon;
GRANT SELECT ON public.ticket_history TO authenticated;

-- Admin grants (adjust based on your admin implementation)
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO admin_role;

-- ========== COMPLETE ==========

-- Schema setup complete!
-- Remember to:
-- 1. Replace 'admin@yourdomain.com' with actual admin emails in RLS policies
-- 2. Update Supabase URL and anon key in HashRace.js
-- 3. Test with sample data before production
-- 4. Set up admin panel for CSV imports and ticket management
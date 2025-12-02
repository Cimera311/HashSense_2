// ============================================
// HashRace Quick Setup Guide
// ============================================

/*
  SCHRITT 1: SUPABASE PROJEKT ERSTELLEN
  --------------------------------------
  1. Gehe zu https://supabase.com
  2. Erstelle neues Projekt
  3. Notiere:
     - Project URL: https://xxxxx.supabase.co
     - Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
*/

/*
  SCHRITT 2: DATABASE SCHEMA AUSFÜHREN
  -------------------------------------
  1. Öffne Supabase SQL Editor
  2. Kopiere src/sql/hashrace-schema.sql
  3. WICHTIG: Ersetze Admin-Email in Schema:
     
     Suche: 'admin@yourdomain.com'
     Ersetze mit: 'deine-echte-email@domain.com'
  
  4. Führe SQL aus
  5. Prüfe ob Tabellen erstellt wurden:
     - profiles
     - participants
     - tickets
     - system_stats
     - ticket_history
     - admin_actions
*/

/*
  SCHRITT 3: CREDENTIALS IN CODE EINFÜGEN
  ----------------------------------------
  Öffne src/scripts/HashRace.js (Zeile 8-12):
*/

const HASHRACE_CONFIG = {
    supabase: {
        url: 'https://xxxxx.supabase.co',           // ← Deine URL hier
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6...' // ← Dein Key hier
    },
    prizeTiers: [
        // ... bleibt unverändert
    ]
};

/*
  SCHRITT 4: EMAIL AUTH IN SUPABASE AKTIVIEREN
  ----------------------------------------------
  1. Gehe zu Supabase Dashboard → Authentication → Providers
  2. Aktiviere "Email" Provider
  3. Optional: Customize Email Templates
  4. Site URL einstellen: http://localhost:8000 (für Entwicklung)
*/

/*
  SCHRITT 5: TESTEN
  ------------------
  1. Starte lokalen Webserver:
     
     python -m http.server 8000
  
  2. Öffne Browser:
     
     http://localhost:8000/Hashrace.html
  
  3. Teste Login Flow:
     - Klicke "Login / Join"
     - Gib Email ein
     - Check Email für Magic Link
     - Nach Login solltest du "Not registered yet" sehen
*/

/*
  SCHRITT 6: ERSTEN TEST-USER AKTIVIEREN
  ----------------------------------------
  1. Nach erstem Login: Kopiere User UUID aus Supabase Auth → Users
  
  2. Führe in Supabase SQL Editor aus:
*/

-- User als Participant aktivieren
INSERT INTO public.participants (id, email, gomining_user_id, is_active)
VALUES (
    'DEINE_USER_UUID_HIER',    -- UUID aus auth.users kopieren
    'test@example.com',
    'GM_TEST_123',
    true
);

-- Tickets vergeben
INSERT INTO public.tickets (user_id, tickets)
VALUES ('DEINE_USER_UUID_HIER', 25);

-- System Stats aktualisieren
SELECT recalculate_total_tickets();

/*
  3. Reload Hashrace.html → Du solltest jetzt Dashboard mit 25 Tickets sehen!
*/

/*
  PRODUKTIONS-SETUP
  ------------------
  1. Update Site URL in Supabase:
     Authentication → URL Configuration → Site URL
     
     z.B.: https://deine-domain.com
  
  2. Add Redirect URLs:
     https://deine-domain.com/Hashrace.html
  
  3. Custom Domain für Supabase (optional):
     Project Settings → API → Custom Domain
  
  4. Email Templates anpassen:
     Authentication → Email Templates
     
     - Confirm Signup
     - Magic Link
     - Reset Password
*/

/*
  HÄUFIGE FEHLER & LÖSUNGEN
  --------------------------
  
  ❌ "createClient is not a function"
  → Prüfe ob Supabase CDN Script geladen ist in HTML Head
  
  ❌ "Failed to fetch" bei loadGlobalStats()
  → Prüfe Supabase URL und Anon Key in HashRace.js
  
  ❌ "Row Level Security policy violation"
  → Prüfe ob RLS Policies korrekt erstellt wurden (schema.sql)
  
  ❌ Dashboard zeigt "Not registered yet"
  → User ist nicht in participants table ODER is_active = false
  
  ❌ Total Tickets zeigt 0
  → Führe aus: SELECT recalculate_total_tickets();
*/

/*
  DEBUGGING
  ---------
  Browser Console öffnen (F12) und eingeben:
*/

// Current State prüfen
HashRace.getState();

// Gibt zurück:
// {
//   userState: 'logged_in_active',
//   currentUser: { ... },
//   globalStats: { totalTickets: 25 },
//   userTickets: 25
// }

// Stats manuell neu laden
await HashRace.refreshStats();

/*
  FERTIG! 🎄
  ----------
  Dein HashRace ist jetzt ready!
  
  Nächste Schritte:
  - Admin Panel bauen für CSV Import
  - Ticket Calculation Logic implementieren
  - Winner Draw System entwickeln
  
  Viel Erfolg! ❄️
*/
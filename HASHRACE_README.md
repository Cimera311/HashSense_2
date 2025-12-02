# 🎄 HashRace Christmas Raffle 2025

Single-page web app für das HashRace Christmas Raffle mit Supabase Auth und manuell verwalteten Tickets.

## 📁 Dateien

- **`Hashrace.html`** - Hauptseite mit Public Landing + Dashboard
- **`src/scripts/HashRace.js`** - JavaScript Logic mit Supabase Integration
- **`src/styles/hashrace.css`** - Dark Theme + Glassmorphism Design
- **`src/sql/hashrace-schema.sql`** - Supabase Database Schema

## 🚀 Setup

### 1. Supabase Projekt erstellen

1. Gehe zu [supabase.com](https://supabase.com) und erstelle ein neues Projekt
2. Notiere dir:
   - **Project URL** (z.B. `https://xxxxx.supabase.co`)
   - **Anon/Public Key** (aus Settings → API)

### 2. Database Schema einrichten

1. Öffne Supabase SQL Editor
2. Kopiere kompletten Inhalt von `src/sql/hashrace-schema.sql`
3. Führe das SQL aus
4. **Wichtig:** Ersetze in der SQL-Datei die Admin-Emails:
   ```sql
   'admin@yourdomain.com'  →  deine echte Admin-Email
   ```

### 3. Supabase Credentials in Code einfügen

Öffne `src/scripts/HashRace.js` und ersetze:

```javascript
const HASHRACE_CONFIG = {
    supabase: {
        url: 'YOUR_SUPABASE_URL',           // ← Deine Project URL
        anonKey: 'YOUR_SUPABASE_ANON_KEY'   // ← Dein Anon Key
    },
    // ...
};
```

### 4. Testen

1. Öffne `Hashrace.html` in einem lokalen Webserver:
   ```bash
   python -m http.server 8000
   ```
   
2. Navigiere zu `http://localhost:8000/Hashrace.html`

3. Teste folgende Flows:
   - **Public Landing** sollte für alle sichtbar sein
   - **Login** mit Magic Link
   - **Dashboard** nach Login (zeigt "Not registered yet" wenn nicht in `participants`)

## 👤 User States

Das System unterstützt 3 User-States:

### 1. NOT LOGGED IN
- Zeigt nur Public Landing Section
- "Login / Join" Button sichtbar
- Keine persönlichen Daten

### 2. LOGGED IN, NOT ACTIVE
- Public Landing Section
- Dashboard mit "Not registered yet" Nachricht
- User muss DM mit GoMining UserID senden

### 3. LOGGED IN & ACTIVE
- Public Landing Section
- Vollständiges persönliches Dashboard:
  - Deine Tickets
  - Referral Status
  - Total Tickets
  - Current Prize Tier
  - How to Earn More
  - Update Hint

## 🎫 Ticket System

**Ticket-Regeln:**
- $10 Ausgaben bei GoMining → +1 Ticket
- Freund werben (ICjK3 Referral) → +2 Tickets
- HashRace teilen (max 3x) → +1 Ticket pro Share
- Registrierung → +1 Ticket (optional)

**Prize Tiers:**
- **Tier 1** (0-100 tickets): 1 winner – 50 GMT
- **Tier 2** (101-200 tickets): 2 winners – 50 + 25 GMT
- **Tier 3** (201-300 tickets): 3 winners – 100 GMT/2TH + 50 + 25 GMT
- **Tier 4** (301+ tickets): 5 winners – 100/2TH + 50 + 50 + 25 + 25 GMT

## 🔧 Admin Workflow (manuell)

### User aktivieren

```sql
-- User in participants table einfügen
INSERT INTO public.participants (id, email, gomining_user_id, is_active)
VALUES (
    'USER_AUTH_UUID',           -- UUID aus auth.users
    'user@example.com',
    'GM_USER_12345',           -- GoMining UserID
    true                        -- Als aktiv markieren
);
```

### Tickets vergeben

```sql
-- Tickets für User eintragen
INSERT INTO public.tickets (user_id, tickets)
VALUES ('USER_AUTH_UUID', 15);

-- ODER updaten
UPDATE public.tickets
SET tickets = 20, updated_at = NOW()
WHERE user_id = 'USER_AUTH_UUID';
```

### Total Tickets neu berechnen

```sql
-- Automatische Neuberechnung
SELECT recalculate_total_tickets();
```

### Ticket History tracken (optional)

```sql
INSERT INTO public.ticket_history (user_id, reason, tickets_earned, order_id, notes)
VALUES (
    'USER_AUTH_UUID',
    'spend',                    -- 'registration', 'spend', 'referral', 'share'
    10,                         -- Anzahl Tickets
    'ORD_12345',               -- Optional: GoMining Order ID
    'Spent $100 on miners'     -- Optional: Notes
);
```

## 📊 Supabase Functions

### Get Current Tier

```javascript
const { data, error } = await supabase.rpc('get_current_tier');
// Returns: { tier: 2, min: 101, max: 200, winners: 2, prizes: '...' }
```

### Recalculate Total Tickets

```javascript
const { data, error } = await supabase.rpc('recalculate_total_tickets');
```

## 🎨 Design

**Color Palette:**
- Background: `#0d1117` (Dark)
- Glass Cards: `rgba(255, 255, 255, 0.05)` mit Blur
- Accent Gold: `#FFD700`
- Accent Ice Blue: `#00D4FF`

**Features:**
- Glassmorphism Cards mit Backdrop Blur
- Smooth Animations & Hover Effects
- Responsive Layout (Mobile-First)
- Christmas Glow Effects
- Snowflake Animations

## 🔐 Security (RLS)

Row Level Security ist aktiviert für:
- Users können nur eigene Daten lesen
- System Stats sind für alle lesbar
- Admin Actions nur für Admin-Emails

**Admin-Email Whitelist ändern:**
```sql
-- In hashrace-schema.sql suchen und ersetzen:
auth.jwt() ->> 'email' IN (
    'deine-admin@email.com',
    'zweite-admin@email.com'
)
```

## 📝 Nächste Schritte

1. **CSV Import Tool** für GoMining Daten (Admin Panel)
2. **Ticket Calculation Logic** basierend auf Order Data
3. **Winner Draw System** mit Fairness-Check
4. **Email Notifications** für Updates
5. **Social Share Tracking** mit Verification

## 🐛 Debugging

Browser Console öffnen und prüfen:

```javascript
// Current State prüfen
HashRace.getState();

// Stats manuell aktualisieren
await HashRace.refreshStats();
```

## 📞 Support

Bei Fragen oder Problemen DM an Admin senden.

---

**Version:** 1.0.0  
**Datum:** Dezember 2025  
**Status:** Ready for Supabase Setup 🎄
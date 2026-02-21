# GoMining Marketplace Live Monitor

Live-Überwachung des GoMining Marketplace mit Echtzeit-Updates für Miner-Käufe, Upgrades und Transaktionen.

## 📋 Überblick

Diese Lösung besteht aus zwei Komponenten:

1. **marketplace.html** - Frontend-Seite im HashSense-Design
2. **cloudflare-worker-marketplace.js** - Cloudflare Worker für API-Caching und CORS

## 🚀 Setup-Anleitung

### Option 1: Ohne Cloudflare Worker (Schnellstart)

Die `marketplace.html` ist bereits einsatzbereit und kann direkt verwendet werden. Sie versucht, die GoMining API direkt abzurufen (kann durch CORS eingeschränkt sein).

1. Pushe `marketplace.html` zu deinem GitHub Repository
2. Öffne die Seite: `https://hashfarm.me/marketplace.html`

**Hinweis:** Falls CORS-Fehler auftreten, musst du Option 2 verwenden.

### Option 2: Mit Cloudflare Worker (Empfohlen)

Der Cloudflare Worker bietet:
- ✅ Keine CORS-Probleme
- ✅ API-Caching (schnellere Ladezeiten)
- ✅ Reduzierte Anfragen an GoMining API
- ✅ Kostenlos (bis 100.000 Requests/Tag)

#### Schritt 1: Cloudflare Worker erstellen

1. Gehe zu [https://workers.cloudflare.com/](https://workers.cloudflare.com/)
2. Melde dich an (kostenloser Account reicht)
3. Klicke auf "Create a Service"
4. Wähle einen Namen (z.B. `gomining-marketplace-api`)
5. Klicke auf "Create Service"

#### Schritt 2: Worker-Code deployen

1. Klicke auf "Quick Edit"
2. Lösche den vorhandenen Code
3. Kopiere den kompletten Code aus `cloudflare-worker-marketplace.js`
4. Füge den Code ein
5. Klicke auf "Save and Deploy"

#### Schritt 3: Worker-URL kopieren

1. Nach dem Deployment siehst du die Worker-URL (z.B. `https://gomining-marketplace-api.username.workers.dev`)
2. Kopiere diese URL

#### Schritt 4: marketplace.html aktualisieren

Öffne `marketplace.html` und suche die Zeile (circa Zeile 268):

```javascript
const CONFIG = {
    // Ersetze diese URL mit deinem Cloudflare Worker
    WORKER_URL: 'https://your-worker.workers.dev/marketplace',
    ...
    USE_WORKER: false // Auf true setzen wenn Worker deployed ist
};
```

Ändere es zu:

```javascript
const CONFIG = {
    // Ersetze diese URL mit deinem Cloudflare Worker
    WORKER_URL: 'https://gomining-marketplace-api.username.workers.dev/marketplace',
    ...
    USE_WORKER: true // Auf true setzen wenn Worker deployed ist
};
```

#### Schritt 5: Testen

1. Pushe die aktualisierte `marketplace.html` zu GitHub
2. Öffne `https://hashfarm.me/marketplace.html`
3. Die Seite sollte jetzt Daten vom Worker laden

## ⚙️ Konfiguration

### marketplace.html Optionen

In der `CONFIG`-Konstante kannst du folgende Einstellungen anpassen:

```javascript
const CONFIG = {
    WORKER_URL: 'https://your-worker.workers.dev/marketplace',
    DIRECT_API: 'https://gomining.com/api/payment-marketplace-statistics',
    REFRESH_INTERVAL: 30000, // Update-Intervall in Millisekunden (30s)
    USE_WORKER: true // Worker verwenden (true) oder direkte API (false)
};
```

### Cloudflare Worker Optionen

Im Worker-Code kannst du anpassen:

```javascript
const CONFIG = {
  GOMINING_API: 'https://gomining.com/api/payment-marketplace-statistics',
  CACHE_TTL: 30, // Cache-Dauer in Sekunden
  MAX_TRANSACTIONS: 200, // Maximale Anzahl zu speichernder Transaktionen
};
```

## 🎨 Features

### Live-Updates
- ✅ Automatische Aktualisierung alle 30 Sekunden
- ✅ Countdown-Timer bis zum nächsten Update
- ✅ Manuelle Deaktivierung möglich

### Filter
- **Alle**: Zeigt alle Transaktionen
- **Käufe**: Nur Miner-Käufe
- **Upgrades**: Nur Upgrades

### Statistiken (Echtzeit)
- 📊 Gesamt-Volumen (24h)
- 📈 Anzahl Transaktionen (24h)
- ⚡ Durchschnittliche TH/s pro Kauf
- 🕐 Letztes Update

### Visuelle Highlights
- 🔴 Neue Transaktionen werden farblich hervorgehoben
- ⚡ Slide-in Animation für neue Einträge
- 💫 Typ-basierte Icons (Kauf/Upgrade)

## 🔧 Erweiterte Optionen

### KV Storage (Optional)

Für erweiterte Funktionen kannst du Cloudflare KV Storage hinzufügen:

1. In Cloudflare Dashboard: Workers > KV
2. Erstelle einen Namespace: `MARKETPLACE_STORAGE`
3. Binde den Namespace an deinen Worker:
   - Settings > Variables > KV Namespace Bindings
   - Variable name: `MARKETPLACE_STORAGE`
   - KV namespace: Wähle deinen erstellten Namespace

KV Storage ermöglicht:
- Historische Snapshots (24h gespeichert)
- Erweiterte Statistiken über `/stats` Endpoint
- Langzeit-Tracking von Trends

### Worker Endpoints

Der Worker stellt mehrere Endpoints bereit:

- `GET /marketplace` - Marketplace-Daten (gecached)
- `GET /stats` - Statistiken (benötigt KV Storage)
- `GET /health` - Health-Check

## 🐛 Fehlerbehebung

### "Fehler" Status in der Seite

**Problem:** Rote "Fehler"-Anzeige statt "Live"

**Lösungen:**
1. Prüfe die Browser-Konsole (F12) auf Fehler
2. Wenn CORS-Fehler: Verwende Cloudflare Worker (Option 2)
3. Prüfe ob Worker-URL korrekt eingetragen ist
4. Stelle sicher `USE_WORKER: true` gesetzt ist

### Keine Transaktionen sichtbar

**Problem:** "Keine Transaktionen gefunden" Meldung

**Mögliche Ursachen:**
1. GoMining API liefert derzeit keine Daten
2. API-Struktur hat sich geändert (siehe "API-Struktur Anpassung")
3. Worker läuft nicht korrekt

### API-Struktur Anpassung

Falls die GoMining API ihre Struktur ändert, musst du die `extractTransactions`-Funktion in `marketplace.html` anpassen (circa Zeile 420).

**So findest du die richtige Struktur:**
1. Öffne in Browser: `https://gomining.com/api/payment-marketplace-statistics`
2. Analysiere die JSON-Struktur
3. Passe die Funktion entsprechend an

## 📱 Mobile Optimierung

Die Seite ist vollständig responsive und optimiert für:
- 📱 Smartphones
- 📱 Tablets
- 💻 Desktop

## 🔐 Sicherheit & Datenschutz

- ✅ Keine persönlichen Daten werden gespeichert
- ✅ Alle API-Aufrufe sind öffentlich verfügbar
- ✅ Worker speichert nur anonymisierte Marketplace-Daten
- ✅ Keine Authentifizierung erforderlich

## 📊 Performance

### Ohne Worker
- Direkte API-Anfragen alle 30s
- Abhängig von GoMining API Geschwindigkeit
- Mögliche CORS-Probleme

### Mit Worker
- Gecachte Antworten (TTL: 30s)
- Schnellere Ladezeiten
- Reduzierte Serverlast
- Keine CORS-Probleme

## 🚦 Cloudflare Free Tier Limits

Der kostenlose Cloudflare Workers Plan bietet:
- ✅ 100.000 Requests pro Tag
- ✅ 1ms CPU Zeit pro Request
- ✅ Ausreichend für diese Anwendung

**Bei 30s Refresh-Intervall:**
- 1 Benutzer: ~2.880 Requests/Tag
- Unterstützt ~34 gleichzeitige Benutzer

Für höhere Last: Upgrade auf Workers Paid ($5/Monat für 10 Millionen Requests).

## 📝 Changelog

### Version 1.0 (2026-02-21)
- ✅ Initiales Release
- ✅ Live Marketplace Feed
- ✅ Cloudflare Worker Integration
- ✅ Auto-Refresh Funktion
- ✅ Statistiken Dashboard
- ✅ Filter-Optionen

## 🤝 Support

Bei Problemen oder Fragen:
1. Prüfe die Browser-Konsole auf Fehler
2. Überprüfe Worker Logs in Cloudflare Dashboard
3. Teste Worker direkt: `https://dein-worker.workers.dev/health`

## 📄 Lizenz

Teil des HashFarm Projekts. Siehe Haupt-Repository für Lizenzinformationen.

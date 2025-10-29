## Zweck
Kurze, praktische Anleitung für AI-Assistenten die in diesem Repository (HashSense_2) arbeiten.

## Überblick
- Dieses Repository ist hauptsächlich eine Sammlung statischer HTML-Seiten (HTML-Dateien im Hauptverzeichnis) plus eine kleine JS-App unter `src/`.
- Zwei koexistierende Ansätze:
  - Eigenständige HTML-Seiten die Module oder CDN-Bibliotheken direkt importieren (z.B. `login.html`, `linkview.html`, `farm*.html`). Diese nutzen oft ESM-Imports von jsdelivr und setzen `window.supabase = createClient(...)`.
  - Leichtgewichtige modulbasierte UI in `src/` (z.B. `src/index.js`, `src/App.js`, `src/components/*`) die über HTTP als ES-Module bereitgestellt werden muss.
- Gemeinsamer Header und Bootstrapping wird durch `header.html` + `header.js` gehandhabt (fügt Header ein und lädt `skript.js`).

## Wichtige Integrationspunkte
- Supabase: Das Repository nutzt Supabase intensiv. Siehe `src/scripts/skriptfarm.js` (CRUD + Auth-Flows), `src/scripts/skriptindex.js`, und `linkview.html` / `login.html` für Beispiele. Es gibt auch eine gebündelte `supabase.js` im Repository (minifiziert). Hinweis: Viele HTML-Seiten importieren `createClient` vom CDN und weisen `window.supabase` zu.
- Datendateien: `data/bitcoin_eur.csv`, `data/gominingtoken_eur.csv`, und `src/data/example-farm.json` werden als Beispiel-/Seed-Daten verwendet.
- Preismatrix und CSV-Parsing: Viele Skripte namens `priceMatrix*.js` und `skript-prices*.js` generieren Tabellen; prüfe diese bei Änderungen der Preislogik.

## Entwickler-Workflows (was hier tatsächlich funktioniert)
- Es gibt keine package.json oder npm-Build in diesem Repository. Dateien sollen statisch bereitgestellt werden. Für lokale Entwicklung einen einfachen HTTP-Server starten (ES-Module und Supabase-Aufrufe benötigen HTTP-Origin):

PowerShell-Beispiel (im Repository-Hauptverzeichnis):
```powershell
# Python (schnell, auf vielen Systemen verfügbar)
python -m http.server 8000

# Oder falls Node installiert ist, kannst du npx verwenden (optional):
npx http-server -p 8000
```

Dann http://localhost:8000/index.html (oder andere HTML-Dateien) öffnen. Dateien NICHT über `file://` öffnen wenn die Seite `import`/ES-Module verwendet.

## Projektspezifische Konventionen & Muster
- Dateinamen und Kommentare sind gemischt Deutsch/Englisch. Bei neuen Dateien oder DOM-IDs die bestehenden deutschen Konventionen beibehalten (z.B. `skriptfarm.js`, `hinzufuegenCard`).
- Globale DOM-Hooks: Viele Skripte verlassen sich auf spezifische Element-IDs (z.B. `app`, `header-container`, `load-sample`). Diese IDs bei UI-Änderungen mit grep suchen.
- Zwei Arten wie Supabase in Seiten initialisiert wird:
  - CDN ESM-Import in HTML, dann `window.supabase = createClient(supabaseUrl, supabaseKey)` (üblich in `login.html`, `linkview.html`, `farmold.html`).
  - Lokale gebündelte `supabase.js` existiert, aber die Codebasis verwendet öfter den CDN-Ansatz. Vorsichtig bei Bearbeitung von `supabase.js` (ist eine minifizierte Vendor-Datei).
- Session Storage: Einige Skripte lesen `sessionStorage.getItem('supabaseSession')` — Namen konsistent halten bei Auth-Code-Änderungen.

## Wo was geändert wird (konkrete Beispiele)
- Supabase-gestützte Persistierung ändern: `src/scripts/skriptfarm.js` bearbeiten (Speichern/Laden von Minern, user_data). Zeigt Muster für `supabase.from('miners').insert(...)` und `.delete().eq('user_id', userId)`.
- Kleine SPA-UI aktualisieren: `src/App.js` und `src/components/*` bearbeiten. Einstiegspunkt ist `src/index.js` das in Element mit ID `app` eingehängt wird.
- Gemeinsamen Header oder Skript-Injection ändern: `header.html` und `header.js` bearbeiten.

## Sicherheit & Hinweise
- Das Repository enthält Supabase-Projekt-URLs und Keys in HTML-Dateien. Diese als öffentliche/Vorschau-Token behandeln. Neue Geheimnisse nicht fest in Dateien kodieren. Environment-gestützte Geheimnisse oder sichere Config-Referenz bei neuen Backend-Keys bevorzugen.

## Schnelle Such-Tipps für das Repository
- `grep supabase` -> findet Supabase-Verwendung (siehe `src/scripts/skriptfarm.js`, `src/scripts/skriptindex.js`, viele HTML Login/Farm-Dateien).
- `grep load-sample` oder Suche nach `example-farm.json` -> findet Sample-Data-Loader in `src/App.js`.

---
Falls Teile der Architektur falsch sind oder du möchtest, dass diese Datei zusätzliche Workflows (CI, Deploy, oder welche HTML kanonisch ist) enthält, sag mir welche Dateien/Seiten am wichtigsten sind und ich werde iterieren.

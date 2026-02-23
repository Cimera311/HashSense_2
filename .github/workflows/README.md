# GitHub Actions - Marketplace Data Collection

## 🎯 Zweck

Diese GitHub Action sammelt **automatisch alle 10 Sekunden** Daten vom GoMining Marketplace API und speichert sie im Cloudflare Worker KV Storage für eine lückenlose Historie.

## ⚙️ Wie es funktioniert

### Workflow: `collect-marketplace-data.yml`

**Zeitplan:**
- Läuft **jede Minute** (GitHub Actions Minimum-Intervall)
- Macht **6 Requests pro Minute** (alle 10 Sekunden)
- = **360 Requests pro Stunde** = **8.640 Requests pro Tag**

**Ablauf pro Minute:**
```
0:00 → Request 1 → Worker sammelt Daten
0:10 → Request 2 → Worker sammelt Daten
0:20 → Request 3 → Worker sammelt Daten
0:30 → Request 4 → Worker sammelt Daten
0:40 → Request 5 → Worker sammelt Daten
0:50 → Request 6 → Worker sammelt Daten
```

**Vorteile:**
- ✅ Komplett kostenlos (GitHub Free Tier: 2000 Minuten/Monat)
- ✅ Läuft 24/7 automatisch
- ✅ Keine Browser-Tabs offen halten nötig
- ✅ Lückenlose Datenerfassung
- ✅ Fehlerbehandlung und Logging

## 📊 Limits & Kosten

### GitHub Actions Free Tier
- **2000 Minuten/Monat** = ~1,4 Minuten pro Stunde 24/7
- **Unser Verbrauch:** ~1440 Minuten/Monat (innerhalb Limit! ✅)
- **Kosten:** $0.00

### Cloudflare Workers Free Tier
- **100.000 Requests/Tag**
- **Unser Verbrauch:** 8.640 Requests/Tag (innerhalb Limit! ✅)
- **Kosten:** $0.00

## 🚀 Aktivierung

Die Workflow-Datei ist bereits committed. GitHub Actions aktiviert sich automatisch nach dem Push:

```bash
git add .github/workflows/collect-marketplace-data.yml
git commit -m "Add automated marketplace data collection (every 10s)"
git push
```

## 🔍 Monitoring

### Im GitHub Repository:
1. Gehe zu **Actions** Tab
2. Sieh **"Collect GoMining Marketplace Data"** Workflow
3. Klick auf einen Run um Details zu sehen

### Live-Status prüfen:
```bash
# Manuell triggern
# GitHub → Actions → Workflow → "Run workflow"

# Stats vom Worker abrufen
curl https://gomining-marketplace.cimerawow.workers.dev/stats
```

## ⏸️ Pausieren/Deaktivieren

### Temporär pausieren:
GitHub → Actions → Workflow → `...` → "Disable workflow"

### Dauerhaft entfernen:
```bash
git rm .github/workflows/collect-marketplace-data.yml
git commit -m "Remove automated data collection"
git push
```

## 🛠️ Anpassungen

### Intervall ändern (z.B. alle 30 Sekunden):
```yaml
# Ändere in collect-marketplace-data.yml:
for i in {1..2}; do  # Nur 2x statt 6x
  # ...
  sleep 30  # 30 Sekunden statt 10
done
```

### Nur tagsüber laufen lassen:
```yaml
# Cron: Nur 8-20 Uhr
- cron: '* 8-20 * * *'
```

## 📈 Erwartete Ergebnisse

- **Nach 1 Stunde:** 360 Worker-Requests
- **Nach 1 Tag:** 8.640 Worker-Requests
- **Nach 1 Woche:** ~60.000 Worker-Requests
- **Gespeicherte Transaktionen:** Abhängig von GoMining Marketplace Aktivität

Der Worker dedupliziert automatisch, also werden nur **einzigartige Transaktionen** gespeichert!

## 🐛 Troubleshooting

**Action läuft nicht:**
- Check GitHub → Settings → Actions → "Allow all actions"
- Workflow muss im `main` oder `master` Branch sein

**Worker nicht erreichbar:**
- Prüfe Worker Status: https://gomining-marketplace.cimerawow.workers.dev/health
- Check Cloudflare Dashboard für Errors

**Zu viele Requests:**
- Reduziere Loop-Count von 6 auf 3 (alle 20s)
- Oder ändere Cron zu `*/2 * * * *` (alle 2 Minuten)

# ⚖️ HashFarm Legal Documents - Ausfüll-Checkliste

## 📋 Was du jetzt tun musst

Alle drei Dateien wurden erstellt, aber du musst noch **deine persönlichen Daten** einfügen:

### 1. **privacy-policy.html** ausfüllen

Suche nach `[PLATZHALTER]` und ersetze:

- [ ] `[IHR NAME / FIRMENNAME]` → Dein Name oder Firmenname
- [ ] `[STRASSE UND HAUSNUMMER]` → Deine Adresse
- [ ] `[PLZ ORT]` → Deine PLZ und Stadt
- [ ] `[LAND]` → Dein Land (z.B. "Deutschland")
- [ ] `[IHRE@EMAIL.COM]` → Deine Kontakt-Email (mehrfach im Dokument!)

**Tipp:** Suche mit `Ctrl+F` nach `[` um alle Platzhalter zu finden.

---

### 2. **terms-of-service.html** ausfüllen

Suche und ersetze:

- [ ] `[IHRE@EMAIL.COM]` → Deine Kontakt-Email (mehrfach!)
- [ ] `[IHR ORT]` → Dein Gerichtsstand (meist dein Wohnort)

---

### 3. **imprint.html** ausfüllen (⚠️ WICHTIGSTE DATEI!)

**Pflichtangaben nach § 5 TMG:**

- [ ] `[IHR NAME / FIRMENNAME]` → Vollständiger Name oder Firma
- [ ] `[STRASSE UND HAUSNUMMER]` → Deine ladungsfähige Adresse
- [ ] `[PLZ ORT]` → PLZ und Ort
- [ ] `[LAND]` → Land
- [ ] `[IHR VOLLSTÄNDIGER NAME]` → Dein voller Name (als Verantwortlicher)
- [ ] `[IHRE@EMAIL.COM]` → Deine Email (mehrfach!)
- [ ] `[OPTIONAL: +49 XXX XXXXXXXX]` → Optional: Telefonnummer

**Optional (falls zutreffend):**

- [ ] `[DE123456789]` → Deine USt-ID (falls vorhanden)
- [ ] `[DEXXXXXXXXXXX]` → Wirtschafts-ID (nur für Gewerbetreibende)

**Falls du KEINE USt-ID hast:**
→ Lösche den kompletten Abschnitt "Umsatzsteuer-Identifikationsnummer"

**Falls du KEINE Wirtschafts-ID hast:**
→ Lösche den kompletten Abschnitt "Wirtschafts-Identifikationsnummer"

---

## 🚨 Rechtliche Anforderungen

### Minimum Requirements (Pflicht in Deutschland/EU):

✅ **Impressum** (imprint.html)
- Name und Anschrift
- Kontaktdaten (Email)
- Vertretungsberechtigte Person

✅ **Datenschutzerklärung** (privacy-policy.html)
- Welche Daten werden gesammelt
- Wie werden sie verwendet
- Rechte der Nutzer

✅ **Nutzungsbedingungen** (terms-of-service.html)
- Haftungsausschluss
- Nutzungsregeln
- Geistiges Eigentum

---

## 🍪 Cookie-Consent Banner (noch nicht implementiert!)

⚠️ **WICHTIG:** Da du Google Analytics verwendest, brauchst du einen **Cookie-Consent-Banner**!

**Empfohlene Tools:**
- [Cookiebot](https://www.cookiebot.com/) - Kommerziell, sehr gut
- [Klaro!](https://kiprotect.com/klaro) - Open Source, DSGVO-konform
- [CookieYes](https://www.cookieyes.com/) - Freemium

**Was der Banner machen muss:**
1. ❌ Google Analytics darf NICHT laden bevor User zugestimmt hat
2. ✅ User kann ablehnen (kein "Cookie Wall")
3. ✅ Einstellungen müssen jederzeit änderbar sein
4. ✅ Plausible Analytics kann ohne Consent laufen (DSGVO-konform)

---

## 📝 Quick-Fix Anleitung

### Schritt 1: Alle Platzhalter ersetzen
```bash
# Öffne jede Datei in VS Code
# Drücke Ctrl+H (Find & Replace)
# Suche nach: [
# Ersetze alle Platzhalter
```

### Schritt 2: Footer-Links prüfen
Prüfe ob in `farm2.html` und `HashSense.html` die Footer-Links korrekt sind:

```html
<a href="privacy-policy.html">Privacy Policy</a>
<a href="terms-of-service.html">Terms of Service</a>
<a href="imprint.html">Impressum</a>
```

### Schritt 3: Testen
- [ ] Öffne alle drei Seiten im Browser
- [ ] Prüfe ob alle Platzhalter ersetzt wurden
- [ ] Prüfe ob Links funktionieren
- [ ] Prüfe ob Zurück-Buttons funktionieren

---

## 🔍 Rechtliche Prüfung (empfohlen)

**Option A: Automatische Generatoren**
- [Datenschutz-Generator.de](https://www.datenschutz-generator.de/) - Kostenlos
- [eRecht24](https://www.e-recht24.de/) - Premium (€)

**Option B: Anwalt konsultieren** (empfohlen für Commercial)
- Medienrechtler / IT-Rechtler
- Kosten: ca. 200-500€ einmalig
- Sicherheit: Rechtssichere Texte

---

## ⚠️ Häufige Fehler vermeiden

❌ **NICHT:**
- Platzhalter vergessen zu ersetzen
- Falsche/alte Adresse angeben
- Email-Adresse vergessen
- Google Analytics ohne Consent laden
- Cookie-Banner weglassen

✅ **RICHTIG:**
- Alle Angaben vollständig
- Ladungsfähige Adresse
- Funktionierende Email
- Cookie-Consent VOR Analytics
- Regelmäßig aktualisieren

---

## 📅 Wartung

**Jährlich prüfen:**
- [ ] Sind alle Angaben noch aktuell?
- [ ] Hat sich die Rechtslage geändert?
- [ ] Neue Dienste hinzugefügt? (z.B. neue Analytics)
- [ ] Cookie-Consent noch DSGVO-konform?

**Bei Änderungen:**
- [ ] Datenschutzerklärung anpassen
- [ ] "Stand: [DATUM]" aktualisieren
- [ ] Nutzer informieren (bei wesentlichen Änderungen)

---

## ✅ Checkliste für Go-Live

Vor dem Deployment prüfen:

- [ ] Alle Platzhalter in allen 3 Dateien ersetzt
- [ ] Impressum vollständig ausgefüllt
- [ ] Email-Adressen funktionieren
- [ ] Footer-Links auf allen Seiten funktionieren
- [ ] Cookie-Consent-Banner implementiert
- [ ] Google Analytics lädt NUR nach Consent
- [ ] Plausible Analytics läuft (ist DSGVO-OK)
- [ ] Alle Seiten im Browser getestet
- [ ] Mobile-Ansicht geprüft

---

## 🆘 Support

Bei Fragen zur Rechtslage:
- **Deutschland:** [eRecht24.de](https://www.e-recht24.de/)
- **Österreich:** [WKO Datenschutz](https://www.wko.at/datenschutz)
- **Schweiz:** [EDÖB](https://www.edoeb.admin.ch/)

---

**Stand:** Dezember 2025  
**Status:** Templates erstellt, müssen ausgefüllt werden ⚠️
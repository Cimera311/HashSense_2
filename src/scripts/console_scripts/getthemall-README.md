# GoMining GetThemAll — erster Entwurf

Den gesamten Inhalt von `gomining-getthemall-export.js` auf der angemeldeten
GoMining-Seite in die Browserkonsole einfügen. Das Einfügen registriert nur die
Befehle. Danach starten:

```js
await getthemall();
```

Reihenfolge: Wallet-Guthaben, Minerbestand samt Käufen/Upgrades/Verkäufen,
Mining-Einnahmen, Miner Wars, Referral-Einnahmen, geworbene Nutzer, Transaktionen,
Kreditkarten. Alle verfügbaren Zeiträume der bisherigen Exporte werden verwendet.
Kein Marketplace-Export, keine Preismatrix, keine Diagnosewerkzeuge.

## Enthaltene Module

| Modul | Inhalt | Quelldatei | Ausgabedateien |
| --- | --- | --- | --- |
| `balances` | Wallet-Guthaben | `gomining-wallet-balances-export.js` | `gomining-wallet-balances_<Datum>.csv`, `.json` |
| `miners` | Minerbestand, Käufe, Upgrades, Verkäufe | `gomining-miners-exportall_purchase_upgrades_sales_current_approved.js` | `gomining-current-miners-`, `gomining-purchases-`, `gomining-upgrades-`, `gomining-sales-<Datum>.csv` |
| `income` | Mining-Einnahmen (Details und Tagesübersicht) | `gomining-nft-income-export.js` | `gomining_income_all_detail_<Datum>.csv`, `gomining_income_all_summary_<Datum>.csv` |
| `wars` | Miner Wars | `gomining-miners-wars-export.js` | `gomining_miners_wars_all_<Datum>.csv` |
| `referrals` | Referral-Einnahmen | `gomining-referral-complete-export_approved.js` | `gomining_referral_<Datum>.csv` |
| `referralUsers` | Geworbene Nutzer | `gomining-referral-users-export.js` | `gomining_referral_users_<Datum>.csv` |
| `transactions` | Wallet-Transaktionen | `gomining-export-final_transactions_approved.js` | `gomining_export_<Datum>.csv` |
| `cards` | Kreditkarten: Zahlungen, Karten, Kartenguthaben | `gomining-cards-export.js` | `gomining-card-payments_`, `gomining-cards_`, `gomining-card-balances_<Datum>.csv` |

Alle CSVs sind Semikolon-getrennt mit Dezimalkomma; die Module `income`, `wars`,
`balances`, `referralUsers`, `referrals` und `cards` schreiben zusätzlich ein UTF-8-BOM.

Die bestehenden CSV-/JSON-Generatoren und Dateinamen bleiben erhalten.
Mining-Einnahmen liefern Details und Tagesübersicht aus einem gemeinsamen Abruf.
Bei Referral-Einnahmen und geworbenen Nutzern wird der CSV-Schritt mit ausgeführt.
Die Historie eigener Miner-Verkäufe gehört weiterhin zum Minerexport.

Die Dateien erfolgreicher Module werden zunächst im Arbeitsspeicher gesammelt;
am Ende werden die einzelnen Downloads angefordert. Der Browser kann verlangen,
mehrere Downloads für GoMining zuzulassen. Der Starter kann nicht feststellen,
ob eine Datei tatsächlich auf der Festplatte gespeichert wurde.

## Bedienung

```js
gmExport.status();        // Fortschritt, Anfragen, Fehler und Dateiliste
gmExport.pause();         // vor der nächsten Anfrage pausieren
gmExport.resume();        // weiterarbeiten
gmExport.stop();          // laufende Anfrage abbrechen und Lauf beenden
await gmExport.downloadAll();  // fertige Dateien erneut herunterladen
gmExport.download('DATEINAME_AUS_DER_STATUSLISTE.csv'); // einzelne Datei
```

Kleiner erster Live-Test:

```js
await getthemall({ modules: ['balances'] });
```

Einzelne Module oder eine andere Reihenfolge:

```js
await getthemall({ modules: ['income', 'wars', 'transactions'] });
```

Verfügbare Namen: `balances`, `miners`, `income`, `wars`, `referrals`,
`referralUsers`, `transactions`, `cards`. Derselbe Starter ist auch unter
`gmExport.all()` erreichbar. Für einen Lauf ohne automatische Downloads:

```js
await getthemall({ download: false });
```

## Kreditkarten (`cards`)

API-Basis ist `https://internal-api.baas.gomining.com/api/cards/internal`:

- `POST /v2/card/index` — Kartenliste (Nummern nur maskiert)
- `POST /v1/payment/index` — Zahlungen und Aufladungen; Pflichtfelder `paymentType` (Array, leer = alle) und `pagination`, Zeitraum über `periodFrom`/`periodTo` in Millisekunden
- `POST /v1/wallet/get-balances` — Kartenguthaben je Asset
- `POST /v1/asset/index` — Zuordnung Asset-ID zu Name

Beobachtete Zahlungstypen: `topup-order` (Aufladung, `credit`) und `unlimit-transaction`
(Kartenzahlung, `debit`). Beträge (`valueNumeric`, `amountInEur`, Guthaben) sind wie bei den
Wallets Rohwerte mit 18 Nachkommastellen und werden umgerechnet; die Rohwerte bleiben in
der CSV. `paymentData.amountInCurrency` ist der Originalbetrag beim Händler und bereits
ein Dezimalwert. Weicht die Skalierung bei Stablecoin-Zahlungen auffällig vom
Originalbetrag ab, warnt das Modul; dann `cardsExportConfig.decimals` anpassen.

`amountInEur` ist der von GoMining gelieferte Gegenwert und keine eigene Kursbewertung.
Das Modul läuft auch allein: `exportCards()` oder `getthemall({ modules: ['cards'] })`.

## Token und Unterbrechungen

Vor jeder Anfrage wird das aktuelle Token aus Cookies/Browser-Speicher gelesen.
Ein dort geänderter Wert wird gegenüber einem alten zwischengespeicherten Token
bevorzugt. Der Starter überschreibt weder `fetch` noch Tokens der GoMining-Seite.

Bei HTTP 401 wird ein bereits gewechseltes Token für dieselbe Anfrage verwendet.
Andernfalls pausiert der Lauf. GoMining im selben Tab verwenden und danach
`gmExport.resume()` eingeben. Ohne ein neues Token bleibt der Lauf pausiert.
Ein automatischer serverseitiger Refresh ist noch nicht implementiert.

Falls nötig kann ein Token lokal mit `gmExport.setToken('...')` gesetzt werden.
Es wird nicht ausgegeben und gehört nicht in geteilte Logs. Mit
`gmExport.setToken(null)` wird die automatische Browser-Erkennung wieder aktiv.

Pause/Weiter erhält den aktuellen Aufruf samt Position nur im aktuellen Tab.
Neuladen oder Schließen verliert den Zustand. `stop()` beendet den Lauf; ein
erneuter Start beginnt neu. Es gibt in diesem Entwurf keine dauerhaften
Zwischenstände. Ein neuer Lauf ersetzt die zuvor im Speicher gehaltenen Dateien.

Netzwerkfehler sowie HTTP 429/5xx werden begrenzt wiederholt. Andere Fehler führen
zum Status `fehlgeschlagen`; Dateien dieses Moduls werden nicht freigegeben.
Die anderen Module laufen danach weiter. Erfolgreiche vorherige Module bleiben
auch bei Stop verfügbar. Ein leerer Datensatz kann `fertig, keine Datei` ergeben.

## Prüfung und Wartung

Offline mit simulierten API-Antworten geprüft. Der Karten-Export wurde einzeln live
in der Konsole ausgeführt; als Teil von `getthemall()` sowie GoMinings Refresh-Verhalten
stehen Live-Tests noch aus. Die bestehende Daten-/Seitennavigation wurde
übernommen; ein erfolgreicher Lauf ist keine unabhängige Vollständigkeitsprüfung
gegen den Kontostand bei GoMining.

Die Originalskripte werden nicht verändert. Für Anpassungen und Neuaufbau:

```text
python tools/build_getthemall.py
node tools/test_getthemall.cjs
```

Der Builder kapselt die acht Originaldateien in getrennte Funktionen und
ergänzt den gemeinsamen Starter aus `tools/getthemall-runtime.js`. Anfragen sind auf
`api.gomining.com`, `referral-api.bounty.gomining.com` und
`internal-api.baas.gomining.com` beschränkt. `gomining-getthemall-export.js` wird
generiert und nicht von Hand bearbeitet; Änderungen gehören in die Quelldateien. Er korrigiert
im Bundle die Browser-unverträgliche `process.stdout`-Zeile des Transaktionsexports
und bindet dessen globale Konfiguration lokal. Das generierte Skript benötigt
keine Bibliothek, keinen Server und keine weiteren Skriptdateien im Browser.

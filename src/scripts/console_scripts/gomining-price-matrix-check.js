// In der GoMining-Browserkonsole ausführen. Liest ausschließlich Preiskonfigurationen.
// Geöffnete englische "Miner levels"-Preisliste prüfen (ganze Stufen 12–20 W/TH).
// W/TH wird abgefragt; Preise werden unabhängig aus dem sichtbaren Seitentext gelesen.
// Ändert keine Miner und keine priceMatrix.js. Export enthält keine Anmeldedaten.
(async function () {
  'use strict';

  const copyResult = typeof copy === 'function' ? copy : null;
  const api = 'https://api.gomining.com/api';
  const expectedTH = [1, 2, 4, 8, 16, 32, 48, 64, 96, 128, 192, 256, 384, 512, 768, 1024, 1536, 2560, 3584];

  function readVisiblePrices() {
    const text = document.body.innerText.replace(/\u00a0|\u202f/g, ' ');
    if (!/Miner levels/i.test(text)) throw new Error('Bitte zuerst die englische Miner levels / Price list öffnen.');
    // Jede Zeile muss Level, TH und USD/TH enthalten. ROI wird nicht erfasst.
    const pattern = /(?:^|\n)\s*(\d{1,2})\s+(\d[\d, ]*)\s*TH\s+\$\s*(\d+\.\d{2})\s*\/\s*TH\b/g;
    const found = [...text.matchAll(pattern)].map(match => ({
      level: Number(match[1]),
      minTH: Number(match[2].replace(/[, ]/g, '')),
      displayedPrice: Number(match[3])
    }));
    if (found.length !== expectedTH.length || found.some((row, index) => row.level !== index + 1 || row.minTH !== expectedTH[index])) {
      throw new Error(`Preisliste nicht eindeutig lesbar (${found.length}/19 Zeilen). Englische USD-Preisliste vollständig öffnen. Bitte diese Fehlermeldung teilen; es werden keine Preise geraten.`);
    }
    return found;
  }

  function findToken() {
    if (typeof globalThis.goMiningToken === 'string') return globalThis.goMiningToken;
    for (const cookie of document.cookie.split(';')) {
      const separator = cookie.indexOf('=');
      if (cookie.slice(0, separator).trim() === 'access_token') {
        return decodeURIComponent(cookie.slice(separator + 1));
      }
    }
    for (const key of ['access_token', 'token', 'auth_token', 'jwt']) {
      const token = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (token) return token;
    }
    return null;
  }

  try {
    globalThis.gmPriceCheck = null;
    const visiblePrices = readVisiblePrices();
    const answer = prompt('Welche W/TH-Stufe hat der geöffnete Miner? Ganze Zahl von 12 bis 20 eingeben.');
    if (answer === null) return;
    const efficiency = Number(answer.trim());
    if (!Number.isInteger(efficiency) || efficiency < 12 || efficiency > 20) {
      throw new Error('Bitte eine ganze W/TH-Stufe von 12 bis 20 verwenden. Zwischenwerte werden noch nicht geprüft.');
    }
    const token = (findToken() || '').replace(/^Bearer\s+/i, '').trim();
    if (!token) throw new Error('Kein Login-Token gefunden. Bei GoMining anmelden und erneut ausführen. Keine Tokens hier teilen.');

    async function readConfig(endpoint) {
      const response = await fetch(api + endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'x-device-type': 'desktop'
        },
        body: '{}'
      });
      if (!response.ok) throw new Error(`${endpoint}: HTTP ${response.status}`);
      const json = await response.json();
      if (!json.data) throw new Error(`${endpoint}: data fehlt.`);
      return json.data;
    }

    const info = await readConfig('/nft/get-power-upgrade-info');
    const rates = await readConfig('/nft/get-upgrade-rate');
    if (JSON.stringify(readVisiblePrices()) !== JSON.stringify(visiblePrices)) {
      throw new Error('Preisliste während der Abfrage geändert. Bitte erneut ausführen.');
    }
    const base = info.price;
    const discount = info.discount;
    if (!Number.isFinite(base) || base <= 0 || !Number.isFinite(discount) || discount < 0 || discount >= 1) {
      throw new Error('Unbekanntes Format für Basispreis oder Rabatt.');
    }
    if (info.defaultNftEE !== 20 || info.discountCoefficient !== 1) {
      throw new Error('Basis-W/TH oder discountCoefficient geändert. Formel muss neu geprüft werden.');
    }
    if (!Array.isArray(info.powersByLevel) || !Array.isArray(rates.powerUpgradePriceConfig)) {
      throw new Error('TH-Stufen oder Aufschläge fehlen.');
    }
    const thresholds = info.powersByLevel.filter(th => th > 0 && th < 5000);
    if (JSON.stringify(thresholds) !== JSON.stringify(expectedTH) || !info.powersByLevel.includes(5000)) {
      throw new Error('TH-Stufen weichen von den erwarteten Stufen ab. Vergleich muss angepasst werden.');
    }
    const steps = [];
    for (let level = efficiency; level < info.defaultNftEE; level++) {
      const matches = rates.powerUpgradePriceConfig.filter(row => row.toLevel === level);
      if (matches.length !== 1 || !Number.isFinite(matches[0].priceUsd) || matches[0].priceUsd < 0) {
        throw new Error(`Ungültiger Aufschlag für Stufe ${level}.`);
      }
      steps.push({ toLevel: level, priceUsd: matches[0].priceUsd });
    }
    const surcharge = steps.reduce((sum, row) => sum + row.priceUsd, 0);
    const rows = thresholds.map((minTH, index) => {
      const rawPrice = base * Math.pow(1 - discount, index) + surcharge;
      const pricePerTH = Number(rawPrice.toFixed(2));
      return {
        level: index + 1,
        minTH,
        rawPrice,
        pricePerTH,
        displayedPrice: visiblePrices[index].displayedPrice,
        difference: Number((pricePerTH - visiblePrices[index].displayedPrice).toFixed(2)),
        matches: pricePerTH === visiblePrices[index].displayedPrice
      };
    });
    const report = {
      capturedAt: new Date().toISOString(),
      efficiency,
      efficiencySource: 'user input',
      reference: 'visible English USD price list (document.body.innerText)',
      formulaStatus: 'hypothesis',
      formula: `price * (1 - discount) ** (level - 1) + sum(priceUsd for efficiency <= toLevel < ${info.defaultNftEE})`,
      rounding: 'Number(rawPrice.toFixed(2))',
      parameters: { base, discount, discountCoefficient: info.discountCoefficient, defaultNftEE: info.defaultNftEE, surcharge, steps },
      allMatchDisplayed: rows.every(row => row.matches),
      note: 'Vergleich gilt nur für die geöffnete Preisliste und die eingegebene W/TH-Stufe. Zwischenwerte sind nicht geprüft.',
      rows
    };
    globalThis.gmPriceCheck = report;
    console.table(rows);
    console.log(report.allMatchDisplayed ? `Alle 19 Preise stimmen mit der geöffneten Preisliste überein (${efficiency} W/TH laut Eingabe).` : 'Abweichungen zur geöffneten Preisliste gefunden; siehe difference.');
    const output = JSON.stringify(report, null, 2);
    if (copyResult) {
      copyResult(output);
      console.log('Prüfbericht in die Zwischenablage kopiert. Diesen Bericht im Chat einfügen.');
    } else {
      console.log('Zum Kopieren in der Konsole ausführen: copy(JSON.stringify(gmPriceCheck, null, 2))');
    }
  } catch (error) {
    console.error('Preisprüfung abgebrochen:', error.message);
  }
})();

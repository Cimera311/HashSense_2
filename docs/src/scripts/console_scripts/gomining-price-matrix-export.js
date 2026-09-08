// Auf der angemeldeten GoMining-Seite vollständig in die Browserkonsole einfügen.
// Fragt minerCost für den 1-TH-Miner mit 12 W/TH in USD ab (wie in der bisherigen Matrix).
// Liest zwei Preis-Endpunkte; keine geöffnete Preisliste erforderlich.
// Download + Zwischenablage: priceMatrix.js mit 12–50 W/TH.
// 21–50 W/TH: abgeleitete, noch nicht gegen GoMining geprüfte Berechnung.
// Negative Rechenergebnisse werden auf 0 USD begrenzt (Nutzervorgabe). Keine Datei wird automatisch ersetzt.
// Formel am 08.09.2026 bei 12, 15 und 20 W/TH gegen 57 angezeigte Preise geprüft.
(async function () {
  'use strict';
  const copyResult = typeof copy === 'function' ? copy : null;
  const expectedPowers = [0, 1, 2, 4, 8, 16, 32, 48, 64, 96, 128, 192, 256, 384, 512, 768, 1024, 1536, 2560, 3584, 5000];

  function askMinerCost() {
    let message = 'minerCost: Aktueller Kaufpreis des 1-TH-Miners mit 12 W/TH in USD?\nZum Beispiel 16,99 oder 16.99 (ohne Tausendertrennzeichen).\nAbbrechen beendet den Export.';
    while (true) {
      const answer = prompt(message);
      if (answer === null) return null;
      const input = answer.trim();
      const value = Number(input.replace(',', '.'));
      if (/^\d+(?:[.,]\d{1,2})?$/.test(input) && Number.isFinite(value) && value > 0) return value;
      message = 'Bitte einen positiven USD-Betrag mit maximal zwei Nachkommastellen eingeben, z. B. 16,99.\nAbbrechen beendet den Export.';
    }
  }

  function findToken() {
    if (typeof globalThis.goMiningToken === 'string') return globalThis.goMiningToken;
    for (const cookie of document.cookie.split(';')) {
      const separator = cookie.indexOf('=');
      if (cookie.slice(0, separator).trim() === 'access_token') return decodeURIComponent(cookie.slice(separator + 1));
    }
    for (const key of ['access_token', 'token', 'auth_token', 'jwt']) {
      const token = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (token) return token;
    }
    return null;
  }

  try {
    globalThis.gmPriceMatrixExport = null;
    const minerCost = askMinerCost();
    if (minerCost === null) {
      console.log('Export abgebrochen.');
      return;
    }
    const token = (findToken() || '').replace(/^Bearer\s+/i, '').trim();
    if (!token) throw new Error('Kein Login-Token gefunden. Bei GoMining anmelden und erneut ausführen.');

    async function readConfig(endpoint) {
      const response = await fetch(`https://api.gomining.com/api/nft/${endpoint}`, {
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
      const result = await response.json();
      if (!result.data) throw new Error(`${endpoint}: data fehlt.`);
      return result.data;
    }

    const info = await readConfig('get-power-upgrade-info');
    const rates = await readConfig('get-upgrade-rate');
    if (info.defaultNftEE !== 20 || info.discountCoefficient !== 1) {
      throw new Error('Basis-W/TH oder discountCoefficient geändert. Berechnung muss erneut geprüft werden.');
    }
    if (!Number.isFinite(info.price) || info.price <= 0 || !Number.isFinite(info.discount) || info.discount < 0 || info.discount >= 1) {
      throw new Error('Ungültiger Basispreis oder Rabatt.');
    }
    if (JSON.stringify(info.powersByLevel) !== JSON.stringify(expectedPowers)) {
      throw new Error('TH-Stufen geändert. Export muss angepasst werden.');
    }
    if (!Array.isArray(rates.powerUpgradePriceConfig)) throw new Error('Effizienzaufschläge fehlen.');
    const steps = [];
    for (let efficiency = 12; efficiency < 50; efficiency++) {
      const matches = rates.powerUpgradePriceConfig.filter(row => row.toLevel === efficiency);
      if (matches.length !== 1 || !Number.isFinite(matches[0].priceUsd) || matches[0].priceUsd < 0) {
        throw new Error(`Ungültiger oder fehlender Aufschlag für ${efficiency} W/TH.`);
      }
      steps.push({ toLevel: efficiency, priceUsd: matches[0].priceUsd });
    }
    const matrix = {};
    for (let efficiency = 12; efficiency <= 50; efficiency++) {
      const surcharge = efficiency <= 20
        ? steps.filter(row => row.toLevel >= efficiency && row.toLevel < 20).reduce((sum, row) => sum + row.priceUsd, 0)
        : -steps.filter(row => row.toLevel >= 20 && row.toLevel < efficiency).reduce((sum, row) => sum + row.priceUsd, 0);
      matrix[efficiency] = expectedPowers.slice(1, -1).map((minTH, index) => {
        const rawPrice = info.price * (1 - info.discount) ** index + surcharge;
        const pricePerTH = Math.max(0, Number(rawPrice.toFixed(2)));
        if (!Number.isFinite(rawPrice) || !Number.isFinite(pricePerTH)) {
          throw new Error(`Ungültiges Rechenergebnis bei ${efficiency} W/TH und ${minTH} TH.`);
        }
        const row = { minTH, pricePerTH };
        if (efficiency === 12 && index === 0) row.minerCost = minerCost;
        return row;
      });
    }

    const capturedAt = new Date().toISOString();
    const blocks = Object.entries(matrix).map(([efficiency, rows]) =>
      `    "${efficiency}": [\n${rows.map(row => `        ${JSON.stringify(row)}`).join(',\n')}\n    ]`
    );
    const source = `// GoMining-Preisexport: ${capturedAt}\n` +
      '// Umfang: ganze W/TH-Stufen 12 bis 50; keine Zwischenwerte.\n' +
      '// Untergrenze 0 USD auf Nutzerwunsch; kein bestätigter GoMining-Mindestpreis.\n' +
      '// 21–50 W/TH sind unbestätigt: Basispreis mit Levelrabatt minus Stufenbeträge 20 bis W/TH-1.\n' +
      '// minerCost manuell eingegeben (1 TH, 12 W/TH, USD).\n' +
      `// API-Basispreis: ${info.price}; Levelrabatt: ${info.discount}; discountCoefficient: 1.\n` +
      `const priceMatrixdatei = {\n${blocks.join(',\n')}\n};\n`;
    globalThis.gmPriceMatrixExport = {
      capturedAt, matrix, source,
      parameters: { base: info.price, discount: info.discount, discountCoefficient: info.discountCoefficient, defaultNftEE: info.defaultNftEE, steps },
      minerCostSource: 'manual input: 1 TH, 12 W/TH, USD',
      validation: { comparedWithGoMining: [12, 15, 20], inferredEfficiencies: Array.from({ length: 30 }, (_, i) => i + 21) }
    };
    console.table(Object.entries(matrix).map(([efficiency, rows]) => ({
      WTH: Number(efficiency), status: Number(efficiency) > 20 ? 'unbestätigt' : 'Formel 12/15/20 geprüft', rows: rows.length,
      priceAt1TH: rows[0].pricePerTH, priceAt3584TH: rows[18].pricePerTH
    })));
    console.log(`741 Preise erzeugt. minerCost: ${minerCost} USD. Enthält 12–50 W/TH (21–50 unbestätigt). Negative Rechenergebnisse werden auf 0 USD begrenzt (Nutzervorgabe).`);

    // Ausgabewege unabhängig: Bei gesperrter Zwischenablage bleibt der Download verfügbar.
    if (copyResult) {
      try {
        copyResult(source);
        console.log('JavaScript für priceMatrix.js in die Zwischenablage kopiert.');
      } catch {
        console.warn('Zwischenablage nicht verfügbar. Download oder copy(gmPriceMatrixExport.source) verwenden.');
      }
    } else {
      console.log('Zum Kopieren ausführen: copy(gmPriceMatrixExport.source)');
    }
    const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'priceMatrix.js';
    document.body.appendChild(link);
    try {
      link.click();
      console.log('Download priceMatrix.js angefordert.');
    } finally {
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
  } catch (error) {
    console.error('Preisexport fehlgeschlagen:', error.message);
  }
})();

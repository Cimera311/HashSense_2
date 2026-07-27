// ============================================================
// GoMining Miners Wars Export
// Endpoint: POST /api/nft-game/nft-game-income/find-aggregated-by-date
// ============================================================
//
// Struktur: 1 Datensatz pro Wars-Woche (wöchentliche Auszahlung,
//           jeweils dienstags). KEIN incomeList[] — nur Farm-Level.
//
// Exportfunktionen:
//   exportWarsAll()
//   exportWarsByYear(2026)
//   exportWarsByMonth(2026, 5)
//
//   stopWarsExport = true   → Abbrechen
//   warsData                → Rohdaten (letzter Abruf)
// ============================================================

(function () {
    'use strict';

    const API_BASE = 'https://api.gomining.com/api';
    const LIMIT    = 20;

    // ── Token detection ─────────────────────────────────────────────
    function findToken() {
        for (const c of document.cookie.split(';')) {
            const [n, v] = c.trim().split('=');
            if (n === 'access_token') return decodeURIComponent(v);
        }
        for (const key of ['access_token', 'token', 'auth_token', 'jwt']) {
            const t = localStorage.getItem(key) || sessionStorage.getItem(key);
            if (t) return t;
        }
        return null;
    }

    function getHeaders(token) {
        return {
            'Authorization': `Bearer ${token.replace('Bearer ', '').trim()}`,
            'Content-Type':  'application/json',
            'Accept':        'application/json',
            'Origin':        'https://app.gomining.com',
            'Referer':       'https://app.gomining.com/',
            'x-device-type': 'desktop',
        };
    }

    // ── Fetch all Wars records ───────────────────────────────────────
    async function fetchAllWars(token, startDate, endDate) {
        let skip       = 0;
        let totalCount = null;
        const all      = [];

        console.log(`\n📅 Wars Zeitraum: ${startDate} → ${endDate}`);

        while (true) {
            if (globalThis.stopWarsExport) {
                console.log('🛑 Export gestoppt.');
                break;
            }

            const res = await fetch(`${API_BASE}/nft-game/nft-game-income/find-aggregated-by-date`, {
                method:  'POST',
                headers: getHeaders(token),
                body:    JSON.stringify({ startDate, endDate, limit: LIMIT, skip }),
            });

            if (!res.ok) {
                let msg = `HTTP ${res.status}`;
                try { msg += ': ' + JSON.stringify(await res.json()); } catch (_) {}
                console.error(`❌ ${msg}`);
                break;
            }

            const json  = await res.json();
            const data  = json.data || {};
            const items = data.array || [];
            const count = data.count ?? 0;

            if (totalCount === null) {
                totalCount = count;
                console.log(`   📊 Gesamt: ${totalCount} Wars-Wochen | totalIncome: ${data.totalIncome ?? '?'} BTC`);
            }

            if (!items.length) break;

            all.push(...items);
            skip += LIMIT;
            console.log(`   Batch ${Math.ceil(skip / LIMIT)}: +${items.length} Wochen (${all.length}/${totalCount})`);

            if (skip >= totalCount) break;
            await new Promise(r => setTimeout(r, 200));
        }

        console.log(`✅ ${all.length} Wars-Datensätze geladen`);
        return all;
    }

    // ── Helpers ─────────────────────────────────────────────────────
    function de(v) {
        if (v === null || v === undefined || v === '') return '';
        const n = parseFloat(v);
        return isNaN(n) ? String(v) : n.toString().replace('.', ',');
    }
    function bool(v) { return v ? 'ja' : 'nein'; }
    function isoDate(s) { return s ? s.split('T')[0] : ''; }
    function q(v) { return `"${String(v ?? '').replace(/"/g, '""')}"`; }

    // ── Approximate Wars week start (calculatedAt − 6 days) ─────────
    function warsWeekStart(calculatedAt) {
        if (!calculatedAt) return '';
        const d = new Date(calculatedAt);
        d.setDate(d.getDate() - 6);
        return d.toISOString().split('T')[0];
    }

    // ────────────────────────────────────────────────────────────────
    //  CSV — WARS (eine Zeile pro Wars-Woche / Auszahlung)
    // ────────────────────────────────────────────────────────────────
    function toCSVWars(records) {
        const headers = [
            'Nr',
            // Datum
            'Datum Ausgezahlt',          // createdAt
            'Wars Woche Ende',           // calculatedAt
            'Wars Woche Start (ca.)',     // calculatedAt − 6 Tage
            // Einnahmen
            'Total Reward (BTC)',         // totalReward — 0 wenn rewardProtection
            'Raw Value (BTC)',            // metaData.rawValue
            'Maintenance BTC',           // metaData.maintenanceInBtc
            'Net BTC (Raw − Wartung)',    // rawValue − maintenanceInBtc
            'C1 Value (BTC)',
            'C2 Value (BTC)',
            'C3 Value',
            'C4 Value',
            'C1 Value (GMT)',
            'C2 Value (GMT)',
            // Farm-Infos
            'NFT Anzahl',                // nftsCount
            'Farm Power (TH)',           // power
            'Energie-Effizienz (W/TH)', // energyEfficiency
            'Effizienz-Abnahme',        // energyEfficiencyDecreaseValue
            // Wartung
            'Wartung GMT (ohne Rabatt)', // metaData.dataForGmtMaintenance.maintenanceInGmtWithoutDiscount
            'Wartung GMT (nach Rabatt)', // metaData.dataForGmtMaintenance.totalMaintenanceBeforeTokenDiscount
            'GMT Balance',               // metaData.dataForGmtMaintenance.balanceGmt
            'Locked GMT',                // metaData.dataForGmtMaintenance.lockedGmt
            'Discount by Maint GMT',     // discountByMaintenanceInGmt
            'Total Discount',            // totalDiscount
            'Insurance',                 // insurance
            // Flags
            'Reward Protection',
            'Reinvestment',
            'Reinvestment NFT ID',
            'Status',
            'To Address',
            'To Wallet Type',
            'Bonus for Clan Author',
            // incomeStatistic Felder
            'BTC Kurs (USD)',            // incomeStatistic.btcCourseInUsd
            'GMT Preis',                 // incomeStatistic.gmtPrice
            'kWh Preis',                 // incomeStatistic.kilowattHour
            'Income per TH',             // incomeStatistic.incomePerTh
            'Total Farm Income (BTC)',   // incomeStatistic.totalIncome
            'Total Supply',              // incomeStatistic.totalSupply
            'reinvestmentStatus',        // incomeStatistic.reinvestmentStatus
            'Transaction ID',            // incomeStatistic.transactionId
            'incomeStatistic ID',        // incomeStatistic.id
        ];

        const rows = records.map((r, i) => {
            const stat  = r.incomeStatistic || {};
            const meta  = r.metaData        || {};
            const gmtM  = meta.dataForGmtMaintenance || {};
            const calcAt = stat.calculatedAt ?? r.createdAt;
            const rawVal = meta.rawValue              ?? 0;
            const maintB = meta.maintenanceInBtc      ?? 0;
            const netBtc = parseFloat((rawVal - maintB).toFixed(12));

            return [
                i + 1,
                isoDate(r.createdAt),
                isoDate(calcAt),
                warsWeekStart(calcAt),
                de(r.totalReward),
                de(rawVal),
                de(maintB),
                de(netBtc),
                de(r.c1Value),
                de(r.c2Value),
                de(r.c3Value),
                de(r.c4Value),
                de(r.c1ValueInGmt),
                de(r.c2ValueInGmt),
                r.nftsCount  ?? '',
                de(r.power),
                de(r.energyEfficiency),
                de(r.energyEfficiencyDecreaseValue),
                de(gmtM.maintenanceInGmtWithoutDiscount),
                de(gmtM.totalMaintenanceBeforeTokenDiscount),
                de(gmtM.balanceGmt),
                de(gmtM.lockedGmt),
                de(r.discountByMaintenanceInGmt),
                de(r.totalDiscount),
                de(r.insurance),
                bool(r.rewardProtection),
                bool(r.reinvestment),
                r.reinvestmentInPowerNftId ?? '',
                r.status ?? '',
                r.toAddress   ?? '',
                r.toWalletType ?? '',
                de(r.bonusForClanAuthor),
                de(stat.btcCourseInUsd),
                de(stat.gmtPrice),
                de(stat.kilowattHour),
                de(stat.incomePerTh),
                de(stat.totalIncome),
                stat.totalSupply ?? '',
                stat.reinvestmentStatus ?? '',
                stat.transactionId ?? '',
                stat.id ?? '',
            ].map(q).join(';');
        });

        return '\uFEFF' + headers.join(';') + '\n' + rows.join('\n');
    }

    // ── Download helper ──────────────────────────────────────────────
    function downloadCSV(csv, tag) {
        const today    = new Date().toISOString().split('T')[0];
        const filename = `gomining_miners_wars_${tag}_${today}.csv`;
        const blob     = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url      = URL.createObjectURL(blob);
        const a        = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        const lines = csv.split('\n').length - 1;
        console.log(`\n💾 ${filename}  (${lines} Zeilen)`);
    }

    function requireToken() {
        const t = (globalThis.goMiningToken || findToken() || '').replace('Bearer ', '').trim();
        if (!t) { console.error('❌ Kein Token! Bitte einloggen.'); return null; }
        return t;
    }

    // ── Universal run helper ─────────────────────────────────────────
    async function run(startDate, endDate, tag) {
        const token = requireToken();
        if (!token) return;
        globalThis.stopWarsExport = false;

        const records = await fetchAllWars(token, startDate, endDate);
        if (!records.length) { console.log('⚠️ Keine Wars-Daten gefunden.'); return; }
        globalThis.warsData = records;

        const csv = toCSVWars(records);
        downloadCSV(csv, tag);
    }

    // ── Export functions ─────────────────────────────────────────────
    async function exportWarsAll() {
        await run('2020-01-01T00:00:00.000Z', new Date().toISOString(), 'all');
    }
    async function exportWarsByYear(year) {
        const y = parseInt(year);
        await run(`${y}-01-01T00:00:00.000Z`, `${y}-12-31T23:59:59.999Z`, `year_${y}`);
    }
    async function exportWarsByMonth(year, month) {
        const y = parseInt(year), m = parseInt(month), mm = String(m).padStart(2, '0');
        const last = new Date(y, m, 0).getDate();
        await run(`${y}-${mm}-01T00:00:00.000Z`, `${y}-${mm}-${last}T23:59:59.999Z`, `month_${y}_${mm}`);
    }

    // ── Expose globally ──────────────────────────────────────────────
    Object.assign(globalThis, {
        exportWarsAll,
        exportWarsByYear,
        exportWarsByMonth,
        stopWarsExport: false,
    });

    console.log(`
╔══════════════════════════════════════════════════════════════╗
║       ⚔️  GoMining Miners Wars Export ✅                      ║
╚══════════════════════════════════════════════════════════════╝

  Endpunkt: /api/nft-game/nft-game-income/find-aggregated-by-date
  Struktur:  1 Zeile pro Wars-Woche (wöchentliche Auszahlung)
  Spalten:   ~38 | Semikolon-getrennt, UTF-8 BOM

  ── EXPORT FUNKTIONEN ───────────────────────────────────────
   exportWarsAll()
   exportWarsByYear(2026)
   exportWarsByMonth(2026, 5)

   stopWarsExport = true   → Abbrechen
   warsData                → Rohdaten (letzter Abruf)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Limit: ${LIMIT} pro Request | ca. 113 Wars-Wochen gesamt
`);

})();

// ============================================================
// GoMining NFT Daily Income Export
// Endpoint: POST /api/nft-income/find-aggregated-by-date
// ============================================================
//
// Struktur: 1 Datensatz pro Tag, jeder enthält incomeList[]
//           mit einem Eintrag pro Miner → Detail-Export fächert
//           auf eine Zeile pro Miner pro Tag auf.
//
// ──── DETAIL-EXPORT (eine Zeile pro Miner pro Tag) ────────
//   exportIncomeAll()
//   exportIncomeByYear(2026)
//   exportIncomeByMonth(2026, 5)
//   exportIncomeByDay('2026-05-26')
//
// ──── TAGES-SUMMARY (eine Zeile pro Tag) ──────────────────
//   exportIncomeSummaryAll()
//   exportIncomeSummaryByYear(2026)
//   exportIncomeSummaryByMonth(2026, 5)
//   exportIncomeSummaryByDay('2026-05-26')
//
//   stopIncomeExport = true    → Abbrechen
//   incomeData                 → Rohdaten (letzter Abruf)
// ============================================================

(function () {
    'use strict';

    const API_BASE = 'https://api.gomining.com/api';
    const LIMIT    = 20;    // API akzeptiert max 20

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
            'Authorization':  `Bearer ${token.replace('Bearer ', '').trim()}`,
            'Content-Type':   'application/json',
            'Accept':         'application/json',
            'Origin':         'https://app.gomining.com',
            'Referer':        'https://app.gomining.com/',
            'x-device-type':  'desktop',
        };
    }

    // ── Pagination ──────────────────────────────────────────────────
    async function fetchAllIncome(token, startDate, endDate) {
        let skip       = 0;
        let totalCount = null;
        const all      = [];

        console.log(`\n📅 Zeitraum: ${startDate} → ${endDate}`);

        while (true) {
            if (globalThis.stopIncomeExport) {
                console.log('🛑 Export gestoppt.');
                break;
            }

            const res = await fetch(`${API_BASE}/nft-income/find-aggregated-by-date`, {
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

            const json = await res.json();
            const data  = json.data || {};
            const items = data.array || [];
            const count = data.count ?? 0;

            if (totalCount === null) {
                totalCount = count;
                console.log(`   📊 Gesamt: ${totalCount} Tages-Einträge | totalIncome: ${data.totalIncome ?? '?'} BTC`);
            }

            if (!items.length) break;

            all.push(...items);
            skip += LIMIT;
            const minerRows = all.reduce((s, r) => s + (r.incomeList?.length || 0), 0);
            console.log(`   Batch ${Math.ceil(skip / LIMIT)}: +${items.length} Tage (${all.length}/${totalCount}) | ~${minerRows} Miner-Zeilen`);

            if (skip >= totalCount) break;
            await new Promise(r => setTimeout(r, 200));
        }

        console.log(`✅ ${all.length} Datensätze geladen`);
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
    function isoTime(s) { return s ? (s.split('T')[1]?.split('.')[0] ?? '') : ''; }
    function q(v) { return `"${String(v ?? '').replace(/"/g, '""')}"`; }

    // ────────────────────────────────────────────────────────────────
    //  CSV 1 — DETAIL  (eine Zeile pro Miner pro Tag)
    //  Quelle: incomeList[] innerhalb jedes Tages-Datensatzes
    // ────────────────────────────────────────────────────────────────
    function toCSVDetail(dayRecords) {
        const headers = [
            'Nr',
            // Datum / Miner-Identifikation
            'Datum',
            'Berechnet am (calculatedAt)',
            'NFT ID',
            'Miner Name',
            'External URL ID',
            // Einnahmen
            'BTC Einnahme (value)',
            'BTC Total Value',
            'Raw Value (metaData)',
            'Pool Reward (metaData)',
            // Energie / Power
            'Power (TH)',
            'kW Verbraucht',
            'Energie-Effizienz (W/TH)',
            'Energie-Effizienz Abnahme',
            // Wartung
            'Wartung in GMT',
            'Wartungsrabatt/Tag',
            'Level-Discount',
            'Reward Distribution Discount',
            'Total Discount',
            'GMT Discount (Wartung)',    // API-Typo: discountByMaitnanceInGmt
            'Maintenance in BTC (metaData)',
            'Wartung via GMT',
            'Wartung via GMT n. verfügbar',
            'Test-Perioden-Wartungsrabatt',
            'Insurance',
            // C-Werte
            'C1 Value',
            'C2 Value',
            'C3 Value',
            'C4 Value',
            // Multiplier / Schutz
            'Multiplier',
            'Reward Protection',
            'Reinvestment',
            'Reinvestment NFT ID',
            // Auszahlung
            'To Address',
            'To Wallet Type',
            'VWT Transaction ID',
            'Income Withdraw ID',
            'GMT Income (BTC-based)',
            // Sonstiges
            'Status',
            'Typ',
            'User ID',
            'Exported At',
            // incomeStatistic (Farm-Level, gilt für alle Miner dieses Tages)
            'BTC Kurs (USD)',            // incomeStatistic.btcCourseInUsd
            'GMT Preis',                 // incomeStatistic.gmtPrice
            'kWh Preis',                 // incomeStatistic.kilowattHour
            'Income per TH (Farm)',      // incomeStatistic.incomePerTh
            'Total Farm Income (BTC)',   // incomeStatistic.totalIncome
            'Total Supply',              // incomeStatistic.totalSupply
        ];

        let nr = 0;
        const rows = [];

        for (const day of dayRecords) {
            const calcAt = day.incomeStatistic?.calculatedAt ?? day.createdAt;
            const stat   = day.incomeStatistic || {};
            const datStr = isoDate(day.createdAt);

            for (const inc of (day.incomeList || [])) {
                const nft  = inc.nft  || {};
                const meta = inc.metaData || {};
                nr++;

                rows.push([
                    nr,
                    datStr,
                    isoDate(calcAt),
                    nft.id   || inc.nftId || '',
                    nft.name || '',
                    nft.externalUrlId || '',
                    de(inc.value),
                    de(inc.totalValue),
                    de(meta.rawValue),
                    de(meta.poolReward),
                    de(inc.power),
                    de(inc.kwConsumed),
                    de(inc.energyEfficiency),
                    de(inc.energyEfficiencyDecreaseValue),
                    de(inc.maintenanceForWithdrawInGmt),
                    de(inc.dailyMaintenanceDiscount),
                    de(inc.levelDiscount),
                    de(inc.rewardDistributionDiscount),
                    de(inc.totalDiscount),
                    de(inc.discountByMaitnanceInGmt),   // API-Typo beibehalten!
                    de(meta.maintenanceInBtc),
                    bool(inc.maintenanceByGmt),          // Achtung: capital G
                    bool(inc.maintenanceByGmtUnavailable),
                    de(inc.testPeriodDiscountForMaintenance),
                    de(inc.insurance),
                    de(inc.c1Value),
                    de(inc.c2Value),
                    de(inc.c3Value),
                    de(inc.c4Value),
                    de(inc.multiplier),
                    bool(inc.rewardProtection),
                    bool(inc.reinvestment),
                    inc.reinvestmentInPowerNftId ?? '',
                    inc.toAddress || '',
                    inc.toWalletType || '',
                    inc.vwtTransactionId || '',
                    inc.incomeWithdrawId || '',
                    de(inc.gmtIncomeBasedOnBtcIncome),
                    inc.status || '',
                    inc.type   || '',
                    inc.userId ?? '',
                    inc.exportedAt ? isoDate(inc.exportedAt) + ' ' + isoTime(inc.exportedAt) : '',
                    // incomeStatistic — gleich für alle Miner dieses Tages
                    de(stat.btcCourseInUsd),
                    de(stat.gmtPrice),
                    de(stat.kilowattHour),
                    de(stat.incomePerTh),
                    de(stat.totalIncome),
                    stat.totalSupply ?? '',
                ].map(q).join(';'));
            }
        }

        return '\uFEFF' + headers.join(';') + '\n' + rows.join('\n');
    }

    // ────────────────────────────────────────────────────────────────
    //  CSV 2 — SUMMARY  (eine Zeile pro Tag)
    //  Quelle: top-level Felder + incomeStatistic
    // ────────────────────────────────────────────────────────────────
    function toCSVSummary(dayRecords) {
        const headers = [
            'Nr',
            'Datum',
            'Berechnet am (calculatedAt)',
            'BTC Gesamt (value)',
            'BTC Gesamt V2 (valueV2)',
            'Bonus Value V2',
            'Anzahl Miner (incomeList)',
            'Bonus Einträge (V2)',
            'GMT to Power',
            'incomeStatistic ID',
        ];

        const rows = dayRecords.map((day, i) => {
            const stat   = day.incomeStatistic || {};
            const calcAt = stat.calculatedAt ?? day.createdAt;
            return [
                i + 1,
                isoDate(day.createdAt),
                isoDate(calcAt),
                de(day.value),
                de(day.valueV2),
                de(day.bonusValueV2),
                day.incomeList?.length ?? 0,
                day.bonusIncomeListV2?.length ?? 0,
                de(stat.gmtToPower),
                stat.id ?? '',
            ].map(q).join(';');
        });

        return '\uFEFF' + headers.join(';') + '\n' + rows.join('\n');
    }

    // ── Download helper ─────────────────────────────────────────────
    function downloadCSV(csv, tag, mode) {
        const today    = new Date().toISOString().split('T')[0];
        const suffix   = mode === 'summary' ? '_summary' : '_detail';
        const filename = `gomining_income_${tag}${suffix}_${today}.csv`;
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
    async function run(startDate, endDate, tag, mode) {
        const token = requireToken();
        if (!token) return;
        globalThis.stopIncomeExport = false;

        const records = await fetchAllIncome(token, startDate, endDate);
        if (!records.length) { console.log('⚠️ Keine Daten gefunden.'); return; }
        globalThis.incomeData = records;

        const csv = mode === 'summary' ? toCSVSummary(records) : toCSVDetail(records);
        downloadCSV(csv, tag, mode);
    }

    // ────────────────────────────────────────────────────────────────
    //  DETAIL EXPORTS
    // ────────────────────────────────────────────────────────────────
    async function exportIncomeAll()                { await run('2020-01-01T00:00:00.000Z', new Date().toISOString(), 'all', 'detail'); }
    async function exportIncomeByYear(year)         { const y=parseInt(year); await run(`${y}-01-01T00:00:00.000Z`,`${y}-12-31T23:59:59.999Z`,`year_${y}`,'detail'); }
    async function exportIncomeByMonth(year, month) {
        const y=parseInt(year), m=parseInt(month), mm=String(m).padStart(2,'0');
        const last = new Date(y, m, 0).getDate();
        await run(`${y}-${mm}-01T00:00:00.000Z`,`${y}-${mm}-${last}T23:59:59.999Z`,`month_${y}_${mm}`,'detail');
    }
    async function exportIncomeByDay(dateStr) {
        if (isNaN(new Date(dateStr))) { console.error(`❌ Ungültiges Datum: ${dateStr}`); return; }
        await run(`${dateStr}T00:00:00.000Z`,`${dateStr}T23:59:59.999Z`,`day_${dateStr.replace(/-/g,'')}`,'detail');
    }

    // ────────────────────────────────────────────────────────────────
    //  SUMMARY EXPORTS
    // ────────────────────────────────────────────────────────────────
    async function exportIncomeSummaryAll()                { await run('2020-01-01T00:00:00.000Z', new Date().toISOString(), 'all', 'summary'); }
    async function exportIncomeSummaryByYear(year)         { const y=parseInt(year); await run(`${y}-01-01T00:00:00.000Z`,`${y}-12-31T23:59:59.999Z`,`year_${y}`,'summary'); }
    async function exportIncomeSummaryByMonth(year, month) {
        const y=parseInt(year), m=parseInt(month), mm=String(m).padStart(2,'0');
        const last = new Date(y, m, 0).getDate();
        await run(`${y}-${mm}-01T00:00:00.000Z`,`${y}-${mm}-${last}T23:59:59.999Z`,`month_${y}_${mm}`,'summary');
    }
    async function exportIncomeSummaryByDay(dateStr) {
        if (isNaN(new Date(dateStr))) { console.error(`❌ Ungültiges Datum: ${dateStr}`); return; }
        await run(`${dateStr}T00:00:00.000Z`,`${dateStr}T23:59:59.999Z`,`day_${dateStr.replace(/-/g,'')}`,'summary');
    }

    // ── Expose globally ─────────────────────────────────────────────
    Object.assign(globalThis, {
        exportIncomeAll, exportIncomeByYear, exportIncomeByMonth, exportIncomeByDay,
        exportIncomeSummaryAll, exportIncomeSummaryByYear, exportIncomeSummaryByMonth, exportIncomeSummaryByDay,
        stopIncomeExport: false,
    });

    console.log(`
╔══════════════════════════════════════════════════════════════╗
║       📊 GoMining NFT Daily Income Export ✅                 ║
╚══════════════════════════════════════════════════════════════╝

  ── DETAIL (1 Zeile pro Miner pro Tag) ─────────────────────
   exportIncomeAll()
   exportIncomeByYear(2026)
   exportIncomeByMonth(2026, 5)
   exportIncomeByDay('2026-05-26')

  ── TAGES-SUMMARY (1 Zeile pro Tag) ────────────────────────
   exportIncomeSummaryAll()
   exportIncomeSummaryByYear(2026)
   exportIncomeSummaryByMonth(2026, 5)
   exportIncomeSummaryByDay('2026-05-26')

   stopIncomeExport = true   → Abbrechen
   incomeData                → Rohdaten (letzter Abruf)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Limit: ${LIMIT} | Detail: ~46 Spalten (inkl. incomeStatistic) | Summary: 10 Spalten
`);

})();

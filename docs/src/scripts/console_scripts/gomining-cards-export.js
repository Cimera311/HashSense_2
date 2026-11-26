// ============================================================
// GoMining Cards Export
// Endpoints (internal-api.baas.gomining.com/api/cards/internal):
//   POST /v2/card/index, /v1/payment/index, /v1/wallet/get-balances, /v1/asset/index
// ============================================================
// Auf https://app.gomining.com eingeloggt in der Konsole ausfuehren:
//   exportCards()
//
// Erstellt drei CSV-Dateien (Semikolon, UTF-8 BOM, Dezimalkomma):
//   - gomining-card-payments_YYYY-MM-DD.csv  (alle Kartenzahlungen und Aufladungen)
//   - gomining-cards_YYYY-MM-DD.csv          (Kartenliste, Nummern nur maskiert)
//   - gomining-card-balances_YYYY-MM-DD.csv  (Karten-Wallet je Asset)
//
// Rohdaten: cardsExportData. Abbrechen: stopCardsExport = true
// Skalierung der Rohbetraege (Standard 1e18 wie bei den Wallets): cardsExportConfig.decimals
// ============================================================

(function () {
    'use strict';

    const BASE = 'https://internal-api.baas.gomining.com/api/cards/internal';
    const PERIOD_FROM = 1714784484221; // 2024-05-04, Startwert der App fuer "alle"
    const LIMIT = 100;

    globalThis.cardsExportConfig = globalThis.cardsExportConfig || { decimals: 18, delayMs: 150 };
    globalThis.stopCardsExport = false;

    function findToken() {
        for (const cookie of document.cookie.split(';')) {
            const [name, ...parts] = cookie.trim().split('=');
            if (['access_token', 'token', 'auth_token', 'jwt'].includes(name)) {
                return decodeURIComponent(parts.join('='));
            }
        }
        for (const key of ['access_token', 'token', 'auth_token', 'jwt', 'authToken', 'accessToken']) {
            const token = localStorage.getItem(key) || sessionStorage.getItem(key);
            if (token) return token;
        }
        return null;
    }

    async function post(token, path, body) {
        const response = await fetch(BASE + path, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token.replace(/^Bearer\s+/i, '').trim()}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/plain, */*',
                'x-device-type': 'desktop',
            },
            body: JSON.stringify(body),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status} bei ${path}`);
        return response.json();
    }

    async function fetchPayments(token) {
        const periodTo = Date.now();
        const payments = [];
        let skip = 0;
        let total = null;
        while (true) {
            if (globalThis.stopCardsExport) throw new Error('Export gestoppt.');
            const result = await post(token, '/v1/payment/index', {
                cardIds: null, periodFrom: PERIOD_FROM, periodTo,
                status: null, paymentType: [], assetIds: null,
                pagination: { skip, limit: LIMIT },
            });
            const items = result.data?.array || [];
            total = result.data?.count ?? total;
            payments.push(...items);
            console.log(`Kartenzahlungen: ${payments.length}/${total ?? '?'}`);
            if (!items.length || (total !== null && payments.length >= total)) break;
            skip += LIMIT;
            await new Promise(r => setTimeout(r, globalThis.cardsExportConfig.delayMs));
        }
        return payments;
    }

    // Rohbetrag (Ganzzahl-String) in Dezimalzahl umrechnen; Nicht-Ganzzahlen bleiben unveraendert.
    function scaled(raw, decimals) {
        if (raw === null || raw === undefined || raw === '') return '';
        const text = String(raw).trim();
        if (!/^-?\d+$/.test(text) || decimals < 1) return text;
        const negative = text.startsWith('-');
        const digits = (negative ? text.slice(1) : text).padStart(decimals + 1, '0');
        const fraction = digits.slice(-decimals).replace(/0+$/, '');
        return `${negative ? '-' : ''}${digits.slice(0, -decimals)}${fraction ? `.${fraction}` : ''}`;
    }

    const de = value => String(value ?? '').replace('.', ',');
    const cell = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csv = (header, rows) => '\uFEFF' + [header, ...rows].map(row => row.map(cell).join(';')).join('\r\n');

    function paymentsCsv(payments, cardMap) {
        const decimals = globalThis.cardsExportConfig.decimals;
        const header = [
            'Datum', 'Zeit (UTC)', 'Zahlungs-ID', 'Karte', 'Typ', 'Richtung', 'Status', 'Asset',
            'Betrag roh', 'Betrag', 'Betrag mit Vorzeichen', 'Betrag EUR',
            'Betrag Originalwaehrung', 'Originalwaehrung', 'Haendler', 'MCC', 'Stadt', 'Land',
            'Storno', 'Wert geaendert', 'Aenderungsgrund', 'Cashback berechnet',
            'Payment-ID', 'Asset-ID', 'Karten-ID',
        ];
        const rows = payments.map(p => {
            const created = p.createdAt || '';
            const amount = scaled(p.valueNumeric, decimals).replace(/^-/, '');
            const signed = p.paymentDirection === 'debit' && amount && amount !== '0' ? `-${amount}` : amount;
            const data = p.paymentData || {};
            const merchant = data.merchantData || {};
            return [
                created.slice(0, 10), created.slice(11, 19), p.id, cardMap.get(p.cardId) || '',
                p.paymentType, p.paymentDirection, p.status, p.assetName,
                p.valueNumeric, de(amount), de(signed), de(scaled(p.amountInEur, decimals)),
                de(data.amountInCurrency), data.currency, merchant.name, merchant.mcc, merchant.city, merchant.country,
                p.isReversal ? 'ja' : 'nein', p.valueChanged ? 'ja' : 'nein',
                (p.valueChangedReason || []).join(', '), p.isCashbackCalculated ? 'ja' : 'nein',
                p.paymentId, p.assetId, p.cardId,
            ];
        });
        return csv(header, rows);
    }

    function cardsCsv(cards, assetMap) {
        const header = [
            'Karten-ID', 'Provider-Karten-ID', 'Erstellt', 'Aktualisiert', 'Nummer (maskiert)',
            'Prioritaets-Asset', 'PIN installiert', 'Pass installiert', 'Fast Approval', 'Anbieter', 'Status', 'Gesperrt',
        ];
        const yn = value => (value ? 'ja' : 'nein');
        return csv(header, cards.map(c => [
            c.id, c.providerCardId, c.createdAt, c.updatedAt, c.maskedNumber,
            assetMap.get(c.priorityAssetId) || c.priorityAssetId, yn(c.pinInstalled), yn(c.passInstalled),
            yn(c.fastApproval), c.provider, c.status, yn(c.isBlocked),
        ]));
    }

    function balancesCsv(balances, exportedAt) {
        const decimals = globalThis.cardsExportConfig.decimals;
        return csv(['Asset', 'Guthaben roh', 'Guthaben', 'Exportiert am (UTC)'],
            balances.map(b => [b.assetName, b.walletBalanceNumeric, de(scaled(b.walletBalanceNumeric, decimals)), exportedAt]));
    }

    // Stablecoin-Betraege muessen in der Groessenordnung des Originalbetrags liegen, sonst stimmt die Skalierung nicht.
    function checkScale(payments) {
        const decimals = globalThis.cardsExportConfig.decimals;
        const bad = payments.filter(p => {
            if (!['USDC', 'USDT'].includes(p.assetName)) return false;
            const original = parseFloat(String(p.paymentData?.amountInCurrency ?? '').replace(',', '.'));
            const value = Math.abs(parseFloat(scaled(p.valueNumeric, decimals)));
            return original > 0 && !(value / original > 0.5 && value / original < 2);
        });
        if (bad.length) {
            console.warn(`Skalierung unplausibel bei ${bad.length} Stablecoin-Zahlungen (decimals=${decimals}). ` +
                'cardsExportConfig.decimals anpassen (z.B. 6) und erneut starten.');
        }
    }

    function download(filename, content) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    globalThis.exportCards = async function () {
        const token = (globalThis.goMiningToken || findToken() || '').replace(/^Bearer\s+/i, '').trim();
        if (!token) {
            console.error('Kein Login-Token gefunden. Bitte auf app.gomining.com einloggen.');
            return;
        }
        globalThis.stopCardsExport = false;

        try {
            const list = value => (Array.isArray(value) ? value : []);
            const cards = list((await post(token, '/v2/card/index', {})).data?.cards);
            const assets = list((await post(token, '/v1/asset/index', {})).data);
            const balances = list((await post(token, '/v1/wallet/get-balances', {})).data);
            const payments = await fetchPayments(token);

            const cardMap = new Map(cards.map(c => [c.id, c.maskedNumber]));
            const assetMap = new Map(assets.map(a => [a.id, a.assetName]));
            const exportedAt = new Date().toISOString();
            const date = exportedAt.slice(0, 10);

            globalThis.cardsExportData = { cards, assets, balances, payments };
            checkScale(payments);

            if (payments.length) download(`gomining-card-payments_${date}.csv`, paymentsCsv(payments, cardMap));
            if (cards.length) download(`gomining-cards_${date}.csv`, cardsCsv(cards, assetMap));
            if (balances.length) download(`gomining-card-balances_${date}.csv`, balancesCsv(balances, exportedAt));

            console.log(`Karten: ${cards.length}, Zahlungen: ${payments.length}, Wallet-Assets: ${balances.length}. Rohdaten: cardsExportData`);
        } catch (error) {
            console.error('Karten-Export fehlgeschlagen:', error.message);
        }
    };

    console.log('Bereit. Starte mit: exportCards()');
})();

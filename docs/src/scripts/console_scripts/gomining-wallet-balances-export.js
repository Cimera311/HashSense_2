// ============================================================
// GoMining Wallet Balances Export
// Endpoint: POST /api/wallet/get-balances
// ============================================================
// Ausfuehren in der Browser-Konsole auf https://app.gomining.com,
// waehrend du eingeloggt bist.
//
// Aufruf:
//   exportWalletBalances()
//
// Erstellt zwei Downloads:
//   - gomining-wallet-balances_YYYY-MM-DD.csv
//   - gomining-wallet-balances_YYYY-MM-DD.json
// ============================================================

(function () {
    'use strict';

    const ENDPOINT = 'https://api.gomining.com/api/wallet/get-balances';
    const DECIMALS = 18;

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

    function getHeaders(token) {
        return {
            'Authorization': `Bearer ${token.replace(/^Bearer\s+/i, '').trim()}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Origin': 'https://app.gomining.com',
            'Referer': 'https://app.gomining.com/',
            'x-device-type': 'desktop',
        };
    }

    function formatTokenAmount(rawValue) {
        if (rawValue === null || rawValue === undefined || rawValue === '') return '';

        try {
            const negative = String(rawValue).startsWith('-');
            const raw = BigInt(negative ? String(rawValue).slice(1) : rawValue);
            const digits = raw.toString().padStart(DECIMALS + 1, '0');
            const whole = digits.slice(0, -DECIMALS);
            const fraction = digits.slice(-DECIMALS).replace(/0+$/, '');
            return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`;
        } catch (_) {
            return String(rawValue);
        }
    }

    function csvCell(value) {
        return `"${String(value ?? '').replace(/"/g, '""')}"`;
    }

    function download(filename, content, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    function toCsv(balances, exportedAt) {
        const fields = [
            ['id', 'Wallet ID'],
            ['gmtValueAtSyncDateNumeric', 'GMT Balance roh (1e18)'],
            ['gmtValueAtSyncDateNumeric', 'GMT Balance'],
            ['timeLockedValueAtSyncDateNumeric', 'Time-Locked Balance roh (1e18)'],
            ['timeLockedValueAtSyncDateNumeric', 'Time-Locked Balance'],
            ['flexibleStakingValueAtSyncDateNumeric', 'Flexible-Staking Balance roh (1e18)'],
            ['flexibleStakingValueAtSyncDateNumeric', 'Flexible-Staking Balance'],
            ['valueNumericAtSyncDate', 'Gesamtbalance roh (1e18)'],
            ['valueNumericAtSyncDate', 'Gesamtbalance'],
            ['freezedValueNumericAtSyncDate', 'Eingefrorene Balance roh (1e18)'],
            ['freezedValueNumericAtSyncDate', 'Eingefrorene Balance'],
            ['exportedAt', 'Exportiert am (UTC)'],
        ];
        const header = fields.map(([, label]) => csvCell(label)).join(';');
        const rows = balances.map(balance => fields.map(([field, label]) => {
            const value = field === 'exportedAt' ? exportedAt : balance[field];
            return csvCell(label.includes('roh') || field === 'id' || field === 'exportedAt'
                ? value
                : formatTokenAmount(value));
        }).join(';'));

        return [header, ...rows].join('\r\n');
    }

    globalThis.exportWalletBalances = async function () {
        const token = findToken();
        if (!token) {
            console.error('Kein Login-Token gefunden. Bitte auf app.gomining.com einloggen und erneut ausfuehren.');
            return;
        }

        try {
            console.log('Lade alle Wallet-Balances ...');
            const response = await fetch(ENDPOINT, {
                method: 'POST',
                headers: getHeaders(token),
                body: JSON.stringify({}),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorBody}`);
            }

            const result = await response.json();
            const balances = Array.isArray(result.data) ? result.data : [];
            if (!balances.length) {
                console.warn('Keine Wallet-Balances in der API-Antwort gefunden.', result);
                return;
            }

            const exportedAt = new Date().toISOString();
            const date = exportedAt.slice(0, 10);
            const jsonExport = {
                endpoint: ENDPOINT,
                exportedAt,
                balances,
            };

            globalThis.goMiningWalletBalances = balances;
            download(`gomining-wallet-balances_${date}.csv`, toCsv(balances, exportedAt), 'text/csv;charset=utf-8');
            download(`gomining-wallet-balances_${date}.json`, JSON.stringify(jsonExport, null, 2), 'application/json');

            console.table(balances.map(balance => ({
                walletId: balance.id,
                total: formatTokenAmount(balance.valueNumericAtSyncDate),
                gmt: formatTokenAmount(balance.gmtValueAtSyncDateNumeric),
                timeLocked: formatTokenAmount(balance.timeLockedValueAtSyncDateNumeric),
                flexibleStaking: formatTokenAmount(balance.flexibleStakingValueAtSyncDateNumeric),
                frozen: formatTokenAmount(balance.freezedValueNumericAtSyncDateNumeric),
            })));
            console.log(`${balances.length} Wallet-Balances exportiert. Rohdaten: goMiningWalletBalances`);
        } catch (error) {
            console.error('Balance-Export fehlgeschlagen:', error.message);
        }
    };

    console.log('Bereit. Starte mit: exportWalletBalances()');
}());

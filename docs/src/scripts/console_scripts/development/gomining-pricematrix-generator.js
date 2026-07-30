/**
 * GoMining PriceMatrix.js Auto-Generator
 *
 * GOAL: Run this ONCE in the console (logged in at app.gomining.com), and get a
 * ready-to-paste priceMatrix.js content copied to your clipboard - directly from
 * the real API, no manual table-copying.
 *
 * WHY the "open a dialog once" step is unavoidable:
 * Previous investigation PROVED that /api/nft/get-power-upgrade-info is 100%
 * parameterless (every guessed body field -> HTTP 400, only {} works) and returns
 * ONE global curve, identical for every miner. That means either:
 *   (a) a DIFFERENT endpoint (unknown URL/shape) delivers the real per-EE prices, or
 *   (b) GoMining computes the per-EE price CLIENT-SIDE (no network call at all).
 * This script watches ALL /api/nft/* traffic and tells you EMPIRICALLY, in one run,
 * which case is true - then automates the rest if (a) is true.
 *
 * USAGE:
 *   1) Paste this script in the console.
 *   2) Run: startPriceMatrixCapture()
 *   3) Open the "Levels" / upgrade dialog for 2-3 miners with DIFFERENT wattage/EE
 *      in the real UI (click a miner -> Upgrade/Levels). Close each dialog again.
 *   4) Run: analyzeCaptures()
 *        - Tells you which endpoint(s) were called, whether responses differ
 *          per miner, and finds candidate level/price arrays automatically.
 *   5a) If a real per-EE endpoint was found:
 *        generatePriceMatrix("<url from step 4>", "<fieldName from step 4>")
 *        -> loops EE 12..50, fetches real data for each, builds priceMatrix.js
 *           text and copies it to your clipboard. Paste directly into
 *           docs/priceMatrix.js next time prices change - just rerun this script.
 *   5b) If analyzeCaptures() reports "IDENTICAL response for every call" for all
 *        candidates: GoMining computes prices client-side. There is no API call
 *        to replicate - tell me and we pivot to reading the frontend bundle.
 */

(function initGoMiningPriceMatrixGenerator() {
    const API_BASE = 'https://api.gomining.com/api';
    const MINERS_ENDPOINT = `${API_BASE}/nft/get-my`;
    // Watch every call to ANY gomining API host - the real per-level-price endpoint's
    // exact URL/name is unknown, so we intentionally do NOT narrow this to /api/nft/ only
    // (it could just as well be /api/marketplace/, /api/upgrade/, a different subdomain, etc).
    const WATCH_URL_PATTERN = /gomining\.com\/api\//i;

    function findToken() {
        if (globalThis.goMiningToken) return globalThis.goMiningToken;

        const cookieCandidates = document.cookie.split(';').map((x) => x.trim()).filter(Boolean);
        for (const cookie of cookieCandidates) {
            const [name, ...rest] = cookie.split('=');
            const value = rest.join('=');
            if (name === 'access_token' || name === 'token' || name === 'auth_token') {
                globalThis.goMiningToken = value;
                return value;
            }
        }

        const localToken = localStorage.getItem('access_token')
            || localStorage.getItem('token')
            || localStorage.getItem('auth_token')
            || localStorage.getItem('jwt');
        if (localToken) {
            globalThis.goMiningToken = localToken;
            return localToken;
        }

        const sessionToken = sessionStorage.getItem('access_token')
            || sessionStorage.getItem('token')
            || sessionStorage.getItem('auth_token')
            || sessionStorage.getItem('jwt');
        if (sessionToken) {
            globalThis.goMiningToken = sessionToken;
            return sessionToken;
        }

        console.error('Token not found. Please log in first.');
        return null;
    }

    function getHeaders(token) {
        return {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Origin: 'https://app.gomining.com',
            Referer: 'https://app.gomining.com/',
            'x-device-type': 'desktop'
        };
    }

    async function apiPost(url, body) {
        const token = findToken();
        if (!token) throw new Error('Missing auth token');

        const response = await fetch(url, {
            method: 'POST',
            headers: getHeaders(token),
            body: JSON.stringify(body ?? {})
        });

        const text = await response.text();
        let parsed;
        try {
            parsed = text ? JSON.parse(text) : null;
        } catch {
            parsed = text;
        }

        return { ok: response.ok, status: response.status, statusText: response.statusText, data: parsed };
    }

    function extractArrayResponse(payload) {
        if (!payload) return [];
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload.data)) return payload.data;
        if (Array.isArray(payload.data?.array)) return payload.data.array;
        return [];
    }

    function safeNumber(v) {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    }

    async function getCurrentMiners() {
        const result = await apiPost(MINERS_ENDPOINT, {});
        if (!result.ok) throw new Error(`get-my failed: HTTP ${result.status} ${result.statusText}`);
        return extractArrayResponse(result.data);
    }

    // ---------------------------------------------------------------------
    // CONFIRMED (2026-07-29): /api/nft/get-upgrade-rate is the REAL live source
    // for the efficiencyMatrix used in altes root/generate_price_matrix.html.
    // Response shape: { data: { energyEfficiencyPriceConfig: [], powerUpgradePriceConfig: [{toLevel,priceUsd}],
    //                            energyEfficiencyUpgradePriceConfig: [{toLevel,priceUsd}] } }
    // energyEfficiencyUpgradePriceConfig[toLevel] matches local efficiencyMatrix[toLevel+1].pricePerW
    // (a +1 index offset), values in USD directly - no GMT conversion needed.
    // ---------------------------------------------------------------------
    const UPGRADE_RATE_ENDPOINT = `${API_BASE}/nft/get-upgrade-rate`;

    async function fetchUpgradeRate(body) {
        const result = await apiPost(UPGRADE_RATE_ENDPOINT, body ?? {});
        console.log('Request payload:', body ?? {});
        console.log('Response status:', result.status, result.statusText);
        console.log('Response body:', result.data);
        if (result.ok) {
            globalThis.__lastUpgradeRateResponse = result.data;
        }
        return result;
    }

    /**
     * Builds a ready-to-paste `const efficiencyMatrix = {...}` block (matching the exact
     * format used in src/scripts/skript-prices.js) from the live get-upgrade-rate response.
     * Applies the confirmed +1 index offset: local key N <- API entry toLevel = N-1.
     */
    function buildEfficiencyMatrixFromUpgradeRate(response) {
        const data = response?.data || response;
        const config = data?.energyEfficiencyUpgradePriceConfig;
        if (!Array.isArray(config) || !config.length) {
            console.error('No energyEfficiencyUpgradePriceConfig found in response. Run fetchUpgradeRate() first.');
            return null;
        }

        const byToLevel = new Map();
        config.forEach((entry) => {
            const toLevel = safeNumber(entry?.toLevel);
            const priceUsd = safeNumber(entry?.priceUsd);
            if (toLevel !== null && priceUsd !== null) byToLevel.set(toLevel, priceUsd);
        });

        const sortedKeys = Array.from(byToLevel.keys()).sort((a, b) => a - b);
        let out = 'const efficiencyMatrix = {\n';
        sortedKeys.forEach((toLevel) => {
            const localKey = toLevel + 1;
            const price = byToLevel.get(toLevel);
            out += `            ${localKey}: { to: ${toLevel}, pricePerW: ${price} },\n`;
        });
        out = out.replace(/,\n$/, '\n');
        out += '        };\n';

        console.log(out);
        return out;
    }

    async function refreshEfficiencyMatrix() {
        const result = await fetchUpgradeRate({});
        if (!result.ok) {
            console.error(`get-upgrade-rate failed: HTTP ${result.status} ${result.statusText}`);
            return null;
        }
        const text = buildEfficiencyMatrixFromUpgradeRate(result.data);
        if (!text) return null;
        const copied = await copyTextToClipboard(text);
        console.log(copied
            ? 'New efficiencyMatrix copied to clipboard! Paste it into src/scripts/skript-prices.js (both docs+src mirrors).'
            : 'Automatic copy failed. Opening manual copy dialog...');
        if (!copied) showCopyPrompt(text);
        return text;
    }

    function legacyCopyToClipboard(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.top = '0';
        textarea.style.left = '-9999px';
        textarea.setAttribute('readonly', '');
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        textarea.setSelectionRange(0, textarea.value.length);
        let success = false;
        try {
            success = document.execCommand('copy');
        } catch {
            success = false;
        }
        document.body.removeChild(textarea);
        return success;
    }

    async function copyTextToClipboard(text) {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            }
        } catch (err) {
            console.warn('navigator.clipboard.writeText failed, falling back:', err);
        }
        try {
            if (legacyCopyToClipboard(text)) return true;
        } catch (err) {
            console.warn('execCommand copy fallback failed:', err);
        }
        try {
            if (typeof copy === 'function') {
                copy(text);
                return true;
            }
        } catch (err) {
            console.warn('DevTools copy() fallback failed:', err);
        }
        return false;
    }

    function showCopyPrompt(text) {
        try {
            window.prompt('Copy failed automatically. Press Ctrl+A then Ctrl+C to copy manually:', text);
        } catch (err) {
            console.warn('prompt() fallback also failed:', err);
        }
    }

    // ---------------------------------------------------------------------
    // Phase 1: Capture real network traffic while the user opens the UI dialog
    // ---------------------------------------------------------------------

    function startPriceMatrixCapture() {
        if (globalThis.__priceMatrixCaptureEnabled) {
            console.log('Capture is already running.');
            return;
        }
        globalThis.__priceMatrixCaptureEnabled = true;
        globalThis.__priceMatrixCaptures = [];
        globalThis.__priceMatrixAllSeenUrls = new Set();

        // IMPORTANT: many apps (GoMining included, likely via axios) use
        // XMLHttpRequest under the hood, NOT window.fetch. We must patch BOTH
        // or dialogs that use XHR will silently produce zero captures.
        globalThis.__priceMatrixOriginalFetch = window.fetch;
        globalThis.__priceMatrixOriginalXHROpen = XMLHttpRequest.prototype.open;
        globalThis.__priceMatrixOriginalXHRSend = XMLHttpRequest.prototype.send;

        const originalFetch = globalThis.__priceMatrixOriginalFetch;
        window.fetch = async function patchedFetch(...args) {
            const [url, options = {}] = args;
            const urlStr = typeof url === 'string' ? url : (url?.url || '');
            if (urlStr) globalThis.__priceMatrixAllSeenUrls.add(`fetch ${options?.method || 'GET'} ${urlStr}`);
            if (!WATCH_URL_PATTERN.test(urlStr)) {
                return originalFetch.apply(this, args);
            }

            let body = options?.body;
            if (typeof body === 'string') {
                try { body = JSON.parse(body); } catch { /* keep as string */ }
            }

            const response = await originalFetch.apply(this, args);
            const clone = response.clone();
            let data;
            try {
                data = await clone.json();
            } catch {
                data = await clone.text();
            }

            const entry = {
                type: 'fetch',
                url: urlStr,
                method: options?.method || 'GET',
                body,
                status: response.status,
                data,
                at: new Date().toISOString()
            };
            globalThis.__priceMatrixCaptures.push(entry);
            console.log(`[capture:fetch] ${entry.method} ${urlStr}`, { body, status: response.status });

            return response;
        };

        const originalXHROpen = globalThis.__priceMatrixOriginalXHROpen;
        const originalXHRSend = globalThis.__priceMatrixOriginalXHRSend;

        XMLHttpRequest.prototype.open = function patchedOpen(method, url, ...rest) {
            this.__priceMatrixInfo = { method, url: String(url) };
            return originalXHROpen.call(this, method, url, ...rest);
        };

        XMLHttpRequest.prototype.send = function patchedSend(body) {
            const info = this.__priceMatrixInfo;
            if (info?.url) globalThis.__priceMatrixAllSeenUrls.add(`xhr ${info.method || 'GET'} ${info.url}`);
            if (!info || !WATCH_URL_PATTERN.test(info.url)) {
                return originalXHRSend.call(this, body);
            }

            let parsedBody = body;
            if (typeof body === 'string') {
                try { parsedBody = JSON.parse(body); } catch { /* keep as string */ }
            }

            this.addEventListener('load', function onLoad() {
                let data;
                try {
                    data = JSON.parse(this.responseText);
                } catch {
                    data = this.responseText;
                }

                const entry = {
                    type: 'xhr',
                    url: info.url,
                    method: info.method || 'GET',
                    body: parsedBody,
                    status: this.status,
                    data,
                    at: new Date().toISOString()
                };
                globalThis.__priceMatrixCaptures.push(entry);
                console.log(`[capture:xhr] ${entry.method} ${info.url}`, { body: parsedBody, status: this.status });
            });

            return originalXHRSend.call(this, body);
        };

        console.log('Capture enabled (both fetch AND XMLHttpRequest are watched).');
        console.log('Now open the "Levels"/upgrade dialog for 2-3 miners with DIFFERENT wattage/EE in the UI.');
        console.log('Then run: analyzeCaptures()');
    }

    function stopPriceMatrixCapture() {
        if (!globalThis.__priceMatrixCaptureEnabled) {
            console.log('Capture is not running.');
            return;
        }
        window.fetch = globalThis.__priceMatrixOriginalFetch;
        XMLHttpRequest.prototype.open = globalThis.__priceMatrixOriginalXHROpen;
        XMLHttpRequest.prototype.send = globalThis.__priceMatrixOriginalXHRSend;
        globalThis.__priceMatrixCaptureEnabled = false;
        console.log('Capture disabled.');
    }

    // ---------------------------------------------------------------------
    // Phase 2: Analyze what was captured
    // ---------------------------------------------------------------------

    function findLevelRowArrays(data, path = '') {
        const results = [];
        if (Array.isArray(data)) {
            if (data.length && data[0] && typeof data[0] === 'object') {
                const keys = Object.keys(data[0]);
                const hasPowerLike = keys.some((k) => /power|hashrate|watt|level|\bth\b/i.test(k));
                const hasPriceLike = keys.some((k) => /price|cost|amount/i.test(k));
                if (hasPowerLike && hasPriceLike) {
                    results.push({ path, sample: data.slice(0, 3), length: data.length });
                }
            }
            data.forEach((item, i) => results.push(...findLevelRowArrays(item, `${path}[${i}]`)));
        } else if (data && typeof data === 'object') {
            for (const [k, v] of Object.entries(data)) {
                results.push(...findLevelRowArrays(v, path ? `${path}.${k}` : k));
            }
        }
        return results;
    }

    function analyzeCaptures() {
        const captures = globalThis.__priceMatrixCaptures || [];
        if (!captures.length) {
            console.warn('No captures yet. Run startPriceMatrixCapture() and open the Levels dialog first.');
            return;
        }

        console.log(`Captured ${captures.length} request(s) total.`);
        const byUrl = new Map();
        captures.forEach((c) => {
            const key = c.url.split('?')[0];
            if (!byUrl.has(key)) byUrl.set(key, []);
            byUrl.get(key).push(c);
        });

        console.log('--- Captured endpoints under /api/nft/ ---');
        for (const [url, entries] of byUrl) {
            console.log(`\nURL: ${url}  (${entries.length} call(s))`);
            const uniqueResponses = new Set(entries.map((e) => JSON.stringify(e.data)));
            const uniqueBodies = new Set(entries.map((e) => JSON.stringify(e.body)));
            console.log(`  Distinct request bodies: ${uniqueBodies.size}, distinct responses: ${uniqueResponses.size}`);

            if (entries.length > 1 && uniqueResponses.size === 1) {
                console.log('  -> IDENTICAL response for every call. Likely NOT per-miner/per-EE data.');
            } else if (uniqueResponses.size > 1) {
                console.log('  -> Responses DIFFER between calls! This endpoint likely depends on the miner/EE. CANDIDATE.');
            }

            const levelArrays = findLevelRowArrays(entries[entries.length - 1].data);
            if (levelArrays.length) {
                console.log('  Candidate level/price arrays found in the response:');
                levelArrays.forEach((la) => console.log(`    path="${la.path}" (${la.length} items)`, la.sample));
            }
        }

        globalThis.__priceMatrixCapturesByUrl = byUrl;

        console.log('\nNext steps:');
        console.log('  inspectCapturesForUrl("<url>")  - see every call + body for one endpoint');
        console.log('  generatePriceMatrix("<url>", "<field.path.to.vary>")  - once you found a CANDIDATE above');
        console.log('If ALL candidates show "IDENTICAL response for every call": there is no per-EE API call.');
        console.log('GoMining computes the price client-side - tell me, and we pivot to reading the frontend bundle.');
    }

    function inspectCapturesForUrl(url) {
        const byUrl = globalThis.__priceMatrixCapturesByUrl;
        if (!byUrl || !byUrl.has(url)) {
            console.warn('Unknown URL. Run analyzeCaptures() first and copy the exact URL string shown there.');
            return;
        }
        console.table(byUrl.get(url).map((e) => ({ body: JSON.stringify(e.body), status: e.status, at: e.at })));
        byUrl.get(url).forEach((e, i) => console.log(`Call #${i + 1}`, e));
    }

    // ---------------------------------------------------------------------
    // Phase 3: Automatically generate the full priceMatrix.js
    // ---------------------------------------------------------------------

    function getByPath(obj, path) {
        if (!path) return obj;
        return path.split(/\.|\[|\]/).filter(Boolean).reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
    }

    function setByPath(obj, path, value) {
        const keys = path.split('.');
        let cur = obj;
        for (let i = 0; i < keys.length - 1; i += 1) {
            if (cur[keys[i]] === undefined || cur[keys[i]] === null) cur[keys[i]] = {};
            cur = cur[keys[i]];
        }
        cur[keys[keys.length - 1]] = value;
    }

    function bestLevelArray(data) {
        const candidates = findLevelRowArrays(data);
        if (!candidates.length) return null;
        candidates.sort((a, b) => b.length - a.length);
        return candidates[0];
    }

    function extractMinThAndPrice(rowObj) {
        const keys = Object.keys(rowObj);
        const powerKey = keys.find((k) => /power|hashrate/i.test(k))
            || keys.find((k) => /\bth\b/i.test(k))
            || keys.find((k) => /level/i.test(k))
            || keys.find((k) => /watt/i.test(k));
        const priceKey = keys.find((k) => /price|cost|amount/i.test(k));
        return {
            minTH: safeNumber(rowObj[powerKey]),
            pricePerTH: safeNumber(rowObj[priceKey])
        };
    }

    function buildPriceMatrixJsText(matrix) {
        let out = 'const priceMatrixdatei = {\n';
        const keys = Object.keys(matrix).sort((a, b) => Number(a) - Number(b));
        keys.forEach((key, ki) => {
            out += `  "${key}": [\n`;
            matrix[key].forEach((row, i) => {
                const comma = i < matrix[key].length - 1 ? ',' : '';
                out += `    { "minTH": ${row.minTH}, "pricePerTH": ${row.pricePerTH} }${comma}\n`;
            });
            out += `  ]${ki < keys.length - 1 ? ',' : ''}\n`;
        });
        out += '};\n';
        return out;
    }

    /**
     * @param {string} templateUrl  Exact URL string shown by analyzeCaptures()/inspectCapturesForUrl()
     * @param {string} [varyField]  Dot-path inside the request body that controls EE/power (e.g. "energyEfficiency").
     *                              Omit if the endpoint takes no body param that varies (rare) - in that case
     *                              generation will only work if the field is discovered by trial.
     * @param {number[]} [eeRange]  Override the EE values to iterate. Defaults to 12..50 (matches priceMatrix.js).
     */
    async function generatePriceMatrix(templateUrl, varyField, eeRange) {
        const byUrl = globalThis.__priceMatrixCapturesByUrl;
        if (!byUrl || !byUrl.has(templateUrl)) {
            console.warn('Run analyzeCaptures() first, then pass the EXACT URL string shown there.');
            return null;
        }

        const entries = byUrl.get(templateUrl);
        const templateEntry = entries[entries.length - 1];
        const method = templateEntry.method || 'POST';
        const token = findToken();
        if (!token) return null;

        const eeValues = eeRange || Array.from({ length: 39 }, (_, i) => i + 12); // 12..50
        const matrix = {};

        for (const ee of eeValues) {
            let body = templateEntry.body ? JSON.parse(JSON.stringify(templateEntry.body)) : undefined;
            if (body && varyField) {
                setByPath(body, varyField, ee);
            }

            let response;
            try {
                response = await fetch(templateUrl, {
                    method,
                    headers: getHeaders(token),
                    body: body !== undefined ? JSON.stringify(body) : undefined
                });
            } catch (err) {
                console.warn(`EE ${ee}: request failed (${err.message}) - skipping`);
                continue;
            }

            if (!response.ok) {
                console.warn(`EE ${ee}: HTTP ${response.status} - skipping`);
                continue;
            }

            let data;
            try {
                data = await response.json();
            } catch {
                console.warn(`EE ${ee}: response is not JSON - skipping`);
                continue;
            }

            const candidate = bestLevelArray(data);
            if (!candidate) {
                console.warn(`EE ${ee}: no level/price array found in response - skipping`);
                continue;
            }

            const rowsRaw = getByPath(data, candidate.path) || [];
            const rows = rowsRaw.map(extractMinThAndPrice).filter((r) => r.minTH !== null && r.pricePerTH !== null);
            matrix[String(ee)] = rows;
            console.log(`EE ${ee}: ${rows.length} rows captured`);
        }

        if (!Object.keys(matrix).length) {
            console.error('No data collected for any EE. Check templateUrl/varyField and try again.');
            return null;
        }

        const jsText = buildPriceMatrixJsText(matrix);
        const copied = await copyTextToClipboard(jsText);

        console.log(copied
            ? 'priceMatrix.js content copied to clipboard! Paste it directly into docs/priceMatrix.js.'
            : 'Automatic copy failed. Opening manual copy dialog...');
        if (!copied) showCopyPrompt(jsText);

        globalThis.__generatedPriceMatrix = matrix;
        globalThis.__generatedPriceMatrixJsText = jsText;
        console.log(jsText);
        return matrix;
    }

    function listAllSeenUrls() {
        const seen = globalThis.__priceMatrixAllSeenUrls;
        if (!seen || !seen.size) {
            console.warn('No network requests observed at all yet (fetch or XHR). Did you run startPriceMatrixCapture() BEFORE opening the dialog, and is the page still open?');
            return;
        }
        console.log(`All ${seen.size} network request(s) seen since capture started (matched or not):`);
        Array.from(seen).forEach((u) => console.log('  ' + u));
        console.log('If the real endpoint appears here but was NOT captured in detail, tell me its URL and I will adjust WATCH_URL_PATTERN.');
    }

    function priceMatrixGeneratorHelp() {
        console.log('GoMining PriceMatrix.js Auto-Generator - commands:');
        console.log('  CONFIRMED endpoint (2026-07-29): /api/nft/get-upgrade-rate');
        console.log('  fetchUpgradeRate(body?)           <-- calls it directly (empty body), logs full response');
        console.log('  refreshEfficiencyMatrix()         <-- fetches + builds + copies a fresh efficiencyMatrix block');
        console.log('                                       for src/scripts/skript-prices.js, ready to paste');
        console.log('  buildEfficiencyMatrixFromUpgradeRate(response) - manual version if you already have a response');
        console.log('');
        console.log('Network-capture flow (for the still-unknown per-EE/minTH priceMatrix.js base table):');
        console.log('  startPriceMatrixCapture()        <-- run first, then open Levels dialogs for 2-3 different miners');
        console.log('  listAllSeenUrls()                 - DEBUG: shows every request seen, matched or not');
        console.log('  analyzeCaptures()                <-- run after opening the dialogs, shows candidates');
        console.log('  inspectCapturesForUrl(url)        - full detail for one captured endpoint');
        console.log('  generatePriceMatrix(url, field)  <-- generates + copies full priceMatrix.js to clipboard');
        console.log('  stopPriceMatrixCapture()          - disable the network spy');
        console.log('');
        console.log('Quick start for the efficiencyMatrix refresh: refreshEfficiencyMatrix()');
    }

    globalThis.startPriceMatrixCapture = startPriceMatrixCapture;
    globalThis.stopPriceMatrixCapture = stopPriceMatrixCapture;
    globalThis.analyzeCaptures = analyzeCaptures;
    globalThis.listAllSeenUrls = listAllSeenUrls;
    globalThis.inspectCapturesForUrl = inspectCapturesForUrl;
    globalThis.generatePriceMatrix = generatePriceMatrix;
    globalThis.priceMatrixGeneratorHelp = priceMatrixGeneratorHelp;
    globalThis.getCurrentMinersForPriceMatrix = getCurrentMiners;
    globalThis.fetchUpgradeRate = fetchUpgradeRate;
    globalThis.buildEfficiencyMatrixFromUpgradeRate = buildEfficiencyMatrixFromUpgradeRate;
    globalThis.refreshEfficiencyMatrix = refreshEfficiencyMatrix;

    console.log('GoMining PriceMatrix.js generator loaded. Run priceMatrixGeneratorHelp() for instructions.');
    console.log('Quick start: startPriceMatrixCapture()');
})();

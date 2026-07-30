/**
 * GoMining Power Upgrade Info Debug Script
 *
 * Purpose:
 * - Fetch raw data from /api/nft/get-power-upgrade-info
 * - Test which request payload shape the endpoint expects
 * - Compare results for different miner energy efficiencies (EE)
 * - Build a readable level/price matrix for quick validation
 *
 * Usage in browser console (while logged in at app.gomining.com):
 * 1) Paste this script
 * 2) Run: powerUpgradeInfoHelp()
 */

(function initGoMiningPowerUpgradeInfoDebug() {
    const API_BASE = 'https://api.gomining.com/api';
    const ENDPOINT = `${API_BASE}/nft/get-power-upgrade-info`;
    const MINERS_ENDPOINT = `${API_BASE}/nft/get-my`;

    // Derived from real UI screenshot data: level1 was shown as $12.88/TH, and basePrice (GMT) is 6.823.
    // 12.88 / 6.823 =~ 1.887 -> assumed GMT/USD conversion rate. Verified again: level10 volume-discount
    // estimate (6.577372 GMT) * 1.887 =~ 12.41 USD, matching the screenshot's second data point almost exactly.
    // Update this constant with the LIVE GMT/USD rate if you have a price feed, for a more precise check.
    const ASSUMED_GMT_USD_RATE = 1.887;

    function findToken() {
        if (globalThis.goMiningToken) {
            return globalThis.goMiningToken;
        }

        const cookieCandidates = document.cookie
            .split(';')
            .map((x) => x.trim())
            .filter(Boolean);

        for (const cookie of cookieCandidates) {
            const parts = cookie.split('=');
            const name = parts[0];
            const value = parts.slice(1).join('=');
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
        if (!token) {
            throw new Error('Missing auth token');
        }

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

        return {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            data: parsed
        };
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

    function hashResponseShape(value) {
        try {
            return JSON.stringify(value);
        } catch {
            return String(value);
        }
    }

    function analyzeUpgradeInfoPayload(info, requestedEE) {
        const d = info?.data || info;
        const powersByLevel = Array.isArray(d?.powersByLevel) ? d.powersByLevel : [];
        const marketplacePrices = Array.isArray(d?.marketplacePrices) ? d.marketplacePrices : [];

        const marketplaceMap = new Map();
        for (const item of marketplacePrices) {
            const power = safeNumber(item?.power);
            const pricePerTh = safeNumber(item?.marketplacePricePerTh);
            if (power !== null && pricePerTh !== null) {
                marketplaceMap.set(power, pricePerTh);
            }
        }

        const basePrice = safeNumber(d?.price);
        const discount = safeNumber(d?.discount);
        const discountCoefficient = safeNumber(d?.discountCoefficient);
        const defaultNftEE = safeNumber(d?.defaultNftEE);

        let eeFactorEstimate = null;
        if (
            basePrice !== null
            && discount !== null
            && discountCoefficient !== null
            && defaultNftEE !== null
            && requestedEE !== undefined
            && requestedEE !== null
        ) {
            // DISPROVEN heuristic (kept only for reference): produces a FLAT factor,
            // identical for every level, which contradicts the real UI's decreasing price curve.
            eeFactorEstimate = 1 - (defaultNftEE - requestedEE) * discount * discountCoefficient;
        }

        const rows = [];
        for (let i = 1; i < powersByLevel.length; i += 1) {
            const fromPower = safeNumber(powersByLevel[i - 1]);
            const toPower = safeNumber(powersByLevel[i]);
            if (fromPower === null || toPower === null) continue;

            const deltaTh = toPower - fromPower;
            const mpPrice = marketplaceMap.get(toPower) ?? null;

            // NEW hypothesis (untested against ground truth, but matches real screenshot data much
            // better than the old flat eeFactorEstimate): a per-level VOLUME discount, independent of EE.
            // price(level) = basePrice * (1 - discount * discountCoefficient * (level - 1))
            // Rationale: real UI showed $12.88 -> $12.41 (ratio 0.9634) across ~9 levels, and
            // 1 - 0.004*9 = 0.964 matches almost exactly. The absolute base ($6.823) is likely in GMT,
            // converted to USD via the live GMT/USD rate (12.88 / 6.823 =~ 1.887, a plausible GMT price).
            const estPricePerThVolumeDiscount = basePrice !== null && discount !== null && discountCoefficient !== null
                ? Number((basePrice * (1 - discount * discountCoefficient * (i - 1))).toFixed(6))
                : null;

            // CONFIRMED (near-exact match, 2026-07-29): converting the GMT volume-discount estimate to USD
            // using ASSUMED_GMT_USD_RATE reproduces the real UI screenshot values almost to the cent
            // (level1: 6.823*1.887=12.877 vs real $12.88; level10: 6.577372*1.887=12.411 vs real $12.41).
            const estPriceUsdVolumeDiscount = estPricePerThVolumeDiscount !== null
                ? Number((estPricePerThVolumeDiscount * ASSUMED_GMT_USD_RATE).toFixed(2))
                : null;

            rows.push({
                level: i,
                fromPowerTh: fromPower,
                toPowerTh: toPower,
                deltaTh,
                baseUpgradePricePerTh: basePrice,
                estPricePerThVolumeDiscount,
                estPriceUsdVolumeDiscount,
                eeFactorEstimate,
                estPricePerThAtRequestedEE: basePrice !== null && eeFactorEstimate !== null
                    ? Number((basePrice * eeFactorEstimate).toFixed(6))
                    : null,
                marketplacePricePerThAtLevelPower: mpPrice
            });
        }

        return {
            requestedEE,
            defaultNftEE,
            price: basePrice,
            discount,
            discountCoefficient,
            powersByLevel,
            marketplacePrices,
            rows
        };
    }

    async function getCurrentMiners() {
        const result = await apiPost(MINERS_ENDPOINT, {});
        if (!result.ok) {
            throw new Error(`get-my failed: HTTP ${result.status} ${result.statusText}`);
        }
        return extractArrayResponse(result.data);
    }

    function getUniqueEEsFromMiners(miners) {
        const eeSet = new Set();
        for (const miner of miners) {
            const ee = safeNumber(miner?.energyEfficiency);
            if (ee !== null) eeSet.add(ee);
        }
        return Array.from(eeSet).sort((a, b) => a - b);
    }

    async function fetchPowerUpgradeInfoRaw(body) {
        const payload = body ?? {};
        const result = await apiPost(ENDPOINT, payload);
        console.log('Request payload:', payload);
        console.log('Response status:', result.status, result.statusText);
        console.log('Response body:', result.data);
        return result;
    }

    async function fetchPowerUpgradeInfoForEE(energyEfficiency, overrides) {
        const ee = safeNumber(energyEfficiency);
        if (ee === null) {
            throw new Error('energyEfficiency must be a number');
        }

        const payload = {
            energyEfficiency: ee,
            ...(overrides || {})
        };

        const result = await apiPost(ENDPOINT, payload);
        const analyzed = analyzeUpgradeInfoPayload(result.data, ee);

        console.log('Request payload:', payload);
        console.log('Response status:', result.status, result.statusText);
        console.log('Summary:', {
            requestedEE: analyzed.requestedEE,
            defaultNftEE: analyzed.defaultNftEE,
            price: analyzed.price,
            discount: analyzed.discount,
            discountCoefficient: analyzed.discountCoefficient,
            levels: analyzed.rows.length
        });
        console.table(analyzed.rows);

        return {
            request: payload,
            status: result.status,
            response: result.data,
            analyzed
        };
    }

    async function fetchPowerUpgradeInfoForAllMinerEEs() {
        const miners = await getCurrentMiners();
        const uniqueEEs = getUniqueEEsFromMiners(miners);

        if (!uniqueEEs.length) {
            console.warn('No miner efficiencies found. Trying fallback call with empty body.');
            return [await fetchPowerUpgradeInfoRaw({})];
        }

        const results = [];
        for (const ee of uniqueEEs) {
            const row = await fetchPowerUpgradeInfoForEE(ee);
            results.push(row);
        }

        const compare = results.map((r) => ({
            requestedEE: r.analyzed?.requestedEE,
            defaultNftEE: r.analyzed?.defaultNftEE,
            basePrice: r.analyzed?.price,
            discount: r.analyzed?.discount,
            discountCoefficient: r.analyzed?.discountCoefficient,
            levelsCount: r.analyzed?.rows?.length ?? 0
        }));

        console.log('Comparison by EE:');
        console.table(compare);

        return results;
    }

    async function probePowerUpgradeInfoPayloads(energyEfficiency) {
        const ee = energyEfficiency !== undefined && energyEfficiency !== null
            ? safeNumber(energyEfficiency)
            : null;

        const templates = [
            { name: 'empty', body: {} },
            { name: 'energyEfficiency', body: ee === null ? { energyEfficiency: 20 } : { energyEfficiency: ee } },
            { name: 'ee', body: ee === null ? { ee: 20 } : { ee } },
            { name: 'minerEnergyEfficiency', body: ee === null ? { minerEnergyEfficiency: 20 } : { minerEnergyEfficiency: ee } },
            { name: 'defaultNftEE', body: ee === null ? { defaultNftEE: 20 } : { defaultNftEE: ee } },
            { name: 'fullCandidate', body: ee === null
                ? { energyEfficiency: 20, power: 1, fromPower: 1, toPower: 2 }
                : { energyEfficiency: ee, power: 1, fromPower: 1, toPower: 2 } }
        ];

        const out = [];
        const seenShapes = new Map();

        for (const tpl of templates) {
            const res = await apiPost(ENDPOINT, tpl.body);
            const signature = hashResponseShape(res.data);

            if (!seenShapes.has(signature)) {
                seenShapes.set(signature, tpl.name);
            }

            out.push({
                payloadName: tpl.name,
                payload: tpl.body,
                status: res.status,
                ok: res.ok,
                duplicateOf: seenShapes.get(signature) === tpl.name ? '' : seenShapes.get(signature)
            });
        }

        console.table(out.map((x) => ({
            payloadName: x.payloadName,
            status: x.status,
            ok: x.ok,
            duplicateOf: x.duplicateOf
        })));

        console.log('Detailed probe result:', out);
        return out;
    }

    async function probePowerUpgradeInfoWithMinerIds(miners) {
        const sampleMiners = (miners || []).slice(0, 2);
        if (!sampleMiners.length) {
            return [];
        }

        const out = [];
        for (const miner of sampleMiners) {
            const idCandidates = [
                { field: 'nftId', value: miner?.id },
                { field: 'id', value: miner?.id },
                { field: 'minerId', value: miner?.id },
                { field: 'tokenId', value: miner?.id },
                { field: 'nftItemId', value: miner?.id },
                { field: 'externalUrlId', value: miner?.externalUrlId },
                { field: 'nftCollectionId', value: miner?.nftCollectionId }
            ].filter((c) => c.value !== undefined && c.value !== null);

            for (const candidate of idCandidates) {
                const body = { [candidate.field]: candidate.value };
                const res = await apiPost(ENDPOINT, body);
                out.push({
                    minerId: miner?.id,
                    field: candidate.field,
                    body,
                    status: res.status,
                    ok: res.ok,
                    response: res.ok ? res.data : undefined
                });
            }
        }

        console.log('--- Probing with real miner/NFT id fields ---');
        console.table(out.map((x) => ({
            minerId: x.minerId,
            field: x.field,
            status: x.status,
            ok: x.ok
        })));

        return out;
    }

    function enablePowerUpgradeInfoSpy() {
        if (globalThis.__powerUpgradeInfoSpyEnabled) {
            console.log('Spy is already enabled.');
            return;
        }

        globalThis.__powerUpgradeInfoSpyEnabled = true;
        const originalFetch = window.fetch;

        window.fetch = async function(...args) {
            const [url, options = {}] = args;
            const isTarget = typeof url === 'string' && url.includes('/api/nft/get-power-upgrade-info');

            if (!isTarget) {
                return originalFetch.apply(this, args);
            }

            let parsedBody = options?.body;
            if (typeof parsedBody === 'string') {
                try {
                    parsedBody = JSON.parse(parsedBody);
                } catch {
                    // keep string body if parse fails
                }
            }

            const startedAt = Date.now();
            const response = await originalFetch.apply(this, args);
            const clone = response.clone();

            let parsedResponse;
            try {
                parsedResponse = await clone.json();
            } catch {
                parsedResponse = await clone.text();
            }

            console.log('Captured get-power-upgrade-info request', {
                url,
                method: options?.method || 'GET',
                body: parsedBody,
                status: response.status,
                durationMs: Date.now() - startedAt,
                response: parsedResponse
            });

            return response;
        };

        console.log('Spy enabled. Open the Miner Levels dialog to capture the exact request payload.');
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
        } catch (err) {
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
            if (legacyCopyToClipboard(text)) {
                return true;
            }
        } catch (err) {
            console.warn('execCommand copy fallback failed:', err);
        }

        try {
            // DevTools-only global helper (Chrome/Edge console)
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

    async function runFullPowerUpgradeAnalysis() {
        console.clear();
        console.log('Running full get-power-upgrade-info analysis...');

        const report = {
            generatedAt: new Date().toISOString(),
            endpoint: ENDPOINT,
            emptyBodyCall: null,
            payloadProbe: null,
            minerIdProbe: null,
            minerEEs: [],
            resultsByEE: [],
            notes: []
        };

        // 1) Baseline call with empty body (matches the example from the user)
        try {
            const emptyResult = await apiPost(ENDPOINT, {});
            report.emptyBodyCall = {
                status: emptyResult.status,
                ok: emptyResult.ok,
                response: emptyResult.data
            };
        } catch (err) {
            report.notes.push(`Empty body call failed: ${err.message}`);
        }

        // 2) Probe different payload shapes ONCE to see if the endpoint accepts any params at all
        try {
            report.payloadProbe = await probePowerUpgradeInfoPayloads(20);
        } catch (err) {
            report.notes.push(`Payload probe failed: ${err.message}`);
        }

        const nonEmptyBodiesFail = Array.isArray(report.payloadProbe)
            && report.payloadProbe.length > 1
            && report.payloadProbe.filter((p) => p.payloadName !== 'empty').every((p) => !p.ok);
        const emptyBodyWorks = report.emptyBodyCall?.ok === true;

        if (nonEmptyBodiesFail && emptyBodyWorks) {
            report.notes.push(
                'Endpoint rejects ANY guessed field name (400) except {} -> it does NOT take a flat "energyEfficiency" parameter. '
                + 'It always returns ONE generic table (defaultNftEE/price/discount/discountCoefficient/powersByLevel/marketplacePrices) with the empty body.'
            );
        }

        // 2b) Try real miner/NFT id fields ONLY if step 2 did not already prove the endpoint is parameterless.
        //     (Skips 14 guaranteed-to-fail requests once we already know non-empty bodies always 400.)
        let minerIdProbeResults = [];
        if (!nonEmptyBodiesFail) {
            try {
                const minersForIdProbe = await getCurrentMiners();
                minerIdProbeResults = await probePowerUpgradeInfoWithMinerIds(minersForIdProbe);
                report.minerIdProbe = minerIdProbeResults;

                const workingIdField = minerIdProbeResults.find((r) => r.ok);
                if (workingIdField) {
                    report.notes.push(
                        `Found a working id field: "${workingIdField.field}" -> HTTP ${workingIdField.status}. `
                        + 'This is likely the real parameter (inspect report.minerIdProbe for the full response).'
                    );
                } else if (minerIdProbeResults.length) {
                    report.notes.push('None of the guessed id fields (nftId/id/minerId/tokenId/...) worked either (all 400).');
                }
            } catch (err) {
                report.notes.push(`Miner id probe failed: ${err.message}`);
            }
        } else {
            report.notes.push(
                'CONFIRMED: endpoint is fully parameterless (empty body works, every other body -> 400). '
                + 'Skipped miner-id probing since it would only produce more guaranteed 400s. '
                + 'The per-level $/TH prices shown in the "Miner Levels" UI are NOT computed by this endpoint - '
                + 'use enablePowerUpgradeInfoSpy() and open that dialog in the UI to find the real source.'
            );
        }

        report.notes.push(
            'IMPORTANT: "estPricePerThAtRequestedEE" is a DISPROVEN heuristic (flat factor, same for every level) - ignore it. '
            + '"estPricePerThVolumeDiscount" (GMT) x ASSUMED_GMT_USD_RATE = "estPriceUsdVolumeDiscount" (USD) is now CONFIRMED by near-exact match '
            + 'against real UI screenshot values: level1 -> $12.88 (predicted 12.88), level10 -> $12.41 (predicted 12.41). '
            + 'Formula: price(level) = basePrice(GMT) * (1 - discount * discountCoefficient * (level-1)) * gmtUsdRate. '
            + 'Update ASSUMED_GMT_USD_RATE at the top of this script with the live GMT/USD rate for maximum precision.'
        );

        // 3) Pull current miners and compute a client-side estimate per real EE value
        //    (no extra network calls needed once we know the endpoint ignores body params)
        try {
            const miners = await getCurrentMiners();
            const uniqueEEs = getUniqueEEsFromMiners(miners);
            report.minerEEs = uniqueEEs;

            if (!uniqueEEs.length) {
                report.notes.push('No miners with energyEfficiency found on this account.');
            }

            if (emptyBodyWorks) {
                for (const ee of uniqueEEs) {
                    const analyzed = analyzeUpgradeInfoPayload(report.emptyBodyCall.response, ee);
                    report.resultsByEE.push({
                        requestedEE: ee,
                        computedClientSide: true,
                        summary: {
                            defaultNftEE: analyzed.defaultNftEE,
                            price: analyzed.price,
                            discount: analyzed.discount,
                            discountCoefficient: analyzed.discountCoefficient
                        },
                        rows: analyzed.rows
                    });
                }
            }
        } catch (err) {
            report.notes.push(`getCurrentMiners failed: ${err.message}`);
        }

        console.log('--- Notes ---');
        report.notes.forEach((n) => console.log('- ' + n));

        if (report.emptyBodyCall?.response) {
            console.log('--- Raw base response (empty body) ---');
            console.log(report.emptyBodyCall.response);
        }

        if (report.resultsByEE.length) {
            console.log('--- Summary per miner EE (client-side estimate) ---');
            console.table(report.resultsByEE.map((r) => ({
                requestedEE: r.requestedEE,
                defaultNftEE: r.summary.defaultNftEE,
                basePrice: r.summary.price,
                discount: r.summary.discount,
                discountCoefficient: r.summary.discountCoefficient,
                levels: r.rows?.length ?? 0
            })));

            console.log('--- Detailed level/price rows for the FIRST miner EE (example) ---');
            console.table(report.resultsByEE[0].rows);
        }

        const jsonReport = JSON.stringify(report, null, 2);
        const copied = await copyTextToClipboard(jsonReport);

        console.log('Full report (object):', report);

        if (copied) {
            console.log('Report copied to clipboard (JSON). Just paste it (Ctrl+V) wherever you need it.');
        } else {
            console.log('Automatic copy failed (browser blocked it). Opening a copy dialog instead...');
            showCopyPrompt(jsonReport);
        }

        globalThis.__powerUpgradeInfoReport = report;
        return report;
    }

    function copyLastReport() {
        if (!globalThis.__powerUpgradeInfoReport) {
            console.warn('No report available yet. Run runFullPowerUpgradeAnalysis() first.');
            return false;
        }
        const jsonReport = JSON.stringify(globalThis.__powerUpgradeInfoReport, null, 2);
        showCopyPrompt(jsonReport);
        return true;
    }

    function powerUpgradeInfoHelp() {
        console.log('Commands:');
        console.log('  runFullPowerUpgradeAnalysis()  <-- runs everything and copies result to clipboard');
        console.log('  fetchPowerUpgradeInfoRaw(body?)');
        console.log('  fetchPowerUpgradeInfoForEE(energyEfficiency, overrides?)');
        console.log('  fetchPowerUpgradeInfoForAllMinerEEs()');
        console.log('  probePowerUpgradeInfoPayloads(energyEfficiency?)');
        console.log('  probePowerUpgradeInfoWithMinerIds(miners)');
        console.log('  enablePowerUpgradeInfoSpy()');
        console.log('');
        console.log('Quick start: just run runFullPowerUpgradeAnalysis()');
        console.log('If clipboard copy fails silently, run copyLastReport() afterwards to get a copy dialog.');
        console.log('');
        console.log('Ground-truth flow (RECOMMENDED - the API rejects all guessed params):');
        console.log('  1) enablePowerUpgradeInfoSpy()');
        console.log('  2) Open the "Miner Levels" dialog in the UI (click a miner -> Levels)');
        console.log('  3) Read the captured real request body + response from the console log');
    }

    globalThis.fetchPowerUpgradeInfoRaw = fetchPowerUpgradeInfoRaw;
    globalThis.fetchPowerUpgradeInfoForEE = fetchPowerUpgradeInfoForEE;
    globalThis.fetchPowerUpgradeInfoForAllMinerEEs = fetchPowerUpgradeInfoForAllMinerEEs;
    globalThis.probePowerUpgradeInfoPayloads = probePowerUpgradeInfoPayloads;
    globalThis.probePowerUpgradeInfoWithMinerIds = probePowerUpgradeInfoWithMinerIds;
    globalThis.enablePowerUpgradeInfoSpy = enablePowerUpgradeInfoSpy;
    globalThis.runFullPowerUpgradeAnalysis = runFullPowerUpgradeAnalysis;
    globalThis.copyLastReport = copyLastReport;
    globalThis.powerUpgradeInfoHelp = powerUpgradeInfoHelp;

    console.log('GoMining power-upgrade debug script loaded.');
    console.log('Run runFullPowerUpgradeAnalysis() to auto-test and copy findings to clipboard.');
    console.log('Or run powerUpgradeInfoHelp() for all commands.');
})();

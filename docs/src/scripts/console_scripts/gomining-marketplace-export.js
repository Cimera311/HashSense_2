// ============================================================
// GoMining Marketplace Export
// Endpoint: POST /api/nft/marketplace-index
// ============================================================
//
// Exportfunktionen:
//   exportMarketplaceAll()                      -> JSON + CSV
//   exportMarketplaceJsonOnly()                 -> nur JSON
//   exportMarketplaceCsvOnly()                  -> nur CSV
//
// Optionaler Custom-Payload (zus. Filter/Sortierung):
//   marketplaceBasePayload = { filter: { ... }, sort: { ... } }
//
// Laufzeit-Infos:
//   stopMarketplaceExport = true                -> Export abbrechen
//   marketplaceData                             -> Rohdaten (letzter Abruf)
// ============================================================

(function () {
	'use strict';

	const API_BASE = 'https://api.gomining.com/api';
	const ENDPOINT = '/nft/marketplace-index';
	const LIMIT = 100;
	const BATCH_DELAY_MS = 200;
	const DEFAULT_SAFE_MAX_RECORDS = 10000;
	const DEFAULT_CHUNK_SIZE = 5000;

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
			'Content-Type': 'application/json',
			'Accept': 'application/json',
			'Origin': 'https://app.gomining.com',
			'Referer': 'https://app.gomining.com/',
			'x-device-type': 'desktop',
		};
	}

	function requireToken() {
		const t = (globalThis.goMiningToken || findToken() || '').replace('Bearer ', '').trim();
		if (!t) {
			console.error('❌ Kein Token gefunden. Bitte in GoMining einloggen und erneut versuchen.');
			return null;
		}
		return t;
	}

	// ── Small utils ─────────────────────────────────────────────────
	function sleep(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	function jsonClone(obj) {
		return obj ? JSON.parse(JSON.stringify(obj)) : {};
	}

	function isoNowDate() {
		return new Date().toISOString().split('T')[0];
	}

	function q(v) {
		return `"${String(v ?? '').replace(/"/g, '""')}"`;
	}

	function toNum(v) {
		if (v === null || v === undefined || v === '') return '';
		const n = Number(v);
		return Number.isFinite(n) ? n : '';
	}

	function toBool(v) {
		return v ? 'ja' : 'nein';
	}

	function toDate(v) {
		return v ? String(v).split('T')[0] : '';
	}

	// ── Marketplace fetch ───────────────────────────────────────────
	function buildRequestBody(skip, limit, basePayload) {
		const payload = jsonClone(basePayload);
		payload.pagination = { skip, limit };
		return payload;
	}

	function getRuntimeOptions(options = {}) {
		const merged = {
			limit: LIMIT,
			delayMs: BATCH_DELAY_MS,
			maxRecords: 0,
			...jsonClone(globalThis.marketplaceRuntime || {}),
			...jsonClone(options || {}),
		};

		merged.limit = Math.max(1, parseInt(merged.limit, 10) || LIMIT);
		merged.delayMs = Math.max(0, parseInt(merged.delayMs, 10) || BATCH_DELAY_MS);
		merged.maxRecords = Math.max(0, parseInt(merged.maxRecords, 10) || 0);
		return merged;
	}

	async function fetchMarketplacePage(token, skip, limit, basePayload) {
		const body = buildRequestBody(skip, limit, basePayload);
		const res = await fetch(`${API_BASE}${ENDPOINT}`, {
			method: 'POST',
			headers: getHeaders(token),
			body: JSON.stringify(body),
		});

		if (!res.ok) {
			let detail = '';
			try {
				const err = await res.json();
				detail = `: ${JSON.stringify(err)}`;
			} catch (_) {
				// ignore parse error
			}
			throw new Error(`HTTP ${res.status}${detail}`);
		}

		const json = await res.json();
		const data = json.data || {};
		const items = data.array || [];
		const count = data.count ?? items.length;

		return { items, count };
	}

	async function fetchAllMarketplace(token, basePayload = {}, runtimeOptions = {}) {
		const cfg = getRuntimeOptions(runtimeOptions);
		let skip = 0;
		let totalCount = null;
		const all = [];

		console.log('\n🛒 Starte Marketplace Export...');
		console.log(`   Endpoint: ${ENDPOINT}`);
		console.log(`   Limit pro Request: ${cfg.limit}`);
		if (cfg.maxRecords > 0) {
			console.log(`   Safe-Limit aktiv: max ${cfg.maxRecords} Einträge`);
		}
		if (Object.keys(basePayload || {}).length) {
			console.log('   Zusätzlicher Base-Payload aktiv (Filter/Sortierung).');
		}

		while (true) {
			if (globalThis.stopMarketplaceExport) {
				console.log('🛑 Export gestoppt.');
				break;
			}

			const { items, count } = await fetchMarketplacePage(token, skip, cfg.limit, basePayload);

			if (totalCount === null) {
				totalCount = count;
				console.log(`   📊 Gesamt laut API: ${totalCount}`);
			}

			if (!items.length) break;

			if (cfg.maxRecords > 0) {
				const remaining = cfg.maxRecords - all.length;
				if (remaining <= 0) break;
				all.push(...items.slice(0, remaining));
			} else {
				all.push(...items);
			}

			skip += cfg.limit;
			console.log(`   Batch ${Math.ceil(skip / cfg.limit)}: +${items.length} (${all.length}/${totalCount})`);

			if (cfg.maxRecords > 0 && all.length >= cfg.maxRecords) {
				console.log(`   ⏹ Safe-Limit erreicht: ${all.length}`);
				break;
			}

			if (skip >= totalCount) break;
			await sleep(cfg.delayMs);
		}

		console.log(`✅ Marketplace geladen: ${all.length} Einträge`);
		return { records: all, totalCount: totalCount ?? all.length };
	}

	async function getMarketplaceCount(token, basePayload = {}) {
		const { count } = await fetchMarketplacePage(token, 0, 1, basePayload);
		console.log(`📊 Gesamtanzahl laut API: ${count}`);
		return count;
	}

	function downloadMarketplaceChunkJson(records, totalCount, chunkIndex, chunkSize) {
		const day = isoNowDate();
		const fileName = `gomining_marketplace_chunk_${String(chunkIndex).padStart(4, '0')}_${day}.json`;
		const payload = {
			exportedAt: new Date().toISOString(),
			endpoint: `${API_BASE}${ENDPOINT}`,
			totalCount,
			chunkIndex,
			chunkSize,
			records,
		};
		downloadBlob(JSON.stringify(payload, null, 2), fileName, 'application/json;charset=utf-8;');
		console.log(`💾 ${fileName} (${records.length} Datensätze)`);
	}

	function downloadMarketplaceChunkCsv(records, chunkIndex) {
		const day = isoNowDate();
		const fileName = `gomining_marketplace_chunk_${String(chunkIndex).padStart(4, '0')}_${day}.csv`;
		const csv = toMarketplaceCSV(records);
		downloadBlob(csv, fileName, 'text/csv;charset=utf-8;');
		console.log(`💾 ${fileName} (${records.length} Zeilen)`);
	}

	async function exportMarketplaceChunked(options = {}) {
		const token = requireToken();
		if (!token) return;

		const cfg = getRuntimeOptions(options);
		const chunkSize = Math.max(1, parseInt(options.chunkSize, 10) || DEFAULT_CHUNK_SIZE);
		const withCsv = Boolean(options.csv);
		const basePayload = jsonClone(globalThis.marketplaceBasePayload || {});

		globalThis.stopMarketplaceExport = false;

		let skip = 0;
		let totalCount = null;
		let chunkIndex = 0;
		let exported = 0;
		let chunkBuffer = [];

		console.log('\n🧩 Starte Chunk-Export...');
		console.log(`   Chunk-Größe: ${chunkSize}`);
		console.log(`   Limit pro Request: ${cfg.limit}`);
		if (cfg.maxRecords > 0) {
			console.log(`   Safe-Limit aktiv: max ${cfg.maxRecords} Einträge`);
		}

		while (true) {
			if (globalThis.stopMarketplaceExport) {
				console.log('🛑 Chunk-Export gestoppt.');
				break;
			}

			const { items, count } = await fetchMarketplacePage(token, skip, cfg.limit, basePayload);
			if (totalCount === null) {
				totalCount = count;
				console.log(`   📊 Gesamt laut API: ${totalCount}`);
			}
			if (!items.length) break;

			for (const item of items) {
				if (cfg.maxRecords > 0 && exported >= cfg.maxRecords) break;
				chunkBuffer.push(item);
				exported += 1;

				if (chunkBuffer.length >= chunkSize) {
					chunkIndex += 1;
					downloadMarketplaceChunkJson(chunkBuffer, totalCount, chunkIndex, chunkSize);
					if (withCsv) downloadMarketplaceChunkCsv(chunkBuffer, chunkIndex);
					chunkBuffer = [];
				}
			}

			skip += cfg.limit;
			console.log(`   Batch ${Math.ceil(skip / cfg.limit)}: verarbeitet ${exported}/${totalCount}`);

			if (cfg.maxRecords > 0 && exported >= cfg.maxRecords) {
				console.log(`   ⏹ Safe-Limit erreicht: ${exported}`);
				break;
			}

			if (skip >= totalCount) break;
			await sleep(cfg.delayMs);
		}

		if (chunkBuffer.length) {
			chunkIndex += 1;
			downloadMarketplaceChunkJson(chunkBuffer, totalCount ?? exported, chunkIndex, chunkSize);
			if (withCsv) downloadMarketplaceChunkCsv(chunkBuffer, chunkIndex);
		}

		console.log(`✅ Chunk-Export fertig: ${exported} Datensätze in ${chunkIndex} Datei(en)`);
	}

	// ── CSV export (kompakt, wichtigste Felder) ────────────────────
	function toMarketplaceCSV(records) {
		const headers = [
			'Nr',
			'id',
			'marketplaceOrderId',
			'name',
			'status',
			'marketplaceOrderSaleType',
			'currency',
			'price',
			'priceWithoutFee',
			'fee',
			'priceUsdt',
			'priceGmt',
			'power',
			'energyEfficiency',
			'eligiblePower',
			'level',
			'isUpgraded',
			'network',
			'marketplace',
			'type.name',
			'wallet.address',
			'wallet.type',
			'nftCollectionId',
			'nftCollectionValue',
			'nftCollectionValueGmt',
			'tokenId',
			'address',
			'externalUrlId',
			'imageUrl',
			'smallImageUrl',
			'ipfs',
			'availableToOrder',
			'isMine',
			'forbiddenByInAppPurchase',
			'createdAt',
			'updatedAt',
			'roi.actual.value',
			'roi.actual.electricityFee',
			'roi.actual.netReward',
			'roi.actual.paybackPeriodInMonths',
			'roi.anticipated.value',
			'roi.anticipated.electricityFee',
			'roi.anticipated.netReward',
			'roi.anticipated.paybackPeriodInMonths',
			'auction.startPrice',
			'auction.floorPrice',
			'auction.currentPrice',
			'auction.priceStep',
			'auction.decrementIntervalSeconds',
			'auction.startedAt',
			'auction.nextDecrementAt',
			'auction.decrementStopped',
			'rarityRank',
			'rarityScore',
			'rarityPosition',
			'achievementsRating',
			'attributesCount',
			'achievementsCount',
		];

		const rows = records.map((r, i) => [
			i + 1,
			r.id,
			r.marketplaceOrderId,
			r.name,
			r.status,
			r.marketplaceOrderSaleType,
			r.currency,
			toNum(r.price),
			toNum(r.priceWithoutFee),
			toNum(r.fee),
			toNum(r.priceUsdt),
			toNum(r.priceGmt),
			toNum(r.power),
			toNum(r.energyEfficiency),
			toNum(r.eligiblePower),
			toNum(r.level),
			toBool(r.isUpgraded),
			r.network,
			r.marketplace,
			r.type?.name,
			r.wallet?.address,
			r.wallet?.type,
			r.nftCollectionId,
			toNum(r.nftCollectionValue),
			toNum(r.nftCollectionValueGmt),
			r.tokenId,
			r.address,
			r.externalUrlId,
			r.imageUrl,
			r.smallImageUrl,
			r.ipfs,
			toBool(r.availableToOrder),
			toBool(r.isMine),
			toBool(r.forbiddenByInAppPurchase),
			toDate(r.createdAt),
			toDate(r.updatedAt),
			toNum(r.roi?.actual?.value),
			toNum(r.roi?.actual?.electricityFee),
			toNum(r.roi?.actual?.netReward),
			toNum(r.roi?.actual?.paybackPeriodInMonths),
			toNum(r.roi?.anticipated?.value),
			toNum(r.roi?.anticipated?.electricityFee),
			toNum(r.roi?.anticipated?.netReward),
			toNum(r.roi?.anticipated?.paybackPeriodInMonths),
			toNum(r.auction?.startPrice),
			toNum(r.auction?.floorPrice),
			toNum(r.auction?.currentPrice),
			toNum(r.auction?.priceStep),
			toNum(r.auction?.decrementIntervalSeconds),
			r.auction?.startedAt || '',
			r.auction?.nextDecrementAt || '',
			toBool(r.auction?.decrementStopped),
			r.rarityRank,
			toNum(r.rarityScore),
			r.rarityPosition,
			toNum(r.achievementsRating),
			Array.isArray(r.attributes) ? r.attributes.length : 0,
			Array.isArray(r.achievements) ? r.achievements.length : 0,
		].map(q).join(';'));

		return '\uFEFF' + headers.join(';') + '\n' + rows.join('\n');
	}

	// ── Download helpers ────────────────────────────────────────────
	function downloadBlob(content, fileName, mimeType) {
		const blob = new Blob([content], { type: mimeType });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = fileName;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	function downloadMarketplaceJson(records, totalCount) {
		const day = isoNowDate();
		const fileName = `gomining_marketplace_all_${day}.json`;
		const payload = {
			exportedAt: new Date().toISOString(),
			endpoint: `${API_BASE}${ENDPOINT}`,
			totalCount,
			records,
		};
		downloadBlob(JSON.stringify(payload, null, 2), fileName, 'application/json;charset=utf-8;');
		console.log(`💾 ${fileName} (${records.length} Datensätze)`);
	}

	function downloadMarketplaceJsonRange(records, totalCount, fromSkip, requestedTake) {
		const day = isoNowDate();
		const fileName = `gomining_marketplace_range_${fromSkip}_${requestedTake}_${day}.json`;
		const payload = {
			exportedAt: new Date().toISOString(),
			endpoint: `${API_BASE}${ENDPOINT}`,
			totalCount,
			fromSkip,
			requestedTake,
			actualCount: records.length,
			records,
		};
		downloadBlob(JSON.stringify(payload, null, 2), fileName, 'application/json;charset=utf-8;');
		console.log(`💾 ${fileName} (${records.length} Datensätze)`);
	}

	function downloadMarketplaceCsvRange(records, fromSkip, requestedTake) {
		const day = isoNowDate();
		const fileName = `gomining_marketplace_range_${fromSkip}_${requestedTake}_${day}.csv`;
		const csv = toMarketplaceCSV(records);
		downloadBlob(csv, fileName, 'text/csv;charset=utf-8;');
		console.log(`💾 ${fileName} (${records.length} Zeilen)`);
	}

	function downloadMarketplaceCsv(records) {
		const day = isoNowDate();
		const fileName = `gomining_marketplace_all_${day}.csv`;
		const csv = toMarketplaceCSV(records);
		downloadBlob(csv, fileName, 'text/csv;charset=utf-8;');
		console.log(`💾 ${fileName} (${records.length} Zeilen)`);
	}

	// ── Main run helpers ────────────────────────────────────────────
	async function runMarketplaceExport(options = { json: true, csv: true }) {
		const token = requireToken();
		if (!token) return;

		globalThis.stopMarketplaceExport = false;

		const basePayload = jsonClone(globalThis.marketplaceBasePayload || {});
		const runtimeOptions = {
			limit: options.limit,
			delayMs: options.delayMs,
			maxRecords: options.maxRecords,
		};

		try {
			const { records, totalCount } = await fetchAllMarketplace(token, basePayload, runtimeOptions);
			if (!records.length) {
				console.log('⚠️ Keine Marketplace-Daten gefunden.');
				return;
			}

			globalThis.marketplaceData = records;

			if (options.json) downloadMarketplaceJson(records, totalCount);
			if (options.csv) downloadMarketplaceCsv(records);

			console.log('✅ Export abgeschlossen.');
		} catch (err) {
			console.error('❌ Export fehlgeschlagen:', err.message || err);
		}
	}

	async function exportMarketplaceRange(fromSkip = 0, take = 10000, options = { json: true, csv: true }) {
		const token = requireToken();
		if (!token) return;

		const startSkip = Math.max(0, parseInt(fromSkip, 10) || 0);
		const requestedTake = Math.max(1, parseInt(take, 10) || 10000);
		const basePayload = jsonClone(globalThis.marketplaceBasePayload || {});
		const cfg = getRuntimeOptions({
			limit: options.limit,
			delayMs: options.delayMs,
			maxRecords: requestedTake,
		});

		globalThis.stopMarketplaceExport = false;

		let skip = startSkip;
		let totalCount = null;
		const records = [];

		console.log(`\n🧭 Range-Export: skip=${startSkip}, take=${requestedTake}`);
		console.log(`   Limit pro Request: ${cfg.limit}`);

		try {
			while (records.length < requestedTake) {
				if (globalThis.stopMarketplaceExport) {
					console.log('🛑 Range-Export gestoppt.');
					break;
				}

				const { items, count } = await fetchMarketplacePage(token, skip, cfg.limit, basePayload);
				if (totalCount === null) {
					totalCount = count;
					console.log(`   📊 Gesamt laut API: ${totalCount}`);
				}
				if (!items.length) break;

				const remaining = requestedTake - records.length;
				records.push(...items.slice(0, remaining));
				skip += cfg.limit;

				console.log(`   Batch ${Math.ceil((skip - startSkip) / cfg.limit)}: ${records.length}/${requestedTake}`);

				if (skip >= totalCount) break;
				await sleep(cfg.delayMs);
			}

			if (!records.length) {
				console.log('⚠️ Keine Daten in diesem Range gefunden.');
				return;
			}

			if (options.json !== false) downloadMarketplaceJsonRange(records, totalCount ?? records.length, startSkip, requestedTake);
			if (options.csv) downloadMarketplaceCsvRange(records, startSkip, requestedTake);

			globalThis.marketplaceData = records;
			console.log(`✅ Range-Export fertig: ${records.length} Datensätze`);
		} catch (err) {
			console.error('❌ Range-Export fehlgeschlagen:', err.message || err);
		}
	}

	async function exportMarketplaceRangeJson(fromSkip = 0, take = 10000) {
		await exportMarketplaceRange(fromSkip, take, { json: true, csv: false });
	}

	async function exportMarketplaceRangeJsonCsv(fromSkip = 0, take = 10000) {
		await exportMarketplaceRange(fromSkip, take, { json: true, csv: true });
	}

	async function exportMarketplaceAll() {
		await runMarketplaceExport({ json: true, csv: true });
	}

	async function exportMarketplaceJsonOnly() {
		await runMarketplaceExport({ json: true, csv: false });
	}

	async function exportMarketplaceCsvOnly() {
		await runMarketplaceExport({ json: false, csv: true });
	}

	async function exportMarketplaceCount() {
		const token = requireToken();
		if (!token) return;
		const basePayload = jsonClone(globalThis.marketplaceBasePayload || {});
		try {
			await getMarketplaceCount(token, basePayload);
		} catch (err) {
			console.error('❌ Count fehlgeschlagen:', err.message || err);
		}
	}

	async function exportMarketplaceSafe(maxRecords = DEFAULT_SAFE_MAX_RECORDS) {
		const max = Math.max(1, parseInt(maxRecords, 10) || DEFAULT_SAFE_MAX_RECORDS);
		await runMarketplaceExport({ json: true, csv: true, maxRecords: max });
	}

	async function exportMarketplaceChunkedJson(chunkSize = DEFAULT_CHUNK_SIZE, maxRecords = 0) {
		await exportMarketplaceChunked({ chunkSize, maxRecords, csv: false });
	}

	async function exportMarketplaceChunkedJsonCsv(chunkSize = DEFAULT_CHUNK_SIZE, maxRecords = 0) {
		await exportMarketplaceChunked({ chunkSize, maxRecords, csv: true });
	}

	function printMarketplaceRangePlan(rangeSize = 10000, maxRanges = 20) {
		const size = Math.max(1, parseInt(rangeSize, 10) || 10000);
		const count = Math.max(1, parseInt(maxRanges, 10) || 20);
		console.log(`\n🗂 Range-Plan (size=${size}, maxRanges=${count})`);
		for (let i = 0; i < count; i++) {
			const skip = i * size;
			console.log(`   exportMarketplaceRangeJson(${skip}, ${size})`);
		}
	}

	// ── Expose globally ─────────────────────────────────────────────
	Object.assign(globalThis, {
		exportMarketplaceAll,
		exportMarketplaceJsonOnly,
		exportMarketplaceCsvOnly,
		exportMarketplaceCount,
		exportMarketplaceSafe,
		exportMarketplaceChunkedJson,
		exportMarketplaceChunkedJsonCsv,
		exportMarketplaceRange,
		exportMarketplaceRangeJson,
		exportMarketplaceRangeJsonCsv,
		printMarketplaceRangePlan,
		stopMarketplaceExport: false,
		marketplaceBasePayload: globalThis.marketplaceBasePayload || {},
		marketplaceRuntime: globalThis.marketplaceRuntime || {
			limit: LIMIT,
			delayMs: BATCH_DELAY_MS,
			maxRecords: 0,
		},
	});

	console.log(`
╔══════════════════════════════════════════════════════════════╗
║       🛒 GoMining Marketplace Export bereit ✅               ║
╚══════════════════════════════════════════════════════════════╝

  Endpoint: /api/nft/marketplace-index
  Pagination: skip/limit (automatisch bis Ende)
  Default limit: ${LIMIT}

  Funktionen:
   exportMarketplaceAll()          -> JSON + CSV
   exportMarketplaceJsonOnly()     -> nur JSON
   exportMarketplaceCsvOnly()      -> nur CSV
	   exportMarketplaceCount()        -> nur Gesamtanzahl
	   exportMarketplaceSafe(10000)    -> Stop bei X Datensätzen
	   exportMarketplaceChunkedJson(5000)
	   exportMarketplaceChunkedJsonCsv(5000)
	   exportMarketplaceRangeJson(0, 10000)
	   exportMarketplaceRangeJsonCsv(0, 10000)
	   printMarketplaceRangePlan(10000, 20)

  Optionaler Base-Payload (Filter/Sort):
   marketplaceBasePayload = { ... }
	  Runtime-Steuerung:
	   marketplaceRuntime = { limit: 100, delayMs: 200, maxRecords: 0 }

  Laufzeit:
   stopMarketplaceExport = true    -> Abbrechen
   marketplaceData                 -> Rohdaten (letzter Abruf)
`);

})();

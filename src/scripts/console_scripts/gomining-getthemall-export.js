// GoMining GetThemAll — erster Entwurf. Nur auf app.gomining.com ausführen.
// Nach dem Einfügen: await getthemall()
// Status: gmExport.status() | Pause: gmExport.pause() | Weiter: gmExport.resume()
// Stop: gmExport.stop() | Downloads erneut: gmExport.downloadAll()
// Keine automatische serverseitige Token-Erneuerung; aktuelle Browser-Tokens werden übernommen.
// Eine Pause bleibt nur im aktuellen Tab erhalten. Nicht neu laden.
// Generiert mit tools/build_getthemall.py; Originalexporte bleiben unverändert.
(function () {
  'use strict';
  const root = globalThis;
  if (root.gmExport?.status?.().running) {
    console.warn('GetThemAll läuft bereits. Erst gmExport.stop() und das Ende abwarten.');
    return;
  }
  const nativeFetch = root.fetch.bind(root);
  const nativeConsole = root.console;
  const nativeDocument = root.document;
  const factories = {};
  const labels = {
    transactions: 'Wallet-Transaktionen', miners: 'Minerbestand und Historie',
    income: 'Mining-Einnahmen (Details und Tagesübersicht)', wars: 'Miner Wars',
    referrals: 'Referral-Einnahmen', referralUsers: 'Geworbene Nutzer', balances: 'Wallet-Guthaben', cards: 'Kreditkarten'
  };
  const defaultModules = ['balances', 'miners', 'income', 'wars', 'referrals', 'referralUsers', 'transactions', 'cards'];
  let state = { running: false, paused: false, stopped: false, current: null, results: [], files: [] };
  let wake = null;
  let aborter = null;
  let tokenOverride = null;
  let tokenSnapshot = new Map();
  let latestToken = null;

  function readToken() {
    const values = new Map();
    const keys = ['access_token', 'token', 'auth_token', 'jwt', 'authToken', 'accessToken'];
    const normalize = value => typeof value === 'string' ? value.replace(/^Bearer\s+/i, '').trim() : '';
    for (const cookie of nativeDocument.cookie.split(';')) {
      const at = cookie.indexOf('=');
      const name = cookie.slice(0, at).trim();
      if (at >= 0 && keys.includes(name)) {
        try { values.set(`cookie:${name}`, normalize(decodeURIComponent(cookie.slice(at + 1)))); } catch {}
      }
    }
    for (const kind of ['localStorage', 'sessionStorage']) {
      try {
        for (const key of keys) values.set(`${kind}:${key}`, normalize(root[kind].getItem(key)));
      } catch {}
    }
    if (tokenOverride) return tokenOverride;
    // Ein tatsächlich geänderter Browserwert hat Vorrang vor einem alten Cache.
    for (const [source, value] of values) {
      if (value && tokenSnapshot.get(source) !== value) { latestToken = value; break; }
    }
    tokenSnapshot = values;
    if (latestToken && [...values.values()].includes(latestToken)) return latestToken;
    latestToken = [...values.values()].find(Boolean) || normalize(root.goMiningToken) || null;
    return latestToken;
  }

  function snapshot() {
    return {
      running: state.running, paused: state.paused, stopped: state.stopped,
      current: state.current, pauseReason: state.pauseReason || null,
      results: state.results.map(row => ({ ...row })),
      files: state.files.map(({ name, module, blob }) => ({ name, module, bytes: blob.size }))
    };
  }

  async function gate() {
    while (state.paused && !state.stopped) await new Promise(resolve => { wake = resolve; });
    if (state.stopped) throw new Error('Export gestoppt.');
  }

  async function authPause() {
    state.paused = true;
    state.pauseReason = 'Anmeldung';
    nativeConsole.warn('Anmeldung abgelaufen oder nicht verfügbar. GoMining im selben Tab verwenden, dann gmExport.resume(). Nicht neu laden; die aktuelle Anfrage bleibt erhalten.');
    await gate();
  }

  function safeMessage(value) {
    return String(value).replace(/Bearer\s+\S+/gi, 'Bearer [entfernt]')
      .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[Token entfernt]');
  }

  function environment(record) {
    const box = {};
    const pending = [];
    const blobUrls = new Map();
    let ready = false;
    let sequence = 0;
    const local = new Proxy(box, {
      get(target, key) { return key === 'goMiningToken' ? readToken() : target[key]; },
      set(target, key, value) { if (key !== 'goMiningToken') target[key] = value; return true; }
    });
    const log = new Proxy({}, {
      get(_, method) {
        if (method === 'clear') return () => {};
        return (...args) => {
          if (!ready) return;
          if (method === 'error') record.error ||= safeMessage(args.map(String).join(' '));
          // Alte Skripte drucken Tokenpräfixe und nicht mehr gültige Startbefehle.
          if (args.some(arg => typeof arg === 'string' && /token|YOUR_TOKEN|NEW_TOKEN|setToken\(/i.test(arg))) return;
          if (method === 'log' && args.some(arg => typeof arg === 'string' && /completed|complete|finished|successfully|downloaded|exportiert/i.test(arg))) return;
          const output = nativeConsole[method] || nativeConsole.log;
          output.call(nativeConsole, ...args.map(arg => typeof arg === 'string' ? safeMessage(arg) : arg));
        };
      }
    });
    const urlProxy = new Proxy(URL, {
      get(target, key) {
        if (key === 'createObjectURL') return blob => {
          const id = `blob:getthemall-${record.module}-${++sequence}`;
          blobUrls.set(id, blob); return id;
        };
        if (key === 'revokeObjectURL') return () => {};
        return Reflect.get(target, key);
      }
    });
    const doc = new Proxy(nativeDocument, {
      get(target, key) {
        if (key === 'createElement') return (...args) => {
          const element = target.createElement(...args);
          if (String(args[0]).toLowerCase() === 'a') element.click = () => {
            const blob = blobUrls.get(element.href);
            if (!blob) throw new Error('Unbekannter Download im Exportmodul.');
            pending.push({ name: element.download, blob, module: record.module });
          };
          return element;
        };
        const value = Reflect.get(target, key, target);
        return typeof value === 'function' ? value.bind(target) : value;
      }
    });

    async function request(input, init = {}) {
      try {
        if (record.error) throw new Error('Modul nach vorherigem Fehler angehalten.');
        const url = new URL(String(input));
        if (!['https://api.gomining.com', 'https://referral-api.bounty.gomining.com', 'https://internal-api.baas.gomining.com'].includes(url.origin)) {
          throw new Error('Unbekannter API-Host im Exportmodul.');
        }
        let lastRejected = null;
        let transientRetries = 0;
        while (true) {
          await gate();
          const token = readToken();
          if (!token || token === lastRejected) { await authPause(); continue; }
          const headers = new Headers(init.headers);
          headers.set('Authorization', `Bearer ${token}`);
          headers.delete('Origin'); headers.delete('Referer');
          aborter = new AbortController();
          let response;
          try {
            response = await nativeFetch(input, { ...init, headers, signal: aborter.signal });
          } catch (error) {
            if (state.stopped) throw new Error('Export gestoppt.');
            if (transientRetries++ < 2) { await new Promise(r => setTimeout(r, 1000 * transientRetries)); continue; }
            throw new Error(`Netzwerkfehler bei ${url.pathname}.`);
          } finally { aborter = null; }
          record.requests++;
          if (response.status === 401) {
            lastRejected = token;
            const fresh = readToken();
            if (fresh && fresh !== token) continue;
            await authPause();
            continue;
          }
          if ((response.status === 429 || response.status >= 500) && transientRetries++ < 2) {
            const retrySeconds = Number(response.headers.get('Retry-After'));
            const delay = Math.min(30000, Math.max(1000, Number.isFinite(retrySeconds) && retrySeconds > 0 ? retrySeconds * 1000 : 1500 * transientRetries));
            await new Promise(r => setTimeout(r, delay));
            continue;
          }
          if (!response.ok) throw new Error(`HTTP ${response.status} bei ${url.pathname}.`);
          return new Proxy(response, {
            get(target, key) {
              if (key === 'json') return async () => {
                try {
                  const data = await target.json();
                  if (!data || (!Array.isArray(data) && !Object.prototype.hasOwnProperty.call(data, 'data'))) {
                    throw new Error(`Unerwartetes Antwortformat bei ${url.pathname}.`);
                  }
                  return data;
                } catch (error) {
                  record.error ||= `Antwort konnte nicht gelesen werden: ${url.pathname}.`;
                  throw error;
                }
              };
              const value = Reflect.get(target, key, target);
              return typeof value === 'function' ? value.bind(target) : value;
            }
          });
        }
      } catch (error) {
        record.error ||= safeMessage(error.message);
        throw error;
      }
    }
    return { local, log, doc, urlProxy, request, pending, activate() { ready = true; } };
  }

  function downloadFile(file) {
    const url = URL.createObjectURL(file.blob);
    const link = nativeDocument.createElement('a');
    link.href = url; link.download = file.name;
    nativeDocument.body.appendChild(link);
    link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  async function downloadAll() {
    for (const file of state.files) {
      downloadFile(file);
      await new Promise(r => setTimeout(r, 250));
    }
    nativeConsole.log(`${state.files.length} Datei-Downloads angefordert. Browser kann die Freigabe mehrerer Downloads verlangen.`);
  }

  async function all(options = {}) {
    if (state.running) throw new Error('Ein Export läuft bereits.');
    const modules = options.modules || defaultModules;
    if (!Array.isArray(modules) || !modules.length || new Set(modules).size !== modules.length || modules.some(id => !labels[id])) {
      throw new Error('Ungültige Modulauswahl. Verfügbar: ' + defaultModules.join(', '));
    }
    state = { running: true, paused: false, stopped: false, current: null, results: [], files: [] };
    try {
      if (!readToken()) await authPause();
      for (const id of modules) {
        await gate();
        state.current = id;
        const record = { module: id, status: 'läuft', requests: 0, files: 0, error: null };
        state.results.push(record);
        nativeConsole.log(`[${state.results.length}/${modules.length}] ${labels[id]}`);
        const env = environment(record);
        try {
          const runner = factories[id](env.local, env.local, env.request, env.log, env.doc, env.urlProxy);
          env.activate();
          await runner();
          if (state.stopped) throw new Error('Export gestoppt.');
          if (record.error) throw new Error(record.error);
          state.files.push(...env.pending);
          record.files = env.pending.length;
          record.status = env.pending.length ? 'fertig' : 'fertig, keine Datei';
          nativeConsole.log(`${labels[id]}: ${record.status} (${record.files} Dateien).`);
        } catch (error) {
          record.error ||= safeMessage(error.message);
          record.status = state.stopped ? 'gestoppt' : 'fehlgeschlagen';
          nativeConsole.warn(`${labels[id]}: ${record.status}. ${record.error} Keine Teil-Dateien freigegeben.`);
        }
        if (state.stopped) break;
      }
    } catch (error) {
      if (!state.stopped) nativeConsole.error(safeMessage(error.message));
    } finally {
      state.running = false; state.current = null; state.paused = false;
      nativeConsole.table(state.results);
    }
    if (options.download !== false && state.files.length) await downloadAll();
    return snapshot();
  }

  // Source: gomining-export-final_transactions_approved.js
factories.transactions = function(globalThis, window, fetch, console, document, URL) {
// ═══════════════════════════════════════════════════════
// 🚀 GOMINING TRANSACTION EXPORT - FINAL VERSION
// Complete solution with date selection and progress display
// ═══════════════════════════════════════════════════════

// 🔐 SET TOKEN (automatically searched on load)
globalThis.goMiningToken = null;

// ⚙️ EXPORT CONFIGURATION
globalThis.exportConfig = {
  fromDate: null,        // Format: "2026-01-01" or null for all
  toDate: null,          // Format: "2026-12-31" or null for all
  testMode: false,       // true = only 100 transactions
  batchSize: 100,        // Transactions per request
  delayMs: 50            // Delay between requests (ms)
};

// 📅 HELPER FUNCTION: Set date range
window.setDateRange = function(from, to = null) {
  if (from === 'heute' || from === 'today') {
    const today = new Date().toISOString().split('T')[0];
    exportConfig.fromDate = today;
    exportConfig.toDate = today;
    console.log(`📅 Date filter: Today (${today})`);
  } else if (from === 'monat' || from === 'month') {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    exportConfig.fromDate = firstDay.toISOString().split('T')[0];
    exportConfig.toDate = lastDay.toISOString().split('T')[0];
    console.log(`📅 Date filter: This month (${exportConfig.fromDate} - ${exportConfig.toDate})`);
  } else if (from === 'jahr' || from === 'year') {
    const year = new Date().getFullYear();
    exportConfig.fromDate = `${year}-01-01`;
    exportConfig.toDate = `${year}-12-31`;
    console.log(`📅 Date filter: This year (${exportConfig.fromDate} - ${exportConfig.toDate})`);
  } else if (typeof from === 'number') {
    // Year as number
    exportConfig.fromDate = `${from}-01-01`;
    exportConfig.toDate = `${from}-12-31`;
    console.log(`📅 Date filter: Year ${from}`);
  } else {
    exportConfig.fromDate = from;
    exportConfig.toDate = to || new Date().toISOString().split('T')[0];
    console.log(`📅 Date filter: ${exportConfig.fromDate} to ${exportConfig.toDate}`);
  }
  return exportConfig;
};

// 🔑 Find token automatically
function findToken() {
    if (globalThis.goMiningToken) return globalThis.goMiningToken;
  // Try from cookies
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'access_token') {
      console.log('🔑 Token found in cookies!');
      return decodeURIComponent(value);
    }
  }
  
  // Try from localStorage
  const token = localStorage.getItem('access_token');
  if (token) {
    console.log('🔑 Token found in localStorage!');
    return token;
  }
  
  return null;
}

// 📊 MAIN EXPORT FUNCTION
async function exportTransactions() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 GOMINING TRANSACTION EXPORT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Get token
  const token = (globalThis.goMiningToken || findToken() || '').replace('Bearer ', '').trim();
  if (!token) {
    console.error('❌ No token found!');
    console.log('\n💡 Set token manually:');
    console.log('   globalThis.goMiningToken = "YOUR_TOKEN"');
    console.log('   exportTransactions()');
    return;
  }
  console.log(`🔑 Token: ${token.substring(0, 20)}...`);
  
  // Show configuration
  if (exportConfig.fromDate || exportConfig.toDate) {
    console.log(`📅 Period: ${exportConfig.fromDate || 'Start'} to ${exportConfig.toDate || 'Today'}`);
  } else {
    console.log('📅 Period: All transactions');
  }
  
  if (exportConfig.testMode) {
    console.log('🧪 TEST MODE: Only first 100 transactions\n');
  } else {
    console.log('');
  }
  
  const apiUrl = 'https://api.gomining.com/api/wallet/transaction-history';
  let allTransactions = [];
  let cursor = Date.now();
  let batchNum = 0;
  let totalCount = 0;
  const startTime = Date.now();
  
  while (true) {
    batchNum++;
    
    if (exportConfig.testMode && batchNum > 1) {
      console.log('🛑 Test mode: Stopping after 1 request');
      break;
    }
    
    console.log(`📄 Loading batch ${batchNum}...`);
    
    try {
      // Korrektes API-Format (cursor-basierte Pagination)
      const requestBody = {
        filter: {
          fromType: null,
          walletType: ["VIRTUAL_BNB", "VIRTUAL_BTC", "VIRTUAL_ETH", "VIRTUAL_GMT", 
                       "VIRTUAL_SOL", "VIRTUAL_TON", "VIRTUAL_USDC", "VIRTUAL_USDT"],
          range: null
        },
        pagination: {
          cursor: cursor,
          limit: exportConfig.batchSize
        }
      };
      
      // Add date filter
      if (exportConfig.fromDate || exportConfig.toDate) {
        const from = exportConfig.fromDate ? new Date(exportConfig.fromDate + 'T00:00:00Z') : new Date('2000-01-01');
        const to = exportConfig.toDate ? new Date(exportConfig.toDate + 'T23:59:59Z') : new Date();
        
        requestBody.filter.range = {
          from: from.toISOString(),
          to: to.toISOString()
        };
      }
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
          'Origin': 'https://app.gomining.com',
          'Referer': 'https://app.gomining.com/',
          'x-device-type': 'desktop'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        console.error(`\n❌ API Error: ${response.status}`);
        if (response.status === 401) {
          console.error('🔒 Token invalid or expired!');
          console.log('💡 Copy new token from DevTools and set:');
          console.log('   globalThis.goMiningToken = "NEW_TOKEN"');
        }
        break;
      }
      
      const result = await response.json();
      const transactions = result.data?.array || [];
      totalCount = result.data?.count || 0;
      
      if (!transactions.length) {
        console.log('\n✅ All data loaded!');
        break;
      }
      
      allTransactions.push(...transactions);
      
      const progress = totalCount > 0 ? ((allTransactions.length / totalCount) * 100).toFixed(1) : '?';
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`\r✓ ${allTransactions.length}/${totalCount} Transactions (${progress}%) | ${elapsed}s`);
      
      // Check if we should continue
      if (exportConfig.testMode) break;
      
      // Next cursor = timestamp of last transaction
      const lastTx = transactions[transactions.length - 1];
      const nextCursor = new Date(lastTx.createdAt).getTime();
      
      if (nextCursor === cursor || allTransactions.length >= totalCount) {
        console.log('✅ All data loaded!');
        break;
      }
      
      cursor = nextCursor;
      await new Promise(r => setTimeout(r, exportConfig.delayMs));
      
    } catch (error) {
      console.error('\n❌ Error:', error.message);
      break;
    }
  }
  
  if (!allTransactions.length) {
    console.log('\n⚠️ No transactions found!');
    return;
  }
  
  console.log(`\n📊 Creating CSV with ${allTransactions.length} transactions...`);
  
  // CSV Export (cursor-based API)
  let csv = "Date;Time;Type;FromType;Amount;Currency;Status;ID;WalletType\n";
  
  allTransactions.forEach(tx => {
    const dateObj = new Date(tx.createdAt);
    const date = dateObj.toISOString().split('T')[0];
    const time = dateObj.toTimeString().split(' ')[0];
    const type = tx.type || '';
    const fromType = tx.fromType || '';
    const valueNumeric = tx.valueNumeric || '0';
    const currency = tx.walletType?.replace('VIRTUAL_', '') || '';
    const status = tx.status || '';
    const id = tx.id || '';
    const walletType = tx.walletType || '';
    
    // Convert value (API returns RAW values in Wei - for ALL currencies incl. BTC!)
    let amount = '0';
    try {
      const rawValue = parseFloat(valueNumeric) || 0;
      
      // All currencies: Wei → Token (1 Token = 10^18 Wei)
      amount = (rawValue / 1e18).toFixed(18);
      
      // Remove trailing zeros
      amount = parseFloat(amount).toString();
      
      // ➕/➖ Sign: withdraw = minus, deposit = plus
      if (type === 'withdraw') {
        amount = '-' + amount;
      }
      
      // Dot to comma (German format)
      amount = amount.replace('.', ',');
    } catch (e) {
      amount = '0';
    }
    
    csv += `"${date}";"${time}";"${type}";"${fromType}";"${amount}";"${currency}";"${status}";"${id}";"${walletType}"\n`;
  });
  
  // Generate filename
  let filename = 'gomining_export';
  if (exportConfig.fromDate && exportConfig.toDate) {
    filename += `_${exportConfig.fromDate}_to_${exportConfig.toDate}`;
  } else if (exportConfig.fromDate) {
    filename += `_from_${exportConfig.fromDate}`;
  } else if (exportConfig.toDate) {
    filename += `_to_${exportConfig.toDate}`;
  } else {
    filename += `_${new Date().toISOString().split('T')[0]}`;
  }
  filename += '.csv';
  
  // Download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ EXPORT COMPLETED!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📁 File: ${filename}`);
  console.log(`📊 Transactions: ${allTransactions.length}`);
  console.log(`⏱️ Duration: ${totalTime}s`);
  console.log(`📈 Speed: ${(allTransactions.length / totalTime).toFixed(1)} tx/s\n`);
}

// 🎯 QUICK-START FUNCTIONS
window.exportAll = function() {
  exportConfig.fromDate = null;
  exportConfig.toDate = null;
  exportConfig.testMode = false;
  console.log('📊 Exporting ALL transactions...');
  exportTransactions();
};

window.exportYear = function(year = new Date().getFullYear()) {
  setDateRange(year);
  exportConfig.testMode = false;
  exportTransactions();
};

window.exportMonth = function(year = new Date().getFullYear(), month = new Date().getMonth() + 1) {
  const lastDay = new Date(year, month, 0).getDate();
  const monthStr = month.toString().padStart(2, '0');
  setDateRange(`${year}-${monthStr}-01`, `${year}-${monthStr}-${lastDay}`);
  exportConfig.testMode = false;
  exportTransactions();
};

window.exportCustom = function(from, to) {
  setDateRange(from, to);
  exportConfig.testMode = false;
  exportTransactions();
};

window.exportFromTo = function(dateFrom, dateTo) {
  setDateRange(dateFrom, dateTo);
  exportConfig.testMode = false;
  exportTransactions();
};

window.testExport = function() {
  exportConfig.testMode = true;
  console.log('🧪 Test export (100 transactions)...');
  exportTransactions();
};

// 📖 SHOW HELP
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🚀 GOMINING TRANSACTION EXPORT - LOADED');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('📖 QUICK START:\n');
console.log('  testExport()                    → Test (100 transactions)');
console.log('  exportYear(2026)                → All transactions 2026');
console.log('  exportMonth(2026, 4)            → April 2026');
console.log('  exportFromTo("2026-01-01", "2026-04-02") → From-To period');
console.log('  exportCustom("2026-01-01", "2026-04-02") → Custom period');
console.log('  exportAll()                     → ALL transactions\n');

console.log('⚙️ ADVANCED:\n');
console.log('  setDateRange("2026-01-01", "2026-12-31")  → Set filter');
console.log('  setDateRange(2026)              → Shortcut for year');
console.log('  setDateRange("jahr")            → Shortcut for this year');
console.log('  setDateRange("monat")           → Shortcut for this month');
console.log('  exportTransactions()            → With current settings\n');

console.log('🔧 CONFIGURATION:\n');
console.log('  exportConfig.testMode = true    → Test mode on/off');
console.log('  exportConfig.batchSize = 200    → More per request');
console.log('  exportConfig.delayMs = 100      → Longer pauses\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Token automatically versuchen zu finden
const autoToken = findToken();
if (autoToken) {
  globalThis.goMiningToken = autoToken;
  console.log('✅ Token automatically found and set!\n');
  console.log('🎯 READY! Now run an export, e.g.:');
  console.log('   testExport()        ← Recommended for testing!\n');
} else {
  console.log('⚠️ Token not found automatically.');
  console.log('💡 Set manually:');
  console.log('   globalThis.goMiningToken = "YOUR_TOKEN"\n');
}

const exportConfig = globalThis.exportConfig;
const setDateRange = window.setDateRange;
return async () => { await exportTransactions(); };
};

// Source: gomining-miners-exportall_purchase_upgrades_sales_current_approved.js
factories.miners = function(globalThis, window, fetch, console, document, URL) {
/**
 * GoMining Complete Miners Export Script
 * =======================================
 * Combines current miner inventory + purchase/upgrade/sales history
 * 
 * Usage in Browser Console:
 * 1. Go to app.gomining.com and login
 * 2. Open DevTools Console (F12)
 * 3. Paste this entire script
 * 4. Run: exportAllMiners()
 * 
 * Available Functions:
 * - exportAllMiners()              // Export EVERYTHING (4 CSV files)
 * - exportCurrentMiners()          // Only current miner inventory
 * - exportMinerHistory()           // Only history (purchases + upgrades + sales)
 * - exportPurchases()              // Only purchase history
 * - exportUpgrades()               // Only upgrade history
 * - exportSales()                  // Only sales history
 * - testAllExports()               // Test mode (10 items each)
 */

// Global Configuration
globalThis.minersExportConfig = {
    // API endpoints
    endpoints: {
        currentMiners: 'https://api.gomining.com/api/nft/get-my',
        purchases: 'https://api.gomining.com/api/user-payments-history/index',
        upgrades: 'https://api.gomining.com/api/internal-payment/get-my',
        sales: 'https://api.gomining.com/api/nft-marketplace-order/find-by-user-v2'
    },
    
    // Request settings
    batchSize: 20,
    delayMs: 100,
    testMode: false,
    
    // Date range (optional)
    fromDate: null,
    toDate: null
};

// ============================================================
// TOKEN MANAGEMENT
// ============================================================

function findToken(forceFresh = false) {
    if (globalThis.goMiningToken) return globalThis.goMiningToken;
    if (!forceFresh && globalThis.goMiningToken) {
        console.log('✅ Using cached token');
        return globalThis.goMiningToken;
    }
    
    console.log('🔍 Searching for authentication token...');
    
    const storageKeys = ['access_token', 'token', 'auth_token', 'jwt', 'authToken', 'accessToken'];
    
    // Try localStorage
    for (const key of storageKeys) {
        const value = localStorage.getItem(key);
        if (value && value.length > 20) {
            console.log(`✅ Token found in localStorage.${key}`);
            globalThis.goMiningToken = value;
            return value;
        }
    }
    
    // Try sessionStorage
    for (const key of storageKeys) {
        const value = sessionStorage.getItem(key);
        if (value && value.length > 20) {
            console.log(`✅ Token found in sessionStorage.${key}`);
            globalThis.goMiningToken = value;
            return value;
        }
    }
    
    // Try cookies
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (storageKeys.includes(name) && value && value.length > 20) {
            console.log(`✅ Token found in cookie ${name}`);
            globalThis.goMiningToken = value;
            return value;
        }
    }
    
    console.error('❌ Token not found!');
    console.error('💡 Solutions:');
    console.error('   1. Reload the page and try again');
    console.error('   2. Set manually: setToken("YOUR_TOKEN_HERE")');
    console.error('   3. Check Network tab for Authorization header');
    return null;
}

function setToken(token) {
    if (!token || token.length < 20) {
        console.error('❌ Invalid token (too short)');
        return false;
    }
    globalThis.goMiningToken = token;
    console.log('✅ Token set successfully!');
    console.log('💡 Now try: exportAllMiners()');
    return true;
}

function refreshToken() {
    globalThis.goMiningToken = null;
    const token = findToken(true);
    if (token) {
        console.log('✅ Token refreshed!');
        return true;
    }
    return false;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getCollectionName(id) {
    const collections = {
        16: 'The Greedy Machines',
        264: 'MINEBOX S1',
        267: 'MINEBOX S2',
        268: 'MINEBOX S3',
        401: 'MINEBOX S4'
    };
    return collections[id] || `Collection #${id}`;
}

function formatNumber(value) {
    if (value === null || value === undefined || value === '') {
        return '0';
    }
    
    let valueText = value.toString();
    let isNegative = valueText.startsWith('-');
    
    // Replace first decimal point with placeholder, remove all other separators, then convert placeholder to comma
    valueText = valueText.replace('.', '#').replace(/[.,]/g, '').replace('#', ',');
    valueText = valueText.replace('+', '').replace('-', '');
    
    if (isNegative) {
        valueText = '-' + valueText;
    }
    
    return valueText;
}

function downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ============================================================
// CURRENT MINERS INVENTORY
// ============================================================

async function fetchCurrentMiners() {
    const token = findToken();
    if (!token) {
        throw new Error('Authentication token not found');
    }
    
    const config = globalThis.minersExportConfig;
    console.log('\n📥 Fetching current miners from farm...');
    
    try {
        const response = await fetch(config.endpoints.currentMiners, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({})
        });
        
        if (!response.ok) {
            if (response.status === 403) {
                console.error(`❌ Authentication failed (403 Forbidden)`);
                console.error('💡 Your token is invalid or expired. Try:');
                console.error('   1. refreshToken()  - Get fresh token');
                console.error('   2. Reload the page and run the script again');
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        // Handle response structure
        let miners = [];
        
        if (Array.isArray(result)) {
            miners = result;
        } else if (result.data && Array.isArray(result.data.array)) {
            miners = result.data.array;
        } else if (result.data && Array.isArray(result.data)) {
            miners = result.data;
        } else {
            console.warn('⚠️ Unexpected response format:', result);
            miners = [];
        }
        
        console.log(`✅ Found ${miners.length} miners in your farm`);
        
        // Test mode limit
        if (config.testMode && miners.length > 10) {
            console.log('🧪 Test mode: Limiting to 10 miners');
            miners = miners.slice(0, 10);
        }
        
        return miners;
        
    } catch (error) {
        console.error(`❌ Error fetching miners:`, error.message);
        throw error;
    }
}

function parseCurrentMiners(miners) {
    return miners.map(miner => {
        return {
            minerId: miner.id || '',
            minerName: miner.name || `Miner #${miner.id}`,
            collection: getCollectionName(miner.nftCollectionId),
            hashrate: miner.power || 0,
            energyEfficiency: miner.energyEfficiency || 0,
            level: miner.level || 0,
            unit: 'TH',
            status: miner.status || 'active',
            ownerSince: miner.createdAt ? new Date(miner.createdAt).toISOString().split('T')[0] : '',
            lastUpdate: miner.updatedAt ? new Date(miner.updatedAt).toISOString().split('T')[0] : '',
            nftCollectionId: miner.nftCollectionId || ''
        };
    });
}

function generateCurrentMinersCSV(data) {
    const headers = ['Miner ID', 'Miner Name', 'Collection', 'Hashrate', 'Energy Efficiency', 'Level', 'Unit', 'Status', 'Owner Since', 'Last Update', 'Collection ID'];
    const rows = data.map(d => [
        d.minerId,
        `"${d.minerName}"`,
        d.collection,
        formatNumber(d.hashrate),
        formatNumber(d.energyEfficiency),
        d.level,
        d.unit,
        d.status,
        d.ownerSince,
        d.lastUpdate,
        d.nftCollectionId
    ]);
    
    return [headers, ...rows].map(row => row.join(';')).join('\n');
}

// ============================================================
// MINER HISTORY (PURCHASES, UPGRADES, SALES)
// ============================================================

async function fetchHistoryData(endpoint, type = 'data', customFilters = {}) {
    const token = findToken();
    if (!token) {
        throw new Error('Authentication token not found');
    }
    
    const config = globalThis.minersExportConfig;
    const allData = [];
    let skip = 0;
    let page = 1;
    
    console.log(`\n📥 Fetching ${type}...`);
    
    while (true) {
        const body = {
            ...customFilters,
            pagination: {
                skip: skip,
                limit: config.batchSize
            }
        };
        
        // Add date filter if configured
        if (config.fromDate || config.toDate) {
            if (!body.filters) body.filters = {};
            body.filters.dateRange = {};
            if (config.fromDate) body.filters.dateRange.from = config.fromDate;
            if (config.toDate) body.filters.dateRange.to = config.toDate;
        }
        
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body)
            });
            
            if (!response.ok) {
                if (response.status === 403) {
                    console.error(`❌ Authentication failed (403 Forbidden)`);
                    console.error('💡 Token expired. Try: refreshToken()');
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            // Handle different response structures
            let items = [];
            let totalCount = 0;
            
            if (result.data) {
                items = result.data.items || result.data.array || result.data.list || result.data || [];
                totalCount = result.data.total || result.data.count || result.total || result.count || items.length;
            } else if (Array.isArray(result)) {
                items = result;
                totalCount = items.length;
            }
            
            if (items.length === 0) {
                console.log(`✅ ${type}: No more data (Page ${page})`);
                break;
            }
            
            allData.push(...items);
            console.log(`  Page ${page}: ${items.length} items (Total: ${allData.length}/${totalCount || '?'})`);
            
            // Check if we're done
            if (items.length < config.batchSize) {
                console.log(`✅ ${type}: Reached end (got ${items.length} < ${config.batchSize})`);
                break;
            }
            
            // Test mode limit
            if (config.testMode && allData.length >= 10) {
                console.log('🧪 Test mode: Stopping at 10 items');
                break;
            }
            
            skip += items.length;
            page++;
            
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, config.delayMs));
            
        } catch (error) {
            console.error(`❌ Error fetching ${type}:`, error.message);
            throw error;
        }
    }
    
    console.log(`✅ ${type}: ${allData.length} total items fetched`);
    return allData;
}

function parsePurchaseData(purchases) {
    return purchases.map(p => {
        const nft = p.nfts && p.nfts[0] ? p.nfts[0] : {};
        
        return {
            date: new Date(p.createdAt).toISOString().split('T')[0],
            time: new Date(p.createdAt).toISOString().split('T')[1].split('.')[0],
            minerId: nft.id || p.id,
            minerName: nft.name || `Miner #${nft.id}`,
            collection: getCollectionName(nft.nftCollectionId),
            hashrate: nft.power || 0,
            unit: 'TH',
            price: p.value || 0,
            currency: p.currency || 'GMT',
            status: p.status || 'unknown',
            transactionId: p.id,
        };
    });
}

function parseUpgradeData(upgrades) {
    return upgrades.map(u => {
        const nft = u.nft || {};
        const upgradeTypeMap = {
            'nftPowerUpgrade': 'Power Upgrade',
            'nftEnergyEfficiencyUpgrade': 'Energy Efficiency Upgrade'
        };
        
        return {
            date: new Date(u.createdAt).toISOString().split('T')[0],
            time: new Date(u.createdAt).toISOString().split('T')[1].split('.')[0],
            minerId: nft.id || u.id,
            minerName: nft.name || `Miner #${nft.id}`,
            upgradeType: upgradeTypeMap[u.upgradeType] || u.upgradeType,
            fromValue: u.fromValue || 0,
            toValue: u.toValue || 0,
            unit: u.upgradeType === 'nftPowerUpgrade' ? 'TH' : 'J/TH',
            upgradeCost: u.gmtValue || 0,
            currency: 'GMT',
            usdtValue: u.usdtValue || 0,
            status: u.status || 'unknown',
            collection: getCollectionName(nft.nftCollectionId),
        };
    });
}

function parseSalesData(sales) {
    return sales.map(s => {
        const nft = s.nft || {};
        const buyerPrice = s.price || 0;
        const feePercent = s.fee || 0.05;
        const sellerRevenue = buyerPrice * (1 - feePercent);
        const feeAmount = buyerPrice * feePercent;
        
        return {
            date: new Date(s.createdAt).toISOString().split('T')[0],
            time: new Date(s.createdAt).toISOString().split('T')[1].split('.')[0],
            minerId: nft.id || s.nftId,
            minerName: nft.name || `Miner #${nft.id}`,
            hashrate: nft.power || 0,
            energyEfficiency: nft.energyEfficiency || 0,
            unit: 'TH',
            priceForBuyer: buyerPrice,
            youGet: sellerRevenue,
            fee: feeAmount,
            feePercent: (feePercent * 100).toFixed(0) + '%',
            currency: s.currency || 'GMT',
            status: s.status || 'unknown',
            collection: getCollectionName(nft.nftCollectionId),
        };
    });
}

function generatePurchaseCSV(data) {
    const headers = ['Date', 'Time', 'Miner ID', 'Miner Name', 'Collection', 'Hashrate', 'Unit', 'Price', 'Currency', 'Status', 'Transaction ID'];
    const rows = data.map(d => [
        d.date,
        d.time,
        d.minerId,
        `"${d.minerName}"`,
        d.collection,
        formatNumber(d.hashrate),
        d.unit,
        formatNumber(d.price),
        d.currency,
        d.status,
        d.transactionId
    ]);
    
    return [headers, ...rows].map(row => row.join(';')).join('\n');
}

function generateUpgradeCSV(data) {
    const headers = ['Date', 'Time', 'Miner ID', 'Miner Name', 'Collection', 'Upgrade Type', 'From Value', 'To Value', 'Unit', 'Cost (GMT)', 'Cost (USDT)', 'Status'];
    const rows = data.map(d => [
        d.date,
        d.time,
        d.minerId,
        `"${d.minerName}"`,
        d.collection,
        d.upgradeType,
        formatNumber(d.fromValue),
        formatNumber(d.toValue),
        d.unit,
        formatNumber(d.upgradeCost),
        formatNumber(d.usdtValue),
        d.status
    ]);
    
    return [headers, ...rows].map(row => row.join(';')).join('\n');
}

function generateSalesCSV(data) {
    const headers = ['Date', 'Time', 'Miner ID', 'Miner Name', 'Collection', 'Hashrate', 'Energy Efficiency', 'Unit', 'Price For Buyer', 'You Get', 'Fee Amount', 'Fee %', 'Currency', 'Status'];
    const rows = data.map(d => [
        d.date,
        d.time,
        d.minerId,
        `"${d.minerName}"`,
        d.collection,
        formatNumber(d.hashrate),
        formatNumber(d.energyEfficiency),
        d.unit,
        formatNumber(d.priceForBuyer),
        formatNumber(d.youGet),
        formatNumber(d.fee),
        d.feePercent,
        d.currency,
        d.status
    ]);
    
    return [headers, ...rows].map(row => row.join(';')).join('\n');
}

// ============================================================
// MAIN EXPORT FUNCTIONS
// ============================================================

async function exportCurrentMiners() {
    console.clear();
    console.log('🚀 GoMining Current Miners Export');
    console.log('=' .repeat(50));
    
    const timestamp = new Date().toISOString().split('T')[0];
    
    try {
        const miners = await fetchCurrentMiners();
        
        if (miners.length === 0) {
            console.log('\n⚠️ No miners found in your farm!');
            showCommands();
            return;
        }
        
        console.log('\n🔄 Parsing miner data...');
        const parsedMiners = parseCurrentMiners(miners);
        
        console.log('📝 Generating CSV file...');
        const csv = generateCurrentMinersCSV(parsedMiners);
        
        console.log('💾 Downloading file...\n');
        downloadCSV(csv, `gomining-current-miners-${timestamp}.csv`);
        
        console.log('\n✅ Export Complete!');
        console.log('=' .repeat(50));
        console.log(`🏭 Total Miners in Farm: ${parsedMiners.length}`);
        console.log(`⚡ Total Hashrate: ${parsedMiners.reduce((sum, m) => sum + m.hashrate, 0).toFixed(2)} TH`);
        console.log(`🔋 Average Efficiency: ${(parsedMiners.reduce((sum, m) => sum + m.energyEfficiency, 0) / parsedMiners.length).toFixed(2)} W/TH`);
        console.log('\n📥 CSV file downloaded!');
        
        // Group by collection
        const collections = {};
        parsedMiners.forEach(m => {
            if (!collections[m.collection]) {
                collections[m.collection] = 0;
            }
            collections[m.collection]++;
        });
        
        console.log('\n📊 Miners by Collection:');
        Object.entries(collections).forEach(([name, count]) => {
            console.log(`   ${name}: ${count} miner(s)`);
        });
        
        showCommands();
        
    } catch (error) {
        console.error('\n❌ Export failed:', error.message);
        showCommands();
    }
}

async function exportMinerHistory() {
    console.clear();
    console.log('🚀 GoMining Miner History Export');
    console.log('=' .repeat(50));
    
    const config = globalThis.minersExportConfig;
    const timestamp = new Date().toISOString().split('T')[0];
    
    try {
        console.log('\n📊 Fetching all miner history data...\n');
        
        // Fetch all history types
        const purchases = await fetchHistoryData(
            config.endpoints.purchases, 
            'Purchases',
            { filters: { withCanceled: false } }
        );
        
        const upgrades = await fetchHistoryData(
            config.endpoints.upgrades, 
            'Upgrades',
            {
                filters: {
                    dataType: { in: ["nftEnergyEfficiencyUpgrade", "nftPowerUpgrade"] },
                    status: { in: ["pending", "success", "error", "waitingForProviderConfirmation", 
                                   "approvedByProvider", "waitingForConfirmation", "waiting-for-user-approve"] }
                },
                sort: { createdAt: "DESC" }
            }
        );
        
        const sales = await fetchHistoryData(
            config.endpoints.sales, 
            'Sales',
            { filters: {} }
        );
        
        // Parse data
        console.log('\n🔄 Parsing data...');
        const parsedPurchases = parsePurchaseData(purchases);
        const parsedUpgrades = parseUpgradeData(upgrades);
        const parsedSales = parseSalesData(sales);
        
        // Generate CSVs
        console.log('📝 Generating CSV files...');
        const purchaseCSV = generatePurchaseCSV(parsedPurchases);
        const upgradeCSV = generateUpgradeCSV(parsedUpgrades);
        const salesCSV = generateSalesCSV(parsedSales);
        
        // Download files
        console.log('💾 Downloading files...\n');
        downloadCSV(purchaseCSV, `gomining-purchases-${timestamp}.csv`);
        await new Promise(resolve => setTimeout(resolve, 500));
        downloadCSV(upgradeCSV, `gomining-upgrades-${timestamp}.csv`);
        await new Promise(resolve => setTimeout(resolve, 500));
        downloadCSV(salesCSV, `gomining-sales-${timestamp}.csv`);
        
        // Summary
        console.log('\n✅ Export Complete!');
        console.log('=' .repeat(50));
        console.log(`📦 Purchases: ${parsedPurchases.length} items`);
        console.log(`⬆️  Upgrades:  ${parsedUpgrades.length} items`);
        console.log(`💰 Sales:     ${parsedSales.length} items`);
        console.log(`📁 Total:     ${parsedPurchases.length + parsedUpgrades.length + parsedSales.length} items`);
        console.log('\n📥 3 CSV files downloaded!');
        
        showCommands();
        
    } catch (error) {
        console.error('\n❌ Export failed:', error.message);
        showCommands();
    }
}

async function exportAllMiners() {
    console.clear();
    console.log('🚀 GoMining COMPLETE Export (Current + History)');
    console.log('=' .repeat(60));
    
    const timestamp = new Date().toISOString().split('T')[0];
    const config = globalThis.minersExportConfig;
    
    try {
        // 1. Current Miners
        console.log('\n📊 STEP 1/4: Current Miners Inventory\n');
        const currentMiners = await fetchCurrentMiners();
        const parsedCurrentMiners = parseCurrentMiners(currentMiners);
        const currentMinersCSV = generateCurrentMinersCSV(parsedCurrentMiners);
        
        // 2. Purchases
        console.log('\n📊 STEP 2/4: Purchase History');
        const purchases = await fetchHistoryData(
            config.endpoints.purchases, 
            'Purchases',
            { filters: { withCanceled: false } }
        );
        const parsedPurchases = parsePurchaseData(purchases);
        const purchaseCSV = generatePurchaseCSV(parsedPurchases);
        
        // 3. Upgrades
        console.log('\n📊 STEP 3/4: Upgrade History');
        const upgrades = await fetchHistoryData(
            config.endpoints.upgrades, 
            'Upgrades',
            {
                filters: {
                    dataType: { in: ["nftEnergyEfficiencyUpgrade", "nftPowerUpgrade"] },
                    status: { in: ["pending", "success", "error", "waitingForProviderConfirmation", 
                                   "approvedByProvider", "waitingForConfirmation", "waiting-for-user-approve"] }
                },
                sort: { createdAt: "DESC" }
            }
        );
        const parsedUpgrades = parseUpgradeData(upgrades);
        const upgradeCSV = generateUpgradeCSV(parsedUpgrades);
        
        // 4. Sales
        console.log('\n📊 STEP 4/4: Sales History');
        const sales = await fetchHistoryData(
            config.endpoints.sales, 
            'Sales',
            { filters: {} }
        );
        const parsedSales = parseSalesData(sales);
        const salesCSV = generateSalesCSV(parsedSales);
        
        // Download all files
        console.log('\n💾 Downloading 4 CSV files...\n');
        downloadCSV(currentMinersCSV, `gomining-current-miners-${timestamp}.csv`);
        await new Promise(resolve => setTimeout(resolve, 500));
        downloadCSV(purchaseCSV, `gomining-purchases-${timestamp}.csv`);
        await new Promise(resolve => setTimeout(resolve, 500));
        downloadCSV(upgradeCSV, `gomining-upgrades-${timestamp}.csv`);
        await new Promise(resolve => setTimeout(resolve, 500));
        downloadCSV(salesCSV, `gomining-sales-${timestamp}.csv`);
        
        // Complete Summary
        console.log('\n✅ COMPLETE EXPORT FINISHED!');
        console.log('=' .repeat(60));
        console.log('📊 Current Inventory:');
        console.log(`   🏭 Miners in Farm: ${parsedCurrentMiners.length}`);
        console.log(`   ⚡ Total Hashrate:  ${parsedCurrentMiners.reduce((sum, m) => sum + m.hashrate, 0).toFixed(2)} TH`);
        console.log(`   🔋 Avg Efficiency:  ${(parsedCurrentMiners.reduce((sum, m) => sum + m.energyEfficiency, 0) / parsedCurrentMiners.length).toFixed(2)} W/TH`);
        console.log('\n📊 History:');
        console.log(`   📦 Purchases: ${parsedPurchases.length} items`);
        console.log(`   ⬆️  Upgrades:  ${parsedUpgrades.length} items`);
        console.log(`   💰 Sales:     ${parsedSales.length} items`);
        console.log(`   📁 Total History: ${parsedPurchases.length + parsedUpgrades.length + parsedSales.length} items`);
        console.log('\n📥 4 CSV files downloaded successfully!');
        console.log('   ✅ gomining-current-miners-' + timestamp + '.csv');
        console.log('   ✅ gomining-purchases-' + timestamp + '.csv');
        console.log('   ✅ gomining-upgrades-' + timestamp + '.csv');
        console.log('   ✅ gomining-sales-' + timestamp + '.csv');
        
        showCommands();
        
    } catch (error) {
        console.error('\n❌ Export failed:', error.message);
        showCommands();
    }
}

// ============================================================
// INDIVIDUAL EXPORT FUNCTIONS
// ============================================================

async function exportPurchases() {
    console.clear();
    console.log('🚀 GoMining Purchases Export');
    console.log('=' .repeat(50));
    
    const timestamp = new Date().toISOString().split('T')[0];
    const config = globalThis.minersExportConfig;
    
    try {
        const purchases = await fetchHistoryData(
            config.endpoints.purchases, 
            'Purchases',
            { filters: { withCanceled: false } }
        );
        
        const parsedPurchases = parsePurchaseData(purchases);
        const csv = generatePurchaseCSV(parsedPurchases);
        
        downloadCSV(csv, `gomining-purchases-${timestamp}.csv`);
        
        console.log('\n✅ Export Complete!');
        console.log(`📦 Purchases: ${parsedPurchases.length} items`);
        console.log('📥 CSV file downloaded!');
        
        showCommands();
        
    } catch (error) {
        console.error('\n❌ Export failed:', error.message);
        showCommands();
    }
}

async function exportUpgrades() {
    console.clear();
    console.log('🚀 GoMining Upgrades Export');
    console.log('=' .repeat(50));
    
    const timestamp = new Date().toISOString().split('T')[0];
    const config = globalThis.minersExportConfig;
    
    try {
        const upgrades = await fetchHistoryData(
            config.endpoints.upgrades, 
            'Upgrades',
            {
                filters: {
                    dataType: { in: ["nftEnergyEfficiencyUpgrade", "nftPowerUpgrade"] },
                    status: { in: ["pending", "success", "error", "waitingForProviderConfirmation", 
                                   "approvedByProvider", "waitingForConfirmation", "waiting-for-user-approve"] }
                },
                sort: { createdAt: "DESC" }
            }
        );
        
        const parsedUpgrades = parseUpgradeData(upgrades);
        const csv = generateUpgradeCSV(parsedUpgrades);
        
        downloadCSV(csv, `gomining-upgrades-${timestamp}.csv`);
        
        console.log('\n✅ Export Complete!');
        console.log(`⬆️ Upgrades: ${parsedUpgrades.length} items`);
        console.log('📥 CSV file downloaded!');
        
        showCommands();
        
    } catch (error) {
        console.error('\n❌ Export failed:', error.message);
        showCommands();
    }
}

async function exportSales() {
    console.clear();
    console.log('🚀 GoMining Sales Export');
    console.log('=' .repeat(50));
    
    const timestamp = new Date().toISOString().split('T')[0];
    const config = globalThis.minersExportConfig;
    
    try {
        const sales = await fetchHistoryData(
            config.endpoints.sales, 
            'Sales',
            { filters: {} }
        );
        
        const parsedSales = parseSalesData(sales);
        const csv = generateSalesCSV(parsedSales);
        
        downloadCSV(csv, `gomining-sales-${timestamp}.csv`);
        
        console.log('\n✅ Export Complete!');
        console.log(`💰 Sales: ${parsedSales.length} items`);
        console.log('📥 CSV file downloaded!');
        
        showCommands();
        
    } catch (error) {
        console.error('\n❌ Export failed:', error.message);
        showCommands();
    }
}

// ============================================================
// TEST MODE
// ============================================================

async function testAllExports() {
    console.log('🧪 TEST MODE ENABLED - Limited to 10 items each\n');
    globalThis.minersExportConfig.testMode = true;
    await exportAllMiners();
    globalThis.minersExportConfig.testMode = false;
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function setDateRange(fromDate, toDate) {
    globalThis.minersExportConfig.fromDate = fromDate;
    globalThis.minersExportConfig.toDate = toDate;
    console.log('✅ Date range set:');
    console.log(`   From: ${fromDate || 'Beginning'}`);
    console.log(`   To:   ${toDate || 'Now'}`);
}

function clearDateRange() {
    globalThis.minersExportConfig.fromDate = null;
    globalThis.minersExportConfig.toDate = null;
    console.log('✅ Date range cleared (exporting all history)');
}

function exportYear(year) {
    setDateRange(`${year}-01-01T00:00:00Z`, `${year}-12-31T23:59:59Z`);
    console.log(`💡 Now run: exportMinerHistory() or exportAllMiners()`);
}

function exportMonth(year, month) {
    const monthStr = month.toString().padStart(2, '0');
    const lastDay = new Date(year, month, 0).getDate();
    setDateRange(`${year}-${monthStr}-01T00:00:00Z`, `${year}-${monthStr}-${lastDay}T23:59:59Z`);
    console.log(`💡 Now run: exportMinerHistory() or exportAllMiners()`);
}

function showCommands() {
    console.log('\n' + '='.repeat(60));
    console.log('📖 Available commands:');
    console.log('='.repeat(60));
    console.log('🔥 Main Commands:');
    console.log('  exportAllMiners()              - Export EVERYTHING (4 CSV files)');
    console.log('  exportCurrentMiners()          - Only current miner inventory');
    console.log('  exportMinerHistory()           - Only history (purchases + upgrades + sales)');
    console.log('  testAllExports()               - Test mode (10 items each)');
    console.log('');
    console.log('📦 Individual Exports:');
    console.log('  exportPurchases()              - Only purchase history');
    console.log('  exportUpgrades()               - Only upgrade history');
    console.log('  exportSales()                  - Only sales history');
    console.log('');
    console.log('📅 Date Filters:');
    console.log('  exportYear(2026)               - Export full year');
    console.log('  exportMonth(2026, 4)           - Export specific month (April 2026)');
    console.log('  setDateRange(from, to)         - Custom date range');
    console.log('  clearDateRange()               - Clear date filter');
    console.log('');
    console.log('🔧 Token Management:');
    console.log('  setToken("YOUR_TOKEN")         - Set authentication token manually');
    console.log('  refreshToken()                 - Refresh token from storage');
    console.log('='.repeat(60));
}

// ============================================================
// INITIALIZATION
// ============================================================

console.log('✅ GoMining Complete Miners Export Script loaded!');
showCommands();
console.log('\n💡 Quick Start: exportAllMiners() or testAllExports()\n');

return async () => { await exportAllMiners(); };
};

// Source: gomining-nft-income-export.js
factories.income = function(globalThis, window, fetch, console, document, URL) {
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


    'use strict';

    const API_BASE = 'https://api.gomining.com/api';
    const LIMIT    = 20;    // API akzeptiert max 20

    // ── Token detection ─────────────────────────────────────────────
    function findToken() {
    if (globalThis.goMiningToken) return globalThis.goMiningToken;
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


return async () => { await exportIncomeAll(); if (globalThis.incomeData?.length) downloadCSV(toCSVSummary(globalThis.incomeData), 'all', 'summary'); };
};

// Source: gomining-miners-wars-export.js
factories.wars = function(globalThis, window, fetch, console, document, URL) {
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


    'use strict';

    const API_BASE = 'https://api.gomining.com/api';
    const LIMIT    = 20;

    // ── Token detection ─────────────────────────────────────────────
    function findToken() {
    if (globalThis.goMiningToken) return globalThis.goMiningToken;
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


return async () => { await exportWarsAll(); };
};

// Source: gomining-referral-complete-export_approved.js
factories.referrals = function(globalThis, window, fetch, console, document, URL) {
// ============================================================
// GoMining Referral Complete Export
// Exports ALL referral data using real API structure
// ============================================================
// Usage:
//   1. Go to app.gomining.com and login
//   2. Open Console (F12)
//   3. Paste this script and press Enter
//   4. Run: exportAllReferralData()
//
// Type-specific exports:
//   exportRoyalties()          - income-kw-consumed-royalty
//   exportNftPayments()        - nft-payment
//   exportRegistrations()      - registration
//   exportInternalPayments()   - internal-payment
//   exportSimpleEarnRewards()  - simple-earn-reward
//   exportCardTransactions()   - card-transaction + card-issued
//   exportByTypes([...])       - custom type array
// ============================================================


    'use strict';

    const REFERRAL_API_BASE = 'https://referral-api.bounty.gomining.com/api';

    // All known transaction types (from API payload inspection)
    const ALL_TYPES = [
        'registration',
        'nft-payment',
        'internal-payment',
        'nft-game-ability-payment',
        'card-issued',
        'card-transaction',
        'simple-earn-reward',
        'income-kw-consumed-royalty'
    ];

    // Token detection
    function findToken() {
    if (globalThis.goMiningToken) return globalThis.goMiningToken;
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'access_token') {
                return decodeURIComponent(value);
            }
        }
        const token = localStorage.getItem('access_token');
        if (token) return token;
        return null;
    }

    globalThis.goMiningToken = globalThis.goMiningToken || findToken();
    globalThis.stopReferralExport = false; // Stop flag

    // Get referral summary data
    async function getReferralSummary(token) {
        console.log('\n🔍 Fetching Referral Summary...');
        
        try {
            const response = await fetch(`${REFERRAL_API_BASE}/ref-program/get-referrer-rewards`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Origin': 'https://app.gomining.com',
                    'Referer': 'https://app.gomining.com/',
                    'x-device-type': 'desktop'
                },
                body: JSON.stringify({})
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Referral Summary:', data.data);
                return data.data;
            }
        } catch (e) {
            console.error('❌ Failed to get summary:', e.message);
        }
        return null;
    }

    // Get total rewards
    async function getTotalRewards(token) {
        console.log('\n🔍 Fetching Total Rewards...');
        
        try {
            const response = await fetch(`${REFERRAL_API_BASE}/ref-program/get-total-rewards`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Origin': 'https://app.gomining.com',
                    'Referer': 'https://app.gomining.com/',
                    'x-device-type': 'desktop'
                },
                body: JSON.stringify({})
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Total Rewards:', data.data);
                return data.data;
            }
        } catch (e) {
            console.error('❌ Failed to get rewards:', e.message);
        }
        return null;
    }

    // Get referrals list with pagination
    // types: array of type strings to filter, or null / [] for ALL types
    async function getAllReferrals(token, period = 'ALL', customFrom = null, customTo = null, types = null) {
        const typeLabel = (types && types.length) ? types.join(', ') : 'ALL';
        console.log(`\n🔍 Fetching Referrals (get-my) [types: ${typeLabel}]...`);
        
        globalThis.stopReferralExport = false;
        
        // Build date range
        let startDate, endDate;
        
        if (customFrom && customTo) {
            startDate = new Date(customFrom);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(customTo);
            endDate.setHours(23, 59, 59, 999);
            console.log(`   📅 Range: ${customFrom} to ${customTo}`);
        } else {
            endDate = new Date();
            endDate.setHours(23, 59, 59, 999);
            startDate = new Date();
            if (period === '3M') {
                startDate.setMonth(startDate.getMonth() - 3);
            } else if (period === '1Y') {
                startDate.setFullYear(startDate.getFullYear() - 1);
            } else {
                startDate.setFullYear(2024, 4, 4); // 2024-05-04 (platform start)
            }
            startDate.setHours(0, 0, 0, 0);
            console.log(`   📅 Range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
        }
        
        let allReferrals = [];
        let skip = 0;
        const limit = 100;
        let hasMore = true;
        let totalCount = null;
        let rewardsGmtTotal = null;

        while (hasMore) {
            if (globalThis.stopReferralExport) {
                console.log('\n🛑 Export stopped by user!');
                break;
            }
            
            try {
                // Always send full filters object – matches exact API payload format
                const requestBody = {
                    filters: {
                        createdAt: {
                            range: {
                                start: startDate.toISOString(),
                                end: endDate.toISOString()
                            }
                        },
                        status: [],
                        type: (types && types.length) ? types : ALL_TYPES
                    },
                    pagination: {
                        skip: skip,
                        limit: limit
                    }
                };

                const response = await fetch(`${REFERRAL_API_BASE}/ref-program/get-my`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Origin': 'https://app.gomining.com',
                        'Referer': 'https://app.gomining.com/',
                        'x-device-type': 'desktop'
                    },
                    body: JSON.stringify(requestBody)
                });

                if (response.ok) {
                    const data = await response.json();
                    const items = data.data?.array || data.data?.items || data.data || [];
                    const count = data.data?.count || items.length;

                    // Capture GMT total (API returns it on every page – same value)
                    if (rewardsGmtTotal === null && data.data?.rewardsGmtTotalWithFilters != null) {
                        rewardsGmtTotal = data.data.rewardsGmtTotalWithFilters;
                    }
                    
                    if (totalCount === null) {
                        totalCount = count;
                        const gmtInfo = rewardsGmtTotal != null ? ` | GMT Total: ${rewardsGmtTotal.toFixed(8)}` : '';
                        console.log(`   📊 Total matching: ${totalCount}${gmtInfo}`);
                    }
                    
                    console.log(`   Batch ${Math.floor(skip/limit)+1}: +${items.length} (${allReferrals.length + items.length}/${totalCount})`);
                    
                    if (items.length === 0) {
                        hasMore = false;
                    } else {
                        allReferrals.push(...items);
                        skip += limit;
                        if (skip >= totalCount) hasMore = false;
                    }
                } else {
                    console.error(`   ❌ Failed: ${response.status}`);
                    try { console.error(`   Error:`, await response.json()); } catch (e) {}
                    hasMore = false;
                }

                await new Promise(r => setTimeout(r, 200));
                
            } catch (e) {
                console.error(`   ❌ Error: ${e.message}`);
                hasMore = false;
            }
        }

        const gmtSuffix = rewardsGmtTotal != null ? ` | GMT (filter): ${rewardsGmtTotal.toFixed(8)}` : '';
        console.log(`✅ Loaded ${allReferrals.length} transactions${gmtSuffix}`);

        // Attach metadata for callers
        allReferrals._rewardsGmtTotal = rewardsGmtTotal;
        allReferrals._totalCount = totalCount;
        return allReferrals;
    }

    // Export all referral data
    async function exportAllReferralData() {
        console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║       📊 GoMining Referral Complete Export 📊               ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
        `);

        const token = (globalThis.goMiningToken || findToken() || '').replace('Bearer ', '').trim();
        if (!token) {
            console.error('❌ No token found!');
            return;
        }

        console.log(`🔑 Token: ${token.substring(0, 20)}...`);

        const results = {
            summary: null,
            totalRewards: null,
            transactions: []  // All from get-my
        };

        // 1. Get summary
        results.summary = await getReferralSummary(token);

        // 2. Get total rewards
        results.totalRewards = await getTotalRewards(token);

        // 3. Get all transactions from get-my (all types, full history)
        results.transactions = await getAllReferrals(token, 'ALL');
        results.rewardsGmtTotal = results.transactions._rewardsGmtTotal;

        // Summary
        console.log(`\n\n${'═'.repeat(60)}`);
        console.log(`📊 EXPORT SUMMARY`);
        console.log(`${'═'.repeat(60)}\n`);

        console.log(`✅ Referral Summary:`);
        if (results.summary) {
            console.log(`   • Referrals: ${results.summary.referralCount || 0}`);
            console.log(`   • Total Power: ${results.summary.nftTotalPower || 0} TH/s`);
            console.log(`   • Eligible Power: ${results.summary.nftTotalEligiblePower || 0} TH/s`);
            console.log(`   • kW Consumed: ${results.summary.totalKwConsumed || 0}`);
            console.log(`   • kW Rewards: $${results.summary.totalKwRewardInUsd || 0}`);
        }

        console.log(`\n✅ Total Rewards (all-time):`);
        if (results.totalRewards) {
            console.log(`   • Total USD: $${results.totalRewards.totalRewardsSumUsd || 0}`);
            console.log(`   • GMT: ${results.totalRewards.totalRewardsGmt || 0} ($${results.totalRewards.totalRewardsGmtInUsd || 0})`);
            console.log(`   • USDT: ${results.totalRewards.totalRewardsUsdt || 0}`);
        }

        if (results.rewardsGmtTotal != null) {
            console.log(`\n✅ GMT Total (filtered period): ${results.rewardsGmtTotal.toFixed(8)} GMT`);
        }

        console.log(`\n✅ Transactions Loaded: ${results.transactions.length}`);
        const byType = {};
        results.transactions.forEach(t => {
            const type = t.type || 'unknown';
            byType[type] = (byType[type] || 0) + 1;
        });
        Object.entries(byType).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
            console.log(`   • ${type}: ${count}`);
        });

        globalThis.referralExportData = results;

        console.log(`\n💾 All data stored in: globalThis.referralExportData`);
        console.log(`\n💡 To export to CSV:`);
        console.log(`   exportTransactionsToCSV()`);
        console.log(`\n💡 Type-specific exports:`);
        console.log(`   exportRoyalties()           → income-kw-consumed-royalty`);
        console.log(`   exportNftPayments()          → nft-payment`);
        console.log(`   exportRegistrations()        → registration`);
        console.log(`   exportInternalPayments()     → internal-payment`);
        console.log(`   exportSimpleEarnRewards()    → simple-earn-reward`);
        console.log(`   exportCardTransactions()     → card-transaction + card-issued`);

        return results;
    }

    // Helper: Format number for German locale
    function formatNumberDE(value) {
        if (value === null || value === undefined || value === '') return '0';
        const num = parseFloat(value);
        if (isNaN(num)) return '0';
        return num.toString().replace('.', ',');
    }

    // Export all transactions to CSV – optionally pre-filtered by type(s)
    function exportTransactionsToCSV(filterTypes = null) {
        const data = globalThis.referralExportData;
        if (!data || !data.transactions) {
            console.error('❌ Run exportAllReferralData() or exportReferralDataRange() first!');
            return;
        }

        let transactions = data.transactions;
        if (filterTypes && filterTypes.length) {
            transactions = transactions.filter(t => filterTypes.includes(t.type));
            console.log(`🔍 Filtered to types [${filterTypes.join(', ')}]: ${transactions.length} transactions`);
        }
        if (transactions.length === 0) {
            console.log('⚠️ No transactions to export');
            return;
        }

        // German CSV headers
        const headers = [
            'Nr',
            'Serial ID',
            'Datum',
            'Zeit',
            'User ID',
            'Typ',
            'Währung',
            'Betrag (GMT/USDT)',
            'Betrag USD',
            'Status',
            'Reward Koeffizient',
            'kW Verbraucht',
            'Power gesamt (TH)',
            'Effizienz (W/TH)',
            'Kaufpreis',
            'Kaufpreis USD',
            'Kaufpreis BTC'
        ];

        let csv = headers.join(';') + '\n';
        
        transactions.forEach((item, index) => {
            const date = new Date(item.createdAt);
            const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
            const timeStr = date.toTimeString().split(' ')[0]; // HH:MM:SS
            
            const row = [
                index + 1,
                item.serial_id || '',
                dateStr,
                timeStr,
                item.userId || '',
                item.type || '',
                item.currency || '',
                formatNumberDE(item.reward),          // raw reward amount (GMT or USDT)
                formatNumberDE(item.rewardInUsd),
                item.status || '',
                formatNumberDE(item.rewardCoefficient),
                formatNumberDE(item.royaltyKwConsumed),
                formatNumberDE(item.royaltyTotalPower),
                formatNumberDE(item.royaltyEnergyEfficiency),
                formatNumberDE(item.purchaseValue),
                formatNumberDE(item.purchaseValueInUsd),
                formatNumberDE(item.purchaseValueInBtc)
            ];
            
            csv += row.map(val => `"${val}"`).join(';') + '\n';
        });

        const typeTag = filterTypes && filterTypes.length ? `_${filterTypes[0].replace(/-/g, '_')}${filterTypes.length > 1 ? '_etc' : ''}` : '';
        const filename = `gomining_referral${typeTag}_${new Date().toISOString().split('T')[0]}.csv`;
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log(`✅ Exported ${transactions.length} transactions to ${filename}`);
    }

    // Stop export function
    function stopExport() {
        globalThis.stopReferralExport = true;
        console.log('🛑 Stopping export... (may take a few seconds)');
    }

    // Export referral data for specific date range
    async function exportReferralDataRange(fromDate, toDate) {
        console.log(`
╔══════════════════════════════════════════════════════════════╗
║       📊 GoMining Referral Export - Date Range 📊           ║
╚══════════════════════════════════════════════════════════════╝\n`);

        const token = (globalThis.goMiningToken || findToken() || '').replace('Bearer ', '').trim();
        if (!token) {
            console.error('❌ No token found!');
            return;
        }

        console.log(`🔑 Token: ${token.substring(0, 20)}...`);
        console.log(`📅 Period: ${fromDate} to ${toDate}`);

        const results = {
            summary: null,
            totalRewards: null,
            transactions: []
        };

        results.transactions = await getAllReferrals(token, 'CUSTOM', fromDate, toDate);
        results.rewardsGmtTotal = results.transactions._rewardsGmtTotal;

        console.log(`\n✅ Transactions: ${results.transactions.length}`);
        if (results.rewardsGmtTotal != null) {
            console.log(`   GMT Total (period): ${results.rewardsGmtTotal.toFixed(8)} GMT`);
        }
        const byType = {};
        results.transactions.forEach(t => { byType[t.type || 'unknown'] = (byType[t.type || 'unknown'] || 0) + 1; });
        Object.entries(byType).sort((a,b) => b[1]-a[1]).forEach(([type, count]) => console.log(`   • ${type}: ${count}`));

        globalThis.referralExportData = results;

        console.log(`\n💾 Data stored in: globalThis.referralExportData`);
        console.log(`💡 To export: exportTransactionsToCSV()`);

        return results;
    }

    // ──────────────────────────────────────────────────────
    // TYPE-SPECIFIC EXPORT FUNCTIONS
    // Each fetches only its type(s) from the API (efficient)
    // ──────────────────────────────────────────────────────

    async function _exportByTypesInternal(types, label, fromDate = null, toDate = null) {
        const token = (globalThis.goMiningToken || findToken() || '').replace('Bearer ', '').trim();
        if (!token) { console.error('❌ No token found!'); return; }
        console.log(`\n📊 Fetching [${label}]...`);
        const txs = await getAllReferrals(token, 'ALL', fromDate, toDate, types);
        const results = { transactions: txs, rewardsGmtTotal: txs._rewardsGmtTotal };
        globalThis.referralExportData = results;
        console.log(`\n💡 Now run: exportTransactionsToCSV()  (${txs.length} transactions)`);
        if (txs._rewardsGmtTotal != null) console.log(`   GMT Total: ${txs._rewardsGmtTotal.toFixed(8)} GMT`);
        return results;
    }

    // Royalty rewards (kW consumed royalty – most frequent type)
    async function exportRoyalties(fromDate = null, toDate = null) {
        return _exportByTypesInternal(['income-kw-consumed-royalty'], 'income-kw-consumed-royalty', fromDate, toDate);
    }

    // NFT purchase payments from referrals
    async function exportNftPayments(fromDate = null, toDate = null) {
        return _exportByTypesInternal(['nft-payment'], 'nft-payment', fromDate, toDate);
    }

    // New user registrations
    async function exportRegistrations(fromDate = null, toDate = null) {
        return _exportByTypesInternal(['registration'], 'registration', fromDate, toDate);
    }

    // Internal payments (upgrade payments etc.)
    async function exportInternalPayments(fromDate = null, toDate = null) {
        return _exportByTypesInternal(['internal-payment'], 'internal-payment', fromDate, toDate);
    }

    // Simple earn rewards
    async function exportSimpleEarnRewards(fromDate = null, toDate = null) {
        return _exportByTypesInternal(['simple-earn-reward'], 'simple-earn-reward', fromDate, toDate);
    }

    // Card transactions (card-issued + card-transaction)
    async function exportCardTransactions(fromDate = null, toDate = null) {
        return _exportByTypesInternal(['card-issued', 'card-transaction'], 'card-issued + card-transaction', fromDate, toDate);
    }

    // Generic: pass any array of types
    async function exportByTypes(types, fromDate = null, toDate = null) {
        if (!Array.isArray(types) || !types.length) {
            console.error('❌ Pass an array of types, e.g. exportByTypes(["nft-payment","registration"])');
            console.log('   Available types:', ALL_TYPES.join(', '));
            return;
        }
        return _exportByTypesInternal(types, types.join(', '), fromDate, toDate);
    }

    // Expose globally
    globalThis.exportAllReferralData   = exportAllReferralData;
    globalThis.exportReferralDataRange = exportReferralDataRange;
    globalThis.exportTransactionsToCSV = exportTransactionsToCSV;
    globalThis.stopExport              = stopExport;
    // Type-specific
    globalThis.exportRoyalties         = exportRoyalties;
    globalThis.exportNftPayments       = exportNftPayments;
    globalThis.exportRegistrations     = exportRegistrations;
    globalThis.exportInternalPayments  = exportInternalPayments;
    globalThis.exportSimpleEarnRewards = exportSimpleEarnRewards;
    globalThis.exportCardTransactions  = exportCardTransactions;
    globalThis.exportByTypes           = exportByTypes;

    // Show help
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║       📊 GoMining Referral Complete Export 📊               ║
╚══════════════════════════════════════════════════════════════╝

Full export (all types):
  exportAllReferralData()                               - All data since start
  exportReferralDataRange("2026-01-01", "2026-12-31")  - Custom date range
  exportTransactionsToCSV()                             - Download CSV

Type-specific exports (faster – fetch only what you need):
  exportRoyalties()                                     - income-kw-consumed-royalty
  exportNftPayments()                                   - nft-payment
  exportRegistrations()                                 - registration
  exportInternalPayments()                              - internal-payment
  exportSimpleEarnRewards()                             - simple-earn-reward
  exportCardTransactions()                              - card-issued + card-transaction
  exportByTypes(["nft-payment","registration"])         - custom type array

  All type functions accept optional (fromDate, toDate):
    exportRoyalties("2026-01-01", "2026-05-22")
    exportNftPayments("2025-01-01", "2025-12-31")

Available types: ${ALL_TYPES.join(', ')}

Utility:
  stopExport()   - Stop a running export

Token: ${globalThis.goMiningToken ? '✅ Found' : '❌ Not found'}

💡 Quick start: exportRoyalties()  or  exportAllReferralData()
    `);


return async () => { await exportAllReferralData(); exportTransactionsToCSV(); };
};

// Source: gomining-referral-users-export.js
factories.referralUsers = function(globalThis, window, fetch, console, document, URL) {
// ============================================================
// GoMining Referral Users Export
// Exports complete list of all referred users
// ============================================================
// Usage:
//   1. Go to app.gomining.com and login
//   2. Open Console (F12)
//   3. Paste this script and press Enter
//   4. Run: exportReferralUsers()
// ============================================================


    'use strict';

    const REFERRAL_API_BASE = 'https://referral-api.bounty.gomining.com/api';

    // Token detection
    function findToken() {
    if (globalThis.goMiningToken) return globalThis.goMiningToken;
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'access_token') {
                return decodeURIComponent(value);
            }
        }
        const token = localStorage.getItem('access_token');
        if (token) return token;
        return null;
    }

    globalThis.goMiningToken = globalThis.goMiningToken || findToken();
    globalThis.stopReferralUsersExport = false; // Stop flag

    // Get all referral users with pagination
    async function getAllReferralUsers(token) {
        console.log('\n🔍 Fetching Referral Users...');
        
        // Reset stop flag
        globalThis.stopReferralUsersExport = false;
        
        let allUsers = [];
        let skip = 0;
        const limit = 100;
        let hasMore = true;
        let totalCount = null;

        while (hasMore) {
            // Check stop flag
            if (globalThis.stopReferralUsersExport) {
                console.log('\n🛑 Export stopped by user!');
                hasMore = false;
                break;
            }
            
            try {
                const requestBody = {
                    pagination: {
                        limit: limit,
                        skip: skip,
                        count: 0
                    }
                };

                const response = await fetch(`${REFERRAL_API_BASE}/ref-program/user/get-referrals`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Origin': 'https://app.gomining.com',
                        'Referer': 'https://app.gomining.com/',
                        'x-device-type': 'desktop'
                    },
                    body: JSON.stringify(requestBody)
                });

                if (response.ok) {
                    const result = await response.json();
                    
                    // Response structure: { data: { count: 442, data: { count: 442, referrals: [...] } } }
                    const data = result.data?.data || result.data || {};
                    const users = data.referrals || [];
                    const count = result.data?.count || data.count || users.length;
                    
                    if (totalCount === null) {
                        totalCount = count;
                        console.log(`   📊 Total referral users: ${totalCount}`);
                    }
                    
                    console.log(`   Batch ${Math.floor(skip/limit)+1}: Loaded ${users.length} users (${allUsers.length + users.length}/${totalCount} total)`);
                    
                    if (users.length === 0) {
                        hasMore = false;
                    } else {
                        allUsers.push(...users);
                        skip += limit;
                        
                        if (skip >= totalCount) {
                            hasMore = false;
                        }
                    }
                } else {
                    console.error(`   ❌ Failed: ${response.status}`);
                    try {
                        const errorData = await response.json();
                        console.error(`   Error:`, errorData);
                    } catch (e) {}
                    hasMore = false;
                }

                await new Promise(r => setTimeout(r, 200));
                
            } catch (e) {
                console.error(`   ❌ Error: ${e.message}`);
                hasMore = false;
            }
        }

        console.log(`✅ Loaded ${allUsers.length} referral users`);
        return allUsers;
    }

    // Helper: Format number for German locale
    function formatNumberDE(value) {
        if (value === null || value === undefined || value === '') return '0';
        const num = parseFloat(value);
        if (isNaN(num)) return '0';
        return num.toString().replace('.', ',');
    }

    // Export referral users to CSV (German format)
    function exportUsersToCSV() {
        const data = globalThis.referralUsersData;
        if (!data || !data.users) {
            console.error('❌ Run exportReferralUsers() first!');
            return;
        }

        const users = data.users;
        if (users.length === 0) {
            console.log('⚠️ No referral users to export');
            return;
        }

        // German CSV headers
        const headers = [
            'Nr',
            'User ID',
            'Alias',
            'VIP Level',
            'Registriert am',
            'Registriert um',
            'Profilbild'
        ];

        let csv = headers.join(';') + '\n';
        
        users.forEach((user, index) => {
            const regDate = user.referralsLine ? new Date(user.referralsLine) : null;
            const dateStr = regDate ? regDate.toISOString().split('T')[0] : ''; // YYYY-MM-DD
            const timeStr = regDate ? regDate.toTimeString().split(' ')[0] : ''; // HH:MM:SS
            
            const row = [
                index + 1, // Fortlaufende Nummer
                user.id || '',
                user.alias || '',
                user.vipLevel || '0',
                dateStr,
                timeStr,
                user.picture ? 'Ja' : 'Nein'
            ];
            
            csv += row.map(val => `"${val}"`).join(';') + '\n';
        });

        const filename = `gomining_referral_users_${new Date().toISOString().split('T')[0]}.csv`;
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log(`✅ Exported ${users.length} referral users to ${filename}`);
    }

    // Stop export function
    function stopExport() {
        globalThis.stopReferralUsersExport = true;
        console.log('🛑 Stopping export... (may take a few seconds)');
    }

    // Main export function
    async function exportReferralUsers() {
        console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║       👥 GoMining Referral Users Export 👥                  ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
        `);

        const token = (globalThis.goMiningToken || findToken() || '').replace('Bearer ', '').trim();
        if (!token) {
            console.error('❌ No token found!');
            return;
        }

        console.log(`🔑 Token: ${token.substring(0, 20)}...`);

        const results = {
            users: []
        };

        // Get all referral users
        results.users = await getAllReferralUsers(token);

        // Summary
        console.log(`\n\n${'═'.repeat(60)}`);
        console.log(`📊 EXPORT SUMMARY`);
        console.log(`${'═'.repeat(60)}\n`);

        console.log(`✅ Referral Users Loaded: ${results.users.length}`);
        
        // Count by VIP level
        const byVipLevel = {};
        results.users.forEach(u => {
            const level = u.vipLevel || 0;
            byVipLevel[level] = (byVipLevel[level] || 0) + 1;
        });
        console.log(`\n📊 VIP Level Distribution:`);
        Object.entries(byVipLevel).sort((a, b) => a[0] - b[0]).forEach(([level, count]) => {
            console.log(`   • VIP Level ${level}: ${count} users`);
        });

        // Count by registration date (month)
        const byMonth = {};
        results.users.forEach(u => {
            if (u.referralsLine) {
                const date = new Date(u.referralsLine);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                byMonth[monthKey] = (byMonth[monthKey] || 0) + 1;
            }
        });
        console.log(`\n📅 Registrations by Month:`);
        Object.entries(byMonth).sort().forEach(([month, count]) => {
            console.log(`   • ${month}: ${count} users`);
        });

        // Store globally
        globalThis.referralUsersData = results;

        console.log(`\n💾 All data stored in: globalThis.referralUsersData`);
        console.log(`\n💡 To export to CSV:`);
        console.log(`   exportUsersToCSV()`);

        return results;
    }

    // Expose globally
    globalThis.exportReferralUsers = exportReferralUsers;
    globalThis.exportUsersToCSV = exportUsersToCSV;
    globalThis.stopExport = stopExport;

    // Show help
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║       👥 GoMining Referral Users Export 👥                  ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

📚 Exports complete list of all your referred users

How to use:

  1. exportReferralUsers()        - Fetch all referral users
  2. exportUsersToCSV()            - Export to CSV
  3. stopExport()                  - Stop running export

What gets exported:
  • User ID
  • Alias (anonymized username)
  • VIP Level
  • Registration Date & Time
  • Profile Picture (Yes/No)

Token: ${globalThis.goMiningToken ? '✅ Found' : '❌ Not found'}

💡 Run: exportReferralUsers()
    `);


return async () => { await exportReferralUsers(); exportUsersToCSV(); };
};

// Source: gomining-wallet-balances-export.js
factories.balances = function(globalThis, window, fetch, console, document, URL) {
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


    'use strict';

    const ENDPOINT = 'https://api.gomining.com/api/wallet/get-balances';
    const DECIMALS = 18;

    function findToken() {
    if (globalThis.goMiningToken) return globalThis.goMiningToken;
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

return async () => { await globalThis.exportWalletBalances(); };
};

// Source: gomining-cards-export.js
factories.cards = function(globalThis, window, fetch, console, document, URL) {
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


    'use strict';

    const BASE = 'https://internal-api.baas.gomining.com/api/cards/internal';
    const PERIOD_FROM = 1714784484221; // 2024-05-04, Startwert der App fuer "alle"
    const LIMIT = 100;

    globalThis.cardsExportConfig = globalThis.cardsExportConfig || { decimals: 18, delayMs: 150 };
    globalThis.stopCardsExport = false;

    function findToken() {
    if (globalThis.goMiningToken) return globalThis.goMiningToken;
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

return async () => { await globalThis.exportCards(); };
};

  root.gmExport = {
    all, status: snapshot, downloadAll,
    download(name) {
      const file = state.files.find(item => item.name === name);
      if (!file) throw new Error('Datei nicht gefunden. Siehe gmExport.status().files');
      downloadFile(file);
    },
    pause() { if (state.running) { state.paused = true; state.pauseReason = 'Manuell'; } },
    resume() {
      state.paused = false; state.pauseReason = null;
      if (wake) { const resolve = wake; wake = null; resolve(); }
    },
    stop() { if (state.running) { state.stopped = true; this.resume(); aborter?.abort(); } },
    setToken(token) {
      if (token !== null && (typeof token !== 'string' || !token.trim())) throw new Error('Token muss Text oder null sein.');
      tokenOverride = token === null ? null : token.replace(/^Bearer\s+/i, '').trim();
      this.resume();
      return 'Token übernommen; wird nicht ausgegeben. Mit setToken(null) zurück zur automatischen Erkennung.';
    }
  };
  root.getthemall = options => root.gmExport.all(options);
  nativeConsole.log('GetThemAll bereit: await getthemall() — Status: gmExport.status() — Hilfe: siehe getthemall-README.md');
})();

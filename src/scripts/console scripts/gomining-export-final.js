// ═══════════════════════════════════════════════════════
// 🚀 GOMINING TRANSACTION EXPORT - FINALE VERSION
// Komplett-Lösung mit Datumsauswahl und Fortschrittsanzeige
// ═══════════════════════════════════════════════════════

// 🔐 TOKEN SETZEN (wird beim Laden versucht automatisch zu finden)
globalThis.goMiningToken = null;

// ⚙️ EXPORT-KONFIGURATION
globalThis.exportConfig = {
  fromDate: null,        // Format: "2026-01-01" oder null für alle
  toDate: null,          // Format: "2026-12-31" oder null für alle
  testMode: false,       // true = nur 100 Transaktionen
  batchSize: 100,        // Transaktionen pro Request
  delayMs: 50            // Pause zwischen Requests (ms)
};

// 📅 HILFSFUNKTION: Datumsbereich setzen
window.setDateRange = function(from, to = null) {
  if (from === 'heute' || from === 'today') {
    const today = new Date().toISOString().split('T')[0];
    exportConfig.fromDate = today;
    exportConfig.toDate = today;
    console.log(`📅 Datumsfilter: Heute (${today})`);
  } else if (from === 'monat' || from === 'month') {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    exportConfig.fromDate = firstDay.toISOString().split('T')[0];
    exportConfig.toDate = lastDay.toISOString().split('T')[0];
    console.log(`📅 Datumsfilter: Dieser Monat (${exportConfig.fromDate} - ${exportConfig.toDate})`);
  } else if (from === 'jahr' || from === 'year') {
    const year = new Date().getFullYear();
    exportConfig.fromDate = `${year}-01-01`;
    exportConfig.toDate = `${year}-12-31`;
    console.log(`📅 Datumsfilter: Dieses Jahr (${exportConfig.fromDate} - ${exportConfig.toDate})`);
  } else if (typeof from === 'number') {
    // Jahr als Zahl
    exportConfig.fromDate = `${from}-01-01`;
    exportConfig.toDate = `${from}-12-31`;
    console.log(`📅 Datumsfilter: Jahr ${from}`);
  } else {
    exportConfig.fromDate = from;
    exportConfig.toDate = to || new Date().toISOString().split('T')[0];
    console.log(`📅 Datumsfilter: ${exportConfig.fromDate} bis ${exportConfig.toDate}`);
  }
  return exportConfig;
};

// 🔑 Token automatisch finden
function findToken() {
  // Versuche aus Cookies
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'access_token') {
      console.log('🔑 Token aus Cookie gefunden!');
      return decodeURIComponent(value);
    }
  }
  
  // Versuche aus localStorage
  const token = localStorage.getItem('access_token');
  if (token) {
    console.log('🔑 Token aus localStorage gefunden!');
    return token;
  }
  
  return null;
}

// 📊 HAUPT-EXPORT-FUNKTION
async function exportTransactions() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 GOMINING TRANSACTION EXPORT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Token holen
  const token = (globalThis.goMiningToken || findToken() || '').replace('Bearer ', '').trim();
  if (!token) {
    console.error('❌ Kein Token gefunden!');
    console.log('\n💡 Token manuell setzen:');
    console.log('   globalThis.goMiningToken = "DEIN_TOKEN"');
    console.log('   exportTransactions()');
    return;
  }
  console.log(`🔑 Token: ${token.substring(0, 20)}...`);
  
  // Konfiguration anzeigen
  if (exportConfig.fromDate || exportConfig.toDate) {
    console.log(`📅 Zeitraum: ${exportConfig.fromDate || 'Beginn'} bis ${exportConfig.toDate || 'Heute'}`);
  } else {
    console.log('📅 Zeitraum: Alle Transaktionen');
  }
  
  if (exportConfig.testMode) {
    console.log('🧪 TEST-MODUS: Nur erste 100 Transaktionen\n');
  } else {
    console.log('');
  }
  
  const apiUrl = 'https://api.gomining.com/api/wallet/transaction-history';
  let allTransactions = [];
  let cursor = Date.now();
  let pageNum = 0;
  let totalCount = 0;
  const startTime = Date.now();
  
  while (true) {
    pageNum++;
    
    if (exportConfig.testMode && pageNum > 1) {
      console.log('🛑 Test-Modus: Stoppe nach 1 Request');
      break;
    }
    
    process.stdout?.write?.(`\r📄 Lade Batch ${pageNum}...`) || console.log(`📄 Lade Batch ${pageNum}...`);
    
    try {
      const requestBody = {
        filter: {
          fromType: null,
          walletType: ["VIRTUAL_BNB", "VIRTUAL_BTC", "VIRTUAL_ETH", "VIRTUAL_GMT", 
                       "VIRTUAL_SOL", "VIRTUAL_TON", "VIRTUAL_USDC", "VIRTUAL_USDT"]
        },
        pagination: {
          cursor: cursor,
          limit: exportConfig.batchSize
        }
      };
      
      // Datumsfilter hinzufügen
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
          console.error('🔒 Token ungültig oder abgelaufen!');
          console.log('💡 Neuen Token aus DevTools kopieren und setzen:');
          console.log('   globalThis.goMiningToken = "NEUER_TOKEN"');
        }
        break;
      }
      
      const result = await response.json();
      const transactions = result.data?.array || [];
      totalCount = result.data?.count || 0;
      
      if (!transactions.length) {
        console.log('\n✅ Alle Daten geladen!');
        break;
      }
      
      allTransactions.push(...transactions);
      
      const progress = totalCount > 0 ? ((allTransactions.length / totalCount) * 100).toFixed(1) : '?';
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`\r✓ ${allTransactions.length}/${totalCount} Transaktionen (${progress}%) | ${elapsed}s`);
      
      // Prüfe ob wir weitermachen sollen
      if (exportConfig.testMode) break;
      
      const lastTx = transactions[transactions.length - 1];
      const nextCursor = new Date(lastTx.createdAt).getTime();
      
      if (nextCursor === cursor || allTransactions.length >= totalCount) {
        console.log('✅ Alle Daten geladen!');
        break;
      }
      
      cursor = nextCursor;
      await new Promise(r => setTimeout(r, exportConfig.delayMs));
      
    } catch (error) {
      console.error('\n❌ Fehler:', error.message);
      break;
    }
  }
  
  if (!allTransactions.length) {
    console.log('\n⚠️ Keine Transaktionen gefunden!');
    return;
  }
  
  console.log(`\n📊 Erstelle CSV mit ${allTransactions.length} Transaktionen...`);
  
  // CSV Export mit korrekten Dezimalstellen
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
    
    // Korrekte Umrechnung basierend auf Währung
    let amount = '0';
    try {
      const numValue = parseFloat(valueNumeric);
      if (currency === 'BTC') {
        amount = (numValue / 1e8).toFixed(8); // Satoshi zu BTC
      } else if (currency === 'USDT' || currency === 'USDC') {
        amount = (numValue / 1e18).toFixed(6); // Wei zu USDT/USDC
      } else {
        amount = (numValue / 1e18).toFixed(8); // Wei zu Token
      }
    } catch (e) {
      amount = '0';
    }
    
    amount = amount.replace('.', ','); // Deutsch: Komma als Dezimaltrennzeichen
    
    csv += `"${date}";"${time}";"${type}";"${fromType}";"${amount}";"${currency}";"${status}";"${id}";"${walletType}"\n`;
  });
  
  // Dateiname generieren
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
  console.log('✅ EXPORT ABGESCHLOSSEN!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📁 Datei: ${filename}`);
  console.log(`📊 Transaktionen: ${allTransactions.length}`);
  console.log(`⏱️ Dauer: ${totalTime}s`);
  console.log(`📈 Geschwindigkeit: ${(allTransactions.length / totalTime).toFixed(1)} tx/s\n`);
}

// 🎯 QUICK-START FUNKTIONEN
window.exportAll = function() {
  exportConfig.fromDate = null;
  exportConfig.toDate = null;
  exportConfig.testMode = false;
  console.log('📊 Exportiere ALLE Transaktionen...');
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
  console.log('🧪 Test-Export (100 Transaktionen)...');
  exportTransactions();
};

// 📖 HILFE ANZEIGEN
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🚀 GOMINING TRANSACTION EXPORT - GELADEN');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('📖 SCHNELLSTART:\n');
console.log('  testExport()                    → Test (100 Transaktionen)');
console.log('  exportYear(2026)                → Alle Transaktionen 2026');
console.log('  exportMonth(2026, 4)            → April 2026');
console.log('  exportFromTo("2026-01-01", "2026-04-02") → Von-Bis Zeitraum');
console.log('  exportCustom("2026-01-01", "2026-04-02") → Benutzerdef. Zeitraum');
console.log('  exportAll()                     → ALLE Transaktionen\n');

console.log('⚙️ ERWEITERT:\n');
console.log('  setDateRange("2026-01-01", "2026-12-31")  → Filter setzen');
console.log('  setDateRange(2026)              → Shortcut für Jahr');
console.log('  setDateRange("jahr")            → Shortcut für dieses Jahr');
console.log('  setDateRange("monat")           → Shortcut für diesen Monat');
console.log('  exportTransactions()            → Mit aktuellen Einstellungen\n');

console.log('🔧 KONFIGURATION:\n');
console.log('  exportConfig.testMode = true    → Test-Modus ein/aus');
console.log('  exportConfig.batchSize = 200    → Mehr pro Request');
console.log('  exportConfig.delayMs = 100      → Längere Pausen\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Token automatisch versuchen zu finden
const autoToken = findToken();
if (autoToken) {
  globalThis.goMiningToken = autoToken;
  console.log('✅ Token automatisch gefunden und gesetzt!\n');
  console.log('🎯 READY! Führe jetzt einen Export aus, z.B.:');
  console.log('   testExport()        ← Empfohlen zum Testen!\n');
} else {
  console.log('⚠️ Token nicht automatisch gefunden.');
  console.log('💡 Manuell setzen:');
  console.log('   globalThis.goMiningToken = "DEIN_TOKEN"\n');
}

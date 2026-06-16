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
    
    process.stdout?.write?.(`\r📄 Loading batch ${batchNum}...`) || console.log(`📄 Loading batch ${batchNum}...`);
    
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

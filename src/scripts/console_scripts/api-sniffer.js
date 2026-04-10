// ═══════════════════════════════════════════════════════
// GOMINING API-EXPORT - TEST VERSION (nur 100 Transaktionen)
// ═══════════════════════════════════════════════════════

globalThis.authToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTI3ODAzMywiZW1haWwiOiJtNHEyaGp5eTU1QHByaXZhdGVyZWxheS5hcHBsZWlkLmNvbSIsInVzZXIiOnRydWUsImlhdCI6MTc3NTE1Mjc1NiwiZXhwIjoxNzc1MTU2MzU2LCJhdWQiOlsiZ2VuZGFsZiJdfQ.I_cm9EpD2fSA5KD92JDy5mI8ydGTEIespPEZjRmZdrM";

// ⚙️ KONFIGURATION
const CONFIG = {
  testMode: true,           // nur 1 Request (100 Transaktionen)
  year: 2026,              // Nur dieses Jahr (oder null für alle)
  maxRequests: 1           // Max. Requests (nur im Test-Mode)
};

async function goMiningApiExport() {
  console.log('🚀 Starte Export...');
  if (CONFIG.testMode) console.log('🧪 TEST-MODUS: Lade nur 100 Transaktionen');
  if (CONFIG.year) console.log(`📅 Filter: Nur Jahr ${CONFIG.year}`);
  
  const token = globalThis.authToken.replace('Bearer ', '').trim();
  const apiUrl = 'https://api.gomining.com/api/wallet/transaction-history';
  
  // Datumsbereich für 2026
  let startDate = null;
  let endDate = null;
  if (CONFIG.year) {
    startDate = new Date(`${CONFIG.year}-01-01T00:00:00Z`);
    endDate = new Date(`${CONFIG.year}-12-31T23:59:59Z`);
    console.log(`📆 Von: ${startDate.toISOString()}`);
    console.log(`📆 Bis: ${endDate.toISOString()}`);
  }
  
  let allTransactions = [];
  let cursor = Date.now();
  let pageNum = 0;
  let totalCount = 0;
  
  while (true) {
    pageNum++;
    
    // Test-Mode: Nur 1 Request
    if (CONFIG.testMode && pageNum > CONFIG.maxRequests) {
      console.log('🛑 Test-Mode: Stoppe nach 1 Request');
      break;
    }
    
    console.log(`📄 Lade Batch ${pageNum}...`);
    
    try {
      const requestBody = {
        filter: {
          fromType: null,
          walletType: ["VIRTUAL_BNB", "VIRTUAL_BTC", "VIRTUAL_ETH", "VIRTUAL_GMT", "VIRTUAL_SOL", "VIRTUAL_TON", "VIRTUAL_USDC", "VIRTUAL_USDT"]
        },
        pagination: {
          cursor: cursor,
          limit: 100
        }
      };
      
      // Datumsfilter hinzufügen wenn gesetzt
      if (CONFIG.year) {
        requestBody.filter.range = {
          from: startDate.toISOString(),
          to: endDate.toISOString()
        };
      }
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
          'Origin': 'https://app.gomining.com',
          'Referer': 'https://app.gomining.com/'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        console.error(`❌ Error ${response.status}`);
        const errorText = await response.text();
        console.error('Error Details:', errorText);
        break;
      }
      
      const result = await response.json();
      const transactions = result.data?.array || [];
      totalCount = result.data?.count || 0;
      
      if (!transactions.length) {
        console.log('✅ Keine weiteren Daten');
        break;
      }
      
      allTransactions.push(...transactions);
      console.log(`✓ ${transactions.length} Transaktionen geladen (Gesamt: ${allTransactions.length})`);
      
      if (totalCount > 0) {
        const progress = ((allTransactions.length / totalCount) * 100).toFixed(1);
        console.log(`📊 Fortschritt: ${progress}% (${allTransactions.length}/${totalCount})`);
      }
      
      // Im echten Modus: Weitermachen
      if (!CONFIG.testMode) {
        const lastTx = transactions[transactions.length - 1];
        const nextCursor = new Date(lastTx.createdAt).getTime();
        
        if (nextCursor === cursor) {
          console.log('✅ Ende erreicht');
          break;
        }
        
        cursor = nextCursor;
        await new Promise(r => setTimeout(r, 50));
      } else {
        break; // Test-Mode: Nach 1 Request stoppen
      }
      
    } catch (error) {
      console.error('❌ Fehler:', error);
      break;
    }
  }
  
  if (!allTransactions.length) {
    console.log('⚠️ Keine Transaktionen gefunden!');
    return;
  }
  
  console.log(`\n📊 Exportiere ${allTransactions.length} Transaktionen...`);
  
  // CSV Export
  let csv = "Date;Time;Type;FromType;Amount;Currency;Status;ID\n";
  
  allTransactions.forEach(tx => {
    const dateObj = new Date(tx.createdAt);
    const date = dateObj.toISOString().split('T')[0];
    const time = dateObj.toTimeString().split(' ')[0];
    const type = tx.type || '';
    const fromType = tx.fromType || '';
    const valueNumeric = tx.valueNumeric || '0';
    
    // Konvertiere basierend auf Währung
    let amount = '0';
    const currency = tx.walletType?.replace('VIRTUAL_', '') || '';
    
    // BTC, ETH, etc. haben unterschiedliche Dezimalstellen
    if (currency === 'BTC') {
      amount = (parseFloat(valueNumeric) / 1e8).toFixed(8); // Satoshi
    } else if (currency === 'USDT' || currency === 'USDC') {
      amount = (parseFloat(valueNumeric) / 1e18).toFixed(6); // Wei
    } else {
      amount = (parseFloat(valueNumeric) / 1e18).toFixed(8); // Standard Wei
    }
    
    amount = amount.replace('.', ',');
    
    const status = tx.status || '';
    const id = tx.id || '';
    
    csv += `"${date}";"${time}";"${type}";"${fromType}";"${amount}";"${currency}";"${status}";"${id}"\n`;
  });
  
  const filename = CONFIG.testMode 
    ? `gomining_test.csv`
    : `gomining_${CONFIG.year || 'all'}_${new Date().toISOString().split('T')[0]}.csv`;
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  console.log(`\n✅ FERTIG! ${filename} heruntergeladen!`);
  console.log(`📊 ${allTransactions.length} Transaktionen exportiert`);
  
  if (CONFIG.testMode) {
    console.log('\n💡 Zum vollständigen Export:');
    console.log('   CONFIG.testMode = false');
    console.log('   Dann Skript neu ausführen!');
  }
}

// Starte in 2 Sekunden
console.log('🎯 Bereit zum Export!');
console.log(`⚙️ Settings: testMode=${CONFIG.testMode}, year=${CONFIG.year}`);
setTimeout(() => goMiningApiExport(), 2000);
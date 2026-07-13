// ═══════════════════════════════════════════════════════
// 🔍 GOMINING TRANSACTION DEBUG
// Holt nur einen Batch und zeigt die rohen Daten
// ═══════════════════════════════════════════════════════

// 🔑 Token automatisch finden
function findToken() {
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

// 📊 DEBUG: Hole einen Batch
async function debugTransactions() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 TRANSACTION DEBUG');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const token = (globalThis.goMiningToken || findToken() || '').replace('Bearer ', '').trim();
  if (!token) {
    console.error('❌ Kein Token gefunden!');
    return;
  }
  console.log(`🔑 Token gefunden: ${token.substring(0, 20)}...\n`);
  
  const apiUrl = 'https://api.gomining.com/api/wallet/transaction-history';
  
  // Datumsfilter für 2026-04-08
  const from = new Date('2026-04-08T00:00:00Z');
  const to = new Date('2026-04-08T23:59:59Z');
  
  const requestBody = {
    filter: {
      fromType: null,
      walletType: ["VIRTUAL_BNB", "VIRTUAL_BTC", "VIRTUAL_ETH", "VIRTUAL_GMT", 
                   "VIRTUAL_SOL", "VIRTUAL_TON", "VIRTUAL_USDC", "VIRTUAL_USDT"],
      range: {
        from: from.toISOString(),
        to: to.toISOString()
      }
    },
    pagination: {
      cursor: Date.now(),
      limit: 5
    }
  };
  
  console.log('📡 API Request für 2026-04-08...\n');
  
  try {
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
      console.error(`❌ API Error: ${response.status} ${response.statusText}\n`);
      
      // Versuche Error-Details zu lesen
      try {
        const errorText = await response.text();
        console.log('📋 Response Body:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        try {
          const errorJson = JSON.parse(errorText);
          console.log(JSON.stringify(errorJson, null, 2));
        } catch (e) {
          console.log(errorText);
        }
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      } catch (e) {
        console.log('Konnte Response nicht lesen:', e);
      }
      
      // Zeige auch den gesendeten Request
      console.log('📤 GESENDETER REQUEST:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(JSON.stringify(requestBody, null, 2));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return;
    }
    
    const result = await response.json();
    
    // ZEIGE DIE KOMPLETTE ROHE API-ANTWORT
    console.log('📦 KOMPLETTE API-ANTWORT:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(JSON.stringify(result, null, 2));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const transactions = result.data?.array || [];
    const totalCount = result.data?.count || 0;
    
    console.log(`✅ Response erhalten: ${transactions.length} Transaktionen\n`);
    console.log(`📊 Total Count: ${totalCount}\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Zeige die ersten 5 Transaktionen im Detail
    transactions.forEach((tx, idx) => {
      console.log(`\n📄 TRANSAKTION ${idx + 1}:`);
      console.log('─────────────────────────────────────');
      console.log(`Date:        ${tx.createdAt}`);
      console.log(`Type:        ${tx.type}`);
      console.log(`FromType:    ${tx.fromType || '(leer)'}`);
      console.log(`WalletType:  ${tx.walletType}`);
      console.log(`Currency:    ${tx.walletType?.replace('VIRTUAL_', '') || ''}`);
      console.log(`Status:      ${tx.status}`);
      console.log(`ID:          ${tx.id}`);
      console.log('');
      console.log('💰 VALUE-INFORMATIONEN:');
      console.log(`valueNumeric (raw):  "${tx.valueNumeric}"`);
      console.log(`typeof:              ${typeof tx.valueNumeric}`);
      console.log(`length:              ${tx.valueNumeric?.length || 0} Zeichen`);
      console.log(`enthält Punkt (.):   ${tx.valueNumeric?.includes('.') ? 'JA' : 'NEIN'}`);
      
      // Umrechnung testen (ALLE Währungen inkl. BTC verwenden Wei!)
      const currency = tx.walletType?.replace('VIRTUAL_', '') || '';
      const rawValue = parseFloat(tx.valueNumeric) || 0;
      const converted = rawValue / 1e18;
      const withSign = tx.type === 'withdraw' ? '-' + converted : converted;
      
      console.log(`\nUMRECHNUNG (Wei → ${currency}):`);
      console.log(`  ${rawValue} Wei`);
      console.log(`  ÷ 1.000.000.000.000.000.000 (10^18)`);
      console.log(`  = ${converted} ${currency}`);
      console.log(`  mit Vorzeichen (${tx.type}): ${withSign}`);
      console.log(`  formatiert: ${withSign.toString().replace('.', ',')} ${currency}`);
    });
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DEBUG ABGESCHLOSSEN');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    return transactions;
    
  } catch (error) {
    console.error('❌ Fehler:', error);
  }
}

// Token automatisch setzen
const autoToken = findToken();
if (autoToken) {
  globalThis.goMiningToken = autoToken;
  console.log('✅ Token automatisch gefunden!');
}

console.log('\n🔍 DEBUG-SKRIPT GELADEN');
console.log('──────────────────────────────');
console.log('Aufruf: debugTransactions()');
console.log('──────────────────────────────\n');

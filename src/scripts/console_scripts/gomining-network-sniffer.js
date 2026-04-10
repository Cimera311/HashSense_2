// ═══════════════════════════════════════════════════════
// 🔍 GOMINING NETWORK SNIFFER
// Überwacht alle API-Requests und zeigt transaction-history
// ═══════════════════════════════════════════════════════

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔍 GOMINING NETWORK SNIFFER');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('📡 SCHRITT-FÜR-SCHRITT ANLEITUNG:\n');
console.log('1️⃣ DevTools öffnen (F12) → Network Tab');
console.log('2️⃣ Filter eingeben: "transaction-history"');
console.log('3️⃣ In der GoMining App zur Transaction History gehen');
console.log('4️⃣ Warte, bis Requests erscheinen...');
console.log('5️⃣ Request mit Status 200 anklicken');
console.log('6️⃣ Im rechten Panel: "Payload" Tab öffnen\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('💡 ALTERNATIVE: Wenn du schon Requests siehst, nutze:\n');
console.log('   showLatestTransactionRequest()\n');

// Funktion um den neuesten transaction-history Request zu zeigen
window.showLatestTransactionRequest = function() {
  console.log('\n🔍 Suche nach transaction-history Requests...\n');
  
  // Hole alle Performance-Entries
  const allRequests = performance.getEntriesByType('resource');
  const apiRequests = allRequests.filter(r => 
    r.name.includes('transaction-history') && r.initiatorType === 'fetch'
  );
  
  if (!apiRequests.length) {
    console.log('⚠️ Keine transaction-history Requests gefunden!');
    console.log('💡 Gehe in der App zur Transaction History, dann erneut versuchen.\n');
    return;
  }
  
  console.log(`✅ ${apiRequests.length} Request(s) gefunden!\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Zeige die letzten 3 Requests
  const recent = apiRequests.slice(-3);
  recent.forEach((req, idx) => {
    console.log(`📡 REQUEST ${idx + 1}:`);
    console.log(`   URL: ${req.name}`);
    console.log(`   Duration: ${req.duration.toFixed(0)}ms`);
    console.log(`   Time: ${new Date(req.startTime).toISOString()}`);
    console.log('');
  });
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('⚠️ Request-Body kann nicht aus Performance API gelesen werden!');
  console.log('📋 NÄCHSTE SCHRITTE:\n');
  console.log('1. DevTools → Network Tab');
  console.log('2. Filter: "transaction-history"');
  console.log('3. Request anklicken (Status 200)');
  console.log('4. Rechts → "Payload" oder "Request" Tab');
  console.log('5. Kopiere das JSON und zeige es mir!\n');
};

// Intercept fetch() um Requests zu loggen
const originalFetch = window.fetch;
let capturedRequests = [];

window.fetch = async function(...args) {
  const [url, options] = args;
  
  // Nur transaction-history Requests loggen
  if (url && url.toString().includes('transaction-history')) {
    console.log('\n🎯 TRANSACTION-HISTORY REQUEST GEFANGEN!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📡 URL:', url);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (options) {
      console.log('📦 REQUEST DETAILS:\n');
      console.log('Method:', options.method || 'GET');
      
      if (options.headers) {
        console.log('\n📋 Headers:');
        const headers = typeof options.headers === 'object' ? options.headers : {};
        for (const [key, value] of Object.entries(headers)) {
          if (key.toLowerCase() === 'authorization') {
            console.log(`  ${key}: Bearer ${value.replace('Bearer ', '').substring(0, 20)}...`);
          } else {
            console.log(`  ${key}: ${value}`);
          }
        }
      }
      
      if (options.body) {
        console.log('\n💰 REQUEST BODY (JSON):');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        try {
          const parsed = JSON.parse(options.body);
          console.log(JSON.stringify(parsed, null, 2));
        } catch (e) {
          console.log(options.body);
        }
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      }
    }
    
    // Request speichern
    capturedRequests.push({
      url,
      options,
      timestamp: new Date().toISOString()
    });
    
    console.log('💾 Request gespeichert! (Gesamt: ' + capturedRequests.length + ')\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
  
  // Original fetch aufrufen
  return originalFetch.apply(this, args);
};

window.showCapturedRequests = function() {
  if (!capturedRequests.length) {
    console.log('⚠️ Noch keine Requests gefangen!');
    console.log('💡 Gehe in der App zur Transaction History.\n');
    return;
  }
  
  console.log(`\n📊 ${capturedRequests.length} GEFANGENE REQUEST(S):\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  capturedRequests.forEach((req, idx) => {
    console.log(`REQUEST ${idx + 1}:`);
    console.log(`Time: ${req.timestamp}`);
    
    if (req.options?.body) {
      try {
        const parsed = JSON.parse(req.options.body);
        console.log('Body:', JSON.stringify(parsed, null, 2));
      } catch (e) {
        console.log('Body:', req.options.body);
      }
    }
    console.log('\n');
  });
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
};

console.log('✅ Network Sniffer ist AKTIV!\n');
console.log('💡 Nächste Schritte:');
console.log('   1. Gehe in der GoMining App zur Transaction History');
console.log('   2. Der Sniffer wird automatisch alle Requests anzeigen');
console.log('   3. Oder nutze: showLatestTransactionRequest()\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

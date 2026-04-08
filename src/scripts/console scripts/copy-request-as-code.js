// 🔧 KOPIERT ECHTEN API-REQUEST MIT ALLEN HEADERS
// Anleitung: DevTools Network Tab nutzen

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📋 REQUEST MIT HEADERS KOPIEREN');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('📖 SCHRITT-FÜR-SCHRITT:\n');

console.log('1️⃣ DevTools öffnen (F12)');
console.log('2️⃣ "Network" Tab auswählen');
console.log('3️⃣ Filter eingeben: "transaction-history"');
console.log('4️⃣ Transaktionsseite neu laden (F5) oder navigieren\n');

console.log('5️⃣ Request "transaction-history" mit Status 200 anklicken');
console.log('6️⃣ RECHTSKLICK auf den Request');
console.log('7️⃣ "Copy" → "Copy as fetch"\n');

console.log('8️⃣ Hier in Console einfügen:');
console.log('   parseAndExtractAuth(`HIER_EINFÜGEN`)\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Parser für "Copy as fetch"
window.parseAndExtractAuth = function(fetchCode) {
  console.log('\n🔍 Analysiere Request...\n');
  
  try {
    // Extrahiere URL
    const urlMatch = fetchCode.match(/fetch\(["'](.*?)["']/);
    const url = urlMatch ? urlMatch[1] : 'URL nicht gefunden';
    console.log('🌐 URL:', url);
    
    // Extrahiere Headers
    const headersMatch = fetchCode.match(/"headers":\s*({[\s\S]*?})\s*[,}]/);
    if (headersMatch) {
      const headersStr = headersMatch[1];
      const headers = eval(`(${headersStr})`);
      
      console.log('\n📦 HEADERS:\n');
      Object.entries(headers).forEach(([key, value]) => {
        const truncated = value.length > 80 ? value.substring(0, 80) + '...' : value;
        console.log(`  ${key}: ${truncated}`);
      });
      
      // Auth-Headers finden
      const authHeaders = Object.entries(headers).filter(([key]) => 
        key.toLowerCase().includes('auth') || 
        key.toLowerCase().includes('token') ||
        key.toLowerCase() === 'cookie'
      );
      
      if (authHeaders.length > 0) {
        console.log('\n🔐 GEFUNDENE AUTH-HEADERS:\n');
        authHeaders.forEach(([key, value]) => {
          console.log(`  ✅ ${key}: ${value.substring(0, 50)}...`);
          
          // Token automatisch setzen
          if (key.toLowerCase().includes('authorization')) {
            const token = value.replace('Bearer ', '');
            globalThis.authToken = token;
            console.log('\n✨ Token automatisch gesetzt!');
          }
        });
      } else {
        console.log('\n⚠️ Keine Auth-Headers gefunden!');
        console.log('💡 Prüfe ob der Request wirklich von der GoMining API ist.');
      }
      
      // Body extrahieren
      const bodyMatch = fetchCode.match(/"body":\s*"(.*?)"/);
      if (bodyMatch) {
        try {
          const body = JSON.parse(bodyMatch[1].replace(/\\"/g, '"'));
          console.log('\n📄 REQUEST BODY:');
          console.log(JSON.stringify(body, null, 2));
        } catch (e) {
          console.log('\n📄 REQUEST BODY:', bodyMatch[1]);
        }
      }
      
      // Ready-to-use Fetch generieren
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ FERTIGER CODE FÜR EXPORT:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      console.log('// Headers setzen:');
      console.log('globalThis.goMiningHeaders = ' + JSON.stringify(headers, null, 2) + ';\n');
      
      if (authHeaders.length > 0) {
        console.log('// Token wurde automatisch gesetzt!');
        console.log('// Jetzt Export starten:');
        console.log('goMiningApiExport();\n');
      } else {
        console.log('// ⚠️ Kein Auth-Token gefunden!');
        console.log('// Bitte einen Request MIT Authentication kopieren.\n');
      }
      
    } else {
      console.error('❌ Keine Headers gefunden!');
      console.log('💡 Stelle sicher, dass du "Copy as fetch" verwendet hast.');
    }
    
  } catch (error) {
    console.error('❌ Fehler beim Parsen:', error);
    console.log('\n💡 ALTERNATIVE: Headers manuell kopieren:\n');
    console.log('1. DevTools → Network → Request anklicken');
    console.log('2. "Headers" Tab → nach unten scrollen');
    console.log('3. "Request Headers" → "Authorization" oder "Cookie" kopieren');
    console.log('4. globalThis.authToken = "KOPIERTER_WERT"\n');
  }
};

// Alternative: Direkter Header-Input
window.setAuthFromHeader = function(headerValue) {
  if (headerValue.startsWith('Bearer ')) {
    globalThis.authToken = headerValue.replace('Bearer ', '');
    console.log('✅ Bearer Token gesetzt!');
  } else {
    globalThis.authToken = headerValue;
    console.log('✅ Token gesetzt!');
  }
  console.log('🚀 Starte Export mit: goMiningApiExport()');
};

console.log('💡 SCHNELLSTART:\n');
console.log('1. Network Tab → transaction-history Request → Rechtsklick');
console.log('2. "Copy" → "Copy as fetch"');
console.log('3. parseAndExtractAuth(`HIER_EINFÜGEN`)');
console.log('4. Fertig! Token ist gesetzt.\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

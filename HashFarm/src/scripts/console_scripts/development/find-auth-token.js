// 🔍 FINDET AUTOMATISCH DEN AUTH-TOKEN AUS ERFOLGREICHEN REQUESTS
// Führe das aus, NACHDEM du zur Transaktionsseite navigiert bist

(function() {
  console.log('🔍 Suche nach erfolgreichen API-Requests mit Auth-Token...\n');
  
  // Performance API nutzt um alle Requests zu finden
  const resources = performance.getEntriesByType('resource');
  const apiRequests = resources.filter(r => 
    r.name.includes('api.gomining.com') && 
    r.name.includes('transaction-history')
  );
  
  if (apiRequests.length === 0) {
    console.log('⚠️ Keine transaction-history Requests gefunden!');
    console.log('💡 Navigiere zur Transaktionsseite und führe das Skript erneut aus.');
    return;
  }
  
  console.log(`✅ ${apiRequests.length} transaction-history Request(s) gefunden!\n`);
  
  // Zeige wie man den Token aus DevTools kopiert
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📖 SO FINDEST DU DEN TOKEN:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('1️⃣ DevTools öffnen (F12)');
  console.log('2️⃣ "Network" Tab auswählen');
  console.log('3️⃣ Im Filter-Feld "transaction-history" eingeben\n');
  
  console.log('4️⃣ Einen Request anklicken (Status sollte 200 sein)');
  console.log('5️⃣ Im rechten Panel "Headers" Tab auswählen');
  console.log('6️⃣ Nach unten scrollen zu "Request Headers"\n');
  
  console.log('7️⃣ Suche nach einem dieser Headers:');
  console.log('   🔑 Authorization: Bearer xxx...');
  console.log('   🔑 x-access-token: xxx...');
  console.log('   🔑 x-auth-token: xxx...');
  console.log('   🔑 Cookie: (suche nach "token" oder "session")\n');
  
  console.log('8️⃣ Rechtsklick auf den Wert → "Copy value"');
  console.log('9️⃣ In Console eingeben:\n');
  console.log('   globalThis.authToken = "EINGEFÜGTER_TOKEN"');
  console.log('   goMiningApiExport()\n');
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Alternative: Cookies checken
  console.log('🍪 ODER: COOKIES PRÜFEN\n');
  
  const cookies = document.cookie.split(';').map(c => c.trim());
  const relevantCookies = cookies.filter(c => 
    c.toLowerCase().includes('token') || 
    c.toLowerCase().includes('auth') ||
    c.toLowerCase().includes('session') ||
    c.toLowerCase().includes('jwt')
  );
  
  if (relevantCookies.length > 0) {
    console.log('✅ Gefundene relevante Cookies:');
    relevantCookies.forEach(cookie => {
      const [name, value] = cookie.split('=');
      console.log(`   🔑 ${name} = ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`);
    });
    console.log('\n💡 Versuche einen dieser Cookie-Werte als Token!\n');
  } else {
    console.log('❌ Keine relevanten Cookies gefunden');
    console.log('➡️ Token muss in Request Headers sein (siehe oben)\n');
  }
  
  // LocalStorage checken
  console.log('💾 ODER: LOCALSTORAGE PRÜFEN\n');
  
  const storageItems = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const value = localStorage.getItem(key);
    
    if (key.toLowerCase().includes('token') || 
        key.toLowerCase().includes('auth') ||
        key.toLowerCase().includes('jwt') ||
        key.toLowerCase().includes('session')) {
      storageItems.push({ key, value });
    }
  }
  
  if (storageItems.length > 0) {
    console.log('✅ Gefundene Storage Items:');
    storageItems.forEach(item => {
      console.log(`   🔑 ${item.key}:`);
      
      // Versuche JSON zu parsen
      try {
        const parsed = JSON.parse(item.value);
        console.log(`      ${JSON.stringify(parsed, null, 2).substring(0, 200)}...`);
        
        // Suche nach Token im JSON
        const findToken = (obj, path = '') => {
          for (const key in obj) {
            if (typeof obj[key] === 'string' && 
                (key.toLowerCase().includes('token') || 
                 key.toLowerCase().includes('jwt') ||
                 key.toLowerCase().includes('auth'))) {
              console.log(`      ➡️ Gefunden: ${path}${key} = ${obj[key].substring(0, 50)}...`);
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
              findToken(obj[key], `${path}${key}.`);
            }
          }
        };
        findToken(parsed);
      } catch (e) {
        console.log(`      ${item.value.substring(0, 100)}...`);
      }
    });
    console.log('');
  } else {
    console.log('❌ Keine relevanten LocalStorage Items gefunden\n');
  }
  
  // Quick Copy Helper
  window.setTokenFromStorage = function(storageKey) {
    const value = localStorage.getItem(storageKey);
    if (!value) {
      console.error(`❌ Key "${storageKey}" nicht gefunden!`);
      return;
    }
    
    try {
      const parsed = JSON.parse(value);
      const token = parsed.token || parsed.access_token || parsed.accessToken || parsed.jwt || parsed.auth_token;
      if (token) {
        globalThis.authToken = token;
        console.log('✅ Token gesetzt!', token.substring(0, 20) + '...');
        console.log('🚀 Jetzt ausführen: goMiningApiExport()');
      } else {
        console.error('❌ Kein Token-Feld gefunden in:', parsed);
      }
    } catch (e) {
      globalThis.authToken = value;
      console.log('✅ Wert direkt als Token gesetzt:', value.substring(0, 20) + '...');
    }
  };
  
  window.testWithToken = function(token) {
    console.log('\n🧪 Teste Token...\n');
    
    fetch('https://api.gomining.com/api/wallet/transaction-history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ page: 1, limit: 5 })
    })
    .then(r => {
      console.log(`📡 Status: ${r.status} ${r.statusText}`);
      return r.json();
    })
    .then(data => {
      console.log('✅ SUCCESS! Token funktioniert!');
      console.log('📊 Daten:', data);
      console.log('\n💾 Token speichern:');
      console.log(`   globalThis.authToken = "${token}"`);
      console.log('\n🚀 Export starten:');
      console.log('   goMiningApiExport()');
    })
    .catch(err => {
      console.error('❌ Token funktioniert nicht:', err);
    });
  };
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🛠️ HELPER-FUNKTIONEN:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('testWithToken("DEIN_TOKEN")  → Testet ob Token funktioniert');
  console.log('setTokenFromStorage("KEY")   → Holt Token aus localStorage[KEY]');
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
})();

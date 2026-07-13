// API-BASIERTER EXPORT - Holt Token aus Session und nutzt direkt die GoMining API
// Viel schneller und zuverlässiger als UI-Scraping!

globalThis.cancelApiExport = false;

// Konfiguration
globalThis.apiExportConfig = {
  pageSize: 50,           // Anzahl Transaktionen pro API-Request
  delayBetweenRequests: 100, // Wartezeit zwischen Requests (ms)
  maxRetries: 3,          // Max. Wiederholungen bei Fehler
  retryDelay: 2000        // Wartezeit vor Wiederholung (ms)
};

// Hilfsfunktion zum Ändern der Config
globalThis.setApiExportConfig = function(settings) {
  Object.assign(globalThis.apiExportConfig, settings);
  console.log('⚙️ API Export Config aktualisiert:', globalThis.apiExportConfig);
};

// Funktion zum Extrahieren des Auth-Tokens
function getAuthToken() {
  // Methode 1: localStorage durchsuchen
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const value = localStorage.getItem(key);
    
    // Suche nach typischen Token-Patterns
    if (key.includes('token') || key.includes('auth') || key.includes('session')) {
      console.log(`🔍 Gefundener Token in localStorage.${key}`);
      return value;
    }
    
    // Versuche JSON zu parsen und nach Token zu suchen
    try {
      const parsed = JSON.parse(value);
      if (parsed.token || parsed.access_token || parsed.accessToken || parsed.jwt) {
        const token = parsed.token || parsed.access_token || parsed.accessToken || parsed.jwt;
        console.log(`🔍 Gefundener Token in localStorage.${key} (JSON)`);
        return token;
      }
    } catch (e) {
      // Kein JSON, weiter
    }
  }
  
  // Methode 2: sessionStorage durchsuchen
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    const value = sessionStorage.getItem(key);
    
    if (key.includes('token') || key.includes('auth') || key.includes('session')) {
      console.log(`🔍 Gefundener Token in sessionStorage.${key}`);
      return value;
    }
    
    try {
      const parsed = JSON.parse(value);
      if (parsed.token || parsed.access_token || parsed.accessToken || parsed.jwt) {
        const token = parsed.token || parsed.access_token || parsed.accessToken || parsed.jwt;
        console.log(`🔍 Gefundener Token in sessionStorage.${key} (JSON)`);
        return token;
      }
    } catch (e) {
      // Kein JSON, weiter
    }
  }
  
  // Methode 3: Cookies durchsuchen
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name.includes('token') || name.includes('auth') || name.includes('session')) {
      console.log(`🔍 Gefundener Token in Cookie: ${name}`);
      return decodeURIComponent(value);
    }
  }
  
  console.warn('⚠️ Kein Token gefunden! Bitte manuell setzen: globalThis.authToken = "DEIN_TOKEN"');
  return null;
}

// Funktion zum Abrufen der API-Basis-URL
function getApiBaseUrl() {
  // Versuche die API-URL aus Network-Requests zu extrahieren
  const possibleUrls = [
    'https://api.gomining.com',
    'https://gomining.com/api',
    'https://app.gomining.com/api'
  ];
  
  // Prüfe welche URL bereits in der App verwendet wird
  // (kann aus window.__CONFIG__ oder ähnlichem kommen)
  if (window.__API_URL__) return window.__API_URL__;
  if (window.config?.apiUrl) return window.config.apiUrl;
  
  console.log('ℹ️ Verwende Standard API-URL. Bei Bedarf manuell setzen: globalThis.apiBaseUrl = "URL"');
  return possibleUrls[0];
}

// Hauptfunktion für API-Export
async function goMiningApiExport(startDate = null, endDate = null) {
  console.log('🚀 Starte API-basierten Export...');
  
  // Token holen
  let token = globalThis.authToken || getAuthToken();
  if (!token) {
    console.error('❌ Kein Token gefunden! Manuell setzen: globalThis.authToken = "DEIN_TOKEN"');
    console.log('💡 Tipp: Öffne die Browser DevTools → Network Tab → Suche nach API-Requests → Kopiere den Authorization Header');
    return;
  }
  
  // Token bereinigen (falls "Bearer " Prefix enthalten)
  token = token.replace('Bearer ', '').trim();
  
  const apiBaseUrl = 'https://api.gomining.com';
  console.log(`📡 API URL: ${apiBaseUrl}`);
  console.log(`🔑 Token: ${token.substring(0, 20)}...`);
  
  let allTransactions = [];
  let page = 0; // GoMining API startet bei 0!
  let hasMore = true;
  
  while (hasMore && !globalThis.cancelApiExport) {
    console.log(`📄 Lade Seite ${page + 1}...`);
    
    try {
      // ECHTE API-Struktur von GoMining
      const requestBody = {
        page: page,
        size: apiExportConfig.pageSize,
        cryptoCurrencyId: null,
        fiatCurrencyId: null,
        transactionType: null,
        startDate: startDate || null,
        endDate: endDate || null
      };
      
      const response = await fetch(`${apiBaseUrl}/api/wallet/transaction-history`, {
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
        console.error(`❌ API Error: ${response.status} ${response.statusText}`);
        
        if (response.status === 401) {
          console.error('🔒 Token ungültig oder abgelaufen!');
          break;
        }
        
        // Retry bei Server-Fehler
        if (response.status >= 500 && apiExportConfig.maxRetries > 0) {
          console.log(`🔄 Wiederhole in ${apiExportConfig.retryDelay}ms...`);
          await new Promise(r => setTimeout(r, apiExportConfig.retryDelay));
          continue;
        }
        
        break;
      }
      
      const data = await response.json();
      
      // GoMining API Struktur
      const transactions = data.content || [];
      const totalPages = data.totalPages || 0;
      const totalElements = data.totalElements || 0;
      
      if (!Array.isArray(transactions) || transactions.length === 0) {
        console.log('✅ Alle Daten geladen!');
        hasMore = false;
        break;
      }
      
      allTransactions.push(...transactions);
      console.log(`✓ ${transactions.length} Transaktionen geladen (Gesamt: ${allTransactions.length}/${totalElements})`);
      
      // Prüfe ob es weitere Seiten gibt
      hasMore = page + 1 < totalPages;
      
      page++;
      
      // Kurze Pause zwischen Requests
      if (hasMore) {
        await new Promise(r => setTimeout(r, apiExportConfig.delayBetweenRequests));
      }
      
    } catch (error) {
      console.error('❌ Fehler beim API-Aufruf:', error);
      break;
    }
  }
  
  if (globalThis.cancelApiExport) {
    console.log('🚫 Export abgebrochen!');
    return;
  }
  
  if (allTransactions.length === 0) {
    console.log('⚠️ Keine Transaktionen gefunden!');
    return;
  }
  
  console.log(`📊 ${allTransactions.length} Transaktionen werden exportiert...`);
  exportApiDataToCSV(allTransactions);
}

// CSV-Export für API-Daten
function exportApiDataToCSV(transactions) {
  let csv = "Date;Time;Type;Amount;Currency;Status;ID;Balance;Description\n";
  
  transactions.forEach(tx => {
    // GoMining Transaktionsstruktur
    // Datum und Zeit aus createdAt
    const dateObj = new Date(tx.createdAt || tx.date || tx.timestamp);
    const date = dateObj.toISOString().split('T')[0];
    const time = dateObj.toTimeString().split(' ')[0];
    
    const type = tx.type || tx.transactionType || '';
    let amount = tx.amount || tx.value || '0';
    const currencyCode = tx.currency?.code || tx.currencyCode || '';
    const status = tx.status || 'completed';
    const id = tx.id || '';
    const balance = tx.balanceAfter || tx.balance || '';
    const description = tx.description || tx.comment || '';
    
    // Wert formatieren (negative Werte, Komma als Dezimaltrennzeichen)
    if (typeof amount === 'number') {
      amount = amount.toString().replace('.', ',');
    } else if (typeof amount === 'string') {
      amount = amount.replace('.', ',');
    }
    
    csv += `"${date}";"${time}";"${type}";"${amount}";"${currencyCode}";"${status}";"${id}";"${balance}";"${description}"\n`;
  });
  
  const filename = `gomining_api_export_${new Date().toISOString().split('T')[0]}.csv`;
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  console.log(`✅ Export abgeschlossen: ${filename}`);
  console.log(`📊 ${transactions.length} Transaktionen exportiert`);
}

// Hilfsfunktion zum Abbrechen
window.cancelGoMiningApiExport = function() {
  globalThis.cancelApiExport = true;
  console.log('🚫 API-Export wird abgebrochen...');
};

// Alternative: Token aus Network-Request extrahieren
function extractTokenFromNetwork() {
  console.log('🔍 Bitte öffne die Browser DevTools → Network Tab');
  console.log('📝 Suche nach einem API-Request (z.B. "transactions", "user", etc.)');
  console.log('👉 Kopiere den "Authorization" Header und führe aus:');
  console.log('   globalThis.authToken = "Bearer TOKEN_HIER"');
  console.log('\nOder kopiere den kompletten fetch()-Aufruf aus "Copy as fetch" und schaue nach dem Authorization Header.');
}

// Zeige Hilfe an
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🚀 GoMining API-Export geladen!');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('\n📖 VERWENDUNG:\n');
console.log('1. Export starten:');
console.log('   goMiningApiExport()');
console.log('\n2. Mit Datumsfilter:');
console.log('   goMiningApiExport("2024-01-01", "2024-12-31")');
console.log('\n3. Token manuell setzen (falls nicht automatisch gefunden):');
console.log('   globalThis.authToken = "DEIN_TOKEN"');
console.log('   extractTokenFromNetwork()  // Zeigt Anleitung');
console.log('\n4. Export abbrechen:');
console.log('   cancelGoMiningApiExport()');
console.log('\n5. Config anpassen:');
console.log('   setApiExportConfig({ pageSize: 100, delayBetweenRequests: 200 })');
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Versuche Token automatisch zu finden
getAuthToken();

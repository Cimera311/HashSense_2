let btcPriceCache = {};
let gmtPriceCache = {};

async function loadPriceData() {
    try {
        console.log('📊 Loading price data...');

        // Nutze die eingebetteten Daten (aus price-data-btc.js und price-data-gmt.js)
        if (typeof btcPriceData !== 'undefined') {
            btcPriceCache = btcPriceData;
            console.log('✅ BTC price data loaded:', Object.keys(btcPriceCache).length, 'days');
        } else {
            console.warn('⚠️ btcPriceData not found');
        }
        
        if (typeof gmtPriceData !== 'undefined') {
            gmtPriceCache = gmtPriceData;
            console.log('✅ GMT price data loaded:', Object.keys(gmtPriceCache).length, 'days');
        } else {
            console.warn('⚠️ gmtPriceData not found');
        }

    } catch (error) {
        console.error('❌ Error loading price data:', error);
    }
}

/**
 * Get price for a specific date, symbol, and fiat currency
 * @param {string} date - Date in MM/DD/YYYY or DD.MM.YYYY format
 * @param {string} symbol - 'BTC' or 'GMT'
 * @param {string} fiat - 'EUR' or 'USD'
 * @returns {number|null} Price or null if not found
 */
function getPriceForDate(date, symbol = 'GMT', fiat = 'EUR') {
    // Konvertiere MM/DD/YYYY oder DD.MM.YYYY zu YYYY-MM-DD
    const isoDate = convertToISO(date);
    if (!isoDate) return null;
    
    const cache = symbol.toUpperCase() === 'BTC' ? btcPriceCache : gmtPriceCache;
    const fiatKey = fiat.toLowerCase();
    const priceKey = `price_${fiatKey}`; // "price_usd" oder "price_eur"

    if (cache[isoDate] && cache[isoDate][priceKey]) {
        let rawPrice = cache[isoDate][priceKey];
        
    // ✅ Entferne \r und konvertiere zu Number
    if (typeof rawPrice === 'string') {
            rawPrice = rawPrice
                .replace(/\r/g, '')
                .replace(/,/g, '.') // ← KOMMA durch PUNKT ersetzen!
                .trim();
            
            rawPrice = parseFloat(rawPrice);
    }
        
        return rawPrice
    }
    let test_ergebnis = findNearestPrice(isoDate, cache, priceKey);
    // Fallback: Nächster verfügbarer Tag (falls Wochenende/Feiertag)
    let nearestPrice = findNearestPrice(isoDate, cache, priceKey);
    
    // ✅ Prüfe findNearestPrice Ergebnis auf \r und bereinige
    if (nearestPrice !== null && typeof nearestPrice === 'string') {
        nearestPrice = nearestPrice.replace(/\r/g, '').trim();
        return parseFloat(nearestPrice);
    }
    
    return nearestPrice;
}

function convertToISO(dateStr) {
    if (!dateStr || dateStr === 'Unknown') return null;
    
    // MM/DD/YYYY oder DD.MM.YYYY
    const parts = dateStr.split(/[\/\.]/);
    if (parts.length !== 3) return null;
    
    // Annahme: MM/DD/YYYY (US-Format von GoMining)
    const month = parts[0].padStart(2, '0');
    const day = parts[1].padStart(2, '0');
    const year = parts[2];
    
    return `${year}-${month}-${day}`;
}

function findNearestPrice(isoDate, cache, fiatKey) {
    const dates = Object.keys(cache).sort();
    const targetDate = new Date(isoDate);
        
    const priceKey = `price_${fiatKey}`; // "price_usd" oder "price_eur"
    // Finde nächstes Datum
    for (let i = 0; i < dates.length; i++) {
        const cacheDate = new Date(dates[i]);
        if (cacheDate >= targetDate) {
            let test_ergebnis = cache[dates[i]][priceKey];
            return cache[dates[i]][priceKey];
        }
    }
    
    // Fallback: Letzter verfügbarer Preis
    const lastDate = dates[dates.length - 1];
    return cache[lastDate] ? cache[lastDate][priceKey] : null;
}

function getTodayISO() {
    const now = new Date();
    return now.toISOString().split('T')[0];
}


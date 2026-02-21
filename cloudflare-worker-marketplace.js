/**
 * Cloudflare Worker für GoMining Marketplace API
 * 
 * Dieser Worker:
 * - Ruft regelmäßig die GoMining Marketplace API ab
 * - Cached die Daten (reduziert Requests)
 * - Trackt Änderungen und neue Transaktionen
 * - Stellt die Daten mit CORS-Headers für deine GitHub Pages bereit
 * 
 * Deployment:
 * 1. Gehe zu https://workers.cloudflare.com/
 * 2. Erstelle einen neuen Worker
 * 3. Kopiere diesen Code
 * 4. Deploye den Worker
 * 5. Kopiere die Worker-URL und trage sie in marketplace.html ein (CONFIG.WORKER_URL)
 */

// Configuration
const CONFIG = {
  GOMINING_API: 'https://gomining.com/api/payment-marketplace-statistics',
  CACHE_TTL: 30, // Cache-Dauer in Sekunden
  MAX_TRANSACTIONS: 200, // Maximale Anzahl zu speichernder Transaktionen
};

// KV Namespace für persistenten Storage (optional, aber empfohlen)
// Wenn du KV verwendest, musst du in der Cloudflare-Oberfläche ein KV Namespace erstellen
// und es mit dem Namen 'MARKETPLACE_STORAGE' binden

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  // CORS Pre-flight handling
  if (request.method === 'OPTIONS') {
    return handleCORS();
  }

  const url = new URL(request.url);
  
  // Route handling
  switch (url.pathname) {
    case '/marketplace':
    case '/':
      return await getMarketplaceData(request);
    
    case '/stats':
      return await getStats(request);
    
    case '/health':
      return new Response(JSON.stringify({ status: 'ok', timestamp: Date.now() }), {
        headers: corsHeaders('application/json')
      });
    
    default:
      return new Response('Not Found', { status: 404 });
  }
}

async function getMarketplaceData(request) {
  try {
    // Try Cache API first
    const cache = caches.default;
    const cacheKey = new Request(CONFIG.GOMINING_API, request);
    
    let response = await cache.match(cacheKey);
    
    if (!response) {
      console.log('Cache miss - fetching from GoMining API');
      
      // Fetch from GoMining API
      response = await fetch(CONFIG.GOMINING_API, {
        headers: {
          'User-Agent': 'HashFarm-Marketplace-Monitor/1.0',
          'Accept': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`GoMining API returned ${response.status}`);
      }
      
      // Clone response for caching
      const responseToCache = response.clone();
      
      // Process and enhance the data
      const data = await response.json();
      const enhancedData = await enhanceMarketplaceData(data);
      
      // Store in cache with TTL (asynchronously)
      const cacheResponse = new Response(JSON.stringify(enhancedData), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `max-age=${CONFIG.CACHE_TTL}`
        }
      });
      
      // Cache the enhanced data
      cache.put(cacheKey, cacheResponse).catch(err => console.error('Cache error:', err));
      
      return new Response(JSON.stringify(enhancedData), {
        headers: corsHeaders('application/json')
      });
    }
    
    console.log('Cache hit');
    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      headers: corsHeaders('application/json')
    });
    
  } catch (error) {
    console.error('Error fetching marketplace data:', error);
    
    return new Response(JSON.stringify({
      error: 'Failed to fetch marketplace data',
      message: error.message,
      timestamp: Date.now()
    }), {
      status: 500,
      headers: corsHeaders('application/json')
    });
  }
}

async function enhanceMarketplaceData(data) {
  // Enhance the data with additional processing
  const enhanced = {
    ...data,
    processed_at: new Date().toISOString(),
    cache_ttl: CONFIG.CACHE_TTL,
  };
  
  // Calculate statistics wenn transactions vorhanden
  if (data.transactions && Array.isArray(data.transactions)) {
    const txs = data.transactions;
    
    enhanced.stats = {
      total_count: txs.length,
      total_volume: txs.reduce((sum, tx) => sum + (tx.amount || 0), 0),
      total_ths: txs.reduce((sum, tx) => sum + (tx.ths || tx.hashrate || 0), 0),
      avg_ths: txs.length > 0 
        ? txs.reduce((sum, tx) => sum + (tx.ths || tx.hashrate || 0), 0) / txs.length 
        : 0,
      avg_amount: txs.length > 0
        ? txs.reduce((sum, tx) => sum + (tx.amount || 0), 0) / txs.length
        : 0,
    };
    
    // Group by type
    enhanced.by_type = {
      purchases: txs.filter(tx => tx.type === 'purchase' || tx.type === 'buy').length,
      upgrades: txs.filter(tx => tx.type === 'upgrade').length,
      other: txs.filter(tx => tx.type !== 'purchase' && tx.type !== 'buy' && tx.type !== 'upgrade').length,
    };
  }
  
  // Optional: Store in KV for historical tracking
  if (typeof MARKETPLACE_STORAGE !== 'undefined') {
    try {
      const timestamp = Date.now();
      await MARKETPLACE_STORAGE.put(`snapshot_${timestamp}`, JSON.stringify(enhanced), {
        expirationTtl: 86400 // 24 Stunden
      });
      
      // Keep only last 100 snapshots
      const keys = await MARKETPLACE_STORAGE.list({ prefix: 'snapshot_' });
      if (keys.keys.length > 100) {
        const oldKeys = keys.keys
          .sort((a, b) => a.name.localeCompare(b.name))
          .slice(0, keys.keys.length - 100);
        
        await Promise.all(oldKeys.map(key => MARKETPLACE_STORAGE.delete(key.name)));
      }
    } catch (error) {
      console.error('KV storage error:', error);
    }
  }
  
  return enhanced;
}

async function getStats(request) {
  // Return statistics from KV if available
  if (typeof MARKETPLACE_STORAGE === 'undefined') {
    return new Response(JSON.stringify({
      error: 'KV storage not configured'
    }), {
      status: 503,
      headers: corsHeaders('application/json')
    });
  }
  
  try {
    const keys = await MARKETPLACE_STORAGE.list({ prefix: 'snapshot_' });
    const latestKey = keys.keys.sort((a, b) => b.name.localeCompare(a.name))[0];
    
    if (!latestKey) {
      return new Response(JSON.stringify({
        error: 'No data available'
      }), {
        status: 404,
        headers: corsHeaders('application/json')
      });
    }
    
    const data = await MARKETPLACE_STORAGE.get(latestKey.name, 'json');
    
    return new Response(JSON.stringify({
      stats: data.stats || {},
      by_type: data.by_type || {},
      total_snapshots: keys.keys.length,
      latest_snapshot: latestKey.name,
      processed_at: data.processed_at
    }), {
      headers: corsHeaders('application/json')
    });
    
  } catch (error) {
    console.error('Error fetching stats:', error);
    
    return new Response(JSON.stringify({
      error: 'Failed to fetch stats',
      message: error.message
    }), {
      status: 500,
      headers: corsHeaders('application/json')
    });
  }
}

function handleCORS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    }
  });
}

function corsHeaders(contentType = 'application/json') {
  return {
    'Content-Type': contentType,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': `public, max-age=${CONFIG.CACHE_TTL}`,
  };
}

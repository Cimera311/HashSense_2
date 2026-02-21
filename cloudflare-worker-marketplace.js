/**
 * Cloudflare Worker for GoMining Marketplace API
 * 
 * This worker:
 * - Fetches GoMining Marketplace API regularly
 * - Caches data (reduces requests)
 * - Stores transactions in KV with DEDUPLICATION (no duplicates!)
 * - PERMANENT STORAGE: Each unique transaction is stored FOREVER
 * - Provides historical marketplace data for analytics
 * - Provides data with CORS headers for your GitHub Pages
 * 
 * KV Storage Strategy:
 * - GoMining API returns last ~5 transactions per call (often the same ones repeatedly)
 * - We store ONLY new unique transactions (by ID)
 * - NO expiration = permanent historical archive
 * - NO ID limit = track ALL transactions forever
 * - Other websites can access /history for complete marketplace history
 * 
 * KV Storage Structure:
 * - known_transaction_ids: Set of all known transaction IDs (PERMANENT, no limit)
 * - tx_{id}: Individual transaction data (PERMANENT storage)
 * - latest_snapshot_meta: Metadata about last update (24h retention)
 * 
 * Endpoints:
 * - / or /marketplace: Current marketplace data (cached 30s)
 * - /stats: Statistics about stored transactions
 * - /history?limit=100: All stored transactions (deduplicated, permanent)
 * - /health: Health check
 * 
 * Deployment:
 * 1. Go to https://workers.cloudflare.com/
 * 2. Create a new Worker
 * 3. Copy this code
 * 4. Create KV Namespace "MARKETPLACE_STORAGE" and bind it
 * 5. Deploy the Worker
 * 6. Copy Worker URL and enter it in marketplace.html (CONFIG.WORKER_URL)
 */

// Configuration
const CONFIG = {
  GOMINING_API: 'https://gomining.com/api/payment-marketplace-statistics',
  CACHE_TTL: 30, // Cache TTL in seconds for API responses
  // NO MAX_TRANSACTIONS - we store ALL unique transactions permanently!
};

// KV Namespace for permanent storage
// You need to create a KV Namespace in Cloudflare dashboard
// and bind it with the name 'MARKETPLACE_STORAGE'
// All unique transactions are stored PERMANENTLY (no expiration)

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
    
    case '/history':
      return await getTransactionHistory(request);
    
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
  
  // Calculate statistics from actual API data
  const transactions = data?.data?.array || [];
  
  if (transactions.length > 0) {
    enhanced.stats = {
      total_count: transactions.length,
      total_volume: transactions.reduce((sum, tx) => sum + (tx.value || 0), 0),
      total_volume_usd: transactions.reduce((sum, tx) => sum + (tx.usdValue || 0), 0),
    };
    
    // Group by type
    enhanced.by_type = {
      purchases: transactions.filter(tx => tx.type === 'nft-payment').length,
      upgrades: transactions.filter(tx => tx.type === 'internal-payment').length,
      marketplace: transactions.filter(tx => tx.type === 'nft-marketplace-payment').length,
    };
  }
  
  // Optional: Store in KV with deduplication
  if (typeof MARKETPLACE_STORAGE !== 'undefined') {
    try {
      console.log('📦 KV Storage available - attempting deduplication');
      await storeTransactionsWithDeduplication(data);
    } catch (error) {
      console.error('❌ KV storage error:', error);
    }
  } else {
    console.log('⚠️ KV Storage not bound - skipping transaction storage');
  }
  
  return enhanced;
}

/**
 * Store transactions in KV with deduplication
 * Only new transactions (by ID) are stored
 */
async function storeTransactionsWithDeduplication(data) {
  // Extract transactions from API response
  const transactions = data?.data?.array || [];
  
  console.log(`storeTransactionsWithDeduplication called with ${transactions.length} transactions`);
  
  if (transactions.length === 0) {
    console.log('⚠️ No transactions to store - API response might be empty');
    return;
  }
  
  // Load existing transaction IDs from KV
  let knownIds = new Set();
  try {
    const storedIds = await MARKETPLACE_STORAGE.get('known_transaction_ids', 'json');
    if (storedIds && Array.isArray(storedIds)) {
      knownIds = new Set(storedIds);
    }
  } catch (error) {
    console.log('No existing IDs found, starting fresh');
  }
  
  const initialCount = knownIds.size;
  const newTransactions = [];
  
  // Filter for new transactions only
  for (const tx of transactions) {
    if (!tx.id) continue;
    
    if (!knownIds.has(tx.id)) {
      newTransactions.push(tx);
      knownIds.add(tx.id);
    }
  }
  
  console.log(`Found ${newTransactions.length} new transactions (${initialCount} known)`);
  
  // Store new transactions individually (PERMANENT - no expiration!)
  if (newTransactions.length > 0) {
    const storePromises = newTransactions.map(tx => 
      MARKETPLACE_STORAGE.put(
        `tx_${tx.id}`,
        JSON.stringify({
          ...tx,
          stored_at: new Date().toISOString()
        })
        // NO expirationTtl = PERMANENT storage!
      )
    );
    
    await Promise.all(storePromises);
    
    // Update the known IDs list (PERMANENT - track ALL IDs forever)
    const idsArray = Array.from(knownIds);
    
    await MARKETPLACE_STORAGE.put(
      'known_transaction_ids',
      JSON.stringify(idsArray)
      // NO expirationTtl = PERMANENT tracking of all IDs
    );
    
    console.log(`✅ Stored ${newTransactions.length} new transactions PERMANENTLY, total tracked: ${idsArray.length}`);
  } else {
    console.log(`ℹ️ No new transactions - all ${transactions.length} are already stored (duplicates skipped)`);
  }
  
  // Store latest snapshot metadata
  await MARKETPLACE_STORAGE.put(
    'latest_snapshot_meta',
    JSON.stringify({
      timestamp: Date.now(),
      iso_timestamp: new Date().toISOString(),
      total_transactions: transactions.length,
      new_transactions: newTransactions.length,
      duplicates_skipped: transactions.length - newTransactions.length,
      known_ids_count: knownIds.size
    }),
    {
      expirationTtl: 86400 // 24 hours
    }
  );
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
    // Get latest snapshot metadata
    const meta = await MARKETPLACE_STORAGE.get('latest_snapshot_meta', 'json');
    
    // Get known transaction count
    const knownIds = await MARKETPLACE_STORAGE.get('known_transaction_ids', 'json');
    const totalKnown = knownIds ? knownIds.length : 0;
    
    // Get all transaction keys for additional stats
    const txKeys = await MARKETPLACE_STORAGE.list({ prefix: 'tx_' });
    
    return new Response(JSON.stringify({
      latest_snapshot: meta || {},
      total_stored_transactions: txKeys.keys.length,
      total_tracked_ids: totalKnown,
      oldest_transaction_key: txKeys.keys[0]?.name || null,
      newest_transaction_key: txKeys.keys[txKeys.keys.length - 1]?.name || null,
      storage_info: {
        message: 'Deduplication active - only unique transactions stored',
        retention: 'PERMANENT - all unique transactions stored forever',
        note: 'GoMining API repeats last ~5 transactions, we store each only once'
      }
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

/**
 * Get transaction history from KV storage
 * Returns all stored transactions (deduplicated)
 */
async function getTransactionHistory(request) {
  if (typeof MARKETPLACE_STORAGE === 'undefined') {
    return new Response(JSON.stringify({
      error: 'KV storage not configured'
    }), {
      status: 503,
      headers: corsHeaders('application/json')
    });
  }
  
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit')) || 100;
    
    // Get all transaction keys
    const txKeys = await MARKETPLACE_STORAGE.list({ 
      prefix: 'tx_',
      limit: Math.min(limit, 1000) // Max 1000 to prevent overload
    });
    
    if (txKeys.keys.length === 0) {
      return new Response(JSON.stringify({
        transactions: [],
        count: 0,
        message: 'No transactions stored yet'
      }), {
        headers: corsHeaders('application/json')
      });
    }
    
    // Fetch all transactions
    const txPromises = txKeys.keys.map(key => 
      MARKETPLACE_STORAGE.get(key.name, 'json')
    );
    
    const transactions = await Promise.all(txPromises);
    
    // Sort by stored_at timestamp (newest first)
    const sorted = transactions
      .filter(tx => tx !== null)
      .sort((a, b) => new Date(b.stored_at) - new Date(a.stored_at));
    
    return new Response(JSON.stringify({
      transactions: sorted,
      count: sorted.length,
      limit: limit,
      has_more: txKeys.list_complete === false
    }), {
      headers: corsHeaders('application/json')
    });
    
  } catch (error) {
    console.error('Error fetching history:', error);
    
    return new Response(JSON.stringify({
      error: 'Failed to fetch transaction history',
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

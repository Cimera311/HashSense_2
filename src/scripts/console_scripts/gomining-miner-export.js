/**
 * GoMining Miner History Export Script
 * =====================================
 * Exports purchase, upgrade, and sell history for miners directly via API
 * 
 * Usage in Browser Console:
 * 1. Go to app.gomining.com and login
 * 2. Open DevTools Console (F12)
 * 3. Paste this entire script
 * 4. Run: exportMinerHistory()
 * 
 * Available Functions:
 * - exportMinerHistory()           // Export all miner history
 * - exportPurchases()              // Only purchase history
 * - exportUpgrades()               // Only upgrade history
 * - exportSales()                  // Only sales history
 * - testMinerExport()              // Test mode (10 items each)
 */

// Configuration (verified via API sniffer)
globalThis.minerExportConfig = {
    // API endpoints (actual endpoints from GoMining)
    endpoints: {
        purchases: 'https://api.gomining.com/api/user-payments-history/index',
        upgrades: 'https://api.gomining.com/api/internal-payment/get-my',
        sales: 'https://api.gomining.com/api/nft-marketplace-order/find-by-user',
        miners: 'https://api.gomining.com/api/nft/my-miners' // Might be needed
    },
    
    // Request settings
    batchSize: 20, // Match API's default limit
    delayMs: 100,
    testMode: false,
    
    // Date range (optional)
    fromDate: null, // "2024-01-01T00:00:00Z"
    toDate: null,   // "2026-12-31T23:59:59Z"
};

// Token detection (improved with fresh token lookup)
function findMinerToken(forceFresh = false) {
    // Force fresh lookup ignores cached token
    if (!forceFresh && globalThis.goMiningToken) {
        console.log('✅ Using cached token');
        return globalThis.goMiningToken;
    }
    
    console.log('🔍 Searching for authentication token...');
    
    // Try localStorage (most common for GoMining)
    const localKeys = ['access_token', 'token', 'auth_token', 'jwt', 'authToken', 'accessToken'];
    for (const key of localKeys) {
        const value = localStorage.getItem(key);
        if (value && value.length > 20) {
            console.log(`✅ Token found in localStorage.${key}`);
            globalThis.goMiningToken = value;
            return value;
        }
    }
    
    // Try sessionStorage
    for (const key of localKeys) {
        const value = sessionStorage.getItem(key);
        if (value && value.length > 20) {
            console.log(`✅ Token found in sessionStorage.${key}`);
            globalThis.goMiningToken = value;
            return value;
        }
    }
    
    // Try cookies
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (localKeys.includes(name) && value && value.length > 20) {
            console.log(`✅ Token found in cookie ${name}`);
            globalThis.goMiningToken = value;
            return value;
        }
    }
    
    // Try to extract from fetch requests (look for Authorization header in network)
    console.error('❌ Token not found!');
    console.error('💡 Solutions:');
    console.error('   1. Reload the page and try again');
    console.error('   2. Set manually: setToken("YOUR_TOKEN_HERE")');
    console.error('   3. Check Network tab for Authorization header');
    return null;
}

// Helper: Manually set token
function setToken(token) {
    if (!token || token.length < 20) {
        console.error('❌ Invalid token (too short)');
        return false;
    }
    globalThis.goMiningToken = token;
    console.log('✅ Token set successfully!');
    console.log('💡 Now try: exportAll()');
    return true;
}

// Helper: Refresh token (force new lookup)
function refreshToken() {
    globalThis.goMiningToken = null;
    const token = findMinerToken(true);
    if (token) {
        console.log('✅ Token refreshed!');
        return true;
    }
    return false;
}

// Generic API fetch function with skip/limit pagination
async function fetchMinerData(endpoint, type = 'purchases', customFilters = {}) {
    const token = findMinerToken();
    if (!token) {
        throw new Error('Authentication token not found');
    }
    
    const config = globalThis.minerExportConfig;
    const allData = [];
    let skip = 0;
    let page = 1;
    
    console.log(`\n📥 Fetching ${type}...`);
    
    while (true) {
        const body = {
            ...customFilters,
            pagination: {
                skip: skip,
                limit: config.batchSize
            }
        };
        
        // Add date filter if configured
        if (config.fromDate || config.toDate) {
            if (!body.filters) body.filters = {};
            body.filters.dateRange = {};
            if (config.fromDate) body.filters.dateRange.from = config.fromDate;
            if (config.toDate) body.filters.dateRange.to = config.toDate;
        }
        
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body)
            });
            
            if (!response.ok) {
                // Special handling for 403 (token invalid/expired)
                if (response.status === 403) {
                    console.error(`❌ Authentication failed (403 Forbidden)`);
                    console.error('💡 Your token is invalid or expired. Try:');
                    console.error('   1. refreshToken()  - Get fresh token from storage');
                    console.error('   2. Reload the page and run the script again');
                    console.error('   3. Login again to GoMining');
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            // Handle different response structures
            let items = [];
            let totalCount = 0;
            
            if (result.data) {
                items = result.data.items || result.data.array || result.data.list || result.data || [];
                totalCount = result.data.total || result.data.count || result.total || result.count || items.length;
            } else if (Array.isArray(result)) {
                items = result;
                totalCount = items.length;
            }
            
            if (items.length === 0) {
                console.log(`✅ ${type}: No more data (Page ${page})`);
                break;
            }
            
            allData.push(...items);
            console.log(`  Page ${page}: ${items.length} items (Total: ${allData.length}/${totalCount || '?'})`);
            
            // Check if we're done - if we got fewer items than requested, we're at the end
            if (items.length < config.batchSize) {
                console.log(`✅ ${type}: Reached end (got ${items.length} < ${config.batchSize})`);
                break;
            }
            
            // Test mode limit
            if (config.testMode && allData.length >= 10) {
                console.log('🧪 Test mode: Stopping at 10 items');
                break;
            }
            
            skip += items.length;
            page++;
            
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, config.delayMs));
            
        } catch (error) {
            console.error(`❌ Error fetching ${type}:`, error.message);
            throw error;
        }
    }
    
    console.log(`✅ ${type}: ${allData.length} total items fetched`);
    return allData;
}

// Parse purchase data (based on actual API structure)
function parsePurchaseData(purchases) {
    return purchases.map(p => {
        // Extract first NFT from nfts array
        const nft = p.nfts && p.nfts[0] ? p.nfts[0] : {};
        
        return {
            date: new Date(p.createdAt).toISOString().split('T')[0],
            time: new Date(p.createdAt).toISOString().split('T')[1].split('.')[0],
            minerId: nft.id || p.id,
            minerName: nft.name || `Miner #${nft.id}`,
            collection: getCollectionName(nft.nftCollectionId),
            hashrate: nft.power || 0,
            unit: 'TH',
            price: p.value || 0,
            currency: p.currency || 'GMT',
            status: p.status || 'unknown',
            transactionId: p.id,
        };
    });
}

// Helper: Convert collection ID to name
function getCollectionName(id) {
    const collections = {
        16: 'The Greedy Machines',
        264: 'MINEBOX S1',
        267: 'MINEBOX S2',
        268: 'MINEBOX S3',
    };
    return collections[id] || `Collection #${id}`;
}

// Parse upgrade data (based on actual API structure)
function parseUpgradeData(upgrades) {
    return upgrades.map(u => {
        const nft = u.nft || {};
        const upgradeTypeMap = {
            'nftPowerUpgrade': 'Power Upgrade',
            'nftEnergyEfficiencyUpgrade': 'Energy Efficiency Upgrade'
        };
        
        return {
            date: new Date(u.createdAt).toISOString().split('T')[0],
            time: new Date(u.createdAt).toISOString().split('T')[1].split('.')[0],
            minerId: nft.id || u.id,
            minerName: nft.name || `Miner #${nft.id}`,
            upgradeType: upgradeTypeMap[u.upgradeType] || u.upgradeType,
            fromValue: u.fromValue || 0,
            toValue: u.toValue || 0,
            unit: u.upgradeType === 'nftPowerUpgrade' ? 'TH' : 'J/TH',
            upgradeCost: u.gmtValue || 0,
            currency: 'GMT',
            usdtValue: u.usdtValue || 0,
            status: u.status || 'unknown',
            collection: getCollectionName(nft.nftCollectionId),
        };
    });
}

// Parse sales data (based on actual API structure)
function parseSalesData(sales) {
    return sales.map(s => {
        const nft = s.nft || {};
        const buyerPrice = s.price || 0;
        const feePercent = s.fee || 0.05; // Default 5%
        const sellerRevenue = buyerPrice * (1 - feePercent);
        const feeAmount = buyerPrice * feePercent;
        
        return {
            date: new Date(s.createdAt).toISOString().split('T')[0],
            time: new Date(s.createdAt).toISOString().split('T')[1].split('.')[0],
            minerId: nft.id || s.nftId,
            minerName: nft.name || `Miner #${nft.id}`,
            hashrate: nft.power || 0,
            energyEfficiency: nft.energyEfficiency || 0,
            unit: 'TH',
            priceForBuyer: buyerPrice,
            youGet: sellerRevenue,
            fee: feeAmount,
            feePercent: (feePercent * 100).toFixed(0) + '%',
            currency: s.currency || 'GMT',
            status: s.status || 'unknown',
            collection: getCollectionName(nft.nftCollectionId),
        };
    });
}

// Helper: Format number for German CSV (comma as decimal separator)
// Uses robust formatting from transaction export (handles thousands separators)
function formatNumber(value) {
    if (value === null || value === undefined || value === '') {
        return '0';
    }
    
    let valueText = value.toString();
    
    // Check if negative
    let isNegative = valueText.startsWith('-');
    
    // Replace first decimal point with placeholder, remove all other separators, then convert placeholder to comma
    valueText = valueText.replace('.', '#').replace(/[.,]/g, '').replace('#', ',');
    
    // Remove any +/- signs
    valueText = valueText.replace('+', '').replace('-', '');
    
    // Add negative sign back if needed
    if (isNegative) {
        valueText = '-' + valueText;
    }
    
    return valueText;
}

// Generate CSV for purchases
function generatePurchaseCSV(data) {
    const headers = ['Date', 'Time', 'Miner ID', 'Miner Name', 'Collection', 'Hashrate', 'Unit', 'Price', 'Currency', 'Status', 'Transaction ID'];
    const rows = data.map(d => [
        d.date,
        d.time,
        d.minerId,
        `"${d.minerName}"`,
        d.collection,
        formatNumber(d.hashrate),
        d.unit,
        formatNumber(d.price),
        d.currency,
        d.status,
        d.transactionId
    ]);
    
    return [headers, ...rows].map(row => row.join(';')).join('\n');
}

// Generate CSV for upgrades
function generateUpgradeCSV(data) {
    const headers = ['Date', 'Time', 'Miner ID', 'Miner Name', 'Collection', 'Upgrade Type', 'From Value', 'To Value', 'Unit', 'Cost (GMT)', 'Cost (USDT)', 'Status'];
    const rows = data.map(d => [
        d.date,
        d.time,
        d.minerId,
        `"${d.minerName}"`,
        d.collection,
        d.upgradeType,
        formatNumber(d.fromValue),
        formatNumber(d.toValue),
        d.unit,
        formatNumber(d.upgradeCost),
        formatNumber(d.usdtValue),
        d.status
    ]);
    
    return [headers, ...rows].map(row => row.join(';')).join('\n');
}

// Generate CSV for sales
function generateSalesCSV(data) {
    const headers = ['Date', 'Time', 'Miner ID', 'Miner Name', 'Collection', 'Hashrate', 'Energy Efficiency', 'Unit', 'Price For Buyer', 'You Get', 'Fee Amount', 'Fee %', 'Currency', 'Status'];
    const rows = data.map(d => [
        d.date,
        d.time,
        d.minerId,
        `"${d.minerName}"`,
        d.collection,
        formatNumber(d.hashrate),
        formatNumber(d.energyEfficiency),
        d.unit,
        formatNumber(d.priceForBuyer),
        formatNumber(d.youGet),
        formatNumber(d.fee),
        d.feePercent,
        d.currency,
        d.status
    ]);
    
    return [headers, ...rows].map(row => row.join(';')).join('\n');
}

// Download CSV
function downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Show available commands
function showCommands() {
    console.log('\n' + '='.repeat(50));
    console.log('📖 Available commands:');
    console.log('='.repeat(50));
    console.log('  exportAll()                    - Export all (purchases + upgrades + sales)');
    console.log('  testMinerExport()              - Test mode (10 items per category)');
    console.log('  exportMinerHistory()           - Export all history (same as exportAll)');
    console.log('  exportPurchases()              - Only purchases');
    console.log('  exportUpgrades()               - Only upgrades');
    console.log('  exportSales()                  - Only sales');
    console.log('  exportMinerYear(2026)          - Export full year');
    console.log('  exportMinerMonth(2026, 4)      - Export specific month');
    console.log('  setMinerDateRange(from, to)    - Set custom date range');
    console.log('');
    console.log('🔧 Token management:');
    console.log('  setToken("YOUR_TOKEN")         - Set authentication token manually');
    console.log('  refreshToken()                 - Refresh token from storage');
    console.log('='.repeat(50));
}

// Main export function
async function exportMinerHistory() {
    console.clear();
    console.log('🚀 GoMining Miner History Export');
    console.log('=' .repeat(50));
    
    const config = globalThis.minerExportConfig;
    const timestamp = new Date().toISOString().split('T')[0];
    
    try {
        // Fetch all data
        console.log('\n📊 Fetching all miner history data...\n');
        
        // Purchases with filters
        const purchases = await fetchMinerData(
            config.endpoints.purchases, 
            'Purchases',
            { filters: { withCanceled: false } }
        );
        
        // Upgrades with filters
        const upgrades = await fetchMinerData(
            config.endpoints.upgrades, 
            'Upgrades',
            {
                filters: {
                    dataType: { in: ["nftEnergyEfficiencyUpgrade", "nftPowerUpgrade"] },
                    status: { in: ["pending", "success", "error", "waitingForProviderConfirmation", 
                                   "approvedByProvider", "waitingForConfirmation", "waiting-for-user-approve"] }
                },
                sort: { createdAt: "DESC" }
            }
        );
        
        // Sales with filters
        const sales = await fetchMinerData(
            config.endpoints.sales, 
            'Sales',
            { filters: {} }
        );
        
        // Parse data
        console.log('\n🔄 Parsing data...');
        const parsedPurchases = parsePurchaseData(purchases);
        const parsedUpgrades = parseUpgradeData(upgrades);
        const parsedSales = parseSalesData(sales);
        
        // Generate CSVs
        console.log('📝 Generating CSV files...');
        const purchaseCSV = generatePurchaseCSV(parsedPurchases);
        const upgradeCSV = generateUpgradeCSV(parsedUpgrades);
        const salesCSV = generateSalesCSV(parsedSales);
        
        // Download files
        console.log('💾 Downloading files...\n');
        downloadCSV(purchaseCSV, `gomining-purchases-${timestamp}.csv`);
        await new Promise(resolve => setTimeout(resolve, 500));
        downloadCSV(upgradeCSV, `gomining-upgrades-${timestamp}.csv`);
        await new Promise(resolve => setTimeout(resolve, 500));
        downloadCSV(salesCSV, `gomining-sales-${timestamp}.csv`);
        
        // Summary
        console.log('\n✅ Export Complete!');
        console.log('=' .repeat(50));
        console.log(`📦 Purchases: ${parsedPurchases.length} items`);
        console.log(`⬆️  Upgrades:  ${parsedUpgrades.length} items`);
        console.log(`💰 Sales:     ${parsedSales.length} items`);
        console.log(`📁 Total:     ${parsedPurchases.length + parsedUpgrades.length + parsedSales.length} items`);
        console.log('\n📥 3 CSV files downloaded!');
        
        // Show available commands
        showCommands();
        
    } catch (error) {
        console.error('\n❌ Export failed:', error.message);
        console.error('Stack:', error.stack);
        showCommands();
    }
}

// Export all (alias for exportMinerHistory)
async function exportAll() {
    return exportMinerHistory();
}

// Individual export functions
async function exportPurchases() {
    console.clear();
    console.log('🛒 Exporting Purchase History...\n');
    
    try {
        // Filter structure from API sniffer
        const filters = {
            filters: {
                withCanceled: false
            }
        };
        
        const purchases = await fetchMinerData(
            globalThis.minerExportConfig.endpoints.purchases, 
            'Purchases',
            filters
        );
        const parsed = parsePurchaseData(purchases);
        const csv = generatePurchaseCSV(parsed);
        const timestamp = new Date().toISOString().split('T')[0];
        
        downloadCSV(csv, `gomining-purchases-${timestamp}.csv`);
        console.log(`\n✅ ${parsed.length} purchases exported!`);
        showCommands();
    } catch (error) {
        console.error('❌ Export failed:', error.message);
        showCommands();
    }
}

async function exportUpgrades() {
    console.clear();
    console.log('⬆️ Exporting Upgrade History...\n');
    
    try {
        // Filter structure from API sniffer
        const filters = {
            filters: {
                dataType: {
                    in: ["nftEnergyEfficiencyUpgrade", "nftPowerUpgrade"]
                },
                status: {
                    in: ["pending", "success", "error", "waitingForProviderConfirmation", 
                         "approvedByProvider", "waitingForConfirmation", "waiting-for-user-approve"]
                }
            },
            sort: {
                createdAt: "DESC"
            }
        };
        
        const upgrades = await fetchMinerData(
            globalThis.minerExportConfig.endpoints.upgrades, 
            'Upgrades',
            filters
        );
        const parsed = parseUpgradeData(upgrades);
        const csv = generateUpgradeCSV(parsed);
        const timestamp = new Date().toISOString().split('T')[0];
        
        downloadCSV(csv, `gomining-upgrades-${timestamp}.csv`);
        console.log(`\n✅ ${parsed.length} upgrades exported!`);
        showCommands();
    } catch (error) {
        console.error('❌ Export failed:', error.message);
        showCommands();
    }
}

async function exportSales() {
    console.clear();
    console.log('💰 Exporting Sales History...\n');
    
    try {
        // Filter structure for sales
        const filters = {
            filters: {}
        };
        
        const sales = await fetchMinerData(
            globalThis.minerExportConfig.endpoints.sales, 
            'Sales',
            filters
        );
        const parsed = parseSalesData(sales);
        const csv = generateSalesCSV(parsed);
        const timestamp = new Date().toISOString().split('T')[0];
        
        downloadCSV(csv, `gomining-sales-${timestamp}.csv`);
        console.log(`\n✅ ${parsed.length} sales exported!`);
        showCommands();
    } catch (error) {
        console.error('❌ Export failed:', error.message);
        showCommands();
    }
}

// Test mode
async function testMinerExport() {
    console.log('🧪 TEST MODE ENABLED - Limited to 10 items per type\n');
    globalThis.minerExportConfig.testMode = true;
    await exportMinerHistory();
    globalThis.minerExportConfig.testMode = false;
}

// Helper: Set date range
function setMinerDateRange(from, to) {
    if (from) {
        globalThis.minerExportConfig.fromDate = from.includes('T') ? from : `${from}T00:00:00Z`;
    }
    if (to) {
        globalThis.minerExportConfig.toDate = to.includes('T') ? to : `${to}T23:59:59Z`;
    }
    console.log('✅ Date range set:', globalThis.minerExportConfig.fromDate, 'to', globalThis.minerExportConfig.toDate);
}

// Export year
function exportMinerYear(year) {
    setMinerDateRange(`${year}-01-01`, `${year}-12-31`);
    return exportMinerHistory();
}

// Export month
function exportMinerMonth(year, month) {
    const lastDay = new Date(year, month, 0).getDate();
    const monthStr = month.toString().padStart(2, '0');
    setMinerDateRange(`${year}-${monthStr}-01`, `${year}-${monthStr}-${lastDay}`);
    return exportMinerHistory();
}

console.log('✅ GoMining Miner History Export Script loaded!');
showCommands();
console.log('\n💡 Tip: Start with testMinerExport() or exportAll()!\n');

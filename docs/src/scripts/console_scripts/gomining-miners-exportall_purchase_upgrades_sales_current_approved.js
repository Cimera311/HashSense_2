/**
 * GoMining Complete Miners Export Script
 * =======================================
 * Combines current miner inventory + purchase/upgrade/sales history
 * 
 * Usage in Browser Console:
 * 1. Go to app.gomining.com and login
 * 2. Open DevTools Console (F12)
 * 3. Paste this entire script
 * 4. Run: exportAllMiners()
 * 
 * Available Functions:
 * - exportAllMiners()              // Export EVERYTHING (4 CSV files)
 * - exportCurrentMiners()          // Only current miner inventory
 * - exportMinerHistory()           // Only history (purchases + upgrades + sales)
 * - exportPurchases()              // Only purchase history
 * - exportUpgrades()               // Only upgrade history
 * - exportSales()                  // Only sales history
 * - testAllExports()               // Test mode (10 items each)
 */

// Global Configuration
globalThis.minersExportConfig = {
    // API endpoints
    endpoints: {
        currentMiners: 'https://api.gomining.com/api/nft/get-my',
        purchases: 'https://api.gomining.com/api/user-payments-history/index',
        upgrades: 'https://api.gomining.com/api/internal-payment/get-my',
        sales: 'https://api.gomining.com/api/nft-marketplace-order/find-by-user'
    },
    
    // Request settings
    batchSize: 20,
    delayMs: 100,
    testMode: false,
    
    // Date range (optional)
    fromDate: null,
    toDate: null
};

// ============================================================
// TOKEN MANAGEMENT
// ============================================================

function findToken(forceFresh = false) {
    if (!forceFresh && globalThis.goMiningToken) {
        console.log('✅ Using cached token');
        return globalThis.goMiningToken;
    }
    
    console.log('🔍 Searching for authentication token...');
    
    const storageKeys = ['access_token', 'token', 'auth_token', 'jwt', 'authToken', 'accessToken'];
    
    // Try localStorage
    for (const key of storageKeys) {
        const value = localStorage.getItem(key);
        if (value && value.length > 20) {
            console.log(`✅ Token found in localStorage.${key}`);
            globalThis.goMiningToken = value;
            return value;
        }
    }
    
    // Try sessionStorage
    for (const key of storageKeys) {
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
        if (storageKeys.includes(name) && value && value.length > 20) {
            console.log(`✅ Token found in cookie ${name}`);
            globalThis.goMiningToken = value;
            return value;
        }
    }
    
    console.error('❌ Token not found!');
    console.error('💡 Solutions:');
    console.error('   1. Reload the page and try again');
    console.error('   2. Set manually: setToken("YOUR_TOKEN_HERE")');
    console.error('   3. Check Network tab for Authorization header');
    return null;
}

function setToken(token) {
    if (!token || token.length < 20) {
        console.error('❌ Invalid token (too short)');
        return false;
    }
    globalThis.goMiningToken = token;
    console.log('✅ Token set successfully!');
    console.log('💡 Now try: exportAllMiners()');
    return true;
}

function refreshToken() {
    globalThis.goMiningToken = null;
    const token = findToken(true);
    if (token) {
        console.log('✅ Token refreshed!');
        return true;
    }
    return false;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getCollectionName(id) {
    const collections = {
        16: 'The Greedy Machines',
        264: 'MINEBOX S1',
        267: 'MINEBOX S2',
        268: 'MINEBOX S3',
        401: 'MINEBOX S4'
    };
    return collections[id] || `Collection #${id}`;
}

function formatNumber(value) {
    if (value === null || value === undefined || value === '') {
        return '0';
    }
    
    let valueText = value.toString();
    let isNegative = valueText.startsWith('-');
    
    // Replace first decimal point with placeholder, remove all other separators, then convert placeholder to comma
    valueText = valueText.replace('.', '#').replace(/[.,]/g, '').replace('#', ',');
    valueText = valueText.replace('+', '').replace('-', '');
    
    if (isNegative) {
        valueText = '-' + valueText;
    }
    
    return valueText;
}

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

// ============================================================
// CURRENT MINERS INVENTORY
// ============================================================

async function fetchCurrentMiners() {
    const token = findToken();
    if (!token) {
        throw new Error('Authentication token not found');
    }
    
    const config = globalThis.minersExportConfig;
    console.log('\n📥 Fetching current miners from farm...');
    
    try {
        const response = await fetch(config.endpoints.currentMiners, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({})
        });
        
        if (!response.ok) {
            if (response.status === 403) {
                console.error(`❌ Authentication failed (403 Forbidden)`);
                console.error('💡 Your token is invalid or expired. Try:');
                console.error('   1. refreshToken()  - Get fresh token');
                console.error('   2. Reload the page and run the script again');
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        // Handle response structure
        let miners = [];
        
        if (Array.isArray(result)) {
            miners = result;
        } else if (result.data && Array.isArray(result.data.array)) {
            miners = result.data.array;
        } else if (result.data && Array.isArray(result.data)) {
            miners = result.data;
        } else {
            console.warn('⚠️ Unexpected response format:', result);
            miners = [];
        }
        
        console.log(`✅ Found ${miners.length} miners in your farm`);
        
        // Test mode limit
        if (config.testMode && miners.length > 10) {
            console.log('🧪 Test mode: Limiting to 10 miners');
            miners = miners.slice(0, 10);
        }
        
        return miners;
        
    } catch (error) {
        console.error(`❌ Error fetching miners:`, error.message);
        throw error;
    }
}

function parseCurrentMiners(miners) {
    return miners.map(miner => {
        return {
            minerId: miner.id || '',
            minerName: miner.name || `Miner #${miner.id}`,
            collection: getCollectionName(miner.nftCollectionId),
            hashrate: miner.power || 0,
            energyEfficiency: miner.energyEfficiency || 0,
            level: miner.level || 0,
            unit: 'TH',
            status: miner.status || 'active',
            ownerSince: miner.createdAt ? new Date(miner.createdAt).toISOString().split('T')[0] : '',
            lastUpdate: miner.updatedAt ? new Date(miner.updatedAt).toISOString().split('T')[0] : '',
            nftCollectionId: miner.nftCollectionId || ''
        };
    });
}

function generateCurrentMinersCSV(data) {
    const headers = ['Miner ID', 'Miner Name', 'Collection', 'Hashrate', 'Energy Efficiency', 'Level', 'Unit', 'Status', 'Owner Since', 'Last Update', 'Collection ID'];
    const rows = data.map(d => [
        d.minerId,
        `"${d.minerName}"`,
        d.collection,
        formatNumber(d.hashrate),
        formatNumber(d.energyEfficiency),
        d.level,
        d.unit,
        d.status,
        d.ownerSince,
        d.lastUpdate,
        d.nftCollectionId
    ]);
    
    return [headers, ...rows].map(row => row.join(';')).join('\n');
}

// ============================================================
// MINER HISTORY (PURCHASES, UPGRADES, SALES)
// ============================================================

async function fetchHistoryData(endpoint, type = 'data', customFilters = {}) {
    const token = findToken();
    if (!token) {
        throw new Error('Authentication token not found');
    }
    
    const config = globalThis.minersExportConfig;
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
                if (response.status === 403) {
                    console.error(`❌ Authentication failed (403 Forbidden)`);
                    console.error('💡 Token expired. Try: refreshToken()');
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
            
            // Check if we're done
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

function parsePurchaseData(purchases) {
    return purchases.map(p => {
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

function parseSalesData(sales) {
    return sales.map(s => {
        const nft = s.nft || {};
        const buyerPrice = s.price || 0;
        const feePercent = s.fee || 0.05;
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

// ============================================================
// MAIN EXPORT FUNCTIONS
// ============================================================

async function exportCurrentMiners() {
    console.clear();
    console.log('🚀 GoMining Current Miners Export');
    console.log('=' .repeat(50));
    
    const timestamp = new Date().toISOString().split('T')[0];
    
    try {
        const miners = await fetchCurrentMiners();
        
        if (miners.length === 0) {
            console.log('\n⚠️ No miners found in your farm!');
            showCommands();
            return;
        }
        
        console.log('\n🔄 Parsing miner data...');
        const parsedMiners = parseCurrentMiners(miners);
        
        console.log('📝 Generating CSV file...');
        const csv = generateCurrentMinersCSV(parsedMiners);
        
        console.log('💾 Downloading file...\n');
        downloadCSV(csv, `gomining-current-miners-${timestamp}.csv`);
        
        console.log('\n✅ Export Complete!');
        console.log('=' .repeat(50));
        console.log(`🏭 Total Miners in Farm: ${parsedMiners.length}`);
        console.log(`⚡ Total Hashrate: ${parsedMiners.reduce((sum, m) => sum + m.hashrate, 0).toFixed(2)} TH`);
        console.log(`🔋 Average Efficiency: ${(parsedMiners.reduce((sum, m) => sum + m.energyEfficiency, 0) / parsedMiners.length).toFixed(2)} W/TH`);
        console.log('\n📥 CSV file downloaded!');
        
        // Group by collection
        const collections = {};
        parsedMiners.forEach(m => {
            if (!collections[m.collection]) {
                collections[m.collection] = 0;
            }
            collections[m.collection]++;
        });
        
        console.log('\n📊 Miners by Collection:');
        Object.entries(collections).forEach(([name, count]) => {
            console.log(`   ${name}: ${count} miner(s)`);
        });
        
        showCommands();
        
    } catch (error) {
        console.error('\n❌ Export failed:', error.message);
        showCommands();
    }
}

async function exportMinerHistory() {
    console.clear();
    console.log('🚀 GoMining Miner History Export');
    console.log('=' .repeat(50));
    
    const config = globalThis.minersExportConfig;
    const timestamp = new Date().toISOString().split('T')[0];
    
    try {
        console.log('\n📊 Fetching all miner history data...\n');
        
        // Fetch all history types
        const purchases = await fetchHistoryData(
            config.endpoints.purchases, 
            'Purchases',
            { filters: { withCanceled: false } }
        );
        
        const upgrades = await fetchHistoryData(
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
        
        const sales = await fetchHistoryData(
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
        
        showCommands();
        
    } catch (error) {
        console.error('\n❌ Export failed:', error.message);
        showCommands();
    }
}

async function exportAllMiners() {
    console.clear();
    console.log('🚀 GoMining COMPLETE Export (Current + History)');
    console.log('=' .repeat(60));
    
    const timestamp = new Date().toISOString().split('T')[0];
    const config = globalThis.minersExportConfig;
    
    try {
        // 1. Current Miners
        console.log('\n📊 STEP 1/4: Current Miners Inventory\n');
        const currentMiners = await fetchCurrentMiners();
        const parsedCurrentMiners = parseCurrentMiners(currentMiners);
        const currentMinersCSV = generateCurrentMinersCSV(parsedCurrentMiners);
        
        // 2. Purchases
        console.log('\n📊 STEP 2/4: Purchase History');
        const purchases = await fetchHistoryData(
            config.endpoints.purchases, 
            'Purchases',
            { filters: { withCanceled: false } }
        );
        const parsedPurchases = parsePurchaseData(purchases);
        const purchaseCSV = generatePurchaseCSV(parsedPurchases);
        
        // 3. Upgrades
        console.log('\n📊 STEP 3/4: Upgrade History');
        const upgrades = await fetchHistoryData(
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
        const parsedUpgrades = parseUpgradeData(upgrades);
        const upgradeCSV = generateUpgradeCSV(parsedUpgrades);
        
        // 4. Sales
        console.log('\n📊 STEP 4/4: Sales History');
        const sales = await fetchHistoryData(
            config.endpoints.sales, 
            'Sales',
            { filters: {} }
        );
        const parsedSales = parseSalesData(sales);
        const salesCSV = generateSalesCSV(parsedSales);
        
        // Download all files
        console.log('\n💾 Downloading 4 CSV files...\n');
        downloadCSV(currentMinersCSV, `gomining-current-miners-${timestamp}.csv`);
        await new Promise(resolve => setTimeout(resolve, 500));
        downloadCSV(purchaseCSV, `gomining-purchases-${timestamp}.csv`);
        await new Promise(resolve => setTimeout(resolve, 500));
        downloadCSV(upgradeCSV, `gomining-upgrades-${timestamp}.csv`);
        await new Promise(resolve => setTimeout(resolve, 500));
        downloadCSV(salesCSV, `gomining-sales-${timestamp}.csv`);
        
        // Complete Summary
        console.log('\n✅ COMPLETE EXPORT FINISHED!');
        console.log('=' .repeat(60));
        console.log('📊 Current Inventory:');
        console.log(`   🏭 Miners in Farm: ${parsedCurrentMiners.length}`);
        console.log(`   ⚡ Total Hashrate:  ${parsedCurrentMiners.reduce((sum, m) => sum + m.hashrate, 0).toFixed(2)} TH`);
        console.log(`   🔋 Avg Efficiency:  ${(parsedCurrentMiners.reduce((sum, m) => sum + m.energyEfficiency, 0) / parsedCurrentMiners.length).toFixed(2)} W/TH`);
        console.log('\n📊 History:');
        console.log(`   📦 Purchases: ${parsedPurchases.length} items`);
        console.log(`   ⬆️  Upgrades:  ${parsedUpgrades.length} items`);
        console.log(`   💰 Sales:     ${parsedSales.length} items`);
        console.log(`   📁 Total History: ${parsedPurchases.length + parsedUpgrades.length + parsedSales.length} items`);
        console.log('\n📥 4 CSV files downloaded successfully!');
        console.log('   ✅ gomining-current-miners-' + timestamp + '.csv');
        console.log('   ✅ gomining-purchases-' + timestamp + '.csv');
        console.log('   ✅ gomining-upgrades-' + timestamp + '.csv');
        console.log('   ✅ gomining-sales-' + timestamp + '.csv');
        
        showCommands();
        
    } catch (error) {
        console.error('\n❌ Export failed:', error.message);
        showCommands();
    }
}

// ============================================================
// INDIVIDUAL EXPORT FUNCTIONS
// ============================================================

async function exportPurchases() {
    console.clear();
    console.log('🚀 GoMining Purchases Export');
    console.log('=' .repeat(50));
    
    const timestamp = new Date().toISOString().split('T')[0];
    const config = globalThis.minersExportConfig;
    
    try {
        const purchases = await fetchHistoryData(
            config.endpoints.purchases, 
            'Purchases',
            { filters: { withCanceled: false } }
        );
        
        const parsedPurchases = parsePurchaseData(purchases);
        const csv = generatePurchaseCSV(parsedPurchases);
        
        downloadCSV(csv, `gomining-purchases-${timestamp}.csv`);
        
        console.log('\n✅ Export Complete!');
        console.log(`📦 Purchases: ${parsedPurchases.length} items`);
        console.log('📥 CSV file downloaded!');
        
        showCommands();
        
    } catch (error) {
        console.error('\n❌ Export failed:', error.message);
        showCommands();
    }
}

async function exportUpgrades() {
    console.clear();
    console.log('🚀 GoMining Upgrades Export');
    console.log('=' .repeat(50));
    
    const timestamp = new Date().toISOString().split('T')[0];
    const config = globalThis.minersExportConfig;
    
    try {
        const upgrades = await fetchHistoryData(
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
        
        const parsedUpgrades = parseUpgradeData(upgrades);
        const csv = generateUpgradeCSV(parsedUpgrades);
        
        downloadCSV(csv, `gomining-upgrades-${timestamp}.csv`);
        
        console.log('\n✅ Export Complete!');
        console.log(`⬆️ Upgrades: ${parsedUpgrades.length} items`);
        console.log('📥 CSV file downloaded!');
        
        showCommands();
        
    } catch (error) {
        console.error('\n❌ Export failed:', error.message);
        showCommands();
    }
}

async function exportSales() {
    console.clear();
    console.log('🚀 GoMining Sales Export');
    console.log('=' .repeat(50));
    
    const timestamp = new Date().toISOString().split('T')[0];
    const config = globalThis.minersExportConfig;
    
    try {
        const sales = await fetchHistoryData(
            config.endpoints.sales, 
            'Sales',
            { filters: {} }
        );
        
        const parsedSales = parseSalesData(sales);
        const csv = generateSalesCSV(parsedSales);
        
        downloadCSV(csv, `gomining-sales-${timestamp}.csv`);
        
        console.log('\n✅ Export Complete!');
        console.log(`💰 Sales: ${parsedSales.length} items`);
        console.log('📥 CSV file downloaded!');
        
        showCommands();
        
    } catch (error) {
        console.error('\n❌ Export failed:', error.message);
        showCommands();
    }
}

// ============================================================
// TEST MODE
// ============================================================

async function testAllExports() {
    console.log('🧪 TEST MODE ENABLED - Limited to 10 items each\n');
    globalThis.minersExportConfig.testMode = true;
    await exportAllMiners();
    globalThis.minersExportConfig.testMode = false;
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function setDateRange(fromDate, toDate) {
    globalThis.minersExportConfig.fromDate = fromDate;
    globalThis.minersExportConfig.toDate = toDate;
    console.log('✅ Date range set:');
    console.log(`   From: ${fromDate || 'Beginning'}`);
    console.log(`   To:   ${toDate || 'Now'}`);
}

function clearDateRange() {
    globalThis.minersExportConfig.fromDate = null;
    globalThis.minersExportConfig.toDate = null;
    console.log('✅ Date range cleared (exporting all history)');
}

function exportYear(year) {
    setDateRange(`${year}-01-01T00:00:00Z`, `${year}-12-31T23:59:59Z`);
    console.log(`💡 Now run: exportMinerHistory() or exportAllMiners()`);
}

function exportMonth(year, month) {
    const monthStr = month.toString().padStart(2, '0');
    const lastDay = new Date(year, month, 0).getDate();
    setDateRange(`${year}-${monthStr}-01T00:00:00Z`, `${year}-${monthStr}-${lastDay}T23:59:59Z`);
    console.log(`💡 Now run: exportMinerHistory() or exportAllMiners()`);
}

function showCommands() {
    console.log('\n' + '='.repeat(60));
    console.log('📖 Available commands:');
    console.log('='.repeat(60));
    console.log('🔥 Main Commands:');
    console.log('  exportAllMiners()              - Export EVERYTHING (4 CSV files)');
    console.log('  exportCurrentMiners()          - Only current miner inventory');
    console.log('  exportMinerHistory()           - Only history (purchases + upgrades + sales)');
    console.log('  testAllExports()               - Test mode (10 items each)');
    console.log('');
    console.log('📦 Individual Exports:');
    console.log('  exportPurchases()              - Only purchase history');
    console.log('  exportUpgrades()               - Only upgrade history');
    console.log('  exportSales()                  - Only sales history');
    console.log('');
    console.log('📅 Date Filters:');
    console.log('  exportYear(2026)               - Export full year');
    console.log('  exportMonth(2026, 4)           - Export specific month (April 2026)');
    console.log('  setDateRange(from, to)         - Custom date range');
    console.log('  clearDateRange()               - Clear date filter');
    console.log('');
    console.log('🔧 Token Management:');
    console.log('  setToken("YOUR_TOKEN")         - Set authentication token manually');
    console.log('  refreshToken()                 - Refresh token from storage');
    console.log('='.repeat(60));
}

// ============================================================
// INITIALIZATION
// ============================================================

console.log('✅ GoMining Complete Miners Export Script loaded!');
showCommands();
console.log('\n💡 Quick Start: exportAllMiners() or testAllExports()\n');

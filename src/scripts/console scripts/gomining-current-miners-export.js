/**
 * GoMining Current Miners Export Script
 * =======================================
 * Exports current miner inventory from your mining farm via API
 * 
 * Usage in Browser Console:
 * 1. Go to app.gomining.com and login
 * 2. Open DevTools Console (F12)
 * 3. Paste this entire script
 * 4. Run: exportCurrentMiners()
 * 
 * Available Functions:
 * - exportCurrentMiners()          // Export all current miners
 * - testCurrentMiners()            // Test mode (10 miners)
 */

// Configuration
globalThis.currentMinersConfig = {
    endpoint: 'https://api.gomining.com/api/nft/my-miners',
    batchSize: 100, // Fetch all at once
    delayMs: 100,
    testMode: false
};

// Token detection (reuse from miner-export script)
function findCurrentMinersToken(forceFresh = false) {
    if (!forceFresh && globalThis.goMiningToken) {
        console.log('✅ Using cached token');
        return globalThis.goMiningToken;
    }
    
    console.log('🔍 Searching for authentication token...');
    
    // Try localStorage
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
    
    console.error('❌ Token not found!');
    console.error('💡 Solutions:');
    console.error('   1. Reload the page and try again');
    console.error('   2. Set manually: setCurrentMinersToken("YOUR_TOKEN_HERE")');
    console.error('   3. Check Network tab for Authorization header');
    return null;
}

// Helper: Manually set token
function setCurrentMinersToken(token) {
    if (!token || token.length < 20) {
        console.error('❌ Invalid token (too short)');
        return false;
    }
    globalThis.goMiningToken = token;
    console.log('✅ Token set successfully!');
    console.log('💡 Now try: exportCurrentMiners()');
    return true;
}

// Helper: Refresh token
function refreshCurrentMinersToken() {
    globalThis.goMiningToken = null;
    const token = findCurrentMinersToken(true);
    if (token) {
        console.log('✅ Token refreshed!');
        return true;
    }
    return false;
}

// Fetch current miners
async function fetchCurrentMiners() {
    const token = findCurrentMinersToken();
    if (!token) {
        throw new Error('Authentication token not found');
    }
    
    const config = globalThis.currentMinersConfig;
    
    console.log('\n📥 Fetching current miners from farm...\n');
    
    try {
        // API Request - my-miners endpoint
        const response = await fetch(config.endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                pagination: {
                    skip: 0,
                    limit: config.batchSize
                },
                filters: {},
                sort: {
                    id: "ASC"
                }
            })
        });
        
        if (!response.ok) {
            if (response.status === 403) {
                console.error(`❌ Authentication failed (403 Forbidden)`);
                console.error('💡 Your token is invalid or expired. Try:');
                console.error('   1. refreshCurrentMinersToken()  - Get fresh token');
                console.error('   2. Reload the page and run the script again');
                console.error('   3. Login again to GoMining');
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        // Handle response structure
        let miners = [];
        let totalCount = 0;
        
        if (result.data) {
            miners = result.data.items || result.data.array || result.data.list || result.data || [];
            totalCount = result.data.total || result.data.count || result.total || result.count || miners.length;
        } else if (Array.isArray(result)) {
            miners = result;
            totalCount = miners.length;
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

// Parse miner data
function parseCurrentMiners(miners) {
    return miners.map(miner => {
        return {
            minerId: miner.id || '',
            minerName: miner.name || `Miner #${miner.id}`,
            collection: getCollectionName(miner.nftCollectionId),
            hashrate: miner.power || 0,
            energyEfficiency: miner.energyEfficiency || 0,
            unit: 'TH',
            status: miner.status || 'active',
            ownerSince: miner.createdAt ? new Date(miner.createdAt).toISOString().split('T')[0] : '',
            lastUpdate: miner.updatedAt ? new Date(miner.updatedAt).toISOString().split('T')[0] : '',
            nftCollectionId: miner.nftCollectionId || ''
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

// Helper: Format number for German CSV
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

// Generate CSV for current miners
function generateCurrentMinersCSV(data) {
    const headers = ['Miner ID', 'Miner Name', 'Collection', 'Hashrate', 'Energy Efficiency', 'Unit', 'Status', 'Owner Since', 'Last Update', 'Collection ID'];
    const rows = data.map(d => [
        d.minerId,
        `"${d.minerName}"`,
        d.collection,
        formatNumber(d.hashrate),
        formatNumber(d.energyEfficiency),
        d.unit,
        d.status,
        d.ownerSince,
        d.lastUpdate,
        d.nftCollectionId
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
function showCurrentMinersCommands() {
    console.log('\n' + '='.repeat(50));
    console.log('📖 Available commands:');
    console.log('='.repeat(50));
    console.log('  exportCurrentMiners()          - Export all current miners');
    console.log('  testCurrentMiners()            - Test mode (10 miners)');
    console.log('');
    console.log('🔧 Token management:');
    console.log('  setCurrentMinersToken("TOKEN") - Set authentication token manually');
    console.log('  refreshCurrentMinersToken()    - Refresh token from storage');
    console.log('='.repeat(50));
}

// Main export function
async function exportCurrentMiners() {
    console.clear();
    console.log('🚀 GoMining Current Miners Export');
    console.log('=' .repeat(50));
    
    const timestamp = new Date().toISOString().split('T')[0];
    
    try {
        // Fetch miners
        console.log('\n📊 Fetching current miners from your farm...\n');
        const miners = await fetchCurrentMiners();
        
        if (miners.length === 0) {
            console.log('\n⚠️ No miners found in your farm!');
            showCurrentMinersCommands();
            return;
        }
        
        // Parse data
        console.log('\n🔄 Parsing miner data...');
        const parsedMiners = parseCurrentMiners(miners);
        
        // Generate CSV
        console.log('📝 Generating CSV file...');
        const csv = generateCurrentMinersCSV(parsedMiners);
        
        // Download file
        console.log('💾 Downloading file...\n');
        downloadCSV(csv, `gomining-current-miners-${timestamp}.csv`);
        
        // Summary
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
        
        // Show available commands
        showCurrentMinersCommands();
        
    } catch (error) {
        console.error('\n❌ Export failed:', error.message);
        console.error('Stack:', error.stack);
        showCurrentMinersCommands();
    }
}

// Test mode
async function testCurrentMiners() {
    console.log('🧪 TEST MODE ENABLED - Limited to 10 miners\n');
    globalThis.currentMinersConfig.testMode = true;
    await exportCurrentMiners();
    globalThis.currentMinersConfig.testMode = false;
}

console.log('✅ GoMining Current Miners Export Script loaded!');
showCurrentMinersCommands();
console.log('\n💡 Tip: Start with testCurrentMiners() or exportCurrentMiners()!\n');

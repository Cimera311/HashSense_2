/**
 * GoMining Miner API Analyzer
 * ============================
 * Zeigt die rohe Struktur der API-Responses, um die Parser-Funktionen zu optimieren
 * 
 * Usage:
 * 1. Auf app.gomining.com einloggen
 * 2. Console öffnen (F12)
 * 3. Dieses Script einfügen
 * 4. Run: analyzeMinerAPIs()
 */

// Token Detection (same as before)
function findToken() {
    if (globalThis.goMiningToken) {
        return globalThis.goMiningToken;
    }
    
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'access_token' || name === 'token' || name === 'auth_token') {
            globalThis.goMiningToken = value;
            return value;
        }
    }
    
    const localToken = localStorage.getItem('access_token') 
        || localStorage.getItem('token')
        || localStorage.getItem('auth_token');
    if (localToken) {
        globalThis.goMiningToken = localToken;
        return localToken;
    }
    
    const sessionToken = sessionStorage.getItem('access_token')
        || sessionStorage.getItem('token')
        || sessionStorage.getItem('auth_token');
    if (sessionToken) {
        globalThis.goMiningToken = sessionToken;
        return sessionToken;
    }
    
    console.error('❌ Token not found');
    return null;
}

// Pretty print object structure
function analyzeObject(obj, maxDepth = 3, currentDepth = 0, prefix = '') {
    if (currentDepth >= maxDepth) return;
    
    const indent = '  '.repeat(currentDepth);
    
    if (Array.isArray(obj)) {
        console.log(`${indent}${prefix}[Array with ${obj.length} items]`);
        if (obj.length > 0) {
            console.log(`${indent}  First item:`);
            analyzeObject(obj[0], maxDepth, currentDepth + 1, '');
        }
    } else if (obj && typeof obj === 'object') {
        for (const [key, value] of Object.entries(obj)) {
            const type = Array.isArray(value) ? 'Array' : typeof value;
            
            if (type === 'object' && value !== null) {
                console.log(`${indent}${key}: {Object}`);
                analyzeObject(value, maxDepth, currentDepth + 1, '');
            } else if (type === 'Array') {
                console.log(`${indent}${key}: [Array with ${value.length} items]`);
                if (value.length > 0 && currentDepth < maxDepth - 1) {
                    analyzeObject(value[0], maxDepth, currentDepth + 1, '  [0]: ');
                }
            } else {
                const displayValue = typeof value === 'string' && value.length > 50 
                    ? value.substring(0, 50) + '...' 
                    : value;
                console.log(`${indent}${key}: ${displayValue} (${type})`);
            }
        }
    } else {
        console.log(`${indent}${prefix}${obj} (${typeof obj})`);
    }
}

// Analyze single API endpoint
async function analyzeAPI(name, endpoint, requestBody) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📡 ANALYZING: ${name}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Endpoint: ${endpoint}`);
    console.log(`Request Body:`, JSON.stringify(requestBody, null, 2));
    
    const token = findToken();
    if (!token) {
        console.error('❌ Cannot proceed without token');
        return null;
    }
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        console.log('\n📦 RESPONSE STRUCTURE:');
        console.log('-'.repeat(60));
        analyzeObject(data);
        
        console.log('\n📋 ACTUAL DATA (first 2 items):');
        console.log('-'.repeat(60));
        
        let items = [];
        if (data.data) {
            items = data.data.items || data.data.array || data.data.list || data.data || [];
        } else if (Array.isArray(data)) {
            items = data;
        }
        
        if (items.length > 0) {
            console.log('\n🔍 ITEM 1:');
            console.log(JSON.stringify(items[0], null, 2));
            
            if (items.length > 1) {
                console.log('\n🔍 ITEM 2:');
                console.log(JSON.stringify(items[1], null, 2));
            }
            
            console.log(`\n✅ Total items found: ${items.length}`);
            console.log(`📊 Available fields in first item:`);
            if (items[0]) {
                Object.keys(items[0]).forEach(key => {
                    const value = items[0][key];
                    const type = Array.isArray(value) ? 'Array' : typeof value;
                    console.log(`   - ${key}: ${type}`);
                });
            }
        } else {
            console.log('⚠️ No items found in response');
        }
        
        return items;
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        return null;
    }
}

// Main analysis function
async function analyzeMinerAPIs() {
    console.clear();
    console.log('🔬 GoMining Miner API Structure Analyzer');
    console.log('=========================================\n');
    
    // Store results
    window.apiAnalysisResults = {
        purchases: null,
        upgrades: null,
        sales: null
    };
    
    // 1. Analyze Purchases
    window.apiAnalysisResults.purchases = await analyzeAPI(
        'PURCHASES',
        'https://api.gomining.com/api/user-payments-history/index',
        {
            filters: { withCanceled: false },
            pagination: { skip: 0, limit: 2 }
        }
    );
    
    await new Promise(r => setTimeout(r, 500));
    
    // 2. Analyze Upgrades
    window.apiAnalysisResults.upgrades = await analyzeAPI(
        'UPGRADES',
        'https://api.gomining.com/api/internal-payment/get-my',
        {
            filters: {
                dataType: { in: ["nftEnergyEfficiencyUpgrade", "nftPowerUpgrade"] },
                status: { in: ["pending", "success", "error", "waitingForProviderConfirmation", 
                              "approvedByProvider", "waitingForConfirmation", "waiting-for-user-approve"] }
            },
            sort: { createdAt: "DESC" },
            pagination: { skip: 0, limit: 2 }
        }
    );
    
    await new Promise(r => setTimeout(r, 500));
    
    // 3. Analyze Sales
    window.apiAnalysisResults.sales = await analyzeAPI(
        'SALES',
        'https://api.gomining.com/api/nft-marketplace-order/find-by-user',
        {
            filters: {},
            pagination: { skip: 0, limit: 2 }
        }
    );
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ ANALYSIS COMPLETE!');
    console.log('='.repeat(60));
    console.log('\n💡 Results stored in: window.apiAnalysisResults');
    console.log('   - window.apiAnalysisResults.purchases');
    console.log('   - window.apiAnalysisResults.upgrades');
    console.log('   - window.apiAnalysisResults.sales');
    console.log('\n📋 Copy the console output to share the API structure');
}

// Quick access functions
async function analyzePurchasesOnly() {
    console.clear();
    await analyzeAPI(
        'PURCHASES',
        'https://api.gomining.com/api/user-payments-history/index',
        {
            filters: { withCanceled: false },
            pagination: { skip: 0, limit: 3 }
        }
    );
}

async function analyzeUpgradesOnly() {
    console.clear();
    await analyzeAPI(
        'UPGRADES',
        'https://api.gomining.com/api/internal-payment/get-my',
        {
            filters: {
                dataType: { in: ["nftEnergyEfficiencyUpgrade", "nftPowerUpgrade"] },
                status: { in: ["success"] }
            },
            sort: { createdAt: "DESC" },
            pagination: { skip: 0, limit: 3 }
        }
    );
}

async function analyzeSalesOnly() {
    console.clear();
    await analyzeAPI(
        'SALES',
        'https://api.gomining.com/api/nft-marketplace-order/find-by-user',
        {
            filters: {},
            pagination: { skip: 0, limit: 3 }
        }
    );
}

console.log('✅ Analyzer loaded!');
console.log('');
console.log('📊 Available commands:');
console.log('  analyzeMinerAPIs()      - Analyze all 3 APIs (Purchases, Upgrades, Sales)');
console.log('  analyzePurchasesOnly()  - Only analyze purchases');
console.log('  analyzeUpgradesOnly()   - Only analyze upgrades');
console.log('  analyzeSalesOnly()      - Only analyze sales');
console.log('');
console.log('👉 Start with: analyzeMinerAPIs()');

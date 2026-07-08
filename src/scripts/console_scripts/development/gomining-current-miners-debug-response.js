/**
 * Debug: Test all known API endpoints to find miner data
 */

// List of potential miner API endpoints
const API_ENDPOINTS = [
    { name: 'nft-key/get-my', url: '/api/nft-key/get-my', body: {} },
    { name: 'user/find-by-user', url: '/api/user/find-by-user', body: {} },
    { name: 'nft/find-by-user', url: '/api/nft/find-by-user', body: {} },
    { name: 'nft/find-all', url: '/api/nft/find-all', body: {} },
    { name: 'user/get-my', url: '/api/user/get-my', body: {} },
    { name: 'nft/get-widgets', url: '/api/nft/get-widgets', body: {} },
    { name: 'nft-key/find-by-user', url: '/api/nft-key/find-by-user', body: {} },
    { name: 'nft-key/find-all', url: '/api/nft-key/find-all', body: {} },
];

async function testEndpoint(endpoint, token) {
    try {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`🔍 Testing: ${endpoint.name}`);
        console.log(`📍 URL: https://api.gomining.com${endpoint.url}`);
        console.log(`${'='.repeat(60)}`);
        
        const response = await fetch(`https://api.gomining.com${endpoint.url}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(endpoint.body)
        });
        
        console.log(`Status: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
            console.log(`❌ Failed with HTTP ${response.status}`);
            return null;
        }
        
        const result = await response.json();
        
        // Analyze structure
        let minerCount = 0;
        let dataLocation = 'unknown';
        
        if (Array.isArray(result)) {
            minerCount = result.length;
            dataLocation = 'root (direct array)';
        } else if (result.data && Array.isArray(result.data.array)) {
            minerCount = result.data.array.length;
            dataLocation = 'result.data.array';
        } else if (result.data && Array.isArray(result.data)) {
            minerCount = result.data.length;
            dataLocation = 'result.data';
        } else if (result.data && result.data.count !== undefined) {
            minerCount = result.data.count;
            dataLocation = `result.data (count: ${minerCount})`;
        }
        
        console.log(`✅ Success!`);
        console.log(`📊 Potential miner count: ${minerCount}`);
        console.log(`📍 Data location: ${dataLocation}`);
        
        if (minerCount > 0) {
            console.log(`🎯 POTENTIAL MATCH! This endpoint has ${minerCount} items!`);
        }
        
        // Show first item structure if available
        let firstItem = null;
        if (Array.isArray(result) && result.length > 0) {
            firstItem = result[0];
        } else if (result.data && Array.isArray(result.data.array) && result.data.array.length > 0) {
            firstItem = result.data.array[0];
        } else if (result.data && Array.isArray(result.data) && result.data.length > 0) {
            firstItem = result.data[0];
        }
        
        if (firstItem) {
            console.log(`\n🔎 First item structure:`);
            console.log(`   Keys:`, Object.keys(firstItem).join(', '));
            if (firstItem.id) console.log(`   - id: ${firstItem.id}`);
            if (firstItem.name) console.log(`   - name: ${firstItem.name}`);
            if (firstItem.power) console.log(`   - power: ${firstItem.power}`);
            if (firstItem.energyEfficiency) console.log(`   - energyEfficiency: ${firstItem.energyEfficiency}`);
            if (firstItem.nftCollectionId) console.log(`   - nftCollectionId: ${firstItem.nftCollectionId}`);
        }
        
        // Compact JSON preview (first 500 chars)
        const jsonStr = JSON.stringify(result, null, 2);
        console.log(`\n📄 Response preview (${jsonStr.length} chars):`);
        console.log(jsonStr.substring(0, 500) + (jsonStr.length > 500 ? '...' : ''));
        
        return { endpoint, result, minerCount };
        
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        return null;
    }
}

async function debugAllMinersEndpoints() {
    console.clear();
    console.log('🚀 Testing All Known Miner API Endpoints');
    console.log('='.repeat(60));
    
    // Get token
    const cookies = document.cookie.split(';');
    let token = null;
    for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'access_token') {
            token = value;
            break;
        }
    }
    
    if (!token) {
        console.error('❌ No token found!');
        return;
    }
    
    console.log('✅ Token found, testing endpoints...\n');
    
    const results = [];
    
    for (const endpoint of API_ENDPOINTS) {
        const result = await testEndpoint(endpoint, token);
        if (result && result.minerCount > 0) {
            results.push(result);
        }
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log('\n\n' + '='.repeat(60));
    console.log('📊 SUMMARY - Endpoints with data:');
    console.log('='.repeat(60));
    
    if (results.length === 0) {
        console.log('❌ No endpoints returned miner data!');
    } else {
        results.forEach((r, i) => {
            console.log(`\n${i + 1}. ${r.endpoint.name}`);
            console.log(`   URL: https://api.gomining.com${r.endpoint.url}`);
            console.log(`   Count: ${r.minerCount} items`);
        });
        
        console.log('\n🎯 RECOMMENDATION:');
        const best = results.sort((a, b) => b.minerCount - a.minerCount)[0];
        console.log(`Use endpoint: ${best.endpoint.name}`);
        console.log(`URL: https://api.gomining.com${best.endpoint.url}`);
    }
    
    console.log('\n' + '='.repeat(60));
}

console.log('🔍 Multi-endpoint Debug script loaded!');
console.log('Run: debugAllMinersEndpoints()');

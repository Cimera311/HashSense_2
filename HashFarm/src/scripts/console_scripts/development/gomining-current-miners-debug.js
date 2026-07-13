/**
 * GoMining Current Miners API Debug Script
 * =========================================
 * Find the correct API endpoint for current miners
 * 
 * Usage:
 * 1. Go to app.gomining.com and login
 * 2. Open DevTools Console (F12)
 * 3. Paste this script
 * 4. Navigate to your miners/farm page in the app
 * 5. Check console for API calls
 */

// Store original fetch
const originalFetch = window.fetch;
const apiCalls = [];

// Intercept fetch
window.fetch = function(...args) {
    const url = args[0];
    const options = args[1] || {};
    
    // Only log GoMining API calls
    if (url && url.includes('gomining.com')) {
        const callInfo = {
            url: url,
            method: options.method || 'GET',
            timestamp: new Date().toISOString(),
            body: options.body
        };
        
        // Check if it's related to miners/farm
        const minerRelated = url.includes('miner') || 
                            url.includes('farm') || 
                            url.includes('nft') ||
                            url.includes('inventory');
        
        if (minerRelated) {
            console.log('🎯 MINER-RELATED API CALL DETECTED!');
            console.log('=' .repeat(60));
            console.log('URL:', url);
            console.log('Method:', callInfo.method);
            console.log('Time:', callInfo.timestamp);
            
            if (options.body) {
                try {
                    const bodyObj = JSON.parse(options.body);
                    console.log('Request Body:', JSON.stringify(bodyObj, null, 2));
                } catch (e) {
                    console.log('Request Body:', options.body);
                }
            }
            
            console.log('=' .repeat(60));
            console.log('\n💡 Copy this URL for the export script!\n');
        }
        
        apiCalls.push(callInfo);
    }
    
    return originalFetch.apply(this, args);
};

console.log('✅ API Sniffer installed!');
console.log('📡 Monitoring all API calls...');
console.log('\n👉 Navigate to your Miners/Farm page in GoMining');
console.log('👉 The correct API endpoint will be shown above when detected\n');

// Helper function to show all captured calls
window.showAllMinerCalls = function() {
    console.log('\n📋 All captured miner-related API calls:');
    console.log('=' .repeat(60));
    
    const minerCalls = apiCalls.filter(call => 
        call.url.includes('miner') || 
        call.url.includes('farm') || 
        call.url.includes('nft') ||
        call.url.includes('inventory')
    );
    
    if (minerCalls.length === 0) {
        console.log('❌ No miner-related calls captured yet');
        console.log('💡 Navigate to your Miners/Farm page in the app');
    } else {
        minerCalls.forEach((call, index) => {
            console.log(`\n[${index + 1}] ${call.method} ${call.url}`);
            if (call.body) {
                try {
                    const bodyObj = JSON.parse(call.body);
                    console.log('   Body:', JSON.stringify(bodyObj, null, 2));
                } catch (e) {
                    console.log('   Body:', call.body);
                }
            }
        });
    }
    
    console.log('\n' + '=' .repeat(60));
};

console.log('📖 Commands:');
console.log('  showAllMinerCalls()  - Show all captured miner API calls');

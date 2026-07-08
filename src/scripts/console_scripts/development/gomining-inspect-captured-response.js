/**
 * Inspect specific captured response in detail
 */

// Check if capture is active
if (!window.capturedRequests) {
    console.error('❌ Capture script not loaded!');
    console.log('💡 First load: gomining-capture-all-requests.js');
    throw new Error('Load capture script first');
}

window.inspectResponse = function(index) {
    if (!window.capturedRequests || window.capturedRequests.length === 0) {
        console.error('❌ No requests captured yet! Navigate to miners page and wait a moment.');
        return;
    }
    
    const req = window.capturedRequests[index - 1]; // 1-based index
    
    if (!req) {
        console.error(`❌ No request at index ${index}`);
        return;
    }
    
    console.clear();
    console.log('🔍 REQUEST DETAILS');
    console.log('='.repeat(80));
    console.log(`Index: ${index}`);
    console.log(`URL: ${req.url}`);
    console.log(`Method: ${req.method}`);
    console.log(`Status: ${req.status}`);
    console.log(`\nRequest Body:`);
    console.log(JSON.stringify(req.body, null, 2));
    
    console.log('\n' + '='.repeat(80));
    console.log('📦 FULL RESPONSE:');
    console.log('='.repeat(80));
    console.log(JSON.stringify(req.response, null, 2));
};

window.findMinerDetails = function() {
    console.clear();
    console.log('🔍 Searching for miner details in captured responses...\n');
    
    if (!window.capturedRequests || window.capturedRequests.length === 0) {
        console.error('❌ No requests captured yet!');
        console.log('💡 1. Load gomining-capture-all-requests.js');
        console.log('💡 2. Navigate to your miners page');
        console.log('💡 3. Wait for data to load');
        console.log('💡 4. Run findMinerDetails() again');
        return;
    }
    
    const minerRequests = window.capturedRequests.filter(r => r.containsMiners);
    
    minerRequests.forEach((req, i) => {
        console.log(`\n${'='.repeat(80)}`);
        console.log(`${i + 1}. ${req.url}`);
        console.log('='.repeat(80));
        
        // Try to find miner-like objects in response
        let miners = [];
        
        if (Array.isArray(req.response?.data?.array)) {
            miners = req.response.data.array;
        } else if (Array.isArray(req.response?.data)) {
            miners = req.response.data;
        } else if (Array.isArray(req.response)) {
            miners = req.response;
        }
        
        if (miners.length > 0) {
            console.log(`Found ${miners.length} items in response`);
            console.log('\nFirst item structure:');
            console.log(`Keys: ${Object.keys(miners[0]).join(', ')}`);
            
            // Check if it looks like a miner
            const firstItem = miners[0];
            const hasMinerFields = firstItem.power || firstItem.hashrate || firstItem.nftId || firstItem.name;
            
            if (hasMinerFields) {
                console.log('\n✅ This looks like miner data!');
                console.log('Sample item:');
                console.log(JSON.stringify(firstItem, null, 2).substring(0, 1000));
                
                // Check for nested miner data
                if (firstItem.incomeList || firstItem.nft) {
                    console.log('\n🎯 Found nested structure! Checking deeper...');
                    if (firstItem.incomeList) {
                        console.log('Has incomeList with', firstItem.incomeList.length, 'items');
                        if (firstItem.incomeList[0]) {
                            console.log('Income item keys:', Object.keys(firstItem.incomeList[0]).join(', '));
                        }
                    }
                    if (firstItem.nft) {
                        console.log('Has nft object with keys:', Object.keys(firstItem.nft).join(', '));
                    }
                }
            }
        }
    });
};

window.showIncomeListDetails = function() {
    console.clear();
    console.log('🔍 Extracting NFT IDs from income data...\n');
    
    if (!window.capturedRequests || window.capturedRequests.length === 0) {
        console.error('❌ No requests captured yet!');
        return;
    }
    
    // Find nft-income requests
    const incomeRequests = window.capturedRequests.filter(r => 
        r.url && r.url.includes('nft-income/find-aggregated-by-date')
    );
    
    if (incomeRequests.length === 0) {
        console.log('❌ No income requests found');
        return;
    }
    
    const nftIds = new Set();
    
    incomeRequests.forEach(req => {
        if (!req.response?.data?.array) return;
        
        req.response.data.array.forEach(day => {
            if (!day.incomeList) return;
            
            day.incomeList.forEach(income => {
                if (income.nftId) {
                    nftIds.add(income.nftId);
                }
            });
        });
    });
    
    console.log(`✅ Found ${nftIds.size} unique NFT IDs from income data:`);
    console.log(Array.from(nftIds).sort((a, b) => a - b));
    
    console.log('\n💡 These are your miner IDs! Now need endpoint to get details by ID...');
};

console.log('🔍 Response Inspector loaded!');
console.log('\nCommands:');
console.log('  inspectResponse(8) - Show full response for request #8 (marketplace-index)');
console.log('  inspectResponse(33) - Show full response for request #33 (nft-income)');
console.log('  findMinerDetails() - Search all requests for miner data');
console.log('  showIncomeListDetails() - Extract NFT IDs from income data');

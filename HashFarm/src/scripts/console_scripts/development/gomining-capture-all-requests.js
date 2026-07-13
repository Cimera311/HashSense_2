/**
 * Universal Network Interceptor
 * Captures ALL fetch/XHR requests to find miner data source
 */

// Store captured requests
window.capturedRequests = [];

// Intercept fetch
const originalFetch = window.fetch;
window.fetch = async function(...args) {
    const [url, options = {}] = args;
    
    // Capture request
    const requestInfo = {
        type: 'fetch',
        url: url,
        method: options.method || 'GET',
        timestamp: new Date().toISOString(),
        body: options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : null
    };
    
    try {
        const response = await originalFetch(...args);
        
        // Clone response to read it
        const clonedResponse = response.clone();
        let responseData = null;
        
        try {
            responseData = await clonedResponse.json();
        } catch {
            responseData = await clonedResponse.text();
        }
        
        // Store with response
        requestInfo.status = response.status;
        requestInfo.response = responseData;
        
        // Check if contains miner-like data
        const hasMinerData = checkForMinerData(responseData);
        if (hasMinerData) {
            requestInfo.containsMiners = true;
            console.log('🎯 FOUND POTENTIAL MINER DATA!');
            console.log('URL:', url);
            console.log('Method:', options.method || 'GET');
            console.log('Body:', requestInfo.body);
            console.log('Response preview:', JSON.stringify(responseData).substring(0, 500));
        }
        
        window.capturedRequests.push(requestInfo);
        return response;
        
    } catch (error) {
        requestInfo.error = error.message;
        window.capturedRequests.push(requestInfo);
        throw error;
    }
};

// Intercept XMLHttpRequest
const originalXHROpen = XMLHttpRequest.prototype.open;
const originalXHRSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this._captureInfo = { method, url, timestamp: new Date().toISOString() };
    return originalXHROpen.call(this, method, url, ...rest);
};

XMLHttpRequest.prototype.send = function(body) {
    const captureInfo = this._captureInfo || {};
    captureInfo.type = 'xhr';
    captureInfo.body = body ? (typeof body === 'string' ? JSON.parse(body) : body) : null;
    
    this.addEventListener('load', function() {
        let responseData = null;
        try {
            responseData = JSON.parse(this.responseText);
        } catch {
            responseData = this.responseText;
        }
        
        captureInfo.status = this.status;
        captureInfo.response = responseData;
        
        const hasMinerData = checkForMinerData(responseData);
        if (hasMinerData) {
            captureInfo.containsMiners = true;
            console.log('🎯 XHR FOUND POTENTIAL MINER DATA!');
            console.log('URL:', captureInfo.url);
            console.log('Method:', captureInfo.method);
            console.log('Response preview:', JSON.stringify(responseData).substring(0, 500));
        }
        
        window.capturedRequests.push(captureInfo);
    });
    
    return originalXHRSend.call(this, body);
};

// Helper: Check if response contains miner-like data
function checkForMinerData(data) {
    if (!data) return false;
    
    const jsonStr = JSON.stringify(data);
    
    // Look for miner-related keywords
    const hasMinerKeywords = /power|hashrate|efficiency|miner|nft|collection/i.test(jsonStr);
    
    // Look for arrays with multiple items
    let hasSignificantArray = false;
    if (Array.isArray(data) && data.length > 5) {
        hasSignificantArray = true;
    } else if (data.data && Array.isArray(data.data) && data.data.length > 5) {
        hasSignificantArray = true;
    } else if (data.data?.array && Array.isArray(data.data.array) && data.data.array.length > 5) {
        hasSignificantArray = true;
    }
    
    return hasMinerKeywords && hasSignificantArray;
}

// Analysis functions
window.analyzeRequests = function() {
    console.clear();
    console.log('📊 CAPTURED REQUESTS ANALYSIS');
    console.log('='.repeat(60));
    console.log(`Total requests: ${window.capturedRequests.length}`);
    
    // Filter GoMining API requests
    const gominingRequests = window.capturedRequests.filter(r => 
        r.url && r.url.includes('api.gomining.com')
    );
    
    console.log(`\n🔍 GoMining API requests: ${gominingRequests.length}`);
    
    if (gominingRequests.length === 0) {
        console.log('❌ No API requests captured yet!');
        console.log('💡 Try navigating to your miners page or refreshing');
        return;
    }
    
    console.log('\n📋 All GoMining API Calls:\n');
    gominingRequests.forEach((req, i) => {
        console.log(`${i + 1}. ${req.method} ${req.url}`);
        if (req.body) {
            console.log(`   Body:`, req.body);
        }
        console.log(`   Status: ${req.status || 'pending'}`);
        
        // Show data size
        if (req.response) {
            const size = JSON.stringify(req.response).length;
            console.log(`   Response size: ${size} chars`);
            
            // Check for arrays
            if (Array.isArray(req.response)) {
                console.log(`   ✅ Direct array with ${req.response.length} items`);
            } else if (req.response.data?.array) {
                console.log(`   ✅ data.array with ${req.response.data.array.length} items`);
            } else if (req.response.data && Array.isArray(req.response.data)) {
                console.log(`   ✅ data array with ${req.response.data.length} items`);
            }
        }
        
        if (req.containsMiners) {
            console.log(`   🎯 CONTAINS MINER DATA!`);
        }
        console.log('');
    });
    
    // Requests with potential miner data
    const minerRequests = gominingRequests.filter(r => r.containsMiners);
    if (minerRequests.length > 0) {
        console.log('\n🎯 REQUESTS WITH MINER DATA:');
        minerRequests.forEach(req => {
            console.log(`\nURL: ${req.url}`);
            console.log(`Method: ${req.method}`);
            console.log(`Body:`, req.body);
            console.log(`Response preview:`, JSON.stringify(req.response).substring(0, 300));
        });
    }
};

window.showMinerRequests = function() {
    const minerRequests = window.capturedRequests.filter(r => r.containsMiners);
    if (minerRequests.length === 0) {
        console.log('❌ No miner data requests captured yet');
        return;
    }
    
    console.log('🎯 MINER DATA REQUESTS:');
    minerRequests.forEach((req, i) => {
        console.log(`\n${i + 1}. ${req.method} ${req.url}`);
        console.log('Body:', req.body);
        console.log('Full response:', req.response);
    });
};

window.clearCapture = function() {
    window.capturedRequests = [];
    console.log('✅ Capture cleared');
};

console.log('🎯 Universal Network Interceptor Active!');
console.log('📡 Capturing ALL requests...');
console.log('\nCommands:');
console.log('  analyzeRequests() - Show all captured API calls');
console.log('  showMinerRequests() - Show only miner data requests');
console.log('  clearCapture() - Clear captured data');
console.log('\n💡 Now navigate to your miners page to capture the requests!');

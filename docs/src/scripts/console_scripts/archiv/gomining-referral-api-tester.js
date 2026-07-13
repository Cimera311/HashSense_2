// ============================================================
// GoMining Referral API Tester
// Tests referral-api.bounty.gomining.com endpoints
// ============================================================
// Usage:
//   1. Go to app.gomining.com and login
//   2. Open Console (F12)
//   3. Paste this script and press Enter
//   4. Run: testAllReferralAPI()
// ============================================================

(function() {
    'use strict';

    const REFERRAL_API_BASE = 'https://referral-api.bounty.gomining.com/api';

    // Token detection
    function findToken() {
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'access_token') {
                return decodeURIComponent(value);
            }
        }
        const token = localStorage.getItem('access_token');
        if (token) return token;
        return null;
    }

    globalThis.goMiningToken = globalThis.goMiningToken || findToken();

    // Referral API Endpoints (from Network tab observation)
    const REFERRAL_ENDPOINTS = [
        // Get endpoints
        { name: 'Get Referrer Rewards', url: '/ref-program/get-referrer-rewards', method: 'POST' },
        { name: 'Get Total Rewards', url: '/ref-program/get-total-rewards', method: 'POST' },
        { name: 'Get Referral Cards Chart', url: '/ref-program/get-referral-cards-chart', method: 'POST' },
        { name: 'Get Chart Details', url: '/ref-program/get-chart-details', method: 'POST' },
        { name: 'Get Referral Purchases Chart', url: '/ref-program/get-referral-purchases-chart', method: 'POST' },
        { name: 'Get Referral Simple Earn Chart', url: '/ref-program/get-referral-simple-earn-chart', method: 'POST' },
        { name: 'Get Referral Boosts Chart', url: '/ref-program/get-referral-boosts-chart', method: 'POST' },
        { name: 'Get Referral Electricity Chart', url: '/ref-program/get-referral-electricity-chart', method: 'POST' },
        { name: 'Get My Referral', url: '/ref-program/get-my', method: 'POST' },
        { name: 'Get All Referrals', url: '/ref-program/get-all', method: 'POST' },
        
        // Find endpoints
        { name: 'Find By User', url: '/ref-program/find-by-user', method: 'POST' },
        { name: 'Find All', url: '/ref-program/find-all', method: 'POST' },
        
        // Overview endpoints
        { name: 'Get Overview', url: '/ref-program/get-overview', method: 'POST' },
        { name: 'Get Referrer Stats', url: '/ref-program/get-referrer-stats', method: 'POST' },
        { name: 'Get Referral History', url: '/ref-program/get-referral-history', method: 'POST' },
        
        // Other potential endpoints
        { name: 'Get Referral Summary', url: '/ref-program/get-summary', method: 'POST' },
        { name: 'Get Referrals List', url: '/ref-program/get-referrals-list', method: 'POST' },
        { name: 'Get Earnings', url: '/ref-program/get-earnings', method: 'POST' },
        { name: 'Get Referral Bonuses', url: '/ref-program/get-bonuses', method: 'POST' },
    ];

    // Test single endpoint
    async function testEndpoint(endpoint, token) {
        const url = `${REFERRAL_API_BASE}${endpoint.url}`;
        
        console.log(`\n${'─'.repeat(60)}`);
        console.log(`🔍 Testing: ${endpoint.name}`);
        console.log(`   URL: ${url}`);
        console.log(`   Method: ${endpoint.method}`);

        try {
            const response = await fetch(url, {
                method: endpoint.method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json, text/plain, */*',
                    'Origin': 'https://app.gomining.com',
                    'Referer': 'https://app.gomining.com/',
                    'x-device-type': 'desktop'
                },
                body: endpoint.method === 'POST' ? JSON.stringify({}) : undefined
            });

            console.log(`   Status: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                if (response.status === 404) {
                    console.log(`   ❌ Not found (404)`);
                } else if (response.status === 401) {
                    console.log(`   🔒 Unauthorized (401) - Token might be invalid`);
                } else if (response.status === 403) {
                    console.log(`   🚫 Forbidden (403)`);
                } else {
                    console.log(`   ❌ Failed with HTTP ${response.status}`);
                }
                return null;
            }

            const contentType = response.headers.get('content-type');
            let data;

            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                console.log(`   ⚠️ Non-JSON response (${text.length} chars)`);
                return null;
            }

            console.log(`   ✅ SUCCESS!`);

            // Analyze data structure
            if (Array.isArray(data)) {
                console.log(`   📊 Array with ${data.length} items`);
                if (data.length > 0) {
                    const keys = Object.keys(data[0]);
                    console.log(`   🔑 Item keys: ${keys.slice(0, 10).join(', ')}${keys.length > 10 ? '...' : ''}`);
                    console.log(`   📄 First item:`, data[0]);
                }
            } else if (typeof data === 'object' && data !== null) {
                const keys = Object.keys(data);
                console.log(`   🔑 Object keys: ${keys.slice(0, 15).join(', ')}${keys.length > 15 ? '...' : ''}`);
                
                // Check for nested data
                if (data.data) {
                    if (Array.isArray(data.data)) {
                        console.log(`   📊 data.data is array with ${data.data.length} items`);
                        if (data.data.length > 0) {
                            console.log(`   📄 First data item:`, data.data[0]);
                        }
                    } else {
                        console.log(`   📄 data.data:`, data.data);
                    }
                }
                
                // Preview full response if compact
                const preview = JSON.stringify(data, null, 2);
                if (preview.length <= 500) {
                    console.log(`\n   📄 Full response:`);
                    console.log('   ' + preview.split('\n').join('\n   '));
                }
            } else {
                console.log(`   📄 Response:`, data);
            }

            return {
                endpoint,
                status: response.status,
                data
            };

        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
            return null;
        }
    }

    // Test all referral API endpoints
    async function testAllReferralAPI() {
        console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║       🎯 GoMining Referral API Tester 🎯                    ║
║          referral-api.bounty.gomining.com                   ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
        `);

        const token = (globalThis.goMiningToken || findToken() || '').replace('Bearer ', '').trim();
        if (!token) {
            console.error('❌ No token found!');
            console.log('\n💡 Set token manually:');
            console.log('   globalThis.goMiningToken = "YOUR_TOKEN"');
            console.log('   testAllReferralAPI()');
            return;
        }

        console.log(`🔑 Token: ${token.substring(0, 20)}...`);
        console.log(`📊 Will test ${REFERRAL_ENDPOINTS.length} referral API endpoints\n`);

        const results = [];
        
        for (const endpoint of REFERRAL_ENDPOINTS) {
            const result = await testEndpoint(endpoint, token);
            if (result) {
                results.push(result);
            }
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        // Summary
        console.log(`\n\n${'═'.repeat(60)}`);
        console.log(`📊 SUMMARY`);
        console.log(`${'═'.repeat(60)}\n`);

        console.log(`✅ Working endpoints: ${results.length}/${REFERRAL_ENDPOINTS.length}\n`);

        if (results.length > 0) {
            console.log(`🎉 FOUND ${results.length} WORKING REFERRAL API ENDPOINTS:\n`);
            results.forEach(r => {
                console.log(`   ✅ ${r.endpoint.name}`);
                console.log(`      URL: ${r.endpoint.url}`);
                
                // Show data summary
                if (Array.isArray(r.data)) {
                    console.log(`      Data: Array with ${r.data.length} items`);
                } else if (r.data && typeof r.data === 'object') {
                    const keys = Object.keys(r.data);
                    console.log(`      Data: Object with ${keys.length} keys`);
                    if (r.data.data && Array.isArray(r.data.data)) {
                        console.log(`      Contains: ${r.data.data.length} items in data.data`);
                    }
                }
            });
        } else {
            console.log(`❌ No working endpoints found`);
            console.log(`💡 All tested endpoints returned 404 or errors`);
        }

        console.log(`\n💾 Results stored in: globalThis.referralApiResults`);

        // Store results globally
        globalThis.referralApiResults = results;

        return results;
    }

    // Test specific endpoint by name
    async function testOneReferralEndpoint(name) {
        const token = (globalThis.goMiningToken || findToken() || '').replace('Bearer ', '').trim();
        if (!token) {
            console.error('❌ No token found!');
            return;
        }

        const endpoint = REFERRAL_ENDPOINTS.find(e => 
            e.name.toLowerCase().includes(name.toLowerCase())
        );
        
        if (!endpoint) {
            console.error(`❌ Endpoint not found: ${name}`);
            console.log('Available endpoints:', REFERRAL_ENDPOINTS.map(e => e.name).join(', '));
            return;
        }

        return await testEndpoint(endpoint, token);
    }

    // Export referral data to CSV
    async function exportReferralData(endpointName) {
        const results = globalThis.referralApiResults;
        if (!results || results.length === 0) {
            console.error('❌ Run testAllReferralAPI() first!');
            return;
        }

        const result = results.find(r => 
            r.endpoint.name.toLowerCase().includes(endpointName.toLowerCase())
        );

        if (!result) {
            console.error(`❌ No data found for: ${endpointName}`);
            console.log('Available:', results.map(r => r.endpoint.name).join(', '));
            return;
        }

        console.log(`📥 Exporting data from: ${result.endpoint.name}`);

        const data = result.data;
        let items = [];

        // Extract array from various structures
        if (Array.isArray(data)) {
            items = data;
        } else if (data.data && Array.isArray(data.data)) {
            items = data.data;
        } else if (data.data && data.data.items && Array.isArray(data.data.items)) {
            items = data.data.items;
        } else {
            console.log('⚠️ Data is not an array, will export as single row');
            items = [data];
        }

        if (items.length === 0) {
            console.log('⚠️ No items to export');
            return;
        }

        // Get all keys from all items
        const allKeys = new Set();
        items.forEach(item => {
            Object.keys(item).forEach(key => allKeys.add(key));
        });
        const keys = Array.from(allKeys);

        // CSV Export
        let csv = keys.join(';') + '\n';
        
        items.forEach(item => {
            const row = keys.map(key => {
                const value = item[key];
                if (value === null || value === undefined) return '';
                if (typeof value === 'object') return JSON.stringify(value);
                return `"${String(value).replace(/"/g, '""')}"`;
            });
            csv += row.join(';') + '\n';
        });

        // Download
        const filename = `gomining_referral_${endpointName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log(`✅ Exported ${items.length} items to ${filename}`);
    }

    // Expose globally
    globalThis.testAllReferralAPI = testAllReferralAPI;
    globalThis.testOneReferralEndpoint = testOneReferralEndpoint;
    globalThis.exportReferralData = exportReferralData;

    // Show help
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║       🎯 GoMining Referral API Tester 🎯                    ║
║          referral-api.bounty.gomining.com                   ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

📚 Tests the SEPARATE referral API (not main api.gomining.com)
   This API has referral rewards, stats, charts, etc.

How to use:

  testAllReferralAPI()                     - Test all ${REFERRAL_ENDPOINTS.length} endpoints
  testOneReferralEndpoint("rewards")       - Test specific endpoint
  exportReferralData("rewards")            - Export to CSV

Endpoints being tested:
  • Get Referrer Rewards
  • Get Total Rewards
  • Get Referral Cards/Purchases/Earn/Boosts Charts
  • Get Chart Details
  • Find By User / Find All
  • Get Overview / Stats / History
  • And more...

Token: ${globalThis.goMiningToken ? '✅ Found' : '❌ Not found'}

💡 Run: testAllReferralAPI()
    `);

})();

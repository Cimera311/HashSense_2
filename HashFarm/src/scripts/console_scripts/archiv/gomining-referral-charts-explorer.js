// ============================================================
// GoMining Referral Charts Explorer  
// Finds the correct parameters for chart endpoints
// ============================================================
// Usage:
//   1. Go to app.gomining.com and login
//   2. Open Console (F12)
//   3. Paste this script and press Enter
//   4. Run: exploreChartEndpoints()
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

    // Chart endpoints that returned 400
    const CHART_ENDPOINTS = [
        '/ref-program/get-referral-cards-chart',
        '/ref-program/get-chart-details',
        '/ref-program/get-referral-purchases-chart',
        '/ref-program/get-referral-simple-earn-chart',
        '/ref-program/get-referral-boosts-chart',
        '/ref-program/get-referral-electricity-chart',
    ];

    // Common parameter variations to try
    const BODY_VARIATIONS = [
        // Empty (already tried, but for completeness)
        {},
        
        // timePeriod variations (more likely for GoMining)
        { timePeriod: 'day' },
        { timePeriod: 'week' },
        { timePeriod: 'month' },
        { timePeriod: 'year' },
        { timePeriod: 'all' },
        { timePeriod: '7d' },
        { timePeriod: '30d' },
        { timePeriod: '90d' },
        
        // Period-based
        { period: 'day' },
        { period: 'week' },
        { period: 'month' },
        { period: 'year' },
        { period: 'all' },
        
        // Range-based
        { range: 'day' },
        { range: 'week' },
        { range: 'month' },
        { range: 'year' },
        { range: '7d' },
        { range: '30d' },
        { range: '90d' },
        
        // Date range
        { startDate: '2024-01-01', endDate: '2026-12-31' },
        { from: '2024-01-01', to: '2026-12-31' },
        { dateFrom: '2024-01-01', dateTo: '2026-12-31' },
        
        // Pagination
        { skip: 0, limit: 10 },
        { pagination: { skip: 0, limit: 10 } },
        
        // Filter variations
        { filter: {} },
        { filter: { period: 'month' } },
        { filter: { timePeriod: 'month' } },
        
        // userId (might need current user ID)
        { userId: null },
        
        // Combination with timePeriod (most likely to work)
        { timePeriod: 'month', limit: 100 },
        { timePeriod: 'all', skip: 0, limit: 1000 },
    ];

    // Test endpoint with specific body
    async function testChartEndpoint(url, body, token) {
        try {
            const response = await fetch(`${REFERRAL_API_BASE}${url}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json, text/plain, */*',
                    'Origin': 'https://app.gomining.com',
                    'Referer': 'https://app.gomining.com/',
                    'x-device-type': 'desktop'
                },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                const data = await response.json();
                return { success: true, status: response.status, data };
            } else {
                // Try to get error message
                let errorMsg = response.statusText;
                try {
                    const errorData = await response.json();
                    if (errorData.message) errorMsg = errorData.message;
                    if (errorData.error) errorMsg = errorData.error;
                } catch (e) {}
                return { success: false, status: response.status, error: errorMsg };
            }
        } catch (error) {
            return { success: false, status: 0, error: error.message };
        }
    }

    // Explore all chart endpoints with all body variations
    async function exploreChartEndpoints() {
        console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║       🔍 GoMining Referral Charts Explorer 🔍               ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
        `);

        const token = (globalThis.goMiningToken || findToken() || '').replace('Bearer ', '').trim();
        if (!token) {
            console.error('❌ No token found!');
            return;
        }

        console.log(`🔑 Token: ${token.substring(0, 20)}...`);
        console.log(`📊 Testing ${CHART_ENDPOINTS.length} endpoints with ${BODY_VARIATIONS.length} parameter variations\n`);

        const successfulCombinations = [];

        for (const endpoint of CHART_ENDPOINTS) {
            console.log(`\n${'═'.repeat(60)}`);
            console.log(`🔍 Testing: ${endpoint}`);
            console.log(`${'═'.repeat(60)}`);

            let foundWorking = false;

            for (let i = 0; i < BODY_VARIATIONS.length; i++) {
                const body = BODY_VARIATIONS[i];
                const bodyStr = JSON.stringify(body);
                
                console.log(`   [${i + 1}/${BODY_VARIATIONS.length}] Testing: ${bodyStr.substring(0, 60)}...`);

                const result = await testChartEndpoint(endpoint, body, token);

                if (result.success) {
                    console.log(`      ✅ SUCCESS!`);
                    console.log(`      Status: ${result.status}`);
                    
                    // Analyze response
                    if (Array.isArray(result.data)) {
                        console.log(`      Response: Array with ${result.data.length} items`);
                        if (result.data.length > 0) {
                            console.log(`      First item:`, result.data[0]);
                        }
                    } else if (result.data && typeof result.data === 'object') {
                        const keys = Object.keys(result.data);
                        console.log(`      Response: Object with keys: ${keys.join(', ')}`);
                        
                        // Show compact preview
                        const preview = JSON.stringify(result.data, null, 2);
                        if (preview.length <= 300) {
                            console.log(`      Data: ${preview}`);
                        }
                    }

                    successfulCombinations.push({
                        endpoint,
                        body,
                        data: result.data
                    });
                    
                    foundWorking = true;
                    break; // Found working params, skip other variations for this endpoint
                    
                } else if (result.status === 400) {
                    console.log(`      ❌ 400 - ${result.error || 'Bad Request'}`);
                } else if (result.status === 404) {
                    console.log(`      ❌ 404 - Not Found`);
                } else {
                    console.log(`      ❌ ${result.status} - ${result.error}`);
                }

                // Small delay
                await new Promise(r => setTimeout(r, 100));
            }

            if (!foundWorking) {
                console.log(`\n   ⚠️ No working parameter combination found for this endpoint`);
            }
        }

        // Summary
        console.log(`\n\n${'═'.repeat(60)}`);
        console.log(`📊 SUMMARY`);
        console.log(`${'═'.repeat(60)}\n`);

        if (successfulCombinations.length > 0) {
            console.log(`🎉 FOUND ${successfulCombinations.length} WORKING CHART ENDPOINTS:\n`);
            
            successfulCombinations.forEach(combo => {
                console.log(`   ✅ ${combo.endpoint}`);
                console.log(`      Body: ${JSON.stringify(combo.body)}`);
                
                if (Array.isArray(combo.data)) {
                    console.log(`      Returns: Array with ${combo.data.length} items`);
                } else if (combo.data && typeof combo.data === 'object') {
                    console.log(`      Returns: Object with ${Object.keys(combo.data).length} keys`);
                }
                console.log('');
            });

            console.log(`\n💡 To use these endpoints:`);
            successfulCombinations.forEach(combo => {
                const name = combo.endpoint.split('/').pop();
                console.log(`\n   // ${combo.endpoint}`);
                console.log(`   fetch('${REFERRAL_API_BASE}${combo.endpoint}', {`);
                console.log(`     method: 'POST',`);
                console.log(`     headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },`);
                console.log(`     body: JSON.stringify(${JSON.stringify(combo.body)})`);
                console.log(`   })`);
            });
        } else {
            console.log(`❌ No working combinations found`);
            console.log(`💡 All tested parameter variations returned errors`);
            console.log(`\n💡 Next steps:`);
            console.log(`   1. Check browser DevTools Network tab while using app.gomining.com`);
            console.log(`   2. Navigate to referral charts/stats pages`);
            console.log(`   3. Capture actual API requests with their body parameters`);
        }

        console.log(`\n💾 Results stored in: globalThis.chartExplorerResults`);
        globalThis.chartExplorerResults = successfulCombinations;

        return successfulCombinations;
    }

    // Quick test specific endpoint with custom body
    async function testChartWithBody(endpointName, body) {
        const token = (globalThis.goMiningToken || findToken() || '').replace('Bearer ', '').trim();
        if (!token) {
            console.error('❌ No token found!');
            return;
        }

        const endpoint = CHART_ENDPOINTS.find(e => e.includes(endpointName));
        if (!endpoint) {
            console.error(`❌ Endpoint not found: ${endpointName}`);
            console.log('Available:', CHART_ENDPOINTS.map(e => e.split('/').pop()).join(', '));
            return;
        }

        console.log(`🔍 Testing: ${endpoint}`);
        console.log(`   Body: ${JSON.stringify(body, null, 2)}`);

        const result = await testChartEndpoint(endpoint, body, token);

        if (result.success) {
            console.log(`✅ SUCCESS!`);
            console.log(`   Data:`, result.data);
            return result.data;
        } else {
            console.log(`❌ Failed: ${result.status} - ${result.error}`);
            return null;
        }
    }

    // Expose globally
    globalThis.exploreChartEndpoints = exploreChartEndpoints;
    globalThis.testChartWithBody = testChartWithBody;

    // Show help
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║       🔍 GoMining Referral Charts Explorer 🔍               ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

📚 Finds the correct parameters for chart endpoints that returned 400

How to use:

  exploreChartEndpoints()                  - Test all parameter variations
  testChartWithBody("cards", {period:"month"})  - Test specific params

Will test ${BODY_VARIATIONS.length} parameter variations:
  • period: day/week/month/year/all
  • range: 7d/30d/90d
  • Date ranges
  • Pagination
  • Filters
  • And more...

Token: ${globalThis.goMiningToken ? '✅ Found' : '❌ Not found'}

💡 Run: exploreChartEndpoints()
    `);

})();

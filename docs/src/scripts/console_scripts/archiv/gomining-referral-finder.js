// ============================================================
// GoMining Referral & Bonus API Finder
// Tests variations based on VERIFIED working endpoints
// ============================================================
// Usage:
//   1. Go to app.gomining.com and login
//   2. Open Console (F12)
//   3. Paste this script and press Enter
//   4. Run: testAllEndpoints()
// ============================================================

(function() {
    'use strict';

    // ========== CONFIG ==========
    const BASE_URL = 'https://api.gomining.com/api';
    
    // Token detection
    function findToken() {
        // Try cookies
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'access_token') {
                return decodeURIComponent(value);
            }
        }
        
        // Try localStorage
        const token = localStorage.getItem('access_token');
        if (token) return token;
        
        // Try common keys
        const keys = ['token', 'authToken', 'access_token', 'jwt', 'auth'];
        for (const key of keys) {
            const val = localStorage.getItem(key);
            if (val) return val;
        }
        
        return null;
    }

    // Store token globally
    globalThis.goMiningToken = globalThis.goMiningToken || findToken();

    // ========== VERIFIED WORKING ENDPOINTS (from working export scripts) ==========
    const VERIFIED = [
        { name: '✅ Wallet Transaction History', url: '/wallet/transaction-history', type: 'cursor' },
        { name: '✅ NFT Get My', url: '/nft/get-my', type: 'empty' },
        { name: '✅ User Payments History', url: '/user-payments-history/index', type: 'skip' },
        { name: '✅ Internal Payment Get My', url: '/internal-payment/get-my', type: 'skip' },
        { name: '✅ NFT Marketplace Order', url: '/nft-marketplace-order/find-by-user', type: 'skip' },
    ];

    // ========== ENDPOINT VARIATIONS TO TEST ==========
    // Based on verified patterns: try variations with referral/bonus/cashback/reward
    const ENDPOINTS_TO_TEST = [
        // Pattern: {topic}-history/index (like user-payments-history/index)
        { name: 'Referral History Index', url: '/referral-history/index', type: 'skip' },
        { name: 'Referral Payments History', url: '/referral-payments-history/index', type: 'skip' },
        { name: 'Referral Bonus History', url: '/referral-bonus-history/index', type: 'skip' },
        { name: 'Bonus History Index', url: '/bonus-history/index', type: 'skip' },
        { name: 'Cashback History Index', url: '/cashback-history/index', type: 'skip' },
        { name: 'Reward History Index', url: '/reward-history/index', type: 'skip' },
        { name: 'Promo History Index', url: '/promo-history/index', type: 'skip' },
        { name: 'Loyalty History Index', url: '/loyalty-history/index', type: 'skip' },
        { name: 'Airdrop History Index', url: '/airdrop-history/index', type: 'skip' },
        { name: 'Income History Index', url: '/income-history/index', type: 'skip' },
        { name: 'Earnings History Index', url: '/earnings-history/index', type: 'skip' },
        
        // Pattern: {topic}/get-my (like nft/get-my, internal-payment/get-my)
        { name: 'Referral Get My', url: '/referral/get-my', type: 'empty' },
        { name: 'Bonus Get My', url: '/bonus/get-my', type: 'empty' },
        { name: 'Cashback Get My', url: '/cashback/get-my', type: 'empty' },
        { name: 'Reward Get My', url: '/reward/get-my', type: 'empty' },
        { name: 'Promo Get My', url: '/promo/get-my', type: 'empty' },
        { name: 'Loyalty Get My', url: '/loyalty/get-my', type: 'empty' },
        { name: 'Airdrop Get My', url: '/airdrop/get-my', type: 'empty' },
        { name: 'Income Get My', url: '/income/get-my', type: 'empty' },
        { name: 'User Get My', url: '/user/get-my', type: 'empty' },
        
        // Pattern: {topic}/find-by-user (like nft-marketplace-order/find-by-user)
        { name: 'Referral Find By User', url: '/referral/find-by-user', type: 'skip' },
        { name: 'Bonus Find By User', url: '/bonus/find-by-user', type: 'skip' },
        { name: 'Reward Find By User', url: '/reward/find-by-user', type: 'skip' },
        { name: 'User Find By User', url: '/user/find-by-user', type: 'skip' },
        
        // Pattern: {topic}/{action} (like wallet/transaction-history)
        { name: 'Referral Transaction History', url: '/referral/transaction-history', type: 'cursor' },
        { name: 'Bonus Transaction History', url: '/bonus/transaction-history', type: 'cursor' },
        { name: 'Reward Transaction History', url: '/reward/transaction-history', type: 'cursor' },
        { name: 'Cashback Transaction History', url: '/cashback/transaction-history', type: 'cursor' },
        
        // Additional common patterns
        { name: 'Referral Stats', url: '/referral/stats', type: 'empty' },
        { name: 'Referral Summary', url: '/referral/summary', type: 'empty' },
        { name: 'User Referrals', url: '/user/referrals', type: 'skip' },
        { name: 'User Bonuses', url: '/user/bonuses', type: 'skip' },
        { name: 'User Rewards', url: '/user/rewards', type: 'skip' },
    ];

    // ========== HELPER: Build request body based on pagination type ==========
    function buildRequestBody(type) {
        switch(type) {
            case 'cursor':
                // Like wallet/transaction-history
                return {
                    filter: {
                        fromType: null,
                        walletType: ["VIRTUAL_BTC", "VIRTUAL_GMT", "VIRTUAL_USDT"],
                        range: null
                    },
                    pagination: {
                        cursor: Date.now(),
                        limit: 10
                    }
                };
            
            case 'skip':
                // Like user-payments-history/index
                return {
                    pagination: {
                        skip: 0,
                        limit: 10
                    }
                };
            
            case 'empty':
                // Like nft/get-my
                return {};
            
            default:
                return {};
        }
    }

    // ========== TEST FUNCTIONS ==========
    
    // Test single endpoint with EXACT structure from gomining-export-final.js
    async function testEndpoint(endpoint, token) {
        const url = `${BASE_URL}${endpoint.url}`;
        const requestBody = buildRequestBody(endpoint.type);
        
        console.log(`\n${'─'.repeat(60)}`);
        console.log(`🔍 Testing: ${endpoint.name}`);
        console.log(`   URL: ${url}`);
        console.log(`   Type: ${endpoint.type} pagination`);
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json, text/plain, */*',
                    'Origin': 'https://app.gomining.com',
                    'Referer': 'https://app.gomining.com/',
                    'x-device-type': 'desktop'
                },
                body: JSON.stringify(requestBody)
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
            
            // Analyze data structure (like gomining-export-final.js)
            let items = [];
            let totalCount = 0;
            
            if (data.data) {
                items = data.data.array || data.data.items || data.data.list || data.data || [];
                totalCount = data.data.total || data.data.count || items.length;
            } else if (Array.isArray(data)) {
                items = data;
                totalCount = items.length;
            } else if (typeof data === 'object') {
                // Single object response
                console.log(`   📊 Single object response`);
                console.log(`   🔑 Keys: ${Object.keys(data).slice(0, 10).join(', ')}`);
            }

            if (items.length > 0) {
                console.log(`   📊 Items: ${items.length}${totalCount ? ` / ${totalCount}` : ''}`);
                const keys = Object.keys(items[0]);
                console.log(`   🔑 Item keys: ${keys.slice(0, 10).join(', ')}${keys.length > 10 ? '...' : ''}`);
                console.log(`   📄 First item:`, items[0]);
            }

            // Preview data (compact)
            const preview = JSON.stringify(data, null, 2);
            const maxPreview = 300;
            if (preview.length <= maxPreview) {
                console.log(`\n   📄 Full response:`);
                console.log('   ' + preview.split('\n').join('\n   '));
            }

            return {
                endpoint,
                status: response.status,
                data,
                itemCount: items.length,
                totalCount
            };

        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
            return null;
        }
    }

    // Test verified endpoints first to confirm token works
    async function testVerified(token) {
        console.log(`\n${'═'.repeat(60)}`);
        console.log(`✅ TESTING VERIFIED ENDPOINTS (${VERIFIED.length})`);
        console.log(`   These SHOULD work - verifying token...`);
        console.log(`${'═'.repeat(60)}`);

        const results = [];
        for (const endpoint of VERIFIED) {
            const result = await testEndpoint(endpoint, token);
            if (result) {
                results.push(result);
            }
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        console.log(`\n${results.length}/${VERIFIED.length} verified endpoints working`);
        
        if (results.length === 0) {
            console.error(`\n❌ NO verified endpoints worked!`);
            console.error(`💡 This means your token is likely invalid. Try:`);
            console.error(`   1. Reload the page`);
            console.error(`   2. Set manually: globalThis.goMiningToken = "YOUR_TOKEN"`);
            return false;
        }

        return true;
    }

    // Test all new endpoint variations
    async function testAllEndpoints() {
        console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║       🎯 GoMining Referral & Bonus API Finder 🎯            ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
        `);

        // Get token
        const token = (globalThis.goMiningToken || findToken() || '').replace('Bearer ', '').trim();
        if (!token) {
            console.error('❌ No token found!');
            console.log('\n💡 Set token manually:');
            console.log('   globalThis.goMiningToken = "YOUR_TOKEN"');
            console.log('   testAllEndpoints()');
            return;
        }

        console.log(`🔑 Token: ${token.substring(0, 20)}...`);
        console.log(`📊 Will test: ${VERIFIED.length} verified + ${ENDPOINTS_TO_TEST.length} new endpoints\n`);

        // First test verified to make sure token works
        const tokenWorks = await testVerified(token);
        if (!tokenWorks) {
            return;
        }

        // Now test all new variations
        console.log(`\n${'═'.repeat(60)}`);
        console.log(`🔍 TESTING NEW ENDPOINT VARIATIONS (${ENDPOINTS_TO_TEST.length})`);
        console.log(`   Looking for referral/bonus/cashback data...`);
        console.log(`${'═'.repeat(60)}`);

        const results = [];
        for (const endpoint of ENDPOINTS_TO_TEST) {
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

        console.log(`✅ Verified endpoints: ${VERIFIED.length} working`);
        console.log(`🔍 New endpoints found: ${results.length}/${ENDPOINTS_TO_TEST.length}\n`);

        if (results.length > 0) {
            console.log(`🎉 FOUND ${results.length} NEW WORKING ENDPOINTS:\n`);
            results.forEach(r => {
                console.log(`   ✅ ${r.endpoint.name}`);
                console.log(`      URL: ${r.endpoint.url}`);
                console.log(`      Items: ${r.itemCount}${r.totalCount ? ` / ${r.totalCount}` : ''}`);
            });
        } else {
            console.log(`❌ No new working endpoints found`);
            console.log(`💡 All tested variations returned 404 or errors`);
        }

        console.log(`\n💾 Results stored in: globalThis.apiFinderResults`);

        // Store results globally
        globalThis.apiFinderResults = results;

        return results;
    }

    // Quick test specific endpoint by name
    async function testOne(name) {
        const token = (globalThis.goMiningToken || findToken() || '').replace('Bearer ', '').trim();
        if (!token) {
            console.error('❌ No token found!');
            return;
        }

        const endpoint = ENDPOINTS_TO_TEST.find(e => e.name.toLowerCase().includes(name.toLowerCase()));
        if (!endpoint) {
            console.error(`❌ Endpoint not found: ${name}`);
            console.log('Available endpoints:', ENDPOINTS_TO_TEST.map(e => e.name).join(', '));
            return;
        }

        return await testEndpoint(endpoint, token);
    }

    // ========== EXPOSE GLOBALLY ==========
    globalThis.testAllEndpoints = testAllEndpoints;
    globalThis.testVerified = testVerified;
    globalThis.testOne = testOne;
    globalThis.testEndpoint = testEndpoint;

    // Show help
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║       🎯 GoMining Referral & Bonus API Finder 🎯            ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

📚 How to use:

  testAllEndpoints()              - Test all ${VERIFIED.length + ENDPOINTS_TO_TEST.length} endpoints (verified + new)
  testVerified()                  - Test only ${VERIFIED.length} verified endpoints (to check token)
  testOne("referral")             - Test specific endpoint by name

🎯 What we're testing:
  ✅ ${VERIFIED.length} Verified: wallet/transaction-history, nft/get-my, etc.
  🔍 ${ENDPOINTS_TO_TEST.length} New patterns: referral-history/index, bonus/get-my, etc.

📊 Endpoint patterns:
  • {topic}-history/index with skip/limit pagination
  • {topic}/get-my with empty body  
  • {topic}/find-by-user with skip/limit pagination
  • {topic}/transaction-history with cursor pagination

Token: ${globalThis.goMiningToken ? '✅ Found' : '❌ Not found'}

💡 Run: testAllEndpoints()
    `);

})();

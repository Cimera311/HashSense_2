// ============================================================
// GoMining API Network Sniffer - Discover real API endpoints
// ============================================================
// Usage:
//   1. Go to app.gomining.com and login
//   2. Open Console (F12)
//   3. Paste this script and press Enter
//   4. Run: startSniffing()
//   5. Navigate through the app (wallet, miners, card, etc.)
//   6. Run: stopSniffing() to see results
// ============================================================

(function() {
    'use strict';

    // ========== CONFIG ==========
    const API_PATTERNS = [
        'gomining.com',  // Match ALL gomining.com requests
        '/api/',         // Any API path
        '/graphql'       // GraphQL endpoints
    ];
    
    // Storage for captured requests
    const capturedRequests = [];
    const allRequests = [];  // Debug: capture ALL requests
    let isSniffing = false;
    let debugMode = false;
    let originalFetch = null;
    let originalXHROpen = null;
    
    // Token detection
    function findToken() {
        // Try localStorage first
        const storage = ['token', 'authToken', 'access_token', 'jwt', 'auth'].map(k => localStorage.getItem(k)).find(Boolean);
        if (storage) return storage;
        
        // Try cookies
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
            const [key, value] = cookie.trim().split('=');
            acc[key] = value;
            return acc;
        }, {});
        
        return cookies.token || cookies.authToken || cookies.access_token || cookies.jwt || null;
    }

    // Store token globally
    globalThis.goMiningToken = globalThis.goMiningToken || findToken();

    // ========== NETWORK INTERCEPTORS ==========
    
    // Start intercepting network requests
    function startSniffing(debug = false) {
        if (isSniffing) {
            console.warn('⚠️ Already sniffing! Stop first with stopSniffing()');
            return;
        }

        debugMode = debug;

        console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║          🕵️ GoMining API Sniffer Started! 🕵️                ║
║                                                              ║
║  Navigate through the app to capture API calls...           ║
║  Run stopSniffing() when done                               ║
║                                                              ║
║  ${debug ? '🐛 DEBUG MODE: Logging ALL requests' : '🎯 FILTER MODE: Only GoMining APIs'}                    ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
        `);

        capturedRequests.length = 0;
        allRequests.length = 0;
        isSniffing = true;

        // Intercept fetch
        originaDebug: Log all requests
            if (debugMode) {
                console.log(`🔍 [DEBUG] Fetch: ${options.method || 'GET'} ${urlString.substring(0, 100)}`);
            }
            
            // Store all requests in debug mode
            if (debugMode) {
                allRequests.push({
                    method: options.method || 'GET',
                    url: urlString,
                    timestamp: new Date().toISOString()
                });
            }
            
            // Check if this is a GoMining API call
            const isGoMiningAPI = API_PATTERNS.some(pattern => urlString.includes(pattern));
            
            if (debugMode) {
                console.log(`   ${isGoMiningAPI ? '✅ MATCH' : '❌ NO MATCH'} (Patterns: ${API_PATTERNS.join(', ')})`);
            }
            
            if (isGoMiningAPI) {
                const requestData = {
                    timestamp: new Date().toISOString(),
                    method: options.method || 'GET',
                    url: urlString,
                    headers: options.headers || {},
                    body: options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : 
                    timestamp: new Date().toISOString(),
                    method: options.method || 'GET',
                    url: urlString,
                    headers: options.headers || {},
                    body: options.body ? JSON.parse(options.body) : null
                };

                try {
                    const response = await originalFetch.apply(this, args);
                    const clone = response.clone();
                    let responseData;
                    
                    try {
                        responseData = await clone.json();
                    } catch {
                        responseData = await clone.text();
                    }

                    requestData.status = response.status;
                    requestData.response = responseData;
                    requestData.responseType = typeof responseData;
// Debug: Log all XHR requests
            if (debugMode) {
                console.log(`🔍 [DEBUG] XHR: ${method} ${urlString.substring(0, 100)}`);
                allRequests.push({
                    method: method,
                    url: urlString,
                    timestamp: new Date().toISOString(),
                    source: 'XHR'
                });
            }
            
            const isGoMiningAPI = API_PATTERNS.some(pattern => urlString.includes(pattern));
            
            if (debugMode) {
                console.log(`   ${isGoMiningAPI ? '✅ MATCH' : '❌ NO MATCH'}`);
            }
            
            if (isGoMiningAPI) {
                this._capturedUrl = urlString;
                this._capturedMethod = method;
                
                this.addEventListener('load', function() {
                    let responseData;
                    try {
                        responseData = JSON.parse(this.responseText);
                    } catch {
                        responseData = this.responseText;
                    }

                    capturedRequests.push({
                        timestamp: new Date().toISOString(),
                        method: method,
                        url: urlString,
                        status: this.status,
                        response: responseData,
                        responseType: typeof responseData,
                        source: 'XHR'
                    });

                    console.log(`📡 Captured (XHR): ${method} ${urlString.split('?')[0]}`);
                });
            }

            return originalXHROpen.apply(this, [method, url, ...rest]);
        };
    }
    
    // Show debug requests
    function showDebugRequests() {
        if (allRequests.length === 0) {
            console.log('❌ No debug requests captured. Run startSniffing(true) for debug mode.');
            return;
        }
        
        console.log(`\n📋 All Captured Requests (${allRequests.length}):\n`);
        
        // Group by domain
        const byDomain = {};
        allRequests.forEach(req => {
            try {
                const url = new URL(req.url);
                const domain = url.hostname;
                if (!byDomain[domain]) byDomain[domain] = [];
                byDomain[domain].push(req);
            } catch {
                if (!byDomain['invalid']) byDomain['invalid'] = [];
                byDomain['invalid'].push(req);
            }
        });
        
        Object.entries(byDomain).forEach(([domain, requests]) => {
            console.log(`\n🌐 ${domain} (${requests.length} requests):`);
            requests.slice(0, 10).forEach(req => {
                console.log(`   ${req.method} ${req.url.substring(0, 100)}`);
            });
            if (requests.length > 10) {
                console.log(`   ... and ${requests.length - 10} more`);
            }
        });
        
        globalThis.allDebugRequests = allRequests;
        console.log(`\n💾 All requests stored in: globalThis.allDebugRequests`)               responseData = JSON.parse(this.responseText);
                    } catch {
                        responseData = this.responseText;
                    }

                    capturedRequests.push({
                        timestamp: new Date().toISOString(),
                        method: method,
                        url: urlString,
                        status: this.status,
                        response: responseData,
                        responseType: typeof responseData,
                        source: 'XHR'
                    });

                    console.log(`📡 Captured (XHR): ${method} ${urlString.split('?')[0]}`);
                });
            }

            return originalXHROpen.apply(this, [method, url, ...rest]);
        };
    }

    // Stop intercepting
    function stopSniffing() {
        if (!isSniffing) {
            console.warn('⚠️ Not currently sniffing!');
            return;
        }

        isSniffing = false;

        // Restore original functions
        if (originalFetch) {
            window.fetch = originalFetch;
        }
        if (originalXHROpen) {
            XMLHttpRequest.prototype.open = originalXHROpen;
        }

        console.log(`\n${'='.repeat(60)}`);
        console.log(`🎯 Sniffing stopped! Captured ${capturedRequests.length} requests`);
        console.log(`${'='.repeat(60)}\n`);

        analyzeCaptures();
    }

    // Analyze captured requests
    function analyzeCaptures() {
        if (capturedRequests.length === 0) {
            console.log('❌ No requests captured. Try navigating through the app while sniffing.');
            return;
        }

        // Group by endpoint
        const endpointMap = {};
        capturedRequests.forEach(req => {
            const urlObj = new URL(req.url);
            const path = urlObj.pathname;
            
            if (!endpointMap[path]) {
                endpointMap[path] = {
                    path,
                    method: req.method,
                    count: 0,
                    examples: [],
                    queryParams: new Set(),
                    successCount: 0,
                    failCount: 0
                };
            }

            endpointMap[path].count++;
            if (req.status >= 200 && req.status < 300) {
                endpointMap[path].successCount++;
            } else {
                endpointMap[path].failCount++;
            }

            // Collect query params
            urlObj.searchParams.forEach((val, key) => {
                endpointMap[path].queryParams.add(key);
            });

            // Store example (max 3)
            if (endpointMap[path].examples.length < 3) {
                endpointMap[path].examples.push({
                    url: req.url,
                    status: req.status,
                    response: req.response
                });
            }
        });

        // Display results
        console.log(`\n📊 Discovered Endpoints (${Object.keys(endpointMap).length}):\n`);

        Object.values(endpointMap).forEach(endpoint => {
            console.log(`\n${'─'.repeat(60)}`);
            console.log(`📍 ${endpoint.method} ${endpoint.path}`);
            console.log(`   Calls: ${endpoint.count} (${endpoint.successCount} ✅ / ${endpoint.failCount} ❌)`);
            
            if (endpoint.queryParams.size > 0) {
                console.log(`   Query Params: ${Array.from(endpoint.queryParams).join(', ')}`);
            }

            console.log(`\n   Example Response:`);
            if (endpoint.examples[0]) {
                const example = endpoint.examples[0].response;
                if (Array.isArray(example)) {
                    console.log(`   📦 Array with ${example.length} items`);
                    if (example.length > 0) {
                        console.log(`   🔑 Keys:`, Object.keys(example[0]));
                        console.log(`   📄 First item:`, example[0]);
                    }
                } else if (typeof example === 'object' && example !== null) {
                    console.log(`   🔑 Keys:`, Object.keys(example));
                    console.log(`   📄 Data:`, example);
                } else {
                    console.log(`   📄`, example);
                }
            }
        });

        console.log(`\n${'='.repeat(60)}`);
        console.log(`💾 All captures stored in: globalThis.capturedAPIRequests`);
        console.log(`🔍 View specific endpoint: viewEndpoint("/path")`);
        console.log(`📥 Export as JSON: exportCaptures()`);
        console.log(`${'='.repeat(60)}\n`);

        globalThis.capturedAPIRequests = capturedRequests;
        globalThis.endpointMap = endpointMap;
    }

    // View specific endpoint details
    function viewEndpoint(path) {
        const endpoint = globalThis.endpointMap?.[path];
        if (!endpoint) {
            console.error(`❌ Endpoint not found: ${path}`);
            console.log('Available endpoints:', Object.keys(globalThis.endpointMap || {}));
            return;
        }

        console.log(`\n${'='.repeat(60)}`);
        console.log(`📍 ${endpoint.method} ${endpoint.path}`);
        console.log(`${'='.repeat(60)}\n`);
        console.log(`Calls: ${endpoint.count}`);
        console.log(`Success: ${endpoint.successCount} ✅`);
        console.log(`Failed: ${endpoint.failCount} ❌`);
        
        if (endpoint.queryParams.size > 0) {
            console.log(`\nQuery Parameters:`);
            Array.from(endpoint.queryParams).forEach(param => {
                console.log(`  • ${param}`);
            });
        }

        console.log(`\nExamples:`);
        endpoint.examples.forEach((ex, i) => {
            console.log(`\n${i + 1}. Status ${ex.status}:`);
            console.log(`   URL: ${ex.url}`);
            console.log(`   Response:`, ex.response);
        });
    }

    // Export captures as JSON
    function exportCaptures() {
        const json = JSON.stringify({
            timestamp: new Date().toISOString(),
            totalRequests: capturedRequests.length,
            endpoints: globalThis.endpointMap,
            requests: capturedRequests
        }, null, 2);

        const blob = new Blob([json], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `gomining_api_captures_${new Date().toISOString().split('T')[0]}.json`;
        link.click();

        console.log(`✅ Exported ${capturedRequests.length} requests!`);
    }

    // Generate code for discovered endpoints
    function generateAPICode() {
        if (!globalThis.endpointMap) {
            console.error('❌ No captures available. Run startSniffing() first!');
            return;
        }

        console.log(`\n// ========== DISCOVERED API ENDPOINTS ==========\n`);
        
        Object.values(globalThis.endpointMap).forEach(endpoint => {
            const functionName = endpoint.path
                .split('/')
                .filter(Boolean)
                .map((part, i) => i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1))
                .join('');

            const params = Array.from(endpoint.queryParams);
            const paramString = params.length > 0 ? params.map(p => `${p} = null`).join(', ') : '';
            
            console.log(`async function ${functionName}(${paramString}) {`);
            console.log(`    const params = {${params.map(p => `${p}`).join(', ')}};`);
            console.log(`    return await callAPI('${endpoint.path}', params);`);
            console.log(`}\n`);
        });
    }

    // Quick test a discovered endpoint
    async function testDiscovered(path) {
        const endpoint = globalThis.endpointMap?.[path];
        if (!endpoint) {
            console.error(`❌ Endpoint not found: ${path}`);
            return;
        }

        console.log(`🧪 Testing: ${endpoint.method} ${path}`);
        
        // Use example URL if available
        if (endpoint.examples[0]) {
            const exampleUrl = endpoint.examples[0].url;
            console.log(`📡 Using example URL: ${exampleUrl}`);
            
            try {
                const response = await fetch(exampleUrl, {
                    headers: {
                        'Authorization': `Bearer ${globalThis.goMiningToken}`
                    }
                });

                const data = await response.json();
                console.log(`✅ Success!`, data);
                return data;
            } catch (error) {
                console.error(`❌ Failed:`, error);
                return null;
            }
        }
    }

    // ========== ENDPOINT DEFINITIONS ==========
    const API_ENDPOINTS = {
        // WALLET (4)
        wallet: {
            balances: { 
                endpoint: '/wallet/balances', 
                desc: 'Virtual wallet balances (BTC, GMT, USDT, USDC, etc.)' 
            },
            depositAddresses: { 
                endpoint: '/wallet/deposit-addresses', 
                desc: 'Deposit addresses for all supported assets' 
            },
            conversionQuote: { 
                endpoint: '/wallet/conversion-quote', 
                desc: 'Conversion quote between assets',
                params: { from: 'GMT', to: 'BTC', amount: 100 }
            },
            transactionHistory: { 
                endpoint: '/transaction-history', 
                desc: 'Transaction history (deposits/withdrawals)',
                params: { limit: 10, offset: 0 }
            }
        },

        // MINERS (4)
        miners: {
            nfts: { 
                endpoint: '/nfts', 
                desc: 'List of owned miners' 
            },
            nftDetail: { 
                endpoint: '/nft/detail', 
                desc: 'Full miner details',
                params: { nftId: 'FIRST_NFT_ID' } // Will be replaced dynamically
            },
            miningRewards: { 
                endpoint: '/nft/mining-rewards', 
                desc: 'Daily mining income over date range',
                params: { 
                    startDate: '2026-01-01', 
                    endDate: '2026-05-15' 
                }
            },
            upgradeTotal: { 
                endpoint: '/nft/upgrade/total', 
                desc: 'Overall upgrade stats' 
            }
        },

        // CARD (4)
        card: {
            cards: { 
                endpoint: '/card/cards', 
                desc: 'GoMining Cards list' 
            },
            balance: { 
                endpoint: '/card/balance', 
                desc: 'Card balance' 
            },
            transactions: { 
                endpoint: '/card/transactions', 
                desc: 'Card transaction history',
                params: { limit: 10, offset: 0 }
            },
            transactionDetail: { 
                endpoint: '/card/transaction/detail', 
                desc: 'Card transaction detail',
                params: { transactionId: 'FIRST_CARD_TX_ID' } // Will be replaced
            }
        },

        // STAKING (2)
        staking: {
            positions: { 
                endpoint: '/staking/positions', 
                desc: 'Active veGOMINING staking positions' 
            },
            types: { 
                endpoint: '/staking/types', 
                desc: 'Available staking types' 
            }
        },

        // ACCOUNT (5)
        account: {
            kycStatus: { 
                endpoint: '/account/kyc-status', 
                desc: 'KYC verification status' 
            },
            referralLink: { 
                endpoint: '/account/referral-link', 
                desc: 'Referral code and link' 
            },
            referralStats: { 
                endpoint: '/account/referral-stats', 
                desc: 'Referral program statistics' 
            },
            avatars: { 
                endpoint: '/account/avatars', 
                desc: 'Owned avatars' 
            },
            avatarCollections: { 
                endpoint: '/account/avatar-collections', 
                desc: 'Available avatars for purchase',
                params: { race: 'all', marketplace: 'all' }
            }
        },

        // MINER WARS (2)
        minerWars: {
            miningIncome: { 
                endpoint: '/miner-wars/mining-income', 
                desc: 'Miner Wars income over date range',
                params: { 
                    startDate: '2026-01-01', 
                    endDate: '2026-05-15',
                    period: 'day' 
                }
            },
            spells: { 
                endpoint: '/miner-wars/spells', 
                desc: 'Available Miner Wars spells' 
            }
        },

        // MARKETPLACE (4)
        marketplace: {
            pricing: { 
                endpoint: '/marketplace/pricing', 
                desc: 'Official marketplace pricing' 
            },
            search: { 
                endpoint: '/marketplace/secondary/search', 
                desc: 'Search secondary marketplace',
                params: { 
                    limit: 10, 
                    offset: 0,
                    sortBy: 'price',
                    sortOrder: 'asc' 
                }
            },
            myListings: { 
                endpoint: '/marketplace/listings/my', 
                desc: 'My marketplace listings' 
            },
            myOrders: { 
                endpoint: '/marketplace/orders/my', 
                desc: 'My marketplace orders (sell orders)',
                params: { status: 'all' }
            }
        },

        // SIMPLE EARN (5)
        simpleEarn: {
            eligibility: { 
                endpoint: '/simple-earn/eligibility', 
                desc: 'Simple Earn eligibility check' 
            },
            status: { 
                endpoint: '/simple-earn/status', 
                desc: 'Simple Earn enrollment status' 
            },
            rewards: { 
                endpoint: '/simple-earn/rewards', 
                desc: 'Simple Earn reward history',
                params: { limit: 10, offset: 0 }
            },
            rewardTotals: { 
                endpoint: '/simple-earn/reward-totals', 
                desc: 'Total Simple Earn rewards' 
            },
            config: { 
                endpoint: '/simple-earn/config', 
                desc: 'Simple Earn rates and config' 
            }
        },

        // VIP & LOYALTY (6)
        vip: {
            level: { 
                endpoint: '/vip/level', 
                desc: 'Current VIP status' 
            },
            benefits: { 
                endpoint: '/vip/benefits', 
                desc: 'VIP benefits breakdown' 
            },
            progress: { 
                endpoint: '/vip/progress', 
                desc: 'VIP progress and tier requirements' 
            },
            subscription: { 
                endpoint: '/vip/subscription', 
                desc: 'VIP Platinum Subscription status' 
            },
            cashbackStats: { 
                endpoint: '/cashback/stats', 
                desc: 'Cashback setup and rates' 
            },
            cashbackHistory: { 
                endpoint: '/cashback/history', 
                desc: 'Cashback earnings history',
                params: { limit: 10, offset: 0 }
            }
        },

        // LAUNCHPAD (3)
        launchpad: {
            projects: { 
                endpoint: '/launchpad/projects', 
                desc: 'BTCFi token sales on Launchpad' 
            },
            allocation: { 
                endpoint: '/launchpad/allocation', 
                desc: 'Launchpad allocation',
                params: { walletAddress: 'YOUR_WALLET' } // Will need to be set
            },
            tierConfig: { 
                endpoint: '/launchpad/tier-config', 
                desc: 'Launchpad tier configuration' 
            }
        },

        // ACADEMY (2)
        academy: {
            courses: { 
                endpoint: '/academy/courses', 
                desc: 'All Academy courses' 
            },
            courseProgress: { 
                endpoint: '/academy/course/progress', 
                desc: 'Progress on specific course',
                params: { courseId: 'FIRST_COURSE_ID' } // Will be replaced
            }
        },

        // MARKET DATA (1)
        market: {
            tickerPrices: { 
                endpoint: '/ticker/prices', 
                desc: 'Current crypto and fiat prices' 
            }
        }
    };

    // ========== TESTER FUNCTIONS ==========
    
    // Test single endpoint
    async function testEndpoint(category, name, config) {
        console.log(`\n🔍 Testing: ${category}.${name}`);
        console.log(`   📝 ${config.desc}`);
        console.log(`   🌐 ${config.endpoint}`);
        
        if (config.params) {
            console.log(`   📦 Params:`, config.params);
        }

        const result = await callAPI(config.endpoint, config.params);
        
        if (result) {
            console.log(`   ✅ Success!`);
            console.log(`   📊 Response:`, result);
            
            // Show key metrics
            if (Array.isArray(result)) {
                console.log(`   📈 Array length: ${result.length}`);
                if (result.length > 0) {
                    console.log(`   🔑 First item keys:`, Object.keys(result[0]));
                }
            } else if (typeof result === 'object') {
                console.log(`   🔑 Response keys:`, Object.keys(result));
            }
        } else {
            console.log(`   ❌ Failed or empty response`);
        }

        return result;
    }

    // Test all endpoints in a category
    async function testCategory(categoryName) {
        const category = API_ENDPOINTS[categoryName];
        if (!category) {
            console.error(`❌ Unknown category: ${categoryName}`);
            console.log('Available categories:', Object.keys(API_ENDPOINTS));
            return;
        }

        console.log(`\n${'='.repeat(60)}`);
        console.log(`📁 CATEGORY: ${categoryName.toUpperCase()}`);
        console.log(`${'='.repeat(60)}`);

        const results = {};
        for (const [name, config] of Object.entries(category)) {
            results[name] = await testEndpoint(categoryName, name, config);
            await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
        }

        return results;
    }

    // Test all endpoints
    async function testAllEndpoints() {
        console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║          🧪 GoMining MCP API Complete Tester 🧪              ║
║                                                              ║
║  Testing all ${Object.keys(API_ENDPOINTS).reduce((sum, cat) => sum + Object.keys(API_ENDPOINTS[cat]).length, 0)} available API endpoints...                        ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
        `);

        if (!globalThis.goMiningToken) {
            console.error('❌ No token found!');
            console.log('Please set: globalThis.goMiningToken = "YOUR_TOKEN"');
            return;
        }

        console.log(`✅ Token found: ${globalThis.goMiningToken.substring(0, 20)}...`);

        const allResults = {};
        const categories = Object.keys(API_ENDPOINTS);

        for (let i = 0; i < categories.length; i++) {
            const categoryName = categories[i];
            console.log(`\n\n🔄 Progress: ${i + 1}/${categories.length}`);
            allResults[categoryName] = await testCategory(categoryName);
        }

        // Summary
        console.log(`\n\n${'='.repeat(60)}`);
        console.log(`📊 SUMMARY`);
        console.log(`${'='.repeat(60)}`);

        let totalSuccess = 0;
        let totalFailed = 0;

        Object.entries(allResults).forEach(([category, results]) => {
            const success = Object.values(results).filter(r => r !== null).length;
            const failed = Object.values(results).filter(r => r === null).length;
            totalSuccess += success;
            totalFailed += failed;

            console.log(`\n📁 ${category}: ${success} ✅ / ${failed} ❌`);
        });

        console.log(`\n🎯 Total: ${totalSuccess} successful, ${totalFailed} failed`);
        console.log(`\n💾 Results stored in: globalThis.apiTestResults`);

        // Store results globally
        globalThis.apiTestResults = allResults;
showDebugRequests = showDebugRequests;
    globalThis.
        return allResults;
    }

    // Quick test specific endpoint
    function testOne(category, endpoint) {
        const config = API_ENDPOINTS[category]?.[endpoint];
        if (!config) {
            console.error(`❌ Endpoint not found: ${category}.${endpoint}`);
            return;
        }
        return testEndpoint(category, endpoint, config);
    }

    // List all available endpoints
    function listEndpoints() {
        console.log(`\n📋 Available API Endpoints:\n`);
        Object.entries(API_ENDPOINTS).forEach(([category, endpoints]) => {
            console.log(`\n📁 ${category.toUpperCase()} (${Object.keys(endpoints).length} endpoints):`);
            Object.entries(endpoints).forEach(([name, config]) => {
                console.log(`   • ${name}: ${config.desc}`);
            });
        });
    }

    // Export to CSV (for specific category)
    function exportCategoryToCSV(categoryName, endpointName) {
        const result = globalThis.apiTestResults?.[categoryName]?.[endpointName];
        if (!result) {
            console.error(`❌ No data found for ${categoryName}.${endpointName}`);
            console.log('Run testAllEndpoints() first!');
            return;
        }

  startSniffing()                 - Start capturing (filtered mode)
  startSniffing(true)             - Start with DEBUG mode (shows ALL requests)
  stopSniffing()                  - Stop and analyze
  showDebugRequests()             - Show all captured requests (debug mode)

🔍 After capturing:

  viewEndpoint("/path")           - View details for specific endpoint
  testDiscovered("/path")         - Test an endpoint again
  generateAPICode()               - Generate code for all endpoints
  exportCaptures()                - Export as JSON file

💡 Workflow (if nothing captured):

  1. startSniffing(true)          // DEBUG: Shows EVERY request
  2. [Click around GoMining app]  // Visit wallet, miners, transactions
  3. stopSniffing()               // Analyze
  4. showDebugRequests()          // See ALL requests to find patterns

💡 Normal workflow:

  1. startSniffing()              // Filter mode (only GoMining)
  2. [Navigate app]
  3. stopSniffing()
  4. generateAPICode()
            ...result.map(row => 
                allKeys.map(key => {
                    const value = row[key];
                    if (value === null || value === undefined) return '';
                    if (typeof value === 'object') return JSON.stringify(value);
                    return String(value).replace(/;/g, ',');
                }).join(';')
            )
        ].join('\n');

        // Download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `gomining_${categoryName}_${endpointName}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();

        console.log(`✅ Exported ${result.length} rows to CSV!`);
    }

    // ========== EXPOSE GLOBALLY ==========
    globalThis.startSniffing = startSniffing;
    globalThis.stopSniffing = stopSniffing;
    globalThis.viewEndpoint = viewEndpoint;
    globalThis.exportCaptures = exportCaptures;
    globalThis.generateAPICode = generateAPICode;
    globalThis.testDiscovered = testDiscovered;

    // Show help
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║          🕵️ GoMining API Network Sniffer 🕵️                 ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

📚 How to use:

  1. startSniffing()              - Start capturing API calls
  2. Navigate through app.gomining.com (wallet, miners, card, etc.)
  3. stopSniffing()               - Stop and analyze

🔍 After capturing:

  viewEndpoint("/path")           - View details for specific endpoint
  testDiscovered("/path")         - Test an endpoint again
  generateAPICode()               - Generate code for all endpoints
  exportCaptures()                - Export as JSON file

💡 Workflow:

  1. startSniffing()              // Starts monitoring
  2. [Click around GoMining app]  // Visit wallet, miners, transactions, etc.
  3. stopSniffing()               // Shows all discovered APIs
  4. generateAPICode()            // Creates ready-to-use functions

🎯 Goal: Discover the REAL API endpoints GoMining uses!

Token: ${globalThis.goMiningToken ? '✅ Found' : '❌ Not found'}
    `);

})();

// ============================================================
// GoMining Referral Complete Export
// Exports ALL referral data using real API structure
// ============================================================
// Usage:
//   1. Go to app.gomining.com and login
//   2. Open Console (F12)
//   3. Paste this script and press Enter
//   4. Run: exportAllReferralData()
//
// Type-specific exports:
//   exportRoyalties()          - income-kw-consumed-royalty
//   exportNftPayments()        - nft-payment
//   exportRegistrations()      - registration
//   exportInternalPayments()   - internal-payment
//   exportSimpleEarnRewards()  - simple-earn-reward
//   exportCardTransactions()   - card-transaction + card-issued
//   exportByTypes([...])       - custom type array
// ============================================================

(function() {
    'use strict';

    const REFERRAL_API_BASE = 'https://referral-api.bounty.gomining.com/api';

    // All known transaction types (from API payload inspection)
    const ALL_TYPES = [
        'registration',
        'nft-payment',
        'internal-payment',
        'nft-game-ability-payment',
        'card-issued',
        'card-transaction',
        'simple-earn-reward',
        'income-kw-consumed-royalty'
    ];

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
    globalThis.stopReferralExport = false; // Stop flag

    // Get referral summary data
    async function getReferralSummary(token) {
        console.log('\n🔍 Fetching Referral Summary...');
        
        try {
            const response = await fetch(`${REFERRAL_API_BASE}/ref-program/get-referrer-rewards`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Origin': 'https://app.gomining.com',
                    'Referer': 'https://app.gomining.com/',
                    'x-device-type': 'desktop'
                },
                body: JSON.stringify({})
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Referral Summary:', data.data);
                return data.data;
            }
        } catch (e) {
            console.error('❌ Failed to get summary:', e.message);
        }
        return null;
    }

    // Get total rewards
    async function getTotalRewards(token) {
        console.log('\n🔍 Fetching Total Rewards...');
        
        try {
            const response = await fetch(`${REFERRAL_API_BASE}/ref-program/get-total-rewards`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Origin': 'https://app.gomining.com',
                    'Referer': 'https://app.gomining.com/',
                    'x-device-type': 'desktop'
                },
                body: JSON.stringify({})
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Total Rewards:', data.data);
                return data.data;
            }
        } catch (e) {
            console.error('❌ Failed to get rewards:', e.message);
        }
        return null;
    }

    // Get referrals list with pagination
    // types: array of type strings to filter, or null / [] for ALL types
    async function getAllReferrals(token, period = 'ALL', customFrom = null, customTo = null, types = null) {
        const typeLabel = (types && types.length) ? types.join(', ') : 'ALL';
        console.log(`\n🔍 Fetching Referrals (get-my) [types: ${typeLabel}]...`);
        
        globalThis.stopReferralExport = false;
        
        // Build date range
        let startDate, endDate;
        
        if (customFrom && customTo) {
            startDate = new Date(customFrom);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(customTo);
            endDate.setHours(23, 59, 59, 999);
            console.log(`   📅 Range: ${customFrom} to ${customTo}`);
        } else {
            endDate = new Date();
            endDate.setHours(23, 59, 59, 999);
            startDate = new Date();
            if (period === '3M') {
                startDate.setMonth(startDate.getMonth() - 3);
            } else if (period === '1Y') {
                startDate.setFullYear(startDate.getFullYear() - 1);
            } else {
                startDate.setFullYear(2024, 4, 4); // 2024-05-04 (platform start)
            }
            startDate.setHours(0, 0, 0, 0);
            console.log(`   📅 Range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
        }
        
        let allReferrals = [];
        let skip = 0;
        const limit = 100;
        let hasMore = true;
        let totalCount = null;
        let rewardsGmtTotal = null;

        while (hasMore) {
            if (globalThis.stopReferralExport) {
                console.log('\n🛑 Export stopped by user!');
                break;
            }
            
            try {
                // Always send full filters object – matches exact API payload format
                const requestBody = {
                    filters: {
                        createdAt: {
                            range: {
                                start: startDate.toISOString(),
                                end: endDate.toISOString()
                            }
                        },
                        status: [],
                        type: (types && types.length) ? types : ALL_TYPES
                    },
                    pagination: {
                        skip: skip,
                        limit: limit
                    }
                };

                const response = await fetch(`${REFERRAL_API_BASE}/ref-program/get-my`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Origin': 'https://app.gomining.com',
                        'Referer': 'https://app.gomining.com/',
                        'x-device-type': 'desktop'
                    },
                    body: JSON.stringify(requestBody)
                });

                if (response.ok) {
                    const data = await response.json();
                    const items = data.data?.array || data.data?.items || data.data || [];
                    const count = data.data?.count || items.length;

                    // Capture GMT total (API returns it on every page – same value)
                    if (rewardsGmtTotal === null && data.data?.rewardsGmtTotalWithFilters != null) {
                        rewardsGmtTotal = data.data.rewardsGmtTotalWithFilters;
                    }
                    
                    if (totalCount === null) {
                        totalCount = count;
                        const gmtInfo = rewardsGmtTotal != null ? ` | GMT Total: ${rewardsGmtTotal.toFixed(8)}` : '';
                        console.log(`   📊 Total matching: ${totalCount}${gmtInfo}`);
                    }
                    
                    console.log(`   Batch ${Math.floor(skip/limit)+1}: +${items.length} (${allReferrals.length + items.length}/${totalCount})`);
                    
                    if (items.length === 0) {
                        hasMore = false;
                    } else {
                        allReferrals.push(...items);
                        skip += limit;
                        if (skip >= totalCount) hasMore = false;
                    }
                } else {
                    console.error(`   ❌ Failed: ${response.status}`);
                    try { console.error(`   Error:`, await response.json()); } catch (e) {}
                    hasMore = false;
                }

                await new Promise(r => setTimeout(r, 200));
                
            } catch (e) {
                console.error(`   ❌ Error: ${e.message}`);
                hasMore = false;
            }
        }

        const gmtSuffix = rewardsGmtTotal != null ? ` | GMT (filter): ${rewardsGmtTotal.toFixed(8)}` : '';
        console.log(`✅ Loaded ${allReferrals.length} transactions${gmtSuffix}`);

        // Attach metadata for callers
        allReferrals._rewardsGmtTotal = rewardsGmtTotal;
        allReferrals._totalCount = totalCount;
        return allReferrals;
    }

    // Export all referral data
    async function exportAllReferralData() {
        console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║       📊 GoMining Referral Complete Export 📊               ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
        `);

        const token = (globalThis.goMiningToken || findToken() || '').replace('Bearer ', '').trim();
        if (!token) {
            console.error('❌ No token found!');
            return;
        }

        console.log(`🔑 Token: ${token.substring(0, 20)}...`);

        const results = {
            summary: null,
            totalRewards: null,
            transactions: []  // All from get-my
        };

        // 1. Get summary
        results.summary = await getReferralSummary(token);

        // 2. Get total rewards
        results.totalRewards = await getTotalRewards(token);

        // 3. Get all transactions from get-my (all types, full history)
        results.transactions = await getAllReferrals(token, 'ALL');
        results.rewardsGmtTotal = results.transactions._rewardsGmtTotal;

        // Summary
        console.log(`\n\n${'═'.repeat(60)}`);
        console.log(`📊 EXPORT SUMMARY`);
        console.log(`${'═'.repeat(60)}\n`);

        console.log(`✅ Referral Summary:`);
        if (results.summary) {
            console.log(`   • Referrals: ${results.summary.referralCount || 0}`);
            console.log(`   • Total Power: ${results.summary.nftTotalPower || 0} TH/s`);
            console.log(`   • Eligible Power: ${results.summary.nftTotalEligiblePower || 0} TH/s`);
            console.log(`   • kW Consumed: ${results.summary.totalKwConsumed || 0}`);
            console.log(`   • kW Rewards: $${results.summary.totalKwRewardInUsd || 0}`);
        }

        console.log(`\n✅ Total Rewards (all-time):`);
        if (results.totalRewards) {
            console.log(`   • Total USD: $${results.totalRewards.totalRewardsSumUsd || 0}`);
            console.log(`   • GMT: ${results.totalRewards.totalRewardsGmt || 0} ($${results.totalRewards.totalRewardsGmtInUsd || 0})`);
            console.log(`   • USDT: ${results.totalRewards.totalRewardsUsdt || 0}`);
        }

        if (results.rewardsGmtTotal != null) {
            console.log(`\n✅ GMT Total (filtered period): ${results.rewardsGmtTotal.toFixed(8)} GMT`);
        }

        console.log(`\n✅ Transactions Loaded: ${results.transactions.length}`);
        const byType = {};
        results.transactions.forEach(t => {
            const type = t.type || 'unknown';
            byType[type] = (byType[type] || 0) + 1;
        });
        Object.entries(byType).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
            console.log(`   • ${type}: ${count}`);
        });

        globalThis.referralExportData = results;

        console.log(`\n💾 All data stored in: globalThis.referralExportData`);
        console.log(`\n💡 To export to CSV:`);
        console.log(`   exportTransactionsToCSV()`);
        console.log(`\n💡 Type-specific exports:`);
        console.log(`   exportRoyalties()           → income-kw-consumed-royalty`);
        console.log(`   exportNftPayments()          → nft-payment`);
        console.log(`   exportRegistrations()        → registration`);
        console.log(`   exportInternalPayments()     → internal-payment`);
        console.log(`   exportSimpleEarnRewards()    → simple-earn-reward`);
        console.log(`   exportCardTransactions()     → card-transaction + card-issued`);

        return results;
    }

    // Helper: Format number for German locale
    function formatNumberDE(value) {
        if (value === null || value === undefined || value === '') return '0';
        const num = parseFloat(value);
        if (isNaN(num)) return '0';
        return num.toString().replace('.', ',');
    }

    // Export all transactions to CSV – optionally pre-filtered by type(s)
    function exportTransactionsToCSV(filterTypes = null) {
        const data = globalThis.referralExportData;
        if (!data || !data.transactions) {
            console.error('❌ Run exportAllReferralData() or exportReferralDataRange() first!');
            return;
        }

        let transactions = data.transactions;
        if (filterTypes && filterTypes.length) {
            transactions = transactions.filter(t => filterTypes.includes(t.type));
            console.log(`🔍 Filtered to types [${filterTypes.join(', ')}]: ${transactions.length} transactions`);
        }
        if (transactions.length === 0) {
            console.log('⚠️ No transactions to export');
            return;
        }

        // German CSV headers
        const headers = [
            'Nr',
            'Serial ID',
            'Datum',
            'Zeit',
            'User ID',
            'Typ',
            'Währung',
            'Betrag (GMT/USDT)',
            'Betrag USD',
            'Status',
            'Reward Koeffizient',
            'kW Verbraucht',
            'Power gesamt (TH)',
            'Effizienz (W/TH)',
            'Kaufpreis',
            'Kaufpreis USD',
            'Kaufpreis BTC'
        ];

        let csv = headers.join(';') + '\n';
        
        transactions.forEach((item, index) => {
            const date = new Date(item.createdAt);
            const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
            const timeStr = date.toTimeString().split(' ')[0]; // HH:MM:SS
            
            const row = [
                index + 1,
                item.serial_id || '',
                dateStr,
                timeStr,
                item.userId || '',
                item.type || '',
                item.currency || '',
                formatNumberDE(item.reward),          // raw reward amount (GMT or USDT)
                formatNumberDE(item.rewardInUsd),
                item.status || '',
                formatNumberDE(item.rewardCoefficient),
                formatNumberDE(item.royaltyKwConsumed),
                formatNumberDE(item.royaltyTotalPower),
                formatNumberDE(item.royaltyEnergyEfficiency),
                formatNumberDE(item.purchaseValue),
                formatNumberDE(item.purchaseValueInUsd),
                formatNumberDE(item.purchaseValueInBtc)
            ];
            
            csv += row.map(val => `"${val}"`).join(';') + '\n';
        });

        const typeTag = filterTypes && filterTypes.length ? `_${filterTypes[0].replace(/-/g, '_')}${filterTypes.length > 1 ? '_etc' : ''}` : '';
        const filename = `gomining_referral${typeTag}_${new Date().toISOString().split('T')[0]}.csv`;
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log(`✅ Exported ${transactions.length} transactions to ${filename}`);
    }

    // Stop export function
    function stopExport() {
        globalThis.stopReferralExport = true;
        console.log('🛑 Stopping export... (may take a few seconds)');
    }

    // Export referral data for specific date range
    async function exportReferralDataRange(fromDate, toDate) {
        console.log(`
╔══════════════════════════════════════════════════════════════╗
║       📊 GoMining Referral Export - Date Range 📊           ║
╚══════════════════════════════════════════════════════════════╝\n`);

        const token = (globalThis.goMiningToken || findToken() || '').replace('Bearer ', '').trim();
        if (!token) {
            console.error('❌ No token found!');
            return;
        }

        console.log(`🔑 Token: ${token.substring(0, 20)}...`);
        console.log(`📅 Period: ${fromDate} to ${toDate}`);

        const results = {
            summary: null,
            totalRewards: null,
            transactions: []
        };

        results.transactions = await getAllReferrals(token, 'CUSTOM', fromDate, toDate);
        results.rewardsGmtTotal = results.transactions._rewardsGmtTotal;

        console.log(`\n✅ Transactions: ${results.transactions.length}`);
        if (results.rewardsGmtTotal != null) {
            console.log(`   GMT Total (period): ${results.rewardsGmtTotal.toFixed(8)} GMT`);
        }
        const byType = {};
        results.transactions.forEach(t => { byType[t.type || 'unknown'] = (byType[t.type || 'unknown'] || 0) + 1; });
        Object.entries(byType).sort((a,b) => b[1]-a[1]).forEach(([type, count]) => console.log(`   • ${type}: ${count}`));

        globalThis.referralExportData = results;

        console.log(`\n💾 Data stored in: globalThis.referralExportData`);
        console.log(`💡 To export: exportTransactionsToCSV()`);

        return results;
    }

    // ──────────────────────────────────────────────────────
    // TYPE-SPECIFIC EXPORT FUNCTIONS
    // Each fetches only its type(s) from the API (efficient)
    // ──────────────────────────────────────────────────────

    async function _exportByTypesInternal(types, label, fromDate = null, toDate = null) {
        const token = (globalThis.goMiningToken || findToken() || '').replace('Bearer ', '').trim();
        if (!token) { console.error('❌ No token found!'); return; }
        console.log(`\n📊 Fetching [${label}]...`);
        const txs = await getAllReferrals(token, 'ALL', fromDate, toDate, types);
        const results = { transactions: txs, rewardsGmtTotal: txs._rewardsGmtTotal };
        globalThis.referralExportData = results;
        console.log(`\n💡 Now run: exportTransactionsToCSV()  (${txs.length} transactions)`);
        if (txs._rewardsGmtTotal != null) console.log(`   GMT Total: ${txs._rewardsGmtTotal.toFixed(8)} GMT`);
        return results;
    }

    // Royalty rewards (kW consumed royalty – most frequent type)
    async function exportRoyalties(fromDate = null, toDate = null) {
        return _exportByTypesInternal(['income-kw-consumed-royalty'], 'income-kw-consumed-royalty', fromDate, toDate);
    }

    // NFT purchase payments from referrals
    async function exportNftPayments(fromDate = null, toDate = null) {
        return _exportByTypesInternal(['nft-payment'], 'nft-payment', fromDate, toDate);
    }

    // New user registrations
    async function exportRegistrations(fromDate = null, toDate = null) {
        return _exportByTypesInternal(['registration'], 'registration', fromDate, toDate);
    }

    // Internal payments (upgrade payments etc.)
    async function exportInternalPayments(fromDate = null, toDate = null) {
        return _exportByTypesInternal(['internal-payment'], 'internal-payment', fromDate, toDate);
    }

    // Simple earn rewards
    async function exportSimpleEarnRewards(fromDate = null, toDate = null) {
        return _exportByTypesInternal(['simple-earn-reward'], 'simple-earn-reward', fromDate, toDate);
    }

    // Card transactions (card-issued + card-transaction)
    async function exportCardTransactions(fromDate = null, toDate = null) {
        return _exportByTypesInternal(['card-issued', 'card-transaction'], 'card-issued + card-transaction', fromDate, toDate);
    }

    // Generic: pass any array of types
    async function exportByTypes(types, fromDate = null, toDate = null) {
        if (!Array.isArray(types) || !types.length) {
            console.error('❌ Pass an array of types, e.g. exportByTypes(["nft-payment","registration"])');
            console.log('   Available types:', ALL_TYPES.join(', '));
            return;
        }
        return _exportByTypesInternal(types, types.join(', '), fromDate, toDate);
    }

    // Expose globally
    globalThis.exportAllReferralData   = exportAllReferralData;
    globalThis.exportReferralDataRange = exportReferralDataRange;
    globalThis.exportTransactionsToCSV = exportTransactionsToCSV;
    globalThis.stopExport              = stopExport;
    // Type-specific
    globalThis.exportRoyalties         = exportRoyalties;
    globalThis.exportNftPayments       = exportNftPayments;
    globalThis.exportRegistrations     = exportRegistrations;
    globalThis.exportInternalPayments  = exportInternalPayments;
    globalThis.exportSimpleEarnRewards = exportSimpleEarnRewards;
    globalThis.exportCardTransactions  = exportCardTransactions;
    globalThis.exportByTypes           = exportByTypes;

    // Show help
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║       📊 GoMining Referral Complete Export 📊               ║
╚══════════════════════════════════════════════════════════════╝

Full export (all types):
  exportAllReferralData()                               - All data since start
  exportReferralDataRange("2026-01-01", "2026-12-31")  - Custom date range
  exportTransactionsToCSV()                             - Download CSV

Type-specific exports (faster – fetch only what you need):
  exportRoyalties()                                     - income-kw-consumed-royalty
  exportNftPayments()                                   - nft-payment
  exportRegistrations()                                 - registration
  exportInternalPayments()                              - internal-payment
  exportSimpleEarnRewards()                             - simple-earn-reward
  exportCardTransactions()                              - card-issued + card-transaction
  exportByTypes(["nft-payment","registration"])         - custom type array

  All type functions accept optional (fromDate, toDate):
    exportRoyalties("2026-01-01", "2026-05-22")
    exportNftPayments("2025-01-01", "2025-12-31")

Available types: ${ALL_TYPES.join(', ')}

Utility:
  stopExport()   - Stop a running export

Token: ${globalThis.goMiningToken ? '✅ Found' : '❌ Not found'}

💡 Quick start: exportRoyalties()  or  exportAllReferralData()
    `);

})();

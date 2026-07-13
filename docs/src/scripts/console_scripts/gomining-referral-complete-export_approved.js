// ============================================================
// GoMining Referral Complete Export
// Exports ALL referral data using real API structure
// ============================================================
// Usage:
//   1. Go to app.gomining.com and login
//   2. Open Console (F12)
//   3. Paste this script and press Enter
//   4. Run: exportAllReferralData()
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
    async function getAllReferrals(token, period = 'ALL', customFrom = null, customTo = null) {
        console.log('\n🔍 Fetching Referrals (get-my)...');
        
        // Reset stop flag
        globalThis.stopReferralExport = false;
        
        // Calculate date range
        let startDate, endDate;
        let filterByDate = false;
        
        if (customFrom && customTo) {
            // Custom date range
            startDate = new Date(customFrom);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(customTo);
            endDate.setHours(23, 59, 59, 999);
            filterByDate = true;
            console.log(`   📅 Custom Range: ${customFrom} to ${customTo}`);
            console.log(`   🎯 API will filter results (efficient!)`);
        } else {
            // Predefined periods
            endDate = new Date();
            endDate.setHours(23, 59, 59, 999);
            
            startDate = new Date();
            if (period === '3M') {
                startDate.setMonth(startDate.getMonth() - 3);
            } else if (period === '1Y') {
                startDate.setFullYear(startDate.getFullYear() - 1);
            } else if (period === 'ALL') {
                startDate.setFullYear(2024, 4, 4); // 2024-05-04
            }
            startDate.setHours(0, 0, 0, 0);
        }
        
        let allReferrals = [];
        let skip = 0;
        const limit = 20;
        let hasMore = true;
        let totalCount = null;

        while (hasMore) {
            // Check stop flag
            if (globalThis.stopReferralExport) {
                console.log('\n🛑 Export stopped by user!');
                hasMore = false;
                break;
            }
            
            try {
                // Build request body with filters (if date range specified)
                const requestBody = {
                    pagination: {
                        skip: skip,
                        limit: limit
                    }
                };
                
                // Add date filter if custom range (CORRECT nested structure!)
                if (filterByDate) {
                    requestBody.filters = {
                        createdAt: {
                            range: {
                                start: startDate.toISOString(),
                                end: endDate.toISOString()
                            }
                        },
                        status: [],
                        type: []
                    };
                }

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
                    // Response structure: { data: { array: [...], count: 52314 } }
                    const items = data.data?.array || data.data?.items || data.data || [];
                    const count = data.data?.count || items.length;
                    
                    if (totalCount === null) {
                        totalCount = count;
                    }
                    
                    console.log(`   Batch ${Math.floor(skip/limit)+1}: Loaded ${items.length} items (${allReferrals.length + items.length}/${totalCount} total)`);
                    
                    if (items.length === 0) {
                        hasMore = false;
                    } else {
                        allReferrals.push(...items);
                        skip += limit;
                        
                        if (skip >= totalCount) {
                            hasMore = false;
                        }
                    }
                } else {
                    console.error(`   ❌ Failed: ${response.status}`);
                    try {
                        const errorData = await response.json();
                        console.error(`   Error:`, errorData);
                    } catch (e) {}
                    hasMore = false;
                }

                await new Promise(r => setTimeout(r, 200));
                
            } catch (e) {
                console.error(`   ❌ Error: ${e.message}`);
                hasMore = false;
            }
        }

        console.log(`✅ Loaded ${allReferrals.length} referral transactions`);
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

        // 3. Get all transactions from get-my (includes ALL types)
        results.transactions = await getAllReferrals(token, 'ALL');

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

        console.log(`\n✅ Total Rewards:`);
        if (results.totalRewards) {
            console.log(`   • Total USD: $${results.totalRewards.totalRewardsSumUsd || 0}`);
            console.log(`   • GMT: ${results.totalRewards.totalRewardsGmt || 0} ($${results.totalRewards.totalRewardsGmtInUsd || 0})`);
            console.log(`   • USDT: ${results.totalRewards.totalRewardsUsdt || 0}`);
        }

        console.log(`\n✅ Transactions Loaded:`);
        console.log(`   • Total: ${results.transactions.length}`);
        
        // Count by type
        const byType = {};
        results.transactions.forEach(t => {
            const type = t.type || 'unknown';
            byType[type] = (byType[type] || 0) + 1;
        });
        Object.entries(byType).forEach(([type, count]) => {
            console.log(`   • ${type}: ${count}`);
        });

        // Store globally
        globalThis.referralExportData = results;

        console.log(`\n💾 All data stored in: globalThis.referralExportData`);
        console.log(`\n💡 To export to CSV:`);
        console.log(`   exportTransactionsToCSV()`);

        return results;
    }

    // Helper: Format number for German locale
    function formatNumberDE(value) {
        if (value === null || value === undefined || value === '') return '0';
        const num = parseFloat(value);
        if (isNaN(num)) return '0';
        return num.toString().replace('.', ',');
    }

    // Export all transactions to CSV (improved German format)
    function exportTransactionsToCSV() {
        const data = globalThis.referralExportData;
        if (!data || !data.transactions) {
            console.error('❌ Run exportAllReferralData() first!');
            return;
        }

        const transactions = data.transactions;
        if (transactions.length === 0) {
            console.log('⚠️ No transactions to export');
            return;
        }

        // German CSV headers
        const headers = [
            'Nr',
            'Datum',
            'Zeit',
            'User ID',
            'Typ',
            'Währung',
            'Betrag',
            'Betrag USD',
            'Status',
            'Reward Koeffizient',
            'kW Verbraucht',
            'Power (TH)',
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
                index + 1, // Fortlaufende Nummer
                dateStr,
                timeStr,
                item.userId || '',
                item.type || '',
                item.currency || '',
                formatNumberDE(item.reward || item.rewardInUsd),
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

        const filename = `gomining_referral_transactions_${new Date().toISOString().split('T')[0]}.csv`;
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

        // Get data for date range (smart filtering during download)
        results.transactions = await getAllReferrals(token, 'CUSTOM', fromDate, toDate);

        console.log(`\n✅ Filtered Transactions: ${results.transactions.length}`);

        // Count by type
        const byType = {};
        results.transactions.forEach(t => {
            const type = t.type || 'unknown';
            byType[type] = (byType[type] || 0) + 1;
        });
        Object.entries(byType).forEach(([type, count]) => {
            console.log(`   • ${type}: ${count}`);
        });

        // Store globally
        globalThis.referralExportData = results;

        console.log(`\n💾 Data stored in: globalThis.referralExportData`);
        console.log(`💡 To export to CSV: exportTransactionsToCSV()`);

        return results;
    }

    // Expose globally
    globalThis.exportAllReferralData = exportAllReferralData;
    globalThis.exportReferralDataRange = exportReferralDataRange;
    globalThis.exportTransactionsToCSV = exportTransactionsToCSV;
    globalThis.stopExport = stopExport;

    // Show help
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║       📊 GoMining Referral Complete Export 📊               ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

📚 Exports ALL your referral transaction data

How to use:

  1. exportAllReferralData()                        - Fetch ALL data
  2. exportReferralDataRange("2024-05-01", "2024-12-31") - Date range
  3. exportTransactionsToCSV()                      - Export to CSV
  4. stopExport()                                   - Stop running export

📋 Copy-Paste Examples (Year Exports):

  exportReferralDataRange("2024-01-01", "2024-12-31")  // Ganzes Jahr 2024
  exportReferralDataRange("2025-01-01", "2025-12-31")  // Ganzes Jahr 2025
  exportReferralDataRange("2026-01-01", "2026-05-18")  // 2026 bis heute
  
  // Then export to CSV:
  exportTransactionsToCSV()

What gets exported:
  • Referral Summary (445 referrals, $5,019 kW rewards)
  • Total Rewards ($12,858 total: GMT + USDT)
  • All Transactions (registration, payments, rewards, etc.)

Token: ${globalThis.goMiningToken ? '✅ Found' : '❌ Not found'}

💡 Run: exportAllReferralData()
    `);

})();

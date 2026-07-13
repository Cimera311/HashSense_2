// ============================================================
// GoMining Transaction Type Analyzer
// Finds ALL fromType values in transaction history
// ============================================================
// Usage:
//   1. Go to app.gomining.com and login
//   2. Open Console (F12)
//   3. Paste this script and press Enter
//   4. Run: analyzeAllTransactions()
// ============================================================

(function() {
    'use strict';

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

    // Fetch ALL transactions and analyze fromType values
    async function analyzeAllTransactions() {
        console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║       📊 GoMining Transaction Type Analyzer 📊              ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
        `);

        const token = (globalThis.goMiningToken || findToken() || '').replace('Bearer ', '').trim();
        if (!token) {
            console.error('❌ No token found!');
            console.log('💡 Set: globalThis.goMiningToken = "YOUR_TOKEN"');
            return;
        }

        console.log(`🔑 Token: ${token.substring(0, 20)}...`);
        console.log(`📥 Loading ALL transactions to find fromType values...\n`);

        const apiUrl = 'https://api.gomining.com/api/wallet/transaction-history';
        let allTransactions = [];
        let cursor = Date.now();
        let batchNum = 0;
        const startTime = Date.now();

        // Load all transactions (limit to 1000 for speed, but can load more)
        while (allTransactions.length < 1000) {
            batchNum++;
            
            try {
                const requestBody = {
                    filter: {
                        fromType: null,
                        walletType: ["VIRTUAL_BNB", "VIRTUAL_BTC", "VIRTUAL_ETH", "VIRTUAL_GMT", 
                                     "VIRTUAL_SOL", "VIRTUAL_TON", "VIRTUAL_USDC", "VIRTUAL_USDT"],
                        range: null
                    },
                    pagination: {
                        cursor: cursor,
                        limit: 100
                    }
                };

                const response = await fetch(apiUrl, {
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

                if (!response.ok) {
                    console.error(`❌ API Error: ${response.status}`);
                    break;
                }

                const result = await response.json();
                const transactions = result.data?.array || [];
                const totalCount = result.data?.count || 0;

                if (!transactions.length) {
                    console.log(`\n✅ All data loaded (${allTransactions.length} transactions)`);
                    break;
                }

                allTransactions.push(...transactions);
                console.log(`  Batch ${batchNum}: ${allTransactions.length}/${totalCount} loaded`);

                // Next cursor
                const lastTx = transactions[transactions.length - 1];
                const nextCursor = new Date(lastTx.createdAt).getTime();
                
                if (nextCursor === cursor || allTransactions.length >= totalCount) {
                    console.log(`✅ Loaded ${allTransactions.length} transactions`);
                    break;
                }
                
                cursor = nextCursor;
                await new Promise(r => setTimeout(r, 100));

            } catch (error) {
                console.error(`❌ Error:`, error.message);
                break;
            }
        }

        if (!allTransactions.length) {
            console.log('⚠️ No transactions found!');
            return;
        }

        // Analyze fromType values
        console.log(`\n${'═'.repeat(60)}`);
        console.log(`📊 ANALYZING ${allTransactions.length} TRANSACTIONS`);
        console.log(`${'═'.repeat(60)}\n`);

        const byFromType = {};
        const byType = {};
        
        allTransactions.forEach(tx => {
            const fromType = tx.fromType || 'null';
            const type = tx.type || 'unknown';
            
            // Group by fromType
            if (!byFromType[fromType]) {
                byFromType[fromType] = {
                    count: 0,
                    type: type,
                    walletTypes: new Set(),
                    examples: []
                };
            }
            byFromType[fromType].count++;
            byFromType[fromType].walletTypes.add(tx.walletType);
            if (byFromType[fromType].examples.length < 2) {
                byFromType[fromType].examples.push({
                    date: tx.createdAt,
                    value: tx.valueNumeric,
                    currency: tx.walletType,
                    status: tx.status
                });
            }
            
            // Group by type
            if (!byType[type]) byType[type] = 0;
            byType[type]++;
        });

        // Display results sorted by count
        const sortedFromTypes = Object.entries(byFromType).sort((a, b) => b[1].count - a[1].count);
        
        console.log(`🎯 Found ${sortedFromTypes.length} different fromType values:\n`);
        
        // Categorize by likely purpose
        const referralTypes = [];
        const bonusTypes = [];
        const earnTypes = [];
        const miningTypes = [];
        const otherTypes = [];
        
        sortedFromTypes.forEach(([fromType, data]) => {
            const lower = fromType.toLowerCase();
            if (lower.includes('referral') || lower.includes('ref')) {
                referralTypes.push([fromType, data]);
            } else if (lower.includes('bonus') || lower.includes('cashback') || lower.includes('promo')) {
                bonusTypes.push([fromType, data]);
            } else if (lower.includes('earn') || lower.includes('staking') || lower.includes('reward')) {
                earnTypes.push([fromType, data]);
            } else if (lower.includes('mining') || lower.includes('nft') || lower.includes('miner')) {
                miningTypes.push([fromType, data]);
            } else {
                otherTypes.push([fromType, data]);
            }
        });

        // Display categorized
        function displayCategory(name, types, emoji) {
            if (types.length === 0) return;
            
            console.log(`${emoji} ${name.toUpperCase()} (${types.length} types):`);
            types.forEach(([fromType, data]) => {
                const currencies = Array.from(data.walletTypes).map(w => w.replace('VIRTUAL_', '')).join(', ');
                console.log(`   • ${fromType}: ${data.count} txs (${data.type}) [${currencies}]`);
                if (data.examples.length > 0) {
                    console.log(`     Example: ${data.examples[0].date.split('T')[0]} | ${data.examples[0].value} ${data.examples[0].currency?.replace('VIRTUAL_', '')}`);
                }
            });
            console.log('');
        }

        displayCategory('Referral & Affiliate', referralTypes, '👥');
        displayCategory('Bonus & Cashback', bonusTypes, '💰');
        displayCategory('Earn & Rewards', earnTypes, '🎁');
        displayCategory('Mining & NFT', miningTypes, '⛏️');
        displayCategory('Other Transaction Types', otherTypes, '📦');

        // Summary by transaction type (deposit/withdraw)
        console.log(`${'═'.repeat(60)}`);
        console.log(`📈 TRANSACTION TYPE SUMMARY`);
        console.log(`${'═'.repeat(60)}\n`);
        Object.entries(byType).forEach(([type, count]) => {
            const pct = ((count / allTransactions.length) * 100).toFixed(1);
            console.log(`   ${type}: ${count} (${pct}%)`);
        });

        // Store globally
        globalThis.transactionAnalysis = {
            allTransactions,
            byFromType,
            byType,
            referralTypes: referralTypes.map(t => t[0]),
            bonusTypes: bonusTypes.map(t => t[0]),
            earnTypes: earnTypes.map(t => t[0]),
            miningTypes: miningTypes.map(t => t[0])
        };

        console.log(`\n💾 Full analysis stored in: globalThis.transactionAnalysis`);
        
        // Export function suggestions
        console.log(`\n${'═'.repeat(60)}`);
        console.log(`📝 EXPORT SUGGESTIONS`);
        console.log(`${'═'.repeat(60)}\n`);
        
        if (referralTypes.length > 0) {
            console.log(`💡 To export REFERRAL transactions:`);
            console.log(`   exportByFromType([${referralTypes.map(t => `'${t[0]}'`).join(', ')}])`);
        }
        
        if (bonusTypes.length > 0) {
            console.log(`\n💡 To export BONUS transactions:`);
            console.log(`   exportByFromType([${bonusTypes.map(t => `'${t[0]}'`).join(', ')}])`);
        }
        
        if (earnTypes.length > 0) {
            console.log(`\n💡 To export EARN/REWARD transactions:`);
            console.log(`   exportByFromType([${earnTypes.map(t => `'${t[0]}'`).join(', ')}])`);
        }

        console.log(`\n💡 Or export ALL with: exportAllTransactions()`);

        return globalThis.transactionAnalysis;
    }

    // Export transactions by fromType filter
    async function exportByFromType(fromTypes) {
        const analysis = globalThis.transactionAnalysis;
        if (!analysis) {
            console.error('❌ Run analyzeAllTransactions() first!');
            return;
        }

        const filtered = analysis.allTransactions.filter(tx => 
            fromTypes.includes(tx.fromType)
        );

        console.log(`📥 Exporting ${filtered.length} transactions with fromType: ${fromTypes.join(', ')}`);

        // CSV Export
        let csv = "Date;Time;Type;FromType;Amount;Currency;Status;ID;WalletType\n";
        
        filtered.forEach(tx => {
            const dateObj = new Date(tx.createdAt);
            const date = dateObj.toISOString().split('T')[0];
            const time = dateObj.toTimeString().split(' ')[0];
            const type = tx.type || '';
            const fromType = tx.fromType || '';
            const valueNumeric = tx.valueNumeric || '0';
            const currency = tx.walletType?.replace('VIRTUAL_', '') || '';
            const status = tx.status || '';
            const id = tx.id || '';
            const walletType = tx.walletType || '';
            
            // Convert value (Wei → Token)
            let amount = '0';
            try {
                const rawValue = parseFloat(valueNumeric) || 0;
                amount = (rawValue / 1e18).toString();
                
                // Sign
                if (type === 'withdraw') {
                    amount = '-' + amount;
                }
                
                // German format
                amount = amount.replace('.', ',');
            } catch (e) {
                amount = '0';
            }
            
            csv += `"${date}";"${time}";"${type}";"${fromType}";"${amount}";"${currency}";"${status}";"${id}";"${walletType}"\n`;
        });

        // Download
        const filename = `gomining_${fromTypes[0]}_${new Date().toISOString().split('T')[0]}.csv`;
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log(`✅ Exported ${filtered.length} transactions to ${filename}`);
    }

    // Export ALL transactions
    function exportAllTransactions() {
        const analysis = globalThis.transactionAnalysis;
        if (!analysis) {
            console.error('❌ Run analyzeAllTransactions() first!');
            return;
        }

        console.log(`📥 Exporting ${analysis.allTransactions.length} transactions...`);

        // CSV Export
        let csv = "Date;Time;Type;FromType;Amount;Currency;Status;ID;WalletType\n";
        
        analysis.allTransactions.forEach(tx => {
            const dateObj = new Date(tx.createdAt);
            const date = dateObj.toISOString().split('T')[0];
            const time = dateObj.toTimeString().split(' ')[0];
            const type = tx.type || '';
            const fromType = tx.fromType || '';
            const valueNumeric = tx.valueNumeric || '0';
            const currency = tx.walletType?.replace('VIRTUAL_', '') || '';
            const status = tx.status || '';
            const id = tx.id || '';
            const walletType = tx.walletType || '';
            
            let amount = '0';
            try {
                const rawValue = parseFloat(valueNumeric) || 0;
                amount = (rawValue / 1e18).toString();
                if (type === 'withdraw') amount = '-' + amount;
                amount = amount.replace('.', ',');
            } catch (e) {
                amount = '0';
            }
            
            csv += `"${date}";"${time}";"${type}";"${fromType}";"${amount}";"${currency}";"${status}";"${id}";"${walletType}"\n`;
        });

        const filename = `gomining_all_transactions_${new Date().toISOString().split('T')[0]}.csv`;
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log(`✅ Exported ${analysis.allTransactions.length} transactions to ${filename}`);
    }

    // Expose globally
    globalThis.analyzeAllTransactions = analyzeAllTransactions;
    globalThis.exportByFromType = exportByFromType;
    globalThis.exportAllTransactions = exportAllTransactions;

    // Show help
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║       📊 GoMining Transaction Type Analyzer 📊              ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

📚 This finds ALL fromType values in your transaction history
   (referral, bonus, cashback, rewards are all in there!)

How to use:

  1. analyzeAllTransactions()        - Load & analyze all transactions
  2. exportByFromType(['type1'])     - Export specific types
  3. exportAllTransactions()         - Export everything

💡 Run: analyzeAllTransactions()

Token: ${globalThis.goMiningToken ? '✅ Found' : '❌ Not found'}
    `);

})();

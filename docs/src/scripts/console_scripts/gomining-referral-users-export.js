// ============================================================
// GoMining Referral Users Export
// Exports complete list of all referred users
// ============================================================
// Usage:
//   1. Go to app.gomining.com and login
//   2. Open Console (F12)
//   3. Paste this script and press Enter
//   4. Run: exportReferralUsers()
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
    globalThis.stopReferralUsersExport = false; // Stop flag

    // Get all referral users with pagination
    async function getAllReferralUsers(token) {
        console.log('\n🔍 Fetching Referral Users...');
        
        // Reset stop flag
        globalThis.stopReferralUsersExport = false;
        
        let allUsers = [];
        let skip = 0;
        const limit = 100;
        let hasMore = true;
        let totalCount = null;

        while (hasMore) {
            // Check stop flag
            if (globalThis.stopReferralUsersExport) {
                console.log('\n🛑 Export stopped by user!');
                hasMore = false;
                break;
            }
            
            try {
                const requestBody = {
                    pagination: {
                        limit: limit,
                        skip: skip,
                        count: 0
                    }
                };

                const response = await fetch(`${REFERRAL_API_BASE}/ref-program/user/get-referrals`, {
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
                    const result = await response.json();
                    
                    // Response structure: { data: { count: 442, data: { count: 442, referrals: [...] } } }
                    const data = result.data?.data || result.data || {};
                    const users = data.referrals || [];
                    const count = result.data?.count || data.count || users.length;
                    
                    if (totalCount === null) {
                        totalCount = count;
                        console.log(`   📊 Total referral users: ${totalCount}`);
                    }
                    
                    console.log(`   Batch ${Math.floor(skip/limit)+1}: Loaded ${users.length} users (${allUsers.length + users.length}/${totalCount} total)`);
                    
                    if (users.length === 0) {
                        hasMore = false;
                    } else {
                        allUsers.push(...users);
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

        console.log(`✅ Loaded ${allUsers.length} referral users`);
        return allUsers;
    }

    // Helper: Format number for German locale
    function formatNumberDE(value) {
        if (value === null || value === undefined || value === '') return '0';
        const num = parseFloat(value);
        if (isNaN(num)) return '0';
        return num.toString().replace('.', ',');
    }

    // Export referral users to CSV (German format)
    function exportUsersToCSV() {
        const data = globalThis.referralUsersData;
        if (!data || !data.users) {
            console.error('❌ Run exportReferralUsers() first!');
            return;
        }

        const users = data.users;
        if (users.length === 0) {
            console.log('⚠️ No referral users to export');
            return;
        }

        // German CSV headers
        const headers = [
            'Nr',
            'User ID',
            'Alias',
            'VIP Level',
            'Registriert am',
            'Registriert um',
            'Profilbild'
        ];

        let csv = headers.join(';') + '\n';
        
        users.forEach((user, index) => {
            const regDate = user.referralsLine ? new Date(user.referralsLine) : null;
            const dateStr = regDate ? regDate.toISOString().split('T')[0] : ''; // YYYY-MM-DD
            const timeStr = regDate ? regDate.toTimeString().split(' ')[0] : ''; // HH:MM:SS
            
            const row = [
                index + 1, // Fortlaufende Nummer
                user.id || '',
                user.alias || '',
                user.vipLevel || '0',
                dateStr,
                timeStr,
                user.picture ? 'Ja' : 'Nein'
            ];
            
            csv += row.map(val => `"${val}"`).join(';') + '\n';
        });

        const filename = `gomining_referral_users_${new Date().toISOString().split('T')[0]}.csv`;
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log(`✅ Exported ${users.length} referral users to ${filename}`);
    }

    // Stop export function
    function stopExport() {
        globalThis.stopReferralUsersExport = true;
        console.log('🛑 Stopping export... (may take a few seconds)');
    }

    // Main export function
    async function exportReferralUsers() {
        console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║       👥 GoMining Referral Users Export 👥                  ║
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
            users: []
        };

        // Get all referral users
        results.users = await getAllReferralUsers(token);

        // Summary
        console.log(`\n\n${'═'.repeat(60)}`);
        console.log(`📊 EXPORT SUMMARY`);
        console.log(`${'═'.repeat(60)}\n`);

        console.log(`✅ Referral Users Loaded: ${results.users.length}`);
        
        // Count by VIP level
        const byVipLevel = {};
        results.users.forEach(u => {
            const level = u.vipLevel || 0;
            byVipLevel[level] = (byVipLevel[level] || 0) + 1;
        });
        console.log(`\n📊 VIP Level Distribution:`);
        Object.entries(byVipLevel).sort((a, b) => a[0] - b[0]).forEach(([level, count]) => {
            console.log(`   • VIP Level ${level}: ${count} users`);
        });

        // Count by registration date (month)
        const byMonth = {};
        results.users.forEach(u => {
            if (u.referralsLine) {
                const date = new Date(u.referralsLine);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                byMonth[monthKey] = (byMonth[monthKey] || 0) + 1;
            }
        });
        console.log(`\n📅 Registrations by Month:`);
        Object.entries(byMonth).sort().forEach(([month, count]) => {
            console.log(`   • ${month}: ${count} users`);
        });

        // Store globally
        globalThis.referralUsersData = results;

        console.log(`\n💾 All data stored in: globalThis.referralUsersData`);
        console.log(`\n💡 To export to CSV:`);
        console.log(`   exportUsersToCSV()`);

        return results;
    }

    // Expose globally
    globalThis.exportReferralUsers = exportReferralUsers;
    globalThis.exportUsersToCSV = exportUsersToCSV;
    globalThis.stopExport = stopExport;

    // Show help
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║       👥 GoMining Referral Users Export 👥                  ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

📚 Exports complete list of all your referred users

How to use:

  1. exportReferralUsers()        - Fetch all referral users
  2. exportUsersToCSV()            - Export to CSV
  3. stopExport()                  - Stop running export

What gets exported:
  • User ID
  • Alias (anonymized username)
  • VIP Level
  • Registration Date & Time
  • Profile Picture (Yes/No)

Token: ${globalThis.goMiningToken ? '✅ Found' : '❌ Not found'}

💡 Run: exportReferralUsers()
    `);

})();

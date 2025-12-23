// Global Variables
let portfolioData = null;
let charts = {};

// Load Backup File
function loadBackup(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Show loading
    document.getElementById('loadingState').classList.add('active');
    document.getElementById('uploadSection').style.display = 'none';

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const backup = JSON.parse(e.target.result);
            
            if (!backup.data || !backup.version) {
                throw new Error('Invalid backup file format');
            }

            portfolioData = backup;
            
            // Hide loading, show dashboard
            setTimeout(() => {
                document.getElementById('loadingState').classList.remove('active');
                document.getElementById('dashboardContent').classList.add('active');
                
                // Render Dashboard
                renderDashboard();
            }, 800);

        } catch (error) {
            console.error('Load error:', error);
            alert('❌ Error loading backup. Invalid file format.');
            
            // Reset UI
            document.getElementById('loadingState').classList.remove('active');
            document.getElementById('uploadSection').style.display = 'block';
        }
    };
    reader.readAsText(file);

    // Reset file input
    event.target.value = '';
}

// Main Dashboard Rendering
function renderDashboard() {
    if (!portfolioData) return;

    const miners = Object.values(portfolioData.data);
    const currency = portfolioData.settings?.currency || 'USD';
    const currencySymbol = currency === 'USD' ? '$' : '€';

    // Calculate Stats
    const stats = calculateStats(miners, currency);
    
    // Update Hero Stats
    updateHeroStats(stats, currencySymbol);
    
    // Render Charts
    renderTimelineChart(miners, currency, currencySymbol);
    renderCollectionChart(miners, currency, currencySymbol);
    renderChainChart(miners);
    renderProfitLossChart(miners, currency, currencySymbol);
    
    // Render Top Performers
    renderTopPerformers(miners, currency, currencySymbol);
    
    // Render Profit/Loss Lists
    renderProfitLossLists(miners, currency, currencySymbol);
}

// Calculate All Statistics
function calculateStats(miners, currency) {
    const rate = portfolioData.settings?.exchangeRates?.[currency] || 0.45;
    
    let totalInvestmentGMT = 0;
    let totalInvestmentFiat = 0;
    let salesRevenueGMT = 0;
    let salesRevenueFiat = 0;
    let totalTH = 0;
    let totalWTH = 0;
    let activeCount = 0;
    let soldCount = 0;

    miners.forEach(miner => {
        // Investment calculation
        const purchaseRate = getPriceForDate(miner.purchase.date, 'GMT', currency) || rate;
        const purchaseGMT = miner.purchase.price || 0;
        const purchaseFiat = purchaseGMT * purchaseRate;
        
        totalInvestmentGMT += purchaseGMT;
        totalInvestmentFiat += purchaseFiat;

        // Add upgrade costs
        miner.upgrades.th.forEach(u => {
            const upgradeRate = getPriceForDate(u.date, 'GMT', currency) || rate;
            totalInvestmentGMT += (u.price || 0);
            totalInvestmentFiat += (u.price || 0) * upgradeRate;
        });
        
        miner.upgrades.efficiency.forEach(u => {
            const upgradeRate = getPriceForDate(u.date, 'GMT', currency) || rate;
            totalInvestmentGMT += (u.price || 0);
            totalInvestmentFiat += (u.price || 0) * upgradeRate;
        });

        // Sales revenue
        if (miner.sale) {
            const saleRate = getPriceForDate(miner.sale.date, 'GMT', currency) || rate;
            salesRevenueGMT += (miner.sale.yourPrice || 0);
            salesRevenueFiat += (miner.sale.yourPrice || 0) * saleRate;
            soldCount++;
        } else {
            // Active miner - add to total hashrate
            totalTH += miner.currentTH || 0;
            totalWTH += miner.currentWTH || 0;
            activeCount++;
        }
    });

    const avgWTH = activeCount > 0 ? totalWTH / activeCount : 0;
    const profitLossGMT = salesRevenueGMT - totalInvestmentGMT;
    const profitLossFiat = salesRevenueFiat - totalInvestmentFiat;
    const roi = totalInvestmentFiat > 0 ? (profitLossFiat / totalInvestmentFiat) * 100 : 0;

    return {
        totalMiners: miners.length,
        activeMiners: activeCount,
        soldMiners: soldCount,
        totalInvestmentGMT,
        totalInvestmentFiat,
        salesRevenueGMT,
        salesRevenueFiat,
        profitLossGMT,
        profitLossFiat,
        roi,
        totalTH,
        avgWTH,
        rate
    };
}

// Update Hero Stats Cards
function updateHeroStats(stats, currencySymbol) {
    document.getElementById('totalValue').textContent = `${currencySymbol}${stats.salesRevenueFiat.toFixed(2)}`;
    document.getElementById('totalGMT').textContent = `${stats.salesRevenueGMT.toFixed(2)} GMT`;

    const roiCard = document.getElementById('roiCard');
    const roiSign = stats.roi >= 0 ? '+' : '';
    document.getElementById('roiValue').textContent = `${roiSign}${stats.roi.toFixed(1)}%`;
    document.getElementById('roiAmount').textContent = `${roiSign}${currencySymbol}${Math.abs(stats.profitLossFiat).toFixed(2)}`;
    roiCard.className = stats.roi >= 0 ? 'stat-card profit' : 'stat-card loss';

    document.getElementById('totalMiners').textContent = stats.totalMiners;
    document.getElementById('activeMiners').textContent = stats.activeMiners;
    document.getElementById('soldMiners').textContent = stats.soldMiners;

    document.getElementById('totalHashrate').textContent = `${stats.totalTH.toFixed(2)} TH`;
    document.getElementById('avgEfficiency').textContent = `Avg: ${stats.avgWTH.toFixed(2)} W/TH`;

    document.getElementById('totalInvestment').textContent = `${currencySymbol}${stats.totalInvestmentFiat.toFixed(2)}`;
    document.getElementById('investmentGMT').textContent = `${stats.totalInvestmentGMT.toFixed(2)} GMT`;

    document.getElementById('salesRevenue').textContent = `${currencySymbol}${stats.salesRevenueFiat.toFixed(2)}`;
    document.getElementById('revenueGMT').textContent = `${stats.salesRevenueGMT.toFixed(2)} GMT`;
}

// Render Timeline Chart
function renderTimelineChart(miners, currency, currencySymbol) {
    const ctx = document.getElementById('timelineChart');
    
    // Destroy existing chart
    if (charts.timeline) {
        charts.timeline.destroy();
    }

    // Prepare timeline data
    const events = [];
    const rate = portfolioData.settings?.exchangeRates?.[currency] || 0.45;

    miners.forEach(miner => {
        // Purchase event
        if (miner.purchase.date && miner.purchase.date !== 'Transfer Import') {
            const purchaseRate = getPriceForDate(miner.purchase.date, 'GMT', currency) || rate;
            events.push({
                date: parseDate(miner.purchase.date),
                type: 'purchase',
                amount: (miner.purchase.price || 0) * purchaseRate,
                miner: miner.fullName
            });
        }

        // Upgrade events
        miner.upgrades.th.forEach(u => {
            const upgradeRate = getPriceForDate(u.date, 'GMT', currency) || rate;
            events.push({
                date: parseDate(u.date),
                type: 'upgrade',
                amount: (u.price || 0) * upgradeRate,
                miner: miner.fullName
            });
        });

        miner.upgrades.efficiency.forEach(u => {
            const upgradeRate = getPriceForDate(u.date, 'GMT', currency) || rate;
            events.push({
                date: parseDate(u.date),
                type: 'upgrade',
                amount: (u.price || 0) * upgradeRate,
                miner: miner.fullName
            });
        });

        // Sale event
        if (miner.sale) {
            const saleRate = getPriceForDate(miner.sale.date, 'GMT', currency) || rate;
            events.push({
                date: parseDate(miner.sale.date),
                type: 'sale',
                amount: (miner.sale.yourPrice || 0) * saleRate,
                miner: miner.fullName
            });
        }
    });

    // Sort by date
    events.sort((a, b) => a.date - b.date);

    // Calculate cumulative values
    let cumulativeInvestment = 0;
    let cumulativeRevenue = 0;
    const timelineData = {
        labels: [],
        investment: [],
        revenue: []
    };

    events.forEach(event => {
        if (event.type === 'purchase' || event.type === 'upgrade') {
            cumulativeInvestment += event.amount;
        } else if (event.type === 'sale') {
            cumulativeRevenue += event.amount;
        }

        timelineData.labels.push(event.date.toLocaleDateString());
        timelineData.investment.push(cumulativeInvestment);
        timelineData.revenue.push(cumulativeRevenue);
    });

    charts.timeline = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timelineData.labels,
            datasets: [
                {
                    label: 'Total Investment',
                    data: timelineData.investment,
                    borderColor: '#ff4d4d',
                    backgroundColor: 'rgba(255, 77, 77, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Sales Revenue',
                    data: timelineData.revenue,
                    borderColor: '#00ff7f',
                    backgroundColor: 'rgba(0, 255, 127, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2.5,
            plugins: {
                legend: {
                    labels: { color: '#f0f0f0' }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${currencySymbol}${context.parsed.y.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#aaa', maxRotation: 45, minRotation: 45 },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: {
                    ticks: { 
                        color: '#aaa',
                        callback: function(value) {
                            return currencySymbol + value.toFixed(0);
                        }
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        }
    });
}

// Render Collection Performance Chart
function renderCollectionChart(miners, currency, currencySymbol) {
    const ctx = document.getElementById('collectionChart');
    
    if (charts.collection) {
        charts.collection.destroy();
    }

    // Group by collection
    const collections = {};
    const rate = portfolioData.settings?.exchangeRates?.[currency] || 0.45;

    miners.forEach(miner => {
        const collection = miner.collection || miner.name.split(' #')[0] || 'Unknown';
        
        if (!collections[collection]) {
            collections[collection] = { value: 0, count: 0 };
        }

        const purchaseRate = getPriceForDate(miner.purchase.date, 'GMT', currency) || rate;
        collections[collection].value += (miner.purchase.price || 0) * purchaseRate;
        collections[collection].count++;
    });

    // Sort by value
    const sorted = Object.entries(collections)
        .sort((a, b) => b[1].value - a[1].value)
        .slice(0, 10); // Top 10

    charts.collection = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(([name]) => name),
            datasets: [{
                label: 'Investment Value',
                data: sorted.map(([, data]) => data.value),
                backgroundColor: 'rgba(103, 61, 236, 0.6)',
                borderColor: '#673dec',
                borderWidth: 2
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 1.2,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const count = sorted[context.dataIndex][1].count;
                            return `${currencySymbol}${context.parsed.x.toFixed(2)} (${count} miners)`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: { 
                        color: '#aaa',
                        callback: function(value) {
                            return currencySymbol + value.toFixed(0);
                        }
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: {
                    ticks: { color: '#aaa' },
                    grid: { display: false }
                }
            }
        }
    });
}

// Render Chain Distribution Chart
function renderChainChart(miners) {
    const ctx = document.getElementById('chainChart');
    
    if (charts.chain) {
        charts.chain.destroy();
    }

    // Group by chain
    const chains = {};
    
    miners.forEach(miner => {
        const chain = miner.chain || 'Unknown';
        chains[chain] = (chains[chain] || 0) + 1;
    });

    const chainColors = {
        'BSC': '#F0B90B',
        'ETH': '#627EEA',
        'TON': '#0088CC',
        'SOL': '#00D4AA',
        'Unknown': '#888888'
    };

    const labels = Object.keys(chains);
    const data = Object.values(chains);
    const colors = labels.map(chain => chainColors[chain] || '#888888');

    charts.chain = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderColor: '#1a1a2e',
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 1.5,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { 
                        color: '#f0f0f0',
                        padding: 15,
                        font: { size: 12 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${context.label}: ${context.parsed} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Render Profit/Loss Chart
function renderProfitLossChart(miners, currency, currencySymbol) {
    const ctx = document.getElementById('profitLossChart');
    
    if (charts.profitLoss) {
        charts.profitLoss.destroy();
    }

    const rate = portfolioData.settings?.exchangeRates?.[currency] || 0.45;
    
    let profitableCount = 0;
    let lossCount = 0;
    let totalProfit = 0;
    let totalLoss = 0;

    // Calculate for sold miners
    miners.forEach(miner => {
        if (!miner.sale) return;

        const purchaseRate = getPriceForDate(miner.purchase.date, 'GMT', currency) || rate;
        const saleRate = getPriceForDate(miner.sale.date, 'GMT', currency) || rate;
        
        let investment = (miner.purchase.price || 0) * purchaseRate;
        
        // Add upgrade costs
        miner.upgrades.th.forEach(u => {
            const upgradeRate = getPriceForDate(u.date, 'GMT', currency) || rate;
            investment += (u.price || 0) * upgradeRate;
        });
        miner.upgrades.efficiency.forEach(u => {
            const upgradeRate = getPriceForDate(u.date, 'GMT', currency) || rate;
            investment += (u.price || 0) * upgradeRate;
        });

        const revenue = (miner.sale.yourPrice || 0) * saleRate;
        const profit = revenue - investment;

        if (profit >= 0) {
            profitableCount++;
            totalProfit += profit;
        } else {
            lossCount++;
            totalLoss += Math.abs(profit);
        }
    });

    const totalSales = profitableCount + lossCount;
    const winRate = totalSales > 0 ? (profitableCount / totalSales) * 100 : 0;
    const netPL = totalProfit - totalLoss;

    // Update summary cards
    document.getElementById('profitableSalesCount').textContent = profitableCount;
    document.getElementById('lossSalesCount').textContent = lossCount;
    document.getElementById('totalProfitAmount').textContent = `+${currencySymbol}${totalProfit.toFixed(2)}`;
    document.getElementById('totalLossAmount').textContent = `-${currencySymbol}${totalLoss.toFixed(2)}`;
    document.getElementById('winRate').textContent = `${winRate.toFixed(1)}%`;
    
    const netPLElement = document.getElementById('netProfitLoss');
    const netSign = netPL >= 0 ? '+' : '';
    netPLElement.textContent = `${netSign}${currencySymbol}${netPL.toFixed(2)}`;
    netPLElement.style.color = netPL >= 0 ? '#00ff7f' : '#ff4d4d';

    // Render pie chart
    if (totalSales === 0) {
        ctx.parentElement.innerHTML = '<div style="text-align: center; padding: 60px; color: #888;">No sold miners yet</div>';
        return;
    }

    charts.profitLoss = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Profitable Sales', 'Loss Sales'],
            datasets: [{
                data: [profitableCount, lossCount],
                backgroundColor: ['rgba(0, 255, 127, 0.6)', 'rgba(255, 77, 77, 0.6)'],
                borderColor: ['#00ff7f', '#ff4d4d'],
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 1.5,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { 
                        color: '#f0f0f0',
                        padding: 15,
                        font: { size: 12 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const percentage = ((context.parsed / totalSales) * 100).toFixed(1);
                            return `${context.label}: ${context.parsed} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Render Profit/Loss Lists
function renderProfitLossLists(miners, currency, currencySymbol) {
    const rate = portfolioData.settings?.exchangeRates?.[currency] || 0.45;
    
    const soldMiners = miners
        .filter(m => m.sale)
        .map(m => {
            const purchaseRate = getPriceForDate(m.purchase.date, 'GMT', currency) || rate;
            const saleRate = getPriceForDate(m.sale.date, 'GMT', currency) || rate;
            
            let investmentGMT = m.purchase.price || 0;
            let investment = investmentGMT * purchaseRate;
            
            // Add upgrade costs
            m.upgrades.th.forEach(u => {
                const upgradeRate = getPriceForDate(u.date, 'GMT', currency) || rate;
                investmentGMT += (u.price || 0);
                investment += (u.price || 0) * upgradeRate;
            });
            m.upgrades.efficiency.forEach(u => {
                const upgradeRate = getPriceForDate(u.date, 'GMT', currency) || rate;
                investmentGMT += (u.price || 0);
                investment += (u.price || 0) * upgradeRate;
            });

            const revenueGMT = m.sale.yourPrice || 0;
            const revenue = revenueGMT * saleRate;
            const profit = revenue - investment;
            const roi = investment > 0 ? (profit / investment) * 100 : 0;
            
            const buyDate = parseDate(m.purchase.date);
            const sellDate = parseDate(m.sale.date);
            const daysHeld = Math.floor((sellDate - buyDate) / (1000 * 60 * 60 * 24));

            return {
                miner: m,
                investmentGMT,
                investment,
                revenueGMT,
                revenue,
                profit,
                roi,
                daysHeld
            };
        });

    // Profitable sales (sorted by highest profit)
    const profitableSales = soldMiners
        .filter(item => item.profit >= 0)
        .sort((a, b) => b.profit - a.profit);

    // Loss sales (sorted by biggest loss)
    const lossSales = soldMiners
        .filter(item => item.profit < 0)
        .sort((a, b) => a.profit - b.profit);

    // Render profitable list
    const profitableList = document.getElementById('profitableSalesList');
    profitableList.innerHTML = '';
    
    if (profitableSales.length === 0) {
        profitableList.innerHTML = '<div style="text-align: center; padding: 30px; color: #888;">No profitable sales yet</div>';
    } else {
        profitableSales.forEach(item => {
            const card = createSaleCard(item, currencySymbol, true);
            profitableList.appendChild(card);
        });
    }

    // Render loss list
    const lossList = document.getElementById('lossSalesList');
    lossList.innerHTML = '';
    
    if (lossSales.length === 0) {
        lossList.innerHTML = '<div style="text-align: center; padding: 30px; color: #888;">No loss sales - great job! 🎉</div>';
    } else {
        lossSales.forEach(item => {
            const card = createSaleCard(item, currencySymbol, false);
            lossList.appendChild(card);
        });
    }
}

// Create Sale Card Helper
function createSaleCard(item, currencySymbol, isProfit) {
    const card = document.createElement('div');
    const borderColor = isProfit ? '#00ff7f' : '#ff4d4d';
    const textColor = isProfit ? '#00ff7f' : '#ff4d4d';
    const bgColor = isProfit ? 'rgba(0, 255, 127, 0.05)' : 'rgba(255, 77, 77, 0.05)';
    const roiSign = item.roi >= 0 ? '+' : '';
    const profitSign = item.profit >= 0 ? '+' : '';

    card.style.cssText = `
        background: ${bgColor};
        border: 2px solid ${borderColor};
        border-radius: 10px;
        padding: 15px;
        transition: all 0.3s ease;
    `;

    card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
            <div>
                <div style="font-weight: 600; font-size: 1.1em; margin-bottom: 5px;">${item.miner.fullName}</div>
                <div style="color: #aaa; font-size: 0.85em;">
                    ${formatDate(item.miner.purchase.date)} → ${formatDate(item.miner.sale.date)} (${item.daysHeld} days)
                </div>
            </div>
            <div style="text-align: right;">
                <div style="font-size: 1.3em; font-weight: bold; color: ${textColor};">
                    ${roiSign}${item.roi.toFixed(1)}%
                </div>
            </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 5px;">
            <div>
                <div style="color: #888; font-size: 0.8em; margin-bottom: 3px;">Investment</div>
                <div style="font-weight: 600;">${currencySymbol}${item.investment.toFixed(2)}</div>
                <div style="color: #888; font-size: 0.75em;">${item.investmentGMT.toFixed(2)} GMT</div>
            </div>
            <div>
                <div style="color: #888; font-size: 0.8em; margin-bottom: 3px;">Revenue</div>
                <div style="font-weight: 600;">${currencySymbol}${item.revenue.toFixed(2)}</div>
                <div style="color: #888; font-size: 0.75em;">${item.revenueGMT.toFixed(2)} GMT</div>
            </div>
            <div>
                <div style="color: #888; font-size: 0.8em; margin-bottom: 3px;">Profit/Loss</div>
                <div style="font-weight: 600; color: ${textColor};">${profitSign}${currencySymbol}${Math.abs(item.profit).toFixed(2)}</div>
                <div style="color: #888; font-size: 0.75em;">${item.miner.currentTH} TH · ${item.miner.currentWTH} W/TH</div>
            </div>
        </div>
    `;

    card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateX(5px)';
        card.style.boxShadow = `0 4px 15px ${borderColor}40`;
    });

    card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateX(0)';
        card.style.boxShadow = 'none';
    });

    return card;
}

// Render Top Performers Table
function renderTopPerformers(miners, currency, currencySymbol) {
    const tbody = document.getElementById('performersTable');
    tbody.innerHTML = '';

    const rate = portfolioData.settings?.exchangeRates?.[currency] || 0.45;
    
    // Get sold miners with profit calculation
    const soldMiners = miners
        .filter(m => m.sale)
        .map(m => {
            const purchaseRate = getPriceForDate(m.purchase.date, 'GMT', currency) || rate;
            const saleRate = getPriceForDate(m.sale.date, 'GMT', currency) || rate;
            
            let investment = (m.purchase.price || 0) * purchaseRate;
            
            // Add upgrade costs
            m.upgrades.th.forEach(u => {
                const upgradeRate = getPriceForDate(u.date, 'GMT', currency) || rate;
                investment += (u.price || 0) * upgradeRate;
            });
            m.upgrades.efficiency.forEach(u => {
                const upgradeRate = getPriceForDate(u.date, 'GMT', currency) || rate;
                investment += (u.price || 0) * upgradeRate;
            });

            const revenue = (m.sale.yourPrice || 0) * saleRate;
            const profit = revenue - investment;
            const roi = investment > 0 ? (profit / investment) * 100 : 0;
            
            const buyDate = parseDate(m.purchase.date);
            const sellDate = parseDate(m.sale.date);
            const daysHeld = Math.floor((sellDate - buyDate) / (1000 * 60 * 60 * 24));

            return {
                miner: m,
                investment,
                revenue,
                profit,
                roi,
                daysHeld
            };
        })
        .sort((a, b) => b.roi - a.roi)
        .slice(0, 10); // Top 10

    soldMiners.forEach((item, index) => {
        const row = document.createElement('tr');
        
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        const profitClass = item.profit >= 0 ? 'profit' : 'loss';
        const roiSign = item.roi >= 0 ? '+' : '';

        row.innerHTML = `
            <td style="text-align: center; font-size: 1.2em;">${medal}</td>
            <td><strong>${item.miner.fullName}</strong></td>
            <td>${formatDate(item.miner.purchase.date)}</td>
            <td>${formatDate(item.miner.sale.date)}</td>
            <td>${currencySymbol}${item.investment.toFixed(2)}</td>
            <td>${currencySymbol}${item.revenue.toFixed(2)}</td>
            <td><span class="badge ${profitClass}">${roiSign}${currencySymbol}${item.profit.toFixed(2)}</span></td>
            <td><strong style="color: ${item.roi >= 0 ? '#00ff7f' : '#ff4d4d'}">${roiSign}${item.roi.toFixed(1)}%</strong></td>
            <td>${item.daysHeld} days</td>
        `;
        
        tbody.appendChild(row);
    });

    if (soldMiners.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 40px; color: #888;">No sold miners yet</td></tr>';
    }
}

// Helper: Parse Date
function parseDate(dateStr) {
    if (!dateStr || dateStr === 'Unknown' || dateStr === 'Transfer Import') {
        return new Date();
    }
    
    let parts;
    if (dateStr.includes('/')) {
        parts = dateStr.split('/');
        return new Date(parts[2], parts[0] - 1, parts[1]);
    } else if (dateStr.includes('.')) {
        parts = dateStr.split('.');
        return new Date(parts[2], parts[1] - 1, parts[0]);
    }
    
    return new Date();
}

// Helper: Format Date
function formatDate(dateStr) {
    if (!dateStr || dateStr === 'Unknown' || dateStr === 'Transfer Import') {
        return dateStr;
    }
    
    const date = parseDate(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Initialize on load
window.addEventListener('DOMContentLoaded', async () => {
    // Load price data if available
    if (typeof loadPriceData === 'function') {
        await loadPriceData();
    }
});

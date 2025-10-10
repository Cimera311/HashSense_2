/**
 * GoMining Reinvestment Calculator
 * Calculates different reinvestment strategies with 5% bonus feature
 */

// ===== CALCULATION FUNCTIONS =====

/**
 * Calculate daily revenue for the farm
 */
function calculateDailyRevenue(satoshiPerTH, totalTH, btcPrice, gmtPrice) {
    const dailyRevenueBTC = (satoshiPerTH * totalTH) / 1e8;
    const dailyRevenueUSD = dailyRevenueBTC * btcPrice;
    const dailyRevenueGMT = gmtPrice ? dailyRevenueUSD / gmtPrice : null;

    return {
        btc: dailyRevenueBTC,
        usd: dailyRevenueUSD,
        gmt: dailyRevenueGMT
    };
}

/**
 * Calculate daily electricity costs
 */
function calculateDailyElectricity(totalTH, efficiency, btcPrice, gmtPrice) {
    const costPerKWh = 0.05; // USD per kWh
    const hoursPerDay = 24;
    const discount = 0; // No discount by default

    // Calculate costs in USD
    const dailyElectricityUSD = ((efficiency * totalTH * costPerKWh * hoursPerDay) / 1000) * (1 - discount);
    const dailyElectricityBTC = btcPrice ? dailyElectricityUSD / btcPrice : null;
    const dailyElectricityGMT = gmtPrice ? dailyElectricityUSD / gmtPrice : null;

    return {
        usd: dailyElectricityUSD,
        btc: dailyElectricityBTC,
        gmt: dailyElectricityGMT
    };
}

/**
 * Calculate daily service costs
 */
function calculateDailyService(totalTH, btcPrice, gmtPrice) {
    const serviceCostPerTHUSD = 0.0089; // USD per TH per day
    const discount = 0; // No discount by default

    const dailyServiceUSD = serviceCostPerTHUSD * totalTH * (1 - discount);
    const dailyServiceBTC = btcPrice ? dailyServiceUSD / btcPrice : null;
    const dailyServiceGMT = gmtPrice ? dailyServiceUSD / gmtPrice : null;

    return {
        usd: dailyServiceUSD,
        btc: dailyServiceBTC,
        gmt: dailyServiceGMT
    };
}

/**
 * Get price per TH based on efficiency and current TH amount
 */
function getPricePerTH(efficiency, thAmount) {
    efficiency = Math.round(parseFloat(efficiency));
    
    if (!priceMatrixdatei || !priceMatrixdatei[efficiency]) {
        console.error(`No price data found for ${efficiency} W/TH`);
        return null;
    }

    const priceEntries = priceMatrixdatei[efficiency];

    // Find the appropriate price for the given TH amount
    for (let i = priceEntries.length - 1; i >= 0; i--) {
        if (thAmount >= priceEntries[i].minTH) {
            return priceEntries[i].pricePerTH;
        }
    }

    return priceEntries[0].pricePerTH; // Return highest price tier if below minimum
}

/**
 * Calculate separate farm and miner efficiencies
 * This solves the mathematical problem of nested efficiency calculations
 */
function calculateSeparateEfficiencies(totalTH, avgEfficiency, minerTH, minerEfficiency) {
    const totalWatt = totalTH * avgEfficiency;
    const minerWatt = minerTH * minerEfficiency;
    const restFarmWatt = totalWatt - minerWatt;
    const restFarmTH = totalTH - minerTH;
    
    // Handle edge case where miner is the entire farm
    if (restFarmTH <= 0) {
        return {
            restFarmTH: 0,
            restFarmEfficiency: 0,
            minerTH: minerTH,
            minerEfficiency: minerEfficiency
        };
    }
    
    const restFarmEfficiency = restFarmWatt / restFarmTH;
    
    return {
        restFarmTH: restFarmTH,
        restFarmEfficiency: restFarmEfficiency,
        minerTH: minerTH,
        minerEfficiency: minerEfficiency
    };
}

/**
 * Calculate daily electricity costs with separate farm and miner calculations
 */
function calculateSeparateElectricity(farmComponents, btcPrice, gmtPrice) {
    const costPerKWh = 0.05; // USD per kWh
    const hoursPerDay = 24;
    const discount = 0; // No discount by default
    
    // Calculate electricity for rest of farm
    const farmElectricityUSD = farmComponents.restFarmTH > 0 ? 
        ((farmComponents.restFarmEfficiency * farmComponents.restFarmTH * costPerKWh * hoursPerDay) / 1000) * (1 - discount) : 0;
    
    // Calculate electricity for upgrade miner
    const minerElectricityUSD = ((farmComponents.minerEfficiency * farmComponents.minerTH * costPerKWh * hoursPerDay) / 1000) * (1 - discount);
    
    // Total electricity costs
    const totalElectricityUSD = farmElectricityUSD + minerElectricityUSD;
    const totalElectricityBTC = btcPrice ? totalElectricityUSD / btcPrice : null;
    const totalElectricityGMT = gmtPrice ? totalElectricityUSD / gmtPrice : null;
    
    return {
        usd: totalElectricityUSD,
        btc: totalElectricityBTC,
        gmt: totalElectricityGMT,
        breakdown: {
            farm: farmElectricityUSD,
            miner: minerElectricityUSD
        }
    };
}

/**
 * Calculate new farm efficiency as the upgrade miner grows
 */
function calculateNewFarmEfficiency(originalFarmTH, originalFarmEfficiency, currentMinerTH, originalMinerTH, minerEfficiency) {
    // Calculate how farm efficiency changes through miner growth
    const currentFarmTH = originalFarmTH + (currentMinerTH - originalMinerTH);
    
    // Original farm watt consumption
    const originalTotalWatt = originalFarmTH * originalFarmEfficiency;
    
    // Additional watt from miner growth
    const minerGrowthWatt = (currentMinerTH - originalMinerTH) * minerEfficiency;
    
    // New total watt consumption
    const newTotalWatt = originalTotalWatt + minerGrowthWatt;
    
    // New farm efficiency
    return newTotalWatt / currentFarmTH;
}

/**
 * Calculate how much TH can be bought with given USD amount
 */
function calculateTHFromUSD(usdAmount, efficiency, currentTH) {
    const pricePerTH = getPricePerTH(efficiency, currentTH);
    if (!pricePerTH) return 0;
    
    return usdAmount / pricePerTH;
}

/**
 * Main reinvestment calculation function
 */
function calculateReinvestmentStrategy() {
    // Get input values
    const inputs = getInputValues();
    if (!inputs) return null;

    const results = [];
    let currentDate = new Date();
    let currentGMTBalance = inputs.gmtWalletBalance;
    let totalInvestment = 0;
    
    // Yesterday values (starting values)
    let yesterdayFarmTH = inputs.farmTotalTH;
    let yesterdayFarmEfficiency = inputs.farmEfficiency;
    let yesterdayMinerTH = inputs.minerTH;
    
    // For controlled strategy
    let dayInCycle = 0;
    const autoDays = currentStrategy === 'controlled' ? parseInt(document.getElementById('auto-days').value) : 30;
    const savingDays = 30 - autoDays;
    
    // Data for chart
    const chartData = {
        labels: [],
        thData: [],
        gmtData: [],
        profitData: []
    };
        // Get chart display settings - chart interval based on selected period unit
        const chartPeriod = document.getElementById('chart-period').value;
        const periodCount = parseInt(document.getElementById('calculation-period').value) || 1;
        let chartInterval = 1; // Default: daily
        
        switch(chartPeriod) {
            case 'daily': 
                chartInterval = Math.max(1, Math.floor(inputs.calculationPeriod / Math.min(100, periodCount))); 
                break;
            case 'weekly': 
                chartInterval = 7; 
                break;
            case 'monthly': 
                chartInterval = 30; 
                break;
            case 'yearly': 
                chartInterval = 365; 
                break;
        }
    for (let day = 0; day < inputs.calculationPeriod; day++) {
        // Calculate separate farm components with YESTERDAY values
        const farmComponents = calculateSeparateEfficiencies(
            yesterdayFarmTH, 
            yesterdayFarmEfficiency, 
            yesterdayMinerTH, 
            inputs.minerEfficiency
        );
        
        // Calculate daily metrics with YESTERDAY farm values
        const dailyRevenue = calculateDailyRevenue(inputs.satPerTH, yesterdayFarmTH, inputs.btcPrice, inputs.gmtPrice);
        const dailyElectricity = calculateSeparateElectricity(farmComponents, inputs.btcPrice, inputs.gmtPrice);
        const dailyService = calculateDailyService(yesterdayFarmTH, inputs.btcPrice, inputs.gmtPrice);
        
        // Calculate daily profit for display purposes
        const dailyProfitGMT = dailyRevenue.gmt - dailyElectricity.gmt - dailyService.gmt;
        const dailyProfitUSD = dailyRevenue.usd - dailyElectricity.usd - dailyService.usd;

        let reinvestmentUSD = 0;
        let strategyText = 'Hold';
        let todayMinerTH = yesterdayMinerTH; // Default: no growth

        // Execute GoMining strategy with correct wallet management
        if (currentStrategy === 'auto') {
            // AUTOMATIC REINVEST: Deduct costs from wallet, reinvest ENTIRE revenue + 5%
            currentGMTBalance -= dailyElectricity.gmt;
            currentGMTBalance -= dailyService.gmt;
            
            // Check if we can afford the electricity and service costs
            if (currentGMTBalance >= 0) {
                reinvestmentUSD = dailyRevenue.usd * 1.05; // ENTIRE revenue + 5% bonus
                const additionalTH = calculateTHFromUSD(reinvestmentUSD, inputs.minerEfficiency, yesterdayMinerTH);
                todayMinerTH = yesterdayMinerTH + additionalTH;
                totalInvestment += reinvestmentUSD;
                strategyText = 'Auto +5%';
            } else {
                // Not enough GMT for costs - revert and hold
                currentGMTBalance += dailyElectricity.gmt;
                currentGMTBalance += dailyService.gmt;
                currentGMTBalance += dailyRevenue.gmt;
                strategyText = 'Hold (Insufficient GMT)';
            }
            
        } else if (currentStrategy === 'manual') {
            // MANUAL REINVEST: Revenue to wallet, deduct costs, reinvest profit
            currentGMTBalance += dailyRevenue.gmt;
            currentGMTBalance -= dailyElectricity.gmt;
            currentGMTBalance -= dailyService.gmt;
            
            const profitGMT = dailyProfitGMT;
            if (profitGMT > 0 && currentGMTBalance >= profitGMT) {
                reinvestmentUSD = dailyProfitUSD; // Only profit, no bonus
                currentGMTBalance -= profitGMT; // Remove profit from wallet for reinvestment
                const additionalTH = calculateTHFromUSD(reinvestmentUSD, inputs.minerEfficiency, yesterdayMinerTH);
                todayMinerTH = yesterdayMinerTH + additionalTH;
                totalInvestment += reinvestmentUSD;
                strategyText = 'Manual';
            } else {
                strategyText = 'Hold (No Profit/Insufficient GMT)';
            }
            
            } else if (currentStrategy === 'controlled') {
                // CONTROLLED AUTO: Mix of auto and saving days
                // Check if we should save first or auto first
                const shouldAutoInvest = saveFirst ? 
                    (dayInCycle >= (30 - autoDays)) : // Save first: auto in last X days
                    (dayInCycle < autoDays);          // Auto first: auto in first X days
                
                if (shouldAutoInvest) {
                    // AUTO DAYS: Same as automatic reinvest
                    currentGMTBalance -= dailyElectricity.gmt;
                    currentGMTBalance -= dailyService.gmt;
                    
                    if (currentGMTBalance >= 0) {
                        reinvestmentUSD = dailyRevenue.usd * 1.05;
                        const additionalTH = calculateTHFromUSD(reinvestmentUSD, inputs.minerEfficiency, yesterdayMinerTH);
                        todayMinerTH = yesterdayMinerTH + additionalTH;
                        totalInvestment += reinvestmentUSD;
                        strategyText = 'Auto +5%';
                    } else {
                        currentGMTBalance += dailyElectricity.gmt;
                        currentGMTBalance += dailyService.gmt;
                        currentGMTBalance += dailyRevenue.gmt;
                        strategyText = 'Hold (Insufficient GMT)';
                    }
                } else {
                    // SAVING DAYS: Revenue to wallet, deduct costs, keep profit as savings
                    currentGMTBalance += dailyRevenue.gmt;
                    currentGMTBalance -= dailyElectricity.gmt;
                    currentGMTBalance -= dailyService.gmt;
                    strategyText = 'Saving';
                }
                
                dayInCycle++;
                if (dayInCycle >= 30) {
                    dayInCycle = 0; // Reset cycle
                }
            }
        
        // Calculate TODAY farm values (for tomorrow's calculations)
        const todayFarmTH = inputs.farmTotalTH + (todayMinerTH - inputs.minerTH);
        const todayFarmEfficiency = calculateNewFarmEfficiency(
            inputs.farmTotalTH, 
            inputs.farmEfficiency, 
            todayMinerTH, 
            inputs.minerTH, 
            inputs.minerEfficiency
        );

        // Store data for chart based on selected interval
        const shouldStore = day % chartInterval === 0 || day === inputs.calculationPeriod - 1;
        
        if (shouldStore) {
            const dateStr = new Date(currentDate.getTime() + day * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            
            results.push({
                day: day + 1,
                date: dateStr,
                thAmount: todayMinerTH,
                farmTH: todayFarmTH,
                farmEfficiency: todayFarmEfficiency,
                dailyProfitUSD: dailyProfitUSD,
                reinvestmentUSD: reinvestmentUSD,
                gmtBalance: currentGMTBalance,
                strategy: strategyText
            });
            
            // Chart data - create appropriate labels
            let label;
            switch(chartPeriod) {
                case 'daily':
                    label = `Day ${day + 1}`;
                    break;
                case 'weekly':
                    label = `Week ${Math.ceil((day + 1) / 7)}`;
                    break;
                case 'monthly':
                    label = `Month ${Math.ceil((day + 1) / 30)}`;
                    break;
                case 'yearly':
                    label = `Year ${Math.ceil((day + 1) / 365)}`;
                    break;
                default:
                    label = `Day ${day + 1}`;
            }

            // Chart data
            chartData.labels.push(label);
            chartData.thData.push(todayMinerTH);
            chartData.gmtData.push(Number(currentGMTBalance.toFixed(4)));
            chartData.profitData.push(dailyProfitUSD);
        }
        
        // TODAY becomes YESTERDAY for next iteration
        yesterdayFarmTH = todayFarmTH;
        yesterdayFarmEfficiency = todayFarmEfficiency;
        yesterdayMinerTH = todayMinerTH;
    }

    return {
        results: results,
        chartData: chartData,
        summary: {
            finalTH: yesterdayMinerTH,
            finalFarmTH: yesterdayFarmTH,
            finalFarmEfficiency: yesterdayFarmEfficiency,
            totalInvestment: totalInvestment,
            finalGMTBalance: currentGMTBalance,
            totalDays: inputs.calculationPeriod
        }
    };
}

/**
 * Get and validate input values
 */
function getInputValues() {
    try {
        const gmtWalletBalance = parseFloat(document.getElementById('gmt-wallet-balance').value) || 0;
        const farmTotalTH = parseFloat(document.getElementById('farm-total-th').value) || 0;
        const farmEfficiency = parseFloat(document.getElementById('farm-efficiency').value) || 19.50;
        const minerTH = parseFloat(document.getElementById('miner-th').value) || 0;
        const minerEfficiency = parseInt(document.getElementById('miner-efficiency').value) || 19;
        // Convert calculation period to days based on selected unit
        const periodCount = parseInt(document.getElementById('calculation-period').value) || 1;
        const periodUnit = document.getElementById('chart-period').value || 'daily';
        
        let calculationPeriod;
        switch(periodUnit) {
            case 'daily': calculationPeriod = periodCount; break;
            case 'weekly': calculationPeriod = periodCount * 7; break;
            case 'monthly': calculationPeriod = periodCount * 30; break;
            case 'yearly': calculationPeriod = periodCount * 365; break;
            default: calculationPeriod = periodCount;
        }
        
        // Get prices
        const btcPrice = parseFloat(document.getElementById('bitcoin-price-dropdown').value) || 67000;
        const gmtPrice = parseFloat(document.getElementById('gmt-token-price').value) || 0.4269;
        const satPerTH = parseInt(document.getElementById('sat-TH').value) || 42;

        // Validate inputs
        if (farmTotalTH <= 0 || minerTH <= 0 || btcPrice <= 0 || gmtPrice <= 0 || satPerTH <= 0) {
            throw new Error('Invalid input values');
        }

        return {
            gmtWalletBalance,
            farmTotalTH,
            farmEfficiency,
            minerTH,
            minerEfficiency,
            calculationPeriod,
            btcPrice,
            gmtPrice,
            satPerTH
        };
    } catch (error) {
        console.error('Error getting input values:', error);
        alert('Please check your input values and try again.');
        return null;
    }
}

/**
 * Update the results display
 */
function updateResultsDisplay(calculationResults) {
    if (!calculationResults) return;

    // Show results section
    document.getElementById('results-section').classList.remove('hidden');

    // Update summary cards
    document.getElementById('final-th').textContent = calculationResults.summary.finalTH.toFixed(2) + ' TH';
    document.getElementById('total-investment').textContent = '$' + calculationResults.summary.totalInvestment.toFixed(2);
    document.getElementById('final-gmt-balance').textContent = calculationResults.summary.finalGMTBalance.toFixed(2) + ' GMT';

    // Update chart
    updateChart(calculationResults.chartData);

    // Update results table
    updateResultsTable(calculationResults.results);

    // Scroll to results
    document.getElementById('results-section').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Update the growth chart
 */
function updateChart(chartData) {
    const ctx = document.getElementById('growthChart').getContext('2d');
    
    if (growthChart) {
        growthChart.destroy();
    }

    growthChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.labels,
            datasets: [
                {
                    label: 'TH Amount',
                    data: chartData.thData,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    yAxisID: 'y'
                },
                {
                    label: 'GMT Balance',
                    data: chartData.gmtData,
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#d1d5db'
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: '#9ca3af'
                    },
                    grid: {
                        color: '#374151'
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'TH Amount',
                        color: '#10b981'
                    },
                    ticks: {
                        color: '#9ca3af'
                    },
                    grid: {
                        color: '#374151'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'GMT Balance',
                        color: '#8b5cf6'
                    },
                    ticks: {
                        color: '#9ca3af'
                    },
                    grid: {
                        drawOnChartArea: false,
                        color: '#374151'
                    }
                }
            }
        }
    });
}

/**
 * Update the results table
 */
function updateResultsTable(results) {
    const tableBody = document.getElementById('results-table-body');
    tableBody.innerHTML = '';

    results.forEach((result, index) => {
        const row = document.createElement('tr');
        
        // Determine period label
        let periodLabel;
        if (result.day <= 30) {
            periodLabel = `Day ${result.day}`;
        } else if (result.day <= 365) {
            periodLabel = `Month ${Math.ceil(result.day / 30)}`;
        } else {
            periodLabel = `Year ${Math.ceil(result.day / 365)}`;
        }

        row.innerHTML = `
            <td>${periodLabel}</td>
            <td>${result.date}</td>
            <td>${result.thAmount.toFixed(3)} TH</td>
            <td>$${result.dailyProfitUSD.toFixed(2)}</td>
            <td>$${result.reinvestmentUSD.toFixed(2)}</td>
            <td>${result.gmtBalance.toFixed(2)} GMT</td>
            <td><span class="px-2 py-1 rounded text-xs font-medium ${getStrategyBadgeClass(result.strategy)}">${result.strategy}</span></td>
        `;
        
        tableBody.appendChild(row);
    });
}

/**
 * Get CSS classes for strategy badges
 */
function getStrategyBadgeClass(strategy) {
    switch (strategy) {
        case 'Auto +5%':
            return 'bg-green-600 text-white';
        case 'Manual':
            return 'bg-blue-600 text-white';
        case 'Saving':
            return 'bg-purple-600 text-white';
        default:
            return 'bg-gray-600 text-white';
    }
}

/**
 * Main calculation function called from HTML
 */
function calculateReinvestment() {
    console.log('Starting reinvestment calculation...');
    
    try {
        const results = calculateReinvestmentStrategy();
        if (results) {
            updateResultsDisplay(results);
            console.log('Calculation completed successfully');
        }
    } catch (error) {
        console.error('Calculation error:', error);
        alert('An error occurred during calculation. Please check your inputs and try again.');
    }
}
// Global variable for cycle mode
let saveFirst = false;

function updateCycleMode() {
    saveFirst = document.getElementById('save-first-toggle').checked;
    const description = document.getElementById('cycle-description');
    
    if (saveFirst) {
        description.textContent = "Start with saving days, then auto-reinvest with 5% bonus";
    } else {
        description.textContent = "Start with auto-reinvest days, then save for maintenance";
    }
    
    // Recalculate if results are visible
    if (!document.getElementById('results-section').classList.contains('hidden')) {
        calculateReinvestment();
    }
}
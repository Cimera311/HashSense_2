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
    let currentBTCBalance = 0; // NEU: BTC Wallet für v2
    let totalInvestment = 0;
    
    // Yesterday values (starting values)
    let yesterdayFarmTH = inputs.farmTotalTH;
    let yesterdayFarmEfficiency = inputs.farmEfficiency;
    let yesterdayMinerTH = inputs.minerTH;
    
    // For controlled strategy
    let dayInCycle = 0;
    const autoDays = currentStrategy === 'controlled' ? parseInt(document.getElementById('auto-days').value) : 30;
    const savingDays = 30 - autoDays;
    
    // For controlled v2 strategy - NEU
    let dayInCycleV2 = 0;
    const reinvestDaysV2 = currentStrategy === 'controlledv2' ? parseInt(document.getElementById('controlled-reinvest-days-v2').value) : 0;
    const btcRewardDaysV2 = currentStrategy === 'controlledv2' ? parseInt(document.getElementById('btc-reward-days-v2').value) : 0;
    const savingDaysV2 = currentStrategy === 'controlledv2' ? parseInt(document.getElementById('controlled-saving-days-v2').value) : 0;
    const totalCycleDaysV2 = reinvestDaysV2 + btcRewardDaysV2 + savingDaysV2;
    
    // Data for chart
    const chartData = {
        labels: [],
        thData: [],
        gmtData: [],
        btcData: [], // NEU: BTC Wallet Daten
        profitData: []
    };
    
    // Get chart display settings
    const chartPeriod = document.getElementById('chart-period').value;
    const periodCount = parseInt(document.getElementById('calculation-period').value) || 1;
    let chartInterval = 1;
    
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
        let todayMinerTH = yesterdayMinerTH;

        // ===== STRATEGY EXECUTION =====
        
        if (currentStrategy === 'auto') {
            // AUTOMATIC REINVEST: Deduct costs from wallet, reinvest ENTIRE revenue + 5%
            currentGMTBalance -= dailyElectricity.gmt;
            currentGMTBalance -= dailyService.gmt;
            
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
            // CONTROLLED AUTO (v1)
            const shouldAutoInvest = saveFirst ? 
                (dayInCycle >= (30 - autoDays)) : 
                (dayInCycle < autoDays);
            
            if (shouldAutoInvest) {
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
                currentGMTBalance += dailyRevenue.gmt;
                currentGMTBalance -= dailyElectricity.gmt;
                currentGMTBalance -= dailyService.gmt;
                strategyText = 'Saving';
            }
            
            dayInCycle++;
            if (dayInCycle >= 30) {
                dayInCycle = 0;
            }
            
        } else if (currentStrategy === 'controlledv2') {
            // ===== CONTROLLED AUTO V2 =====
            const cyclePosition = dayInCycleV2 % totalCycleDaysV2;
            
            // Determine which phase we're in based on save-first toggle
            let isReinvestPhase, isBTCPhase, isSavingPhase;
            
            if (saveFirstV2) {
                // Save First: GMT Saving → BTC → TH Reinvest
                isSavingPhase = cyclePosition < savingDaysV2;
                isBTCPhase = cyclePosition >= savingDaysV2 && cyclePosition < savingDaysV2 + btcRewardDaysV2;
                isReinvestPhase = cyclePosition >= savingDaysV2 + btcRewardDaysV2;
            } else {
                // TH First: TH Reinvest → BTC → GMT Saving
                isReinvestPhase = cyclePosition < reinvestDaysV2;
                isBTCPhase = cyclePosition >= reinvestDaysV2 && cyclePosition < reinvestDaysV2 + btcRewardDaysV2;
                isSavingPhase = cyclePosition >= reinvestDaysV2 + btcRewardDaysV2;
            }
            
            if (isReinvestPhase) {
                // PHASE: Reinvest in TH mit +5%
                currentGMTBalance -= dailyElectricity.gmt;
                currentGMTBalance -= dailyService.gmt;
                
                if (currentGMTBalance >= 0) {
                    reinvestmentUSD = dailyRevenue.usd * 1.05;
                    const additionalTH = calculateTHFromUSD(reinvestmentUSD, inputs.minerEfficiency, yesterdayMinerTH);
                    todayMinerTH = yesterdayMinerTH + additionalTH;
                    totalInvestment += reinvestmentUSD;
                    strategyText = 'TH Reinvest +5%';
                } else {
                    currentGMTBalance += dailyElectricity.gmt;
                    currentGMTBalance += dailyService.gmt;
                    currentGMTBalance += dailyRevenue.gmt;
                    strategyText = 'Hold (Insufficient GMT)';
                }
                
            } else if (isBTCPhase) {
                // PHASE: Reward in BTC, Maintenance in GMT
                currentBTCBalance += dailyRevenue.btc;
                currentGMTBalance -= dailyElectricity.gmt;
                currentGMTBalance -= dailyService.gmt;
                
                if (currentGMTBalance < 0) {
                    currentBTCBalance -= dailyRevenue.btc;
                    currentGMTBalance += dailyElectricity.gmt;
                    currentGMTBalance += dailyService.gmt;
                    currentGMTBalance += dailyRevenue.gmt;
                    strategyText = 'Hold (Insufficient GMT)';
                } else {
                    strategyText = 'BTC Accumulation';
                }
                
            } else if (isSavingPhase) {
                // PHASE: Saving (Reinvest in GMT)
                currentGMTBalance += dailyRevenue.gmt;
                currentGMTBalance -= dailyElectricity.gmt;
                currentGMTBalance -= dailyService.gmt;
                strategyText = 'GMT Saving';
            }
            
            dayInCycleV2++;
        }
        
        // Calculate TODAY farm values
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
                btcBalance: currentBTCBalance, // NEU
                strategy: strategyText
            });
            
            // Chart labels
            let label;
            switch(chartPeriod) {
                case 'daily': label = `Day ${day + 1}`; break;
                case 'weekly': label = `Week ${Math.ceil((day + 1) / 7)}`; break;
                case 'monthly': label = `Month ${Math.ceil((day + 1) / 30)}`; break;
                case 'yearly': label = `Year ${Math.ceil((day + 1) / 365)}`; break;
                default: label = `Day ${day + 1}`;
            }

            chartData.labels.push(label);
            chartData.thData.push(todayMinerTH);
            chartData.gmtData.push(Number(currentGMTBalance.toFixed(4)));
            chartData.btcData.push(Number(currentBTCBalance.toFixed(8))); // NEU
            chartData.profitData.push(dailyProfitUSD);
        }
        
        // TODAY becomes YESTERDAY
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
            finalBTCBalance: currentBTCBalance, // NEU
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
function updateResultsDisplay(calculationResult) {
    // Show results section
    document.getElementById('results-section').classList.remove('hidden');
    
    // Update summary cards
    document.getElementById('final-th').textContent = calculationResult.summary.finalTH.toFixed(2) + ' TH';
    document.getElementById('final-farm-th').textContent = calculationResult.summary.finalFarmTH.toFixed(2) + ' TH';
    document.getElementById('final-farm-efficiency').textContent = calculationResult.summary.finalFarmEfficiency.toFixed(2) + ' W/TH';
    document.getElementById('total-investment').textContent = '$' + calculationResult.summary.totalInvestment.toFixed(2);
    document.getElementById('final-gmt-balance').textContent = calculationResult.summary.finalGMTBalance.toFixed(4) + ' GMT';
    
    // NEU: BTC Balance Card (nur bei controlledv2 anzeigen)
    const btcBalanceCard = document.getElementById('final-btc').parentElement;
    if (currentStrategy === 'controlledv2') {
        btcBalanceCard.style.display = 'block';
        document.getElementById('final-btc').textContent = calculationResult.summary.finalBTCBalance.toFixed(8) + ' BTC';
    } else {
        btcBalanceCard.style.display = 'none';
    }
    
    // Update chart
    updateChart(calculationResult.chartData);
    
    // Update results table
    const tableBody = document.getElementById('results-table-body');
    tableBody.innerHTML = '';
    
    calculationResult.results.forEach(result => {
        const row = document.createElement('tr');
        
        // Period label
        const periodCell = document.createElement('td');
        const chartPeriod = document.getElementById('chart-period').value;
        switch(chartPeriod) {
            case 'daily':
                periodCell.textContent = `Day ${result.day}`;
                break;
            case 'weekly':
                periodCell.textContent = `Week ${Math.ceil(result.day / 7)}`;
                break;
            case 'monthly':
                periodCell.textContent = `Month ${Math.ceil(result.day / 30)}`;
                break;
            case 'yearly':
                periodCell.textContent = `Year ${Math.ceil(result.day / 365)}`;
                break;
        }
        row.appendChild(periodCell);
        
        // Date
        const dateCell = document.createElement('td');
        dateCell.textContent = result.date;
        row.appendChild(dateCell);
        
        // TH Amount
        const thCell = document.createElement('td');
        thCell.textContent = result.thAmount.toFixed(2) + ' TH';
        row.appendChild(thCell);
        
        // Daily Profit
        const profitCell = document.createElement('td');
        profitCell.textContent = '$' + result.dailyProfitUSD.toFixed(2);
        profitCell.className = result.dailyProfitUSD >= 0 ? 'text-green-400' : 'text-red-400';
        row.appendChild(profitCell);
        
        // Reinvestment
        const reinvestCell = document.createElement('td');
        reinvestCell.textContent = result.reinvestmentUSD > 0 ? '$' + result.reinvestmentUSD.toFixed(2) : '-';
        row.appendChild(reinvestCell);
        
        // GMT Balance
        const gmtCell = document.createElement('td');
        gmtCell.textContent = result.gmtBalance.toFixed(4) + ' GMT';
        gmtCell.className = result.gmtBalance >= 0 ? 'text-purple-400' : 'text-red-400';
        row.appendChild(gmtCell);
        
        // NEU: BTC Balance (nur bei controlledv2)
        if (currentStrategy === 'controlledv2') {
            const btcCell = document.createElement('td');
            btcCell.textContent = result.btcBalance.toFixed(8) + ' BTC';
            btcCell.className = 'text-orange-400';
            row.appendChild(btcCell);
        }
        
        // Strategy
        const strategyCell = document.createElement('td');
        strategyCell.textContent = result.strategy;
        
        // Color code strategy
        if (result.strategy.includes('Auto')) {
            strategyCell.className = 'text-green-400';
        } else if (result.strategy.includes('Manual')) {
            strategyCell.className = 'text-blue-400';
        } else if (result.strategy.includes('Saving') || result.strategy.includes('GMT')) {
            strategyCell.className = 'text-purple-400';
        } else if (result.strategy.includes('BTC')) {
            strategyCell.className = 'text-orange-400';
        } else if (result.strategy.includes('TH')) {
            strategyCell.className = 'text-green-400';
        } else {
            strategyCell.className = 'text-gray-400';
        }
        
        row.appendChild(strategyCell);
        tableBody.appendChild(row);
    });
    
    // Scroll to results
    document.getElementById('results-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Update the growth chart
 */
function updateChart(chartData) {
    const ctx = document.getElementById('growthChart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (growthChart) {
        growthChart.destroy();
    }
    
    // Determine which datasets to show based on strategy
    const datasets = [
        {
            label: 'TH Amount',
            data: chartData.thData,
            borderColor: 'rgb(34, 197, 94)',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            yAxisID: 'y',
            tension: 0.4,
            fill: true
        },
        {
            label: 'GMT Balance',
            data: chartData.gmtData,
            borderColor: 'rgb(168, 85, 247)',
            backgroundColor: 'rgba(168, 85, 247, 0.1)',
            yAxisID: 'y1',
            tension: 0.4,
            fill: true
        }
    ];
    
    // Add BTC Balance line for controlledv2 strategy
    if (currentStrategy === 'controlledv2') {
        datasets.push({
            label: 'BTC Balance',
            data: chartData.btcData,
            borderColor: 'rgb(249, 115, 22)', // Orange
            backgroundColor: 'rgba(249, 115, 22, 0.1)',
            yAxisID: 'y2',
            tension: 0.4,
            fill: true
        });
    }
    
    // Create new chart
    growthChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.labels,
            datasets: datasets
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
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#d1d5db',
                        usePointStyle: true,
                        padding: 15
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.9)',
                    titleColor: '#f3f4f6',
                    bodyColor: '#d1d5db',
                    borderColor: '#374151',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.dataset.label === 'TH Amount') {
                                label += context.parsed.y.toFixed(2) + ' TH';
                            } else if (context.dataset.label === 'GMT Balance') {
                                label += context.parsed.y.toFixed(4) + ' GMT';
                            } else if (context.dataset.label === 'BTC Balance') {
                                label += context.parsed.y.toFixed(8) + ' BTC';
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(55, 65, 81, 0.5)'
                    },
                    ticks: {
                        color: '#9ca3af',
                        maxRotation: 45,
                        minRotation: 0
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'TH Amount',
                        color: '#22c55e'
                    },
                    grid: {
                        color: 'rgba(55, 65, 81, 0.5)'
                    },
                    ticks: {
                        color: '#22c55e'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'GMT Balance',
                        color: '#a855f7'
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                    ticks: {
                        color: '#a855f7'
                    }
                },
                // NEU: Y-Achse für BTC (nur bei controlledv2)
                ...(currentStrategy === 'controlledv2' && {
                    y2: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'BTC Balance',
                            color: '#f97316'
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                        ticks: {
                            color: '#f97316',
                            callback: function(value) {
                                return value.toFixed(8);
                            }
                        }
                    }
                })
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

/**
 * Calculate controlled reinvestment strategy (v2)
 * New version with separate BTC wallet and improved logic
 */
function calculateControlledReinvestV2() {
    const reinvestDays = parseInt(document.getElementById('controlled-reinvest-days-v2').value) || 0;
    const btcRewardDays = parseInt(document.getElementById('btc-reward-days-v2').value) || 0;
    const savingDays = parseInt(document.getElementById('controlled-saving-days-v2').value) || 0;
    
    const totalDays = reinvestDays + btcRewardDays + savingDays;
    document.getElementById('controlled-total-days-v2').textContent = totalDays;
    
    // Simulation über 365 Tage
    let currentTH = startingTH;
    let gmtWallet = startingGMT;
    let btcWallet = 0; // NEU: BTC Wallet
    
    const thData = [];
    const gmtData = [];
    const btcData = []; // NEU: BTC Chart-Daten
    
    for (let day = 1; day <= 365; day++) {
        const cycleDay = ((day - 1) % totalDays) + 1;
        
        const dailyReward = currentTH * satPerTH;
        const dailyMaintenanceSat = calculateDailyMaintenance(currentTH);
        const dailyMaintenanceGMT = (dailyMaintenanceSat / 1e8) * btcPrice / gmtPrice;
        
        // Entscheide basierend auf Zyklus-Tag
        if (cycleDay <= reinvestDays) {
            // Phase 1: Reinvest in TH mit +5%
            const netRewardSat = dailyReward - dailyMaintenanceSat;
            const netRewardUSD = (netRewardSat / 1e8) * btcPrice;
            const newTH = (netRewardUSD / pricePerTH) * 1.05; // +5% Bonus
            currentTH += newTH;
            gmtWallet -= dailyMaintenanceGMT;
            
        } else if (cycleDay <= reinvestDays + btcRewardDays) {
            // Phase 2: Reward in BTC, Maintenance in GMT
            btcWallet += dailyReward / 1e8; // Reward auf BTC Wallet
            gmtWallet -= dailyMaintenanceGMT;
            
        } else {
            // Phase 3: Saving (Reinvest in GMT)
            const rewardGMT = (dailyReward / 1e8) * btcPrice / gmtPrice;
            gmtWallet += rewardGMT - dailyMaintenanceGMT;
        }
        
        thData.push({ x: day, y: currentTH });
        gmtData.push({ x: day, y: gmtWallet });
        btcData.push({ x: day, y: btcWallet }); // NEU
    }
    
    // Chart aktualisieren mit BTC-Linie (orange)
    updateChart(thData, gmtData, btcData);
    
    // Results anzeigen
    displayResults({
        finalTH: currentTH,
        finalGMT: gmtWallet,
        finalBTC: btcWallet // NEU
    });
}
   /* function updateControlledV2Settings() {
        const reinvestDays = parseInt(document.getElementById('controlled-reinvest-days-v2').value) || 0;
        const btcRewardDays = parseInt(document.getElementById('btc-reward-days-v2').value) || 0;
        const savingDays = parseInt(document.getElementById('controlled-saving-days-v2').value) || 0;
        
        const totalDays = reinvestDays + btcRewardDays + savingDays;
        document.getElementById('controlled-total-days-v2').textContent = `${totalDays} days`;
        
        // Update phase summaries
        document.getElementById('phase1-summary').textContent = `${reinvestDays}d TH reinvest`;
        document.getElementById('phase2-summary').textContent = `${btcRewardDays}d BTC accumulation`;
        document.getElementById('phase3-summary').textContent = `${savingDays}d GMT saving`;
    } */
// Global variable for cycle mode v2
let saveFirstV2 = false;

function updateCycleModeV2() {
    saveFirstV2 = document.getElementById('save-first-toggle-v2').checked;
    const description = document.getElementById('cycle-description-v2');
    const cycleOrder = document.getElementById('cycle-order-v2');
    
    if (saveFirstV2) {
        description.textContent = "Start with GMT saving, then BTC accumulation, then TH reinvest with 5% bonus";
        cycleOrder.innerHTML = `
            Phase 1: <span id="phase3-summary" class="text-green-400">${document.getElementById('controlled-saving-days-v2').value}d GMT saving</span> → 
            Phase 2: <span id="phase2-summary" class="text-orange-400">${document.getElementById('btc-reward-days-v2').value}d BTC accumulation</span> → 
            Phase 3: <span id="phase1-summary" class="text-blue-400">${document.getElementById('controlled-reinvest-days-v2').value}d TH reinvest</span>
        `;
    } else {
        description.textContent = "Start with TH reinvest, then BTC accumulation, then GMT saving";
        cycleOrder.innerHTML = `
            Phase 1: <span id="phase1-summary" class="text-blue-400">${document.getElementById('controlled-reinvest-days-v2').value}d TH reinvest</span> → 
            Phase 2: <span id="phase2-summary" class="text-orange-400">${document.getElementById('btc-reward-days-v2').value}d BTC accumulation</span> → 
            Phase 3: <span id="phase3-summary" class="text-green-400">${document.getElementById('controlled-saving-days-v2').value}d GMT saving</span>
        `;
    }
    
    // Recalculate if results are visible
    if (!document.getElementById('results-section').classList.contains('hidden')) {
        calculateReinvestment();
    }
}

function updateControlledV2Settings() {
    const reinvestDays = parseInt(document.getElementById('controlled-reinvest-days-v2').value) || 0;
    const btcRewardDays = parseInt(document.getElementById('btc-reward-days-v2').value) || 0;
    const savingDays = parseInt(document.getElementById('controlled-saving-days-v2').value) || 0;
    
    const totalDays = reinvestDays + btcRewardDays + savingDays;
    document.getElementById('controlled-total-days-v2').textContent = `${totalDays} days`;
    
    // Update cycle order display
    updateCycleModeV2();
}

/**
 * Update table header based on strategy
 */
function updateTableHeader() {
    const table = document.querySelector('.results-table');
    const btcHeader = table.querySelector('th:nth-child(7)'); // BTC Balance header
    
    if (currentStrategy === 'controlledv2') {
        btcHeader.style.display = 'table-cell';
    } else {
        btcHeader.style.display = 'none';
    }
}